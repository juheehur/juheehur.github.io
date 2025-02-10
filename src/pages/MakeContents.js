import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// 환경 변수 디버깅
console.log('Environment Variables:', {
  SUPERTONE_API_KEY: process.env.REACT_APP_SUPERTONE_API_KEY,
  SUPERTONE_API_URL: process.env.REACT_APP_SUPERTONE_API_URL,
  NODE_ENV: process.env.NODE_ENV
});

// Supertone API 설정
const SUPERTONE_API = {
  KEY: process.env.REACT_APP_SUPERTONE_API_KEY || '',
  URL: process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001',
  WS_URL: process.env.REACT_APP_WS_URL || 'ws://localhost:3001'
};

// API 설정 디버깅
console.log('API Configuration:', {
  url: SUPERTONE_API.URL,
  keyExists: !!SUPERTONE_API.KEY,
  keyLength: SUPERTONE_API.KEY?.length
});

const createApiHeaders = () => ({
  'Content-Type': 'application/json',
  'Accept': 'audio/*, application/json'
});

const fetchWithTimeout = async (url, options, timeout = 120000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
    console.log(`Request timed out after ${timeout}ms for URL: ${url}`);
  }, timeout);

  try {
    // First try to check if server is available
    const healthCheck = await fetch(`${SUPERTONE_API.URL}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    }).catch(() => null);

    if (!healthCheck?.ok) {
      throw new Error('Server is not available. Please check if the server is running.');
    }

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      credentials: 'include',
      headers: {
        ...options.headers,
        'Origin': window.location.origin
      }
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout}ms`);
    }
    throw error;
  }
};

