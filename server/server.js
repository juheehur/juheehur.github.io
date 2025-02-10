require('dotenv').config();
const express = require('express');
const cors = require('cors');
const https = require('https');
const axios = require('axios').default;
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// WebSocket connections store
const clients = new Map();

// WebSocket connection handling
wss.on('connection', (ws) => {
  const id = Math.random().toString(36).substring(7);
  clients.set(id, ws);

  console.log(`Client ${id} connected`);

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'tts_request') {
        const result = await handleTTSRequest(data.payload, ws);
        ws.send(JSON.stringify({
          type: 'tts_response',
          payload: result
        }));
      }
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        payload: {
          message: error.message,
          code: error.response?.status || 500
        }
      }));
    }
  });

  ws.on('close', () => {
    clients.delete(id);
    console.log(`Client ${id} disconnected`);
  });

  // Send initial connection status
  ws.send(JSON.stringify({
    type: 'connection_status',
    payload: { status: 'connected' }
  }));
});

// Supertone API configuration
const supertoneAPI = axios.create({
  baseURL: 'https://supertoneapi.com',
  timeout: 60000,
  httpsAgent: new https.Agent({ 
    keepAlive: true,
    rejectUnauthorized: true,
    timeout: 60000
  })
});

// Handle TTS requests
async function handleTTSRequest(data, ws) {
  const { voiceId, text, language, settings } = data;
  const apiKey = process.env.REACT_APP_SUPERTONE_API_KEY;

  if (!apiKey) {
    throw new Error('API Key is missing');
  }

  // Send progress update
  ws.send(JSON.stringify({
    type: 'progress',
    payload: { status: 'starting', message: 'Initializing request...' }
  }));

  try {
    const response = await supertoneAPI.post(`/v1/text-to-speech/${voiceId}`, {
      language,
      text,
      model: 'turbo',
      voice_settings: settings
    }, {
      headers: {
        'x-sup-api-key': apiKey,
        'Accept': 'audio/*, application/json'
      },
      responseType: 'arraybuffer',
      onDownloadProgress: (progressEvent) => {
        ws.send(JSON.stringify({
          type: 'progress',
          payload: {
            status: 'downloading',
            progress: progressEvent.loaded / progressEvent.total
          }
        }));
      }
    });

    // Handle response
    const contentType = response.headers['content-type'];
    if (!contentType?.includes('audio/')) {
      const errorData = JSON.parse(response.data.toString());
      throw new Error(errorData.message || 'Invalid response type');
    }

    // Convert arraybuffer to base64
    const audioBase64 = Buffer.from(response.data).toString('base64');
    return {
      audio: audioBase64,
      contentType,
      success: true
    };

  } catch (error) {
    console.error('TTS Error:', error);
    throw new Error(error.response?.data?.message || error.message);
  }
}

// CORS and other middleware setup
app.use(cors({
  origin: ['http://localhost:3002', 'http://localhost:3001'],
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  const status = {
    server: 'ok',
    websocket: wss.clients.size,
    timestamp: new Date().toISOString()
  };
  res.status(200).json(status);
});

// Start server with automatic port selection
const startServer = (port = 3001) => {
  try {
    server.listen(port, () => {
      console.log(`Server running on port ${port}`);
      console.log(`WebSocket server running on ws://localhost:${port}`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.log(`Port ${port} is in use, trying ${port + 1}`);
        startServer(port + 1);
      }
    });

  } catch (error) {
    console.error('Server startup error:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  
  // Close all WebSocket connections
  wss.clients.forEach((client) => {
    client.close();
  });
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
}); 