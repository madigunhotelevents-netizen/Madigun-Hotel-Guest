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

interface UserProfile {
  id: string;
  username: string;
  password?: string;
  name: string;
  email: string;
  role: 'developer' | 'staff';
  roleTitle: string;
  department: string;
  phone: string;
  shift: string;
  bio: string;
  avatarColor: string;
  isPrimaryDeveloper?: boolean;
  dutyStatus: 'ON_DUTY' | 'ON_BREAK' | 'OFF_DUTY';
  createdAt: number;
  lastLoginAt?: number;
}

interface RoomStay {
  roomNumber: string;
  status: 'OCCUPIED' | 'CHECKED_OUT';
  accessCode?: string;
  guestName?: string;
  floor: number;
  roomType: string;
  bedType: string;
  checkInAt?: number;
  checkOutAt?: number;
  notes?: string;
  lastUpdated: number;
}

const INITIAL_ROOM_STAYS: RoomStay[] = [
  // Floor 1
  { roomNumber: '101', status: 'CHECKED_OUT', floor: 1, roomType: 'Deluxe King Room', bedType: '1 King Bed', lastUpdated: Date.now() },
  { roomNumber: '102', status: 'CHECKED_OUT', floor: 1, roomType: 'Deluxe Double Queen', bedType: '2 Queen Beds', lastUpdated: Date.now() },
  { roomNumber: '103', status: 'CHECKED_OUT', floor: 1, roomType: 'Deluxe King Room', bedType: '1 King Bed', lastUpdated: Date.now() },
  { roomNumber: '104', status: 'CHECKED_OUT', floor: 1, roomType: 'Superior Twin Room', bedType: '2 Twin Beds', lastUpdated: Date.now() },
  { roomNumber: '105', status: 'CHECKED_OUT', floor: 1, roomType: 'Deluxe King Room', bedType: '1 King Bed', lastUpdated: Date.now() },
  { roomNumber: '106', status: 'CHECKED_OUT', floor: 1, roomType: 'Deluxe Double Queen', bedType: '2 Queen Beds', lastUpdated: Date.now() },
  { roomNumber: '107', status: 'CHECKED_OUT', floor: 1, roomType: 'Deluxe King Room', bedType: '1 King Bed', lastUpdated: Date.now() },
  { roomNumber: '108', status: 'CHECKED_OUT', floor: 1, roomType: 'Superior King Room', bedType: '1 King Bed', lastUpdated: Date.now() },
  { roomNumber: '109', status: 'CHECKED_OUT', floor: 1, roomType: 'Deluxe Double Queen', bedType: '2 Queen Beds', lastUpdated: Date.now() },
  { roomNumber: '110', status: 'CHECKED_OUT', floor: 1, roomType: 'Executive Suite', bedType: '1 King + Sofa Bed', lastUpdated: Date.now() },

  // Floor 2
  { roomNumber: '201', status: 'CHECKED_OUT', floor: 2, roomType: 'Deluxe King Room', bedType: '1 King Bed', lastUpdated: Date.now() },
  { roomNumber: '202', status: 'CHECKED_OUT', floor: 2, roomType: 'Deluxe King Room', bedType: '1 King Bed', lastUpdated: Date.now() },
  { roomNumber: '203', status: 'CHECKED_OUT', floor: 2, roomType: 'Deluxe Double Queen', bedType: '2 Queen Beds', lastUpdated: Date.now() },
  { roomNumber: '204', status: 'CHECKED_OUT', floor: 2, roomType: 'Deluxe King Room', bedType: '1 King Bed', lastUpdated: Date.now() },
  { roomNumber: '205', status: 'CHECKED_OUT', floor: 2, roomType: 'Executive King Suite', bedType: '1 King Bed', lastUpdated: Date.now() },
  { roomNumber: '206', status: 'CHECKED_OUT', floor: 2, roomType: 'Superior Twin Room', bedType: '2 Twin Beds', lastUpdated: Date.now() },
  { roomNumber: '207', status: 'CHECKED_OUT', floor: 2, roomType: 'Deluxe Double Queen', bedType: '2 Queen Beds', lastUpdated: Date.now() },
  { roomNumber: '208', status: 'CHECKED_OUT', floor: 2, roomType: 'Deluxe King Room', bedType: '1 King Bed', lastUpdated: Date.now() },
  { roomNumber: '209', status: 'CHECKED_OUT', floor: 2, roomType: 'Deluxe King Room', bedType: '1 King Bed', lastUpdated: Date.now() },
  { roomNumber: '210', status: 'CHECKED_OUT', floor: 2, roomType: 'Junior Suite', bedType: '1 King + Lounge', lastUpdated: Date.now() },

  // Floor 3
  { roomNumber: '301', status: 'CHECKED_OUT', floor: 3, roomType: 'Deluxe King Room', bedType: '1 King Bed', lastUpdated: Date.now() },
  { roomNumber: '302', status: 'CHECKED_OUT', floor: 3, roomType: 'Deluxe Double Queen', bedType: '2 Queen Beds', lastUpdated: Date.now() },
  { roomNumber: '303', status: 'CHECKED_OUT', floor: 3, roomType: 'Deluxe King Room', bedType: '1 King Bed', lastUpdated: Date.now() },
  { roomNumber: '304', status: 'CHECKED_OUT', floor: 3, roomType: 'Superior King Room', bedType: '1 King Bed', lastUpdated: Date.now() },
  { roomNumber: '305', status: 'CHECKED_OUT', floor: 3, roomType: 'Deluxe Double Queen', bedType: '2 Queen Beds', lastUpdated: Date.now() },
  { roomNumber: '306', status: 'CHECKED_OUT', floor: 3, roomType: 'Deluxe King Room', bedType: '1 King Bed', lastUpdated: Date.now() },
  { roomNumber: '307', status: 'CHECKED_OUT', floor: 3, roomType: 'Superior Twin Room', bedType: '2 Twin Beds', lastUpdated: Date.now() },
  { roomNumber: '308', status: 'CHECKED_OUT', floor: 3, roomType: 'Executive Suite', bedType: '1 King + Balcony', lastUpdated: Date.now() },
  { roomNumber: '309', status: 'CHECKED_OUT', floor: 3, roomType: 'Deluxe Double Queen', bedType: '2 Queen Beds', lastUpdated: Date.now() },
  { roomNumber: '310', status: 'CHECKED_OUT', floor: 3, roomType: 'Penthouse Junior', bedType: '1 King Bed', lastUpdated: Date.now() },

  // Floor 4 & Suites
  { roomNumber: '401', status: 'CHECKED_OUT', floor: 4, roomType: 'Presidential Royal Suite', bedType: 'Master Suite + Living', lastUpdated: Date.now() },
  { roomNumber: '402', status: 'CHECKED_OUT', floor: 4, roomType: 'Madigun Signature Suite', bedType: '2 King Bedrooms', lastUpdated: Date.now() },
  { roomNumber: '403', status: 'CHECKED_OUT', floor: 4, roomType: 'Skyline Terrace Suite', bedType: '1 King + Private Deck', lastUpdated: Date.now() },
  { roomNumber: '404', status: 'CHECKED_OUT', floor: 4, roomType: 'Grand Ambassador Suite', bedType: 'Master Suite', lastUpdated: Date.now() },
];

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

