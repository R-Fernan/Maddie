import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import si from 'systeminformation';
import axios from 'axios';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';

// REST Endpoint: Check Ollama Status
app.get('/api/status', async (_req, res) => {
  try {
    const response = await axios.get(`${OLLAMA_HOST}/`);
    res.json({ status: 'ONLINE', port: 11434, code: response.status });
  } catch (error) {
    res.json({ status: 'OFFLINE', port: 11434, error: 'Engine unreachable' });
  }
});

// REST Endpoint: Proxy Chat to Ollama Stream
app.post('/api/chat', async (req, res) => {
  try {
    const response = await axios.post(`${OLLAMA_HOST}/api/chat`, req.body, {
      responseType: 'stream',
    });
    res.setHeader('Content-Type', 'text/event-stream');
    response.data.pipe(res);
  } catch (error) {
    res.status(500).json({ error: 'Failed to communicate with Ollama backend' });
  }
});

// WebSocket: Live System Telemetry Stream (Pushes CPU/RAM every 2 seconds)
io.on('connection', (socket) => {
  console.log('⚡ HUD Terminal Connected:', socket.id);

  const telemetryInterval = setInterval(async () => {
    try {
      const cpu = await si.currentLoad();
      const mem = await si.mem();

      socket.emit('telemetry', {
        cpuUsage: Math.round(cpu.currentLoad),
        ramUsage: Math.round((mem.active / mem.total) * 100),
        ramUsedGB: (mem.active / 1024 / 1024 / 1024).toFixed(1),
        ramTotalGB: (mem.total / 1024 / 1024 / 1024).toFixed(1),
      });
    } catch (err) {
      console.error('Telemetry Fetch Error:', err);
    }
  }, 2000);

  socket.on('disconnect', () => {
    console.log('❌ HUD Terminal Disconnected:', socket.id);
    clearInterval(telemetryInterval);
  });
});

const PORT = 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[M.A.D.D.I.E. API] Running on ${PORT}`);
});