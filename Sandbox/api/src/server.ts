import axios from 'axios';
import cors from 'cors';
import crypto from 'crypto';
import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import si from 'systeminformation';
import { tts } from 'edge-tts';

interface TelemetryPayload {
  cpuUsage: number;
  ramUsage: number;
  ramUsedGB: string;
  ramTotalGB: string;
}

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';

export const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

export const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Fail-safe telemetry fetcher
const getTelemetryData = async (): Promise<TelemetryPayload | null> => {
  try {
    const [cpuLoad, mem] = await Promise.all([
      si.currentLoad().catch(() => ({ currentLoad: 0 })),
      si.mem().catch(() => ({ active: 0, total: 1 })),
    ]);

    return {
      cpuUsage: Math.min(100, Math.max(0, Math.round(cpuLoad.currentLoad || 0))),
      ramUsage: Math.min(100, Math.max(0, Math.round(((mem.active || 0) / (mem.total || 1)) * 100))),
      ramUsedGB: ((mem.active || 0) / (1024 ** 3)).toFixed(1),
      ramTotalGB: ((mem.total || 1) / (1024 ** 3)).toFixed(1),
    };
  } catch (err) {
    console.error('[Telemetry Error]:', err);
    return null;
  }
};

const broadcastTelemetry = async (): Promise<void> => {
  if (io.sockets.sockets.size > 0) {
    const heartbeatLength = crypto.randomInt(7, 11);
    const heartbeat = crypto.randomBytes(heartbeatLength)
      .toString('hex')
      .slice(0, heartbeatLength);
    io.emit('heartbeat', heartbeat);

    const telemetry = await getTelemetryData();
    if (telemetry) {
      io.emit('telemetry', telemetry);
    }
  }
};

// Periodic telemetry broadcast
const telemetryInterval = setInterval(broadcastTelemetry, 2000);
telemetryInterval.unref();

// Status Route
app.get('/api/status', async (_req: Request, res: Response) => {
  try {
    await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 3000 });
    res.json({ status: 'ONLINE' });
  } catch {
    res.json({ status: 'OFFLINE' });
  }
});

app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const response = await axios.post(`${OLLAMA_URL}/api/chat`, req.body, {
      responseType: 'stream',
    });

    res.setHeader('Content-Type', 'application/x-ndjson');
    response.data.pipe(res);
  } catch (error) {
    console.error('[Ollama Chat Error]:', error);
    res.status(502).json({ error: 'Failed to communicate with Ollama' });
  }
});

app.post('/api/tts', async (req: Request, res: Response) => {
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';

  if (!text) {
    res.status(400).json({ error: 'Text prompt required' });
    return;
  }

  try {
    const audio = await tts(text, { voice: 'en-US-AriaNeural' });
    res.type('audio/mpeg').send(audio);
  } catch (error) {
    console.error('[TTS Error]:', error);
    res.status(500).json({ error: 'Failed to synthesize voice stream' });
  }
});

// Socket connection confirmation
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Server binding
export const startServer = (): void => {
  const port = Number(process.env.PORT || 5000);
  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`[Server] Active and listening on http://0.0.0.0:${port}`);
  });
};