const INITIAL_ACCOUNTS: UserProfile[] = [
  {
    id: 'user-dev-admin',
    username: 'developer',
    password: 'password123',
    name: 'Alex Rivera (Lead Developer)',
    email: 'developer@madigunhotel.com',
    role: 'developer',
    roleTitle: 'Lead Developer & Primary Admin',
    department: 'IT & System Administration',
    phone: '+1 (555) 019-8234',
    shift: 'All Access / 24/7 DevOps',
    bio: 'Primary developer account with full authority to provision employee accounts, modify all profiles, inspect real-time logs, and manage system operations.',
    avatarColor: '#C5A880',
    isPrimaryDeveloper: true,
    dutyStatus: 'ON_DUTY',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
    lastLoginAt: Date.now(),
  },
  {
    id: 'user-staff-sarah',
    username: 'sarah.frontdesk',
    password: 'password123',
    name: 'Sarah Jenkins',
    email: 'sarah.j@madigunhotel.com',
    role: 'staff',
    roleTitle: 'Front Desk Supervisor',
    department: 'Front Desk',
    phone: '+1 (555) 012-4411',
    shift: 'Day Shift (07:00 - 15:30)',
    bio: 'Senior guest relations concierge specializing in fast room assistance, check-in hospitality, and VIP guest accommodations.',
    avatarColor: '#3B82F6',
    isPrimaryDeveloper: false,
    dutyStatus: 'ON_DUTY',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
    lastLoginAt: Date.now() - 1000 * 60 * 30,
  },
  {
    id: 'user-staff-elena',
    username: 'elena.housekeeping',
    password: 'password123',
    name: 'Elena Rostova',
    email: 'elena.r@madigunhotel.com',
    role: 'staff',
    roleTitle: 'Housekeeping Supervisor',
    department: 'Housekeeping',
    phone: '+1 (555) 014-9922',
    shift: 'Morning Shift (08:00 - 16:30)',
    bio: 'Supervising in-room linens, complimentary supplies, hygiene protocols, and rapid turnover cleaning services.',
    avatarColor: '#10B981',
    isPrimaryDeveloper: false,
    dutyStatus: 'ON_DUTY',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 10,
    lastLoginAt: Date.now() - 1000 * 60 * 120,
  },
  {
    id: 'user-staff-marcus',
    username: 'marcus.maintenance',
    password: 'password123',
    name: 'Marcus Chen',
    email: 'marcus.c@madigunhotel.com',
    role: 'staff',
    roleTitle: 'Chief Maintenance Engineer',
    department: 'Maintenance & Engineering',
    phone: '+1 (555) 017-3388',
    shift: 'Evening Shift (14:00 - 22:30)',
    bio: 'Managing room air conditioning, plumbing, lighting fixtures, and technical guest room diagnostics.',
    avatarColor: '#F59E0B',
    isPrimaryDeveloper: false,
    dutyStatus: 'OFF_DUTY',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
    lastLoginAt: Date.now() - 1000 * 60 * 60 * 8,
  },
];

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'requests.json');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');
const ROOM_STAYS_FILE = path.join(DATA_DIR, 'room_stays.json');

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

