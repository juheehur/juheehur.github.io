import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/makeContents.css';
import JSZip from 'jszip';
import { db } from '../firebase/config';
import { collection, query, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';

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
  const [entries, setEntries] = useState([{ text: "", voiceId: "" }]);
  const [savedVoices, setSavedVoices] = useState([]);
  const [generatedAudios, setGeneratedAudios] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [serverStatus, setServerStatus] = useState('checking');
  const [newVoice, setNewVoice] = useState({
    id: '',
    name: '',
    language: 'ko',
    voice_settings: {
      speed: 1.0,
      pitch_shift: 0,
      pitch_variance: 1.0
    }
  });
  const [voiceJsonInput, setVoiceJsonInput] = useState('');
  const [wsConnection, setWsConnection] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [progress, setProgress] = useState(null);
  const [showVoiceManagement, setShowVoiceManagement] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkVoiceId, setBulkVoiceId] = useState("");

  // Ref to hold pending TTS request resolvers
  const pendingTTSResolvers = useRef({});

  // Helper function to split text into chunks of max 'limit' characters by sentence boundaries
  const splitTextIntoChunks = (text, limit = 200) => {
    // Split on sentence-ending punctuation followed by whitespace
    const sentences = text.split(/(?<=[.!?])\s+/);
    const chunks = [];
    let currentChunk = '';
    sentences.forEach(sentence => {
      if ((currentChunk + (currentChunk ? ' ' : '') + sentence).length <= limit) {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        if (sentence.length > limit) {
          for (let i = 0; i < sentence.length; i += limit) {
            chunks.push(sentence.substring(i, i + limit));
          }
          currentChunk = '';
        } else {
          currentChunk = sentence;
        }
      }
    });
    if (currentChunk) chunks.push(currentChunk);
    return chunks;
  };

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
                const audioBlob = base64ToBlob(data.payload.audio, data.payload.contentType);
                if (data.payload.chunkId && pendingTTSResolvers.current[data.payload.chunkId]) {
                  pendingTTSResolvers.current[data.payload.chunkId](audioBlob);
                  delete pendingTTSResolvers.current[data.payload.chunkId];
                } else {
                  // If chunkId is missing, check if there's exactly one pending resolver and resolve it
                  const pendingKeys = Object.keys(pendingTTSResolvers.current);
                  if (pendingKeys.length === 1) {
                    const key = pendingKeys[0];
                    pendingTTSResolvers.current[key](audioBlob);
                    delete pendingTTSResolvers.current[key];
                  } else {
                    console.warn('tts_response missing chunkId or ambiguous pending resolvers, ignoring response.');
                  }
                }
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
    const selectedVoice = savedVoices.find(v => v.id === entries[0].voiceId);
    const fileName = `${timestamp}_${selectedVoice?.name || entries[0].voiceId}.mp3`;
    
    setGeneratedAudios([{ url: URL.createObjectURL(audioBlob), fileName, blob: audioBlob }]);
    setIsGenerating(false);
  };

  const handleError = (error) => {
    console.error('TTS Error:', error);
    const errorMsg = error && error.message ? error.message : JSON.stringify(error);
    alert(`Error generating voice: ${errorMsg}`);
    setIsGenerating(false);
  };

  // Firebase에서 저장된 voices를 불러옴
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const voicesRef = collection(db, 'voices');
        const voicesSnapshot = await getDocs(voicesRef);
        const voicesList = voicesSnapshot.docs.map(doc => ({
          ...doc.data(),
          firebaseId: doc.id // Firebase document ID 저장
        }));
        setSavedVoices(voicesList);
      } catch (error) {
        console.error('Error fetching voices:', error);
        alert('음성 설정을 불러오는데 실패했습니다.');
      }
    };

    fetchVoices();
  }, []);

  const handleSaveVoice = async () => {
    if (!newVoice.id || !newVoice.name) {
      alert('Please fill in all fields');
      return;
    }

    if (voiceJsonInput.trim() !== '') {
      try {
        const parsed = JSON.parse(voiceJsonInput);
        if (parsed.voice_settings) {
          newVoice.voice_settings = parsed.voice_settings;
        } else {
          alert('JSON must contain a "voice_settings" property.');
          return;
        }
      } catch (e) {
        alert('Invalid JSON for voice settings.');
        return;
      }
    }

    try {
      const voicesRef = collection(db, 'voices');
      const docRef = await addDoc(voicesRef, {
        ...newVoice,
        createdAt: new Date()
      });

      const savedVoice = {
        ...newVoice,
        firebaseId: docRef.id
      };

      setSavedVoices(prev => [...prev, savedVoice]);
      setShowVoiceModal(false);
      setNewVoice({
        id: '',
        name: '',
        language: 'ko',
        voice_settings: {
          speed: 1.0,
          pitch_shift: 0,
          pitch_variance: 1.0
        }
      });
      setVoiceJsonInput('');
    } catch (error) {
      console.error('Error saving voice:', error);
      alert('음성 설정 저장에 실패했습니다.');
    }
  };

  const handleDeleteVoice = async (voiceId, firebaseId) => {
    if (window.confirm('Are you sure you want to delete this voice?')) {
      try {
        const voiceRef = doc(db, 'voices', firebaseId);
        await deleteDoc(voiceRef);
        setSavedVoices(prev => prev.filter(voice => voice.firebaseId !== firebaseId));
      } catch (error) {
        console.error('Error deleting voice:', error);
        alert('음성 설정 삭제에 실패했습니다.');
      }
    }
  };

  // -------------------- New Helper Functions for multi-entry generation --------------------
  const generateVoiceForEntry = async (entry, entryIndex) => {
    if (!entry.text || !entry.voiceId) {
      alert(`Entry ${entryIndex + 1} is missing text or voice selection.`);
      return;
    }
    if (!wsConnection || connectionStatus !== 'connected') {
      alert('Server connection is not available. Please wait for reconnection.');
      throw new Error('WebSocket not connected');
    }
    const selectedVoice = savedVoices.find(v => v.id === entry.voiceId);
    if (!selectedVoice) {
      alert(`Selected voice for entry ${entryIndex + 1} not found.`);
      return;
    }
    const language = selectedVoice.language || 'ko';
    const settings = selectedVoice.voice_settings || selectedVoice.settings || { speed: 1.0, pitch_shift: 0, pitch_variance: 1.0 };
    
    const chunks = splitTextIntoChunks(entry.text, 200);
    for (let i = 0; i < chunks.length; i++) {
      const chunkId = `entry_${entryIndex}_chunk_${i}`;
      try {
        await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            if (pendingTTSResolvers.current[chunkId]) {
              delete pendingTTSResolvers.current[chunkId];
            }
            reject(new Error('TTS processing timeout for chunk ' + i));
          }, 20000); // 20 second timeout

          pendingTTSResolvers.current[chunkId] = (blob) => {
            clearTimeout(timeoutId);
            resolve(blob);
          };

          try {
            wsConnection.send(JSON.stringify({
              type: 'tts_request',
              payload: {
                text: chunks[i],
                voiceId: entry.voiceId,
                language: language,
                settings: settings,
                apiKey: SUPERTONE_API.KEY,
                chunkId: chunkId,
                totalChunks: chunks.length
              }
            }));
          } catch (error) {
            clearTimeout(timeoutId);
            delete pendingTTSResolvers.current[chunkId];
            reject(error);
          }
        }).then((blob) => {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const fileName = `${timestamp}_${selectedVoice.name}_${i + 1}.mp3`;
          setGeneratedAudios(prev => [...prev, { url: URL.createObjectURL(blob), fileName, blob }]);
        });
      } catch (error) {
        console.error(`Error generating chunk ${i} for entry ${entryIndex + 1}:`, error);
        alert(`Error generating a portion of entry ${entryIndex + 1}: ${error.message || JSON.stringify(error)}`);
        throw error;
      }
    }
  };

  const waitForWsConnection = async (timeout = 20000) => {
    if (connectionStatus === 'connected') return;
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const interval = setInterval(() => {
        if (connectionStatus === 'connected') {
          clearInterval(interval);
          resolve();
        } else if (Date.now() - start > timeout) {
          clearInterval(interval);
          reject(new Error('Timed out waiting for WebSocket connection'));
        }
      }, 100);
    });
  };

  const generateVoices = async () => {
    if (!wsConnection || connectionStatus !== 'connected') {
      alert('Server connection is not available. Please wait for reconnection.');
      return;
    }
    setIsGenerating(true);
    for (let i = 0; i < entries.length; i++) {
      if (!wsConnection || connectionStatus !== 'connected') {
        try {
          await waitForWsConnection();
        } catch (error) {
          alert('WebSocket connection not available for entry ' + (i + 1));
          continue;
        }
      }
      const entry = entries[i];
      if (entry.text && entry.voiceId) {
        try {
          await generateVoiceForEntry(entry, i);
        } catch (error) {
          console.error(`Failed to generate voice for entry ${i + 1}:`, error);
          alert(`Failed to generate voice for entry ${i + 1}: ${error.message || JSON.stringify(error)}`);
        }
      }
    }
    setIsGenerating(false);
  };
  // ----------------------------------------------------------------------------------------

  const downloadAudio = (audio) => {
    if (!audio) return;
    const a = document.createElement('a');
    a.href = audio.url;
    a.download = audio.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleBulkSplit = () => {
    const lines = bulkText.split(/\r?\n/).map(line => line.trim()).filter(line => line !== "");
    if (lines.length === 0) {
      alert("No text detected.");
      return;
    }
    const defaultVoiceId = bulkVoiceId || entries[0].voiceId; // use bulkVoiceId if set, otherwise fallback
    const newEntries = lines.map(line => ({ text: line, voiceId: defaultVoiceId }));
    setEntries(newEntries);
    setBulkText("");
  };

  const downloadAllAsZip = async () => {
    if (generatedAudios.length === 0) {
      alert("No MP3 files generated.");
      return;
    }
    const zip = new JSZip();
    generatedAudios.forEach(audio => {
      zip.file(audio.fileName, audio.blob);
    });
    zip.generateAsync({ type: "blob" }).then((content) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = "mp3_files.zip";
      a.click();
    });
  };

  const handleBulkKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift+Enter: Allow normal line break
        return;
      } else {
        // Enter only: Trigger split
        e.preventDefault();
        handleBulkSplit();
      }
    }
  };

  return (
    <div className="make-contents-container">
      <div className="make-contents-header">
        <h1>Text-to-Speech Generator</h1>
        <div className={`server-status ${connectionStatus}`}>
          Server Status: {connectionStatus}
          {progress && (
            <div className="progress-container">
              {progress.status === 'downloading' ? (
                <div className="progress-bar">
                  <div 
                    className="progress-bar-fill" 
                    style={{ width: `${progress.progress * 100}%` }}
                  />
                </div>
              ) : (
                <span>{progress.message}</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="main-content">
        <div className="text-entries">
          <div className="text-entries-header">
            <h2>Text Entries</h2>
            <button className="manage-voices-button" onClick={() => setShowVoiceModal(true)}>
              Manage Voices
            </button>
          </div>

          <div className="bulk-text-section">
            <textarea 
              className="bulk-textarea"
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              onKeyDown={handleBulkKeyDown}
              placeholder="Quick add multiple entries: Paste your text here, one entry per line. Press Enter to split (Shift+Enter for new line)"
            />
            <div className="bulk-controls">
              <select
                value={bulkVoiceId}
                onChange={(e) => setBulkVoiceId(e.target.value)}
                className="voice-select"
              >
                <option value="">Select voice for all entries</option>
                {savedVoices.map(voice => (
                  <option key={voice.id} value={voice.id}>{voice.name}</option>
                ))}
              </select>
              <button className="bulk-split-button" onClick={handleBulkSplit}>
                Convert to Entries
              </button>
            </div>
          </div>

          <div className="entries-list">
            {entries.map((entry, index) => (
              <div key={index} className="text-entry">
                <div className="entry-header">
                  <span className="entry-number">#{index + 1}</span>
                  <select
                    value={entry.voiceId}
                    onChange={(e) => {
                      const newEntries = [...entries];
                      newEntries[index].voiceId = e.target.value;
                      setEntries(newEntries);
                    }}
                    className="voice-select"
                  >
                    <option value="">Select voice</option>
                    {savedVoices.map(voice => (
                      <option key={voice.id} value={voice.id}>{voice.name}</option>
                    ))}
                  </select>
                  {entries.length > 1 && (
                    <button 
                      className="remove-entry-button"
                      onClick={() => {
                        const newEntries = entries.filter((_, i) => i !== index);
                        setEntries(newEntries);
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
                <textarea
                  value={entry.text}
                  onChange={(e) => {
                    const newEntries = [...entries];
                    newEntries[index].text = e.target.value;
                    setEntries(newEntries);
                  }}
                  placeholder="Enter your text here..."
                  className="entry-textarea"
                />
                <div className="entry-footer">
                  <span className="character-count">
                    {entry.text.length} / 200 characters
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="entries-actions">
            <button 
              className="add-entry-button"
              onClick={() => setEntries([...entries, { text: "", voiceId: entries[0]?.voiceId || "" }])}
            >
              + Add New Entry
            </button>
            <button
              className="generate-button"
              onClick={generateVoices}
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating...' : 'Generate All'}
            </button>
          </div>
        </div>

        {generatedAudios.length > 0 && (
          <div className="output-section">
            <h2>Generated Audio Files</h2>
            <div className="audio-files-list">
              {generatedAudios.map((audio, idx) => (
                <div key={audio.fileName} className="audio-file-item">
                  <span className="audio-file-name">MP3 #{idx + 1}</span>
                  <div className="audio-file-actions">
                    <audio controls src={audio.url} className="audio-player" />
                    <button 
                      className="download-button"
                      onClick={() => downloadAudio(audio)}
                    >
                      Download
                    </button>
                  </div>
                </div>
              ))}
              {generatedAudios.length > 1 && (
                <button
                  className="download-all-button"
                  onClick={downloadAllAsZip}
                >
                  Download All as ZIP
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Voice Management Modal */}
      {showVoiceModal && (
        <div className="modal-overlay" onClick={() => setShowVoiceModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Voice Management</h2>
              <button className="close-modal" onClick={() => setShowVoiceModal(false)}>×</button>
            </div>
            <div className="voice-list">
              {savedVoices.map((voice) => (
                <div key={voice.firebaseId} className="voice-item">
                  <div className="voice-info">
                    <span className="voice-name">{voice.name}</span>
                    <span className="voice-id">ID: {voice.id}</span>
                    <span className="voice-language">Language: {voice.language}</span>
                  </div>
                  <div className="voice-actions">
                    <button 
                      className="delete-voice"
                      onClick={() => handleDeleteVoice(voice.id, voice.firebaseId)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="add-voice-form">
              <h3>Add New Voice</h3>
              <input
                type="text"
                placeholder="Voice ID"
                value={newVoice.id}
                onChange={(e) => setNewVoice({...newVoice, id: e.target.value})}
              />
              <input
                type="text"
                placeholder="Voice Name"
                value={newVoice.name}
                onChange={(e) => setNewVoice({...newVoice, name: e.target.value})}
              />
              <select
                value={newVoice.language}
                onChange={(e) => setNewVoice({...newVoice, language: e.target.value})}
              >
                <option value="ko">Korean</option>
                <option value="en">English</option>
              </select>
              <textarea
                placeholder="Voice Settings JSON (optional)"
                value={voiceJsonInput}
                onChange={(e) => setVoiceJsonInput(e.target.value)}
              />
              <button onClick={handleSaveVoice}>Add Voice</button>
            </div>
          </div>
        </div>
      )}

      <button 
        className="back-button"
        onClick={() => navigate('/admin/contents')}
      >
        Back to Contents Management
      </button>
    </div>
  );
};

export default MakeContents; 