const retryFetch = async (url, options, retries = 3, initialDelay = 1000) => {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Attempt ${i + 1} of ${retries} for URL: ${url}`);
      return await fetchWithTimeout(url, options);
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${i + 1} failed:`, error.message);
      
      if (error.message.includes('Server is not available')) {
        throw error; // Don't retry if server is not available
      }
      
      if (i === retries - 1) {
        console.error(`All ${retries} retry attempts failed for URL: ${url}`, error);
        throw error;
      }
      
      const delay = initialDelay * Math.pow(2, i);
      console.log(`Retry attempt ${i + 1} failed. Waiting ${delay}ms before next attempt...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
};

const MakeContents = () => {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('ko');
  const [voiceId, setVoiceId] = useState('');
  const [voiceSettings, setVoiceSettings] = useState({
    speed: 1.0,
    pitch_shift: 0,
    pitch_variance: 1.0
  });
  const [savedVoices, setSavedVoices] = useState([]);
  const [generatedAudio, setGeneratedAudio] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [serverStatus, setServerStatus] = useState('checking');
  const [newVoice, setNewVoice] = useState({
    id: '',
    name: '',
    language: 'ko',
    settings: {
      speed: 1.0,
      pitch_shift: 0,
      pitch_variance: 1.0
    }
  });
  const [wsConnection, setWsConnection] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [progress, setProgress] = useState(null);

  // Check server status
  useEffect(() => {
    const checkServer = async () => {
      // In production, the Supertone API does not offer a /health endpoint,
      // so we skip the health check and assume the server is online.
      if (process.env.NODE_ENV !== 'development') {
        setServerStatus('online');
        return;
      }

      // In development, use the local server health endpoint
      const healthUrl = "http://localhost:3001/health";
      try {
        const response = await fetch(healthUrl, { method: 'GET', headers: { 'Accept': 'application/json' } });
        if (response.ok) {
          setServerStatus('online');
        } else {
          setServerStatus('error');
        }
      } catch (error) {
        console.error('Server check failed:', error);
        setServerStatus('offline');
      }
    };

    checkServer();
    const interval = setInterval(checkServer, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // WebSocket connection setup
  useEffect(() => {
    const connectWebSocket = () => {
      const ws = new WebSocket(SUPERTONE_API.WS_URL);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnectionStatus('connected');
        setWsConnection(ws);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setConnectionStatus('disconnected');
        setWsConnection(null);
        // Try to reconnect after 5 seconds
        setTimeout(connectWebSocket, 5000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'connection_status':
              setConnectionStatus(data.payload.status);
              break;
            
            case 'progress':
              setProgress(data.payload);
              break;
            
            case 'tts_response':
              if (data.payload.success) {
                const audioBlob = base64ToBlob(
                  data.payload.audio,
                  data.payload.contentType
                );
                handleAudioResponse(audioBlob);
              }
              break;
            
            case 'error':
              handleError(data.payload);
              break;
            
            default:
              console.log('Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      return ws;
    };

    const ws = connectWebSocket();
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const base64ToBlob = (base64, contentType) => {
    const byteCharacters = atob(base64);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      
      byteArrays.push(new Uint8Array(byteNumbers));
    }

    return new Blob(byteArrays, { type: contentType });
  };

  const handleAudioResponse = (audioBlob) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const selectedVoice = savedVoices.find(v => v.id === voiceId);
    const fileName = `${timestamp}_${selectedVoice?.name || voiceId}.mp3`;
    
    setGeneratedAudio({
      url: URL.createObjectURL(audioBlob),
      fileName: fileName,
      blob: audioBlob
    });
    setIsGenerating(false);
  };

  const handleError = (error) => {
    console.error('TTS Error:', error);
    alert(`Error generating voice: ${error.message}`);
    setIsGenerating(false);
  };

  // localStorage에서 저장된 voice 설정들을 불러옴
  useEffect(() => {
    const saved = localStorage.getItem('savedVoices');
    if (saved) {
      setSavedVoices(JSON.parse(saved));
    }
  }, []);

  const handleSaveVoice = () => {
    if (!newVoice.id || !newVoice.name) {
      alert('Please fill in all fields');
      return;
    }

    const updatedVoices = [...savedVoices, newVoice];
    setSavedVoices(updatedVoices);
    localStorage.setItem('savedVoices', JSON.stringify(updatedVoices));
    setShowVoiceModal(false);
    setNewVoice({
      id: '',
      name: '',
      language: 'ko',
      settings: {
        speed: 1.0,
        pitch_shift: 0,
        pitch_variance: 1.0
      }
    });
  };

  const handleDeleteVoice = (voiceId) => {
    if (window.confirm('Are you sure you want to delete this voice?')) {
      const updatedVoices = savedVoices.filter(voice => voice.id !== voiceId);
      setSavedVoices(updatedVoices);
      localStorage.setItem('savedVoices', JSON.stringify(updatedVoices));
    }
  };

  const handleVoiceSelect = (voice) => {
    setVoiceId(voice.id);
    setVoiceSettings(voice.settings);
    setSelectedLanguage(voice.language);
  };

  const generateVoice = async () => {
    if (!text || !voiceId) {
      alert('Please enter text and select a voice');
      return;
    }

    if (connectionStatus !== 'connected' || !wsConnection) {
      alert('Server connection is not available. Please wait for reconnection.');
      return;
    }

    setIsGenerating(true);
    setProgress(null);

    try {
      wsConnection.send(JSON.stringify({
        type: 'tts_request',
        payload: {
          text,
          voiceId,
          language: selectedLanguage,
          settings: {
            pitch_shift: voiceSettings.pitch_shift || 0,
            pitch_variance: voiceSettings.pitch_variance || 1.0,
            speed: voiceSettings.speed || 1.0
          }
        }
      }));
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      alert('Failed to send request to server');
      setIsGenerating(false);
    }
  };

  const downloadAudio = () => {
    if (!generatedAudio) return;
    
    const a = document.createElement('a');
    a.href = generatedAudio.url;
    a.download = generatedAudio.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Render connection status
  const renderConnectionStatus = () => {
    const statusStyles = {
      connected: { color: 'green' },
      disconnected: { color: 'red' },
      error: { color: 'orange' }
    };

    return (
      <div style={statusStyles[connectionStatus] || {}}>
        Server Status: {connectionStatus}
        {progress && (
          <div>
            {progress.status === 'downloading' ? (
              <progress value={progress.progress} max="1" />
            ) : (
              <span>{progress.message}</span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <h1>Text-to-Speech Generator</h1>
      {renderConnectionStatus()}
      
      {/* Voice Management Section */}
      <div>
        <button onClick={() => setShowVoiceModal(true)}>Add New Voice</button>
        <div>
          <h3>Saved Voices</h3>
          {savedVoices.map((voice) => (
            <div key={voice.id} style={{ 
              padding: '10px', 
              margin: '5px', 
              border: voiceId === voice.id ? '2px solid blue' : '1px solid gray',
              borderRadius: '5px'
            }}>
              <div>Name: {voice.name}</div>
              <div>ID: {voice.id}</div>
              <div>Language: {voice.language}</div>
              <div>Settings: 
                <pre>{JSON.stringify(voice.settings, null, 2)}</pre>
              </div>
              <button onClick={() => handleVoiceSelect(voice)}>Select</button>
              <button onClick={() => handleDeleteVoice(voice.id)}>Delete</button>
            </div>
          ))}
        </div>
      </div>

      {/* Voice Modal */}
      {showVoiceModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '5px',
            width: '400px'
          }}>
            <h2>Add New Voice</h2>
            <div>
              <label>Voice Name:</label>
              <input
                type="text"
                value={newVoice.name}
                onChange={(e) => setNewVoice({...newVoice, name: e.target.value})}
                placeholder="Enter voice name"
              />
            </div>
            <div>
              <label>Voice ID:</label>
              <input
                type="text"
                value={newVoice.id}
                onChange={(e) => setNewVoice({...newVoice, id: e.target.value})}
                placeholder="e.g., qpu1kEUrM5UtU3FknfLp5G"
              />
            </div>
            <div>
              <label>Language:</label>
              <select
                value={newVoice.language}
                onChange={(e) => setNewVoice({...newVoice, language: e.target.value})}
              >
                <option value="ko">Korean</option>
                <option value="en">English</option>
                <option value="ja">Japanese</option>
              </select>
            </div>
            <div>
              <label>Speed:</label>
              <input
                type="number"
                step="0.1"
                value={newVoice.settings.speed}
                onChange={(e) => setNewVoice({
                  ...newVoice,
                  settings: {...newVoice.settings, speed: parseFloat(e.target.value)}
                })}
              />
            </div>
            <div>
              <label>Pitch Shift:</label>
              <input
                type="number"
                value={newVoice.settings.pitch_shift}
                onChange={(e) => setNewVoice({
                  ...newVoice,
                  settings: {...newVoice.settings, pitch_shift: parseInt(e.target.value)}
                })}
              />
            </div>
            <div>
              <label>Pitch Variance:</label>
              <input
                type="number"
                step="0.1"
                value={newVoice.settings.pitch_variance}
                onChange={(e) => setNewVoice({
                  ...newVoice,
                  settings: {...newVoice.settings, pitch_variance: parseFloat(e.target.value)}
                })}
              />
            </div>
            <div>
              <button onClick={handleSaveVoice}>Save Voice</button>
              <button onClick={() => setShowVoiceModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Text Input Section */}
      <div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={200}
          placeholder="Enter text (max 200 characters)"
        />
        <p>{text.length}/200</p>
      </div>

      {/* Generate Button */}
      <button
        onClick={generateVoice}
        disabled={!text || !voiceId || isGenerating}
      >
        {isGenerating ? 'Generating...' : 'Generate Voice'}
      </button>

      {/* Output Section */}
      {generatedAudio && (
        <div>
          <button onClick={downloadAudio}>
            Download MP3 ({generatedAudio.fileName})
          </button>
        </div>
      )}

      {/* Back Button */}
      <button onClick={() => navigate('/admin/contents')}>
        Back to Contents Management
      </button>
    </div>
  );
};

export default MakeContents; 