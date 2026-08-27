import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

interface HotelRequest {
  id: string;
  roomNumber: string;
  category: string;
  additionalMessage?: string;
  status: 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  isEmergency: boolean;
  createdAt: number;
  acceptedAt?: number;
  completedAt?: number;
  acceptedByStaffName?: string;
  completedByStaffName?: string;
}

const INITIAL_REQUESTS: HotelRequest[] = [
  {
    id: 'req-init-101',
    roomNumber: '101',
    category: 'Extra Pillow / Blanket',
    additionalMessage: 'Please send two pillows.',
    status: 'NEW',
    isEmergency: false,
    createdAt: Date.now() - 1000 * 60 * 4,
  },
  {
    id: 'req-init-205',
    roomNumber: '205',
    category: 'Housekeeping',
    additionalMessage: 'Please clean the room.',
    status: 'NEW',
    isEmergency: false,
    createdAt: Date.now() - 1000 * 60 * 1,
  },
  {
    id: 'req-init-308',
    roomNumber: '308',
    category: 'Water',
    additionalMessage: '2 bottles of chilled still water, please.',
    status: 'IN_PROGRESS',
    isEmergency: false,
    createdAt: Date.now() - 1000 * 60 * 15,
    acceptedAt: Date.now() - 1000 * 60 * 8,
  },
  {
    id: 'req-init-104',
    roomNumber: '104',
    category: 'Toiletries',
    additionalMessage: 'Fresh bath towels and dental kit',
    status: 'COMPLETED',
    isEmergency: false,
    createdAt: Date.now() - 1000 * 60 * 45,
    acceptedAt: Date.now() - 1000 * 60 * 35,
    completedAt: Date.now() - 1000 * 60 * 20,
  },
];

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'requests.json');

function loadRequestsFromFile(): HotelRequest[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('[Storage] Error loading requests from file:', err);
  }
  return [...INITIAL_REQUESTS];
}

function saveRequestsToFile(requests: HotelRequest[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(requests, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Storage] Error saving requests to file:', err);
  }
}

let inMemoryRequests: HotelRequest[] = loadRequestsFromFile();
const sseClients: express.Response[] = [];

function broadcastSSE(event: { type: string; request?: HotelRequest; timestamp: number }) {
  const dataString = `data: ${JSON.stringify(event)}\n\n`;
  for (let i = sseClients.length - 1; i >= 0; i--) {
    const client = sseClients[i];
    try {
      client.write(dataString);
    } catch {
      sseClients.splice(i, 1);
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body Parser & CORS
  app.use(express.json());
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', count: inMemoryRequests.length, time: new Date().toISOString() });
  });

  // Get all requests
  app.get('/api/requests', (req, res) => {
    res.json(inMemoryRequests);
  });

  // Create new request
  app.post('/api/requests', (req, res) => {
    const { roomNumber, category, additionalMessage, isEmergency, id, createdAt } = req.body;
    
    if (!roomNumber || !category) {
      res.status(400).json({ error: 'roomNumber and category are required' });
      return;
    }

    const reqId = (id && typeof id === 'string' && id.trim())
      ? id.trim()
      : `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const newRequest: HotelRequest = {
      id: reqId,
      roomNumber: String(roomNumber).trim(),
      category: String(category).trim(),
      additionalMessage: additionalMessage ? String(additionalMessage).trim() : '',
      status: 'NEW',
      isEmergency: Boolean(isEmergency) || category === 'Emergency Assistance',
      createdAt: typeof createdAt === 'number' ? createdAt : Date.now(),
    };

    // Prevent duplicate ID insertion
    const existingIndex = inMemoryRequests.findIndex((r) => r.id === reqId);
    if (existingIndex >= 0) {
      inMemoryRequests[existingIndex] = { ...inMemoryRequests[existingIndex], ...newRequest };
    } else {
      inMemoryRequests = [newRequest, ...inMemoryRequests];
    }
    saveRequestsToFile(inMemoryRequests);

    broadcastSSE({
      type: 'NEW_REQUEST_SUBMITTED',
      request: newRequest,
      timestamp: Date.now(),
    });

    console.log(`[New Request] Room ${newRequest.roomNumber} - ${newRequest.category} (ID: ${newRequest.id})`);
    res.status(201).json(newRequest);
  });

  // Sync / bulk update requests from client
  app.post('/api/requests/sync', (req, res) => {
    const { requests } = req.body;
    if (Array.isArray(requests)) {
      // Merge requests
      const mergedMap = new Map<string, HotelRequest>();
      // First put incoming
      requests.forEach((r) => {
        if (r && r.id) mergedMap.set(r.id, r);
      });
      // Merge with existing
      inMemoryRequests.forEach((r) => {
        if (!mergedMap.has(r.id)) {
          mergedMap.set(r.id, r);
        }
      });
      inMemoryRequests = Array.from(mergedMap.values()).sort((a, b) => b.createdAt - a.createdAt);
      saveRequestsToFile(inMemoryRequests);
      broadcastSSE({
        type: 'REQUESTS_UPDATED',
        timestamp: Date.now(),
      });
    }
    res.json(inMemoryRequests);
  });

  // Update request status
  app.patch('/api/requests/:id', (req, res) => {
    const { id } = req.params;
    const { status, staffName } = req.body;

    const index = inMemoryRequests.findIndex((r) => r.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    const reqItem = inMemoryRequests[index];
    const patch: Partial<HotelRequest> = {};

    if (status) {
      patch.status = status;
      if (status === 'IN_PROGRESS' && !reqItem.acceptedAt) {
        patch.acceptedAt = Date.now();
        if (staffName) patch.acceptedByStaffName = staffName;
      }
      if (status === 'COMPLETED') {
        patch.completedAt = Date.now();
        if (staffName) patch.completedByStaffName = staffName;
      }
    }

    const updated = { ...reqItem, ...patch };
    inMemoryRequests[index] = updated;
    saveRequestsToFile(inMemoryRequests);

    broadcastSSE({
      type: 'REQUEST_UPDATED',
      request: updated,
      timestamp: Date.now(),
    });

    res.json(updated);
  });

  // Delete request
  app.delete('/api/requests/:id', (req, res) => {
    const { id } = req.params;
    const initialLen = inMemoryRequests.length;
    inMemoryRequests = inMemoryRequests.filter((r) => r.id !== id);
    saveRequestsToFile(inMemoryRequests);

    broadcastSSE({
      type: 'REQUEST_DELETED',
      timestamp: Date.now(),
    });

    res.json({ success: true, count: inMemoryRequests.length, deleted: initialLen > inMemoryRequests.length });
  });

  // Reset to sample initial demo requests
  app.post('/api/requests/reset', (req, res) => {
    inMemoryRequests = [...INITIAL_REQUESTS];
    saveRequestsToFile(inMemoryRequests);

    broadcastSSE({
      type: 'REQUESTS_RESET',
      timestamp: Date.now(),
    });

    res.json(inMemoryRequests);
  });

  // Real-time Server-Sent Events (SSE) stream for instant front desk updates
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Initial connection ping
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', count: inMemoryRequests.length })}\n\n`);

    sseClients.push(res);

    req.on('close', () => {
      const idx = sseClients.indexOf(res);
      if (idx !== -1) {
        sseClients.splice(idx, 1);
      }
    });
  });

  // Vite middleware in development or static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Madigun Hotel Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
