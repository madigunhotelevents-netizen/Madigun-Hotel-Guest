import { HotelRequest } from '../types/hotel';

const STORAGE_KEY = 'madigun_hotel_requests_v1';
const CHANNEL_NAME = 'madigun_hotel_events_channel';

// Default initial requests as requested in prompt example
const INITIAL_DEMO_REQUESTS: HotelRequest[] = [
  {
    id: 'req-init-101',
    roomNumber: '101',
    category: 'Extra Pillow / Blanket',
    additionalMessage: 'Please send two pillows.',
    status: 'NEW',
    isEmergency: false,
    createdAt: Date.now() - 1000 * 60 * 4, // 4 mins ago
  },
  {
    id: 'req-init-205',
    roomNumber: '205',
    category: 'Housekeeping',
    additionalMessage: 'Please clean the room.',
    status: 'NEW',
    isEmergency: false,
    createdAt: Date.now() - 1000 * 60 * 1, // 1 min ago
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

let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  }
} catch {
  // BroadcastChannel unavailable
}

export function getStoredRequests(): HotelRequest[] {
  if (typeof window === 'undefined') return INITIAL_DEMO_REQUESTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DEMO_REQUESTS));
      return INITIAL_DEMO_REQUESTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return INITIAL_DEMO_REQUESTS;
  } catch (err) {
    console.error('Error reading hotel requests from localStorage:', err);
    return INITIAL_DEMO_REQUESTS;
  }
}

export function saveStoredRequests(requests: HotelRequest[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'REQUESTS_UPDATED', timestamp: Date.now() });
    }
  } catch (err) {
    console.error('Error saving hotel requests to localStorage:', err);
  }
}

export function createNewRequest(
  roomNumber: string,
  category: HotelRequest['category'],
  additionalMessage: string = '',
  isEmergency: boolean = false
): HotelRequest {
  const newRequest: HotelRequest = {
    id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    roomNumber: roomNumber.trim() || '101',
    category,
    additionalMessage: additionalMessage.trim(),
    status: 'NEW',
    isEmergency: isEmergency || category === 'Emergency Assistance',
    createdAt: Date.now(),
  };

  const existing = getStoredRequests();
  const updated = [newRequest, ...existing];
  saveStoredRequests(updated);

  if (broadcastChannel) {
    broadcastChannel.postMessage({
      type: 'NEW_REQUEST_SUBMITTED',
      request: newRequest,
    });
  }

  return newRequest;
}

export function updateRequestStatus(
  requestId: string,
  newStatus: HotelRequest['status'],
  staffName?: string
): HotelRequest[] {
  const current = getStoredRequests();
  const updated = current.map((req) => {
    if (req.id === requestId) {
      const patch: Partial<HotelRequest> = { status: newStatus };
      if (newStatus === 'IN_PROGRESS' && !req.acceptedAt) {
        patch.acceptedAt = Date.now();
        if (staffName) patch.acceptedByStaffName = staffName;
      }
      if (newStatus === 'COMPLETED') {
        patch.completedAt = Date.now();
        if (staffName) patch.completedByStaffName = staffName;
      }
      return { ...req, ...patch };
    }
    return req;
  });

  saveStoredRequests(updated);
  return updated;
}

export function deleteRequest(requestId: string): HotelRequest[] {
  const current = getStoredRequests();
  const updated = current.filter((r) => r.id !== requestId);
  saveStoredRequests(updated);
  return updated;
}

export function resetToDemoRequests(): HotelRequest[] {
  saveStoredRequests(INITIAL_DEMO_REQUESTS);
  return INITIAL_DEMO_REQUESTS;
}

export function subscribeToRequestEvents(callback: (event: { type: string; request?: HotelRequest }) => void): () => void {
  const handleMessage = (e: MessageEvent) => {
    if (e.data && e.data.type) {
      callback(e.data);
    }
  };

  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      callback({ type: 'REQUESTS_UPDATED' });
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleMessage);
  }
  window.addEventListener('storage', handleStorage);

  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleMessage);
    }
    window.removeEventListener('storage', handleStorage);
  };
}