function loadAccountsFromFile(): UserProfile[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(ACCOUNTS_FILE)) {
      const content = fs.readFileSync(ACCOUNTS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('[Storage] Error loading accounts from file:', err);
  }
  return [...INITIAL_ACCOUNTS];
}

function saveAccountsToFile(accounts: UserProfile[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Storage] Error saving accounts to file:', err);
  }
}

function loadRoomStaysFromFile(): RoomStay[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(ROOM_STAYS_FILE)) {
      const content = fs.readFileSync(ROOM_STAYS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure all default rooms are present in map
        const map = new Map<string, RoomStay>(parsed.map((r: RoomStay) => [r.roomNumber, r]));
        INITIAL_ROOM_STAYS.forEach((initStay) => {
          if (!map.has(initStay.roomNumber)) {
            map.set(initStay.roomNumber, initStay);
          }
        });
        return Array.from(map.values());
      }
    }
  } catch (err) {
    console.error('[Storage] Error loading room stays from file:', err);
  }
  return [...INITIAL_ROOM_STAYS];
}

function saveRoomStaysToFile(stays: RoomStay[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(ROOM_STAYS_FILE, JSON.stringify(stays, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Storage] Error saving room stays to file:', err);
  }
}

let inMemoryRequests: HotelRequest[] = loadRequestsFromFile();
let inMemoryAccounts: UserProfile[] = loadAccountsFromFile();
let inMemoryRoomStays: RoomStay[] = loadRoomStaysFromFile();
const sseClients: express.Response[] = [];

// SSE Keep-alive heartbeat every 15 seconds
setInterval(() => {
  for (let i = sseClients.length - 1; i >= 0; i--) {
    const client = sseClients[i];
    try {
      client.write(': keepalive\n\n');
    } catch {
      sseClients.splice(i, 1);
    }
  }
}, 15000);

function broadcastSSE(event: { type: string; request?: HotelRequest; account?: UserProfile; timestamp: number }) {
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
    res.json({
      status: 'ok',
      requestsCount: inMemoryRequests.length,
      accountsCount: inMemoryAccounts.length,
      sseClients: sseClients.length,
      time: new Date().toISOString(),
    });
  });

  // -------------------------------------------------------------
  // Requests Endpoints
  // -------------------------------------------------------------
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
      const mergedMap = new Map<string, HotelRequest>();
      requests.forEach((r) => {
        if (r && r.id) mergedMap.set(r.id, r);
      });
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

  // -------------------------------------------------------------
  // Accounts Endpoints (Multi-Device Sync)
  // -------------------------------------------------------------
  app.get('/api/accounts', (req, res) => {
    res.json(inMemoryAccounts);
  });

  app.post('/api/accounts', (req, res) => {
    const account = req.body;
    if (!account || !account.username || !account.name) {
      res.status(400).json({ error: 'Username and name are required' });
      return;
    }
    const cleanUsername = String(account.username).trim().toLowerCase();
    const exists = inMemoryAccounts.some((a) => a.username.toLowerCase() === cleanUsername);
    if (exists) {
      res.status(409).json({ error: `Account with username "${account.username}" already exists.` });
      return;
    }

    const newAccount: UserProfile = {
      ...account,
      id: account.id || `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      username: cleanUsername,
      name: String(account.name).trim(),
      email: account.email ? String(account.email).trim() : `${cleanUsername}@madigunhotel.com`,
      role: account.role === 'developer' ? 'developer' : 'staff',
      roleTitle: account.roleTitle || (account.role === 'developer' ? 'Developer' : 'Staff Concierge'),
      department: account.department || 'Front Desk',
      phone: account.phone || '+1 (555) 000-0000',
      shift: account.shift || 'Standard Shift',
      bio: account.bio || 'Madigun Hotel team member.',
      avatarColor: account.avatarColor || '#3B82F6',
      dutyStatus: account.dutyStatus || 'ON_DUTY',
      isPrimaryDeveloper: Boolean(account.isPrimaryDeveloper),
      createdAt: typeof account.createdAt === 'number' ? account.createdAt : Date.now(),
    };

    inMemoryAccounts = [newAccount, ...inMemoryAccounts];
    saveAccountsToFile(inMemoryAccounts);

    broadcastSSE({
      type: 'ACCOUNTS_UPDATED',
      account: newAccount,
      timestamp: Date.now(),
    });

    res.status(201).json(newAccount);
  });

  app.patch('/api/accounts/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    const idx = inMemoryAccounts.findIndex((a) => a.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }

    const target = inMemoryAccounts[idx];
    const updated: UserProfile = {
      ...target,
      ...updates,
      isPrimaryDeveloper: target.isPrimaryDeveloper, // Protect primary dev status
      role: target.isPrimaryDeveloper ? 'developer' : (updates.role ?? target.role),
    };

    inMemoryAccounts[idx] = updated;
    saveAccountsToFile(inMemoryAccounts);

    broadcastSSE({
      type: 'ACCOUNTS_UPDATED',
      account: updated,
      timestamp: Date.now(),
    });

    res.json(updated);
  });

  app.delete('/api/accounts/:id', (req, res) => {
    const { id } = req.params;
    const target = inMemoryAccounts.find((a) => a.id === id);
    if (!target) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    if (target.isPrimaryDeveloper) {
      res.status(403).json({ error: 'Primary developer account cannot be deleted.' });
      return;
    }

    inMemoryAccounts = inMemoryAccounts.filter((a) => a.id !== id);
    saveAccountsToFile(inMemoryAccounts);

    broadcastSSE({
      type: 'ACCOUNTS_UPDATED',
      timestamp: Date.now(),
    });

    res.json({ success: true });
  });

  app.post('/api/accounts/reset', (req, res) => {
    inMemoryAccounts = [...INITIAL_ACCOUNTS];
    saveAccountsToFile(inMemoryAccounts);

    broadcastSSE({
      type: 'ACCOUNTS_UPDATED',
      timestamp: Date.now(),
    });

    res.json(inMemoryAccounts);
  });

  // -------------------------------------------------------------
  // Room Stays & Occupancy Endpoints
  // -------------------------------------------------------------
  app.get('/api/room-stays', (req, res) => {
    res.json(inMemoryRoomStays);
  });

  app.get('/api/room-stays/:roomNumber', (req, res) => {
    const clean = String(req.params.roomNumber).trim();
    const stay = inMemoryRoomStays.find((s) => s.roomNumber === clean);
    if (!stay) {
      const defaultRef = INITIAL_ROOM_STAYS.find((r) => r.roomNumber === clean);
      const fallback: RoomStay = {
        roomNumber: clean,
        status: 'CHECKED_OUT',
        floor: defaultRef?.floor || 1,
        roomType: defaultRef?.roomType || 'Deluxe King Room',
        bedType: defaultRef?.bedType || '1 King Bed',
        lastUpdated: Date.now(),
      };
      res.json(fallback);
      return;
    }
    res.json(stay);
  });

  // Check In room
  app.post('/api/room-stays/checkin', (req, res) => {
    const { roomNumber, guestName, accessCode } = req.body;
    if (!roomNumber) {
      res.status(400).json({ error: 'roomNumber is required' });
      return;
    }
    const clean = String(roomNumber).trim();
    const existing = inMemoryRoomStays.find((s) => s.roomNumber === clean);
    const now = Date.now();
    const code = accessCode || `MDG-${Math.floor(1000 + Math.random() * 9000)}`;

    const updatedStay: RoomStay = {
      roomNumber: clean,
      status: 'OCCUPIED',
      accessCode: code,
      guestName: guestName || `Room ${clean} Guest`,
      floor: existing?.floor || 1,
      bedType: existing?.bedType || '1 King Bed',
      roomType: existing?.roomType || 'Deluxe King Room',
      checkInAt: now,
      checkOutAt: undefined,
      notes: existing?.notes,
      lastUpdated: now,
    };

    const idx = inMemoryRoomStays.findIndex((s) => s.roomNumber === clean);
    if (idx >= 0) {
      inMemoryRoomStays[idx] = updatedStay;
    } else {
      inMemoryRoomStays.push(updatedStay);
    }
    saveRoomStaysToFile(inMemoryRoomStays);

    broadcastSSE({
      type: 'ROOM_STAY_UPDATED',
      timestamp: now,
    });

    res.json(updatedStay);
  });

  // Check Out room (Crucial: sets status to CHECKED_OUT and invalidates accessCode)
  app.post('/api/room-stays/checkout', (req, res) => {
    const { roomNumber } = req.body;
    if (!roomNumber) {
      res.status(400).json({ error: 'roomNumber is required' });
      return;
    }
    const clean = String(roomNumber).trim();
    const existing = inMemoryRoomStays.find((s) => s.roomNumber === clean);
    const now = Date.now();

    const updatedStay: RoomStay = {
      roomNumber: clean,
      status: 'CHECKED_OUT',
      accessCode: undefined, // Expired
      guestName: existing?.guestName || `Room ${clean} Guest`,
      floor: existing?.floor || 1,
      bedType: existing?.bedType || '1 King Bed',
      roomType: existing?.roomType || 'Deluxe King Room',
      checkInAt: existing?.checkInAt,
      checkOutAt: now,
      notes: existing?.notes,
      lastUpdated: now,
    };

    const idx = inMemoryRoomStays.findIndex((s) => s.roomNumber === clean);
    if (idx >= 0) {
      inMemoryRoomStays[idx] = updatedStay;
    } else {
      inMemoryRoomStays.push(updatedStay);
    }
    saveRoomStaysToFile(inMemoryRoomStays);

    broadcastSSE({
      type: 'ROOM_STAY_UPDATED',
      timestamp: now,
    });

    res.json(updatedStay);
  });

  // Update room specs
  app.patch('/api/room-stays/:roomNumber', (req, res) => {
    const clean = String(req.params.roomNumber).trim();
    const updates = req.body;
    const existing = inMemoryRoomStays.find((s) => s.roomNumber === clean);
    const now = Date.now();

    const updatedStay: RoomStay = {
      roomNumber: clean,
      status: existing?.status || 'CHECKED_OUT',
      accessCode: existing?.accessCode,
      guestName: existing?.guestName,
      floor: typeof updates.floor === 'number' ? updates.floor : (existing?.floor || 1),
      bedType: updates.bedType !== undefined ? String(updates.bedType).trim() : (existing?.bedType || '1 King Bed'),
      roomType: updates.roomType !== undefined ? String(updates.roomType).trim() : (existing?.roomType || 'Deluxe King Room'),
      notes: updates.notes !== undefined ? String(updates.notes).trim() : existing?.notes,
      checkInAt: existing?.checkInAt,
      checkOutAt: existing?.checkOutAt,
      lastUpdated: now,
    };

    const idx = inMemoryRoomStays.findIndex((s) => s.roomNumber === clean);
    if (idx >= 0) {
      inMemoryRoomStays[idx] = updatedStay;
    } else {
      inMemoryRoomStays.push(updatedStay);
    }
    saveRoomStaysToFile(inMemoryRoomStays);

    broadcastSSE({
      type: 'ROOM_STAY_UPDATED',
      timestamp: now,
    });

    res.json(updatedStay);
  });

  // Bulk sync room stays
  app.post('/api/room-stays/sync', (req, res) => {
    const { roomStays } = req.body;
    if (Array.isArray(roomStays)) {
      const map = new Map<string, RoomStay>(inMemoryRoomStays.map((s) => [s.roomNumber, s]));
      roomStays.forEach((s: RoomStay) => {
        if (s && s.roomNumber) {
          map.set(s.roomNumber, s);
        }
      });
      inMemoryRoomStays = Array.from(map.values());
      saveRoomStaysToFile(inMemoryRoomStays);
      broadcastSSE({
        type: 'ROOM_STAYS_UPDATED',
        timestamp: Date.now(),
      });
    }
    res.json(inMemoryRoomStays);
  });

  // -------------------------------------------------------------
  // Real-time Server-Sent Events (SSE) stream for instant sync
  // -------------------------------------------------------------
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
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
