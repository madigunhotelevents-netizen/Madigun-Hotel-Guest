import { HotelRequest } from '../types/hotel';

const STORAGE_KEY = 'madigun_hotel_requests_v1';
const CHANNEL_NAME = 'madigun_hotel_events_channel';

// Default initial requests
const INITIAL_DEMO_REQUESTS: HotelRequest[] = [
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

let inMemoryCache: HotelRequest[] = [];
let isInitialFetchDone = false;
let broadcastChannel: BroadcastChannel | null = null;
const eventListeners: Set<(event: { type: string; request?: HotelRequest }) => void> = new Set();

try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
    broadcastChannel.addEventListener('message', (e) => {
      if (e.data && e.data.type) {
        notifyListeners(e.data);
      }
    });
  }
} catch {
  // BroadcastChannel not supported
}

function notifyListeners(event: { type: string; request?: HotelRequest }) {
  eventListeners.forEach((listener) => {
    try {
      listener(event);
    } catch (err) {
      console.error('Error in request event listener:', err);
    }
  });
}

// Initial cache setup from localStorage
if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryCache = parsed;
      }
    }
  } catch {
    // Ignore error
  }
  if (inMemoryCache.length === 0) {
    inMemoryCache = [...INITIAL_DEMO_REQUESTS];
  }

  // Trigger initial background fetch from server
  fetchRequestsFromServer().catch(() => {});
}

// Fetch all requests from backend API
export async function fetchRequestsFromServer(): Promise<HotelRequest[]> {
  try {
    const res = await fetch('/api/requests', {
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      const serverData = await res.json();
      if (Array.isArray(serverData)) {
        const previousLength = inMemoryCache.length;
        const previousLatest = inMemoryCache[0]?.id;
        inMemoryCache = serverData;
        isInitialFetchDone = true;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(serverData));
        } catch {}

        // If data changed, notify listeners
        if (serverData.length !== previousLength || (serverData[0] && serverData[0].id !== previousLatest)) {
          notifyListeners({ type: 'REQUESTS_UPDATED' });
        }
        return serverData;
      }
    }
  } catch (err) {
    // Server might not be reachable if client-only or offline; fall back to local
  }
  return inMemoryCache;
}

export function getStoredRequests(): HotelRequest[] {
  if (inMemoryCache.length > 0) {
    return inMemoryCache;
  }
  if (typeof window === 'undefined') return INITIAL_DEMO_REQUESTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryCache = parsed;
        return parsed;
      }
    }
  } catch {}
  inMemoryCache = [...INITIAL_DEMO_REQUESTS];
  return inMemoryCache;
}

export function saveStoredRequests(requests: HotelRequest[]): void {
  inMemoryCache = requests;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'REQUESTS_UPDATED', timestamp: Date.now() });
    }
    notifyListeners({ type: 'REQUESTS_UPDATED' });
  } catch (err) {
    console.error('Error saving hotel requests:', err);
  }
}

export function createNewRequest(
  roomNumber: string,
  category: HotelRequest['category'],
  additionalMessage: string = '',
  isEmergency: boolean = false
): HotelRequest {
  const cleanRoom = roomNumber.trim() || '101';
  const cleanCategory = category;
  const cleanMsg = additionalMessage.trim();
  const cleanEmergency = isEmergency || category === 'Emergency Assistance';

  const newRequest: HotelRequest = {
    id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    roomNumber: cleanRoom,
    category: cleanCategory,
    additionalMessage: cleanMsg,
    status: 'NEW',
    isEmergency: cleanEmergency,
    createdAt: Date.now(),
  };

  // Optimistic local update
  inMemoryCache = [newRequest, ...inMemoryCache];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inMemoryCache));
  } catch {}

  const eventPayload = {
    type: 'NEW_REQUEST_SUBMITTED',
    request: newRequest,
  };

  if (broadcastChannel) {
    broadcastChannel.postMessage(eventPayload);
  }
  notifyListeners(eventPayload);

  // Send to server API to ensure cross-device sync (Phone -> Front Desk Desktop)
  fetch('/api/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomNumber: cleanRoom,
      category: cleanCategory,
      additionalMessage: cleanMsg,
      isEmergency: cleanEmergency,
    }),
  })
    .then(async (res) => {
      if (res.ok) {
        const savedServerReq: HotelRequest = await res.json();
        // Replace temporary local ID with server ID if different
        inMemoryCache = inMemoryCache.map((r) => (r.id === newRequest.id ? savedServerReq : r));
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(inMemoryCache));
        } catch {}
        notifyListeners({ type: 'REQUESTS_UPDATED', request: savedServerReq });
      }
    })
    .catch((err) => {
      console.warn('Network error while posting request to server; retained locally:', err);
    });

  return newRequest;
}

export function updateRequestStatus(
  requestId: string,
  newStatus: HotelRequest['status'],
  staffName?: string
): HotelRequest[] {
  let updatedItem: HotelRequest | undefined;
  inMemoryCache = inMemoryCache.map((req) => {
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
      updatedItem = { ...req, ...patch };
      return updatedItem;
    }
    return req;
  });

  saveStoredRequests(inMemoryCache);

  // Sync update to server
  fetch(`/api/requests/${encodeURIComponent(requestId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus, staffName }),
  }).catch((err) => {
    console.warn('Error patching request on server:', err);
  });

  return inMemoryCache;
}

export function deleteRequest(requestId: string): HotelRequest[] {
  inMemoryCache = inMemoryCache.filter((r) => r.id !== requestId);
  saveStoredRequests(inMemoryCache);

  fetch(`/api/requests/${encodeURIComponent(requestId)}`, {
    method: 'DELETE',
  }).catch((err) => {
    console.warn('Error deleting request on server:', err);
  });

  return inMemoryCache;
}

export function resetToDemoRequests(): HotelRequest[] {
  inMemoryCache = [...INITIAL_DEMO_REQUESTS];
  saveStoredRequests(inMemoryCache);

  fetch('/api/requests/reset', {
    method: 'POST',
  }).catch((err) => {
    console.warn('Error resetting requests on server:', err);
  });

  return inMemoryCache;
}

// Global SSE connection instance
let activeEventSource: EventSource | null = null;
let sseReconnectTimer: any = null;

function setupServerEvents() {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
  if (activeEventSource) return;

  try {
    activeEventSource = new EventSource('/api/events');

    activeEventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'NEW_REQUEST_SUBMITTED' && data.request) {
          // Add if not already present
          if (!inMemoryCache.some((r) => r.id === data.request.id)) {
            inMemoryCache = [data.request, ...inMemoryCache];
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(inMemoryCache));
            } catch {}
          }
          notifyListeners({ type: 'NEW_REQUEST_SUBMITTED', request: data.request });
        } else if (data.type === 'REQUEST_UPDATED' || data.type === 'REQUEST_DELETED' || data.type === 'REQUESTS_RESET') {
          fetchRequestsFromServer().then(() => {
            notifyListeners({ type: 'REQUESTS_UPDATED' });
          });
        }
      } catch (err) {
        console.error('Error parsing SSE event data:', err);
      }
    };

    activeEventSource.onerror = () => {
      if (activeEventSource) {
        activeEventSource.close();
        activeEventSource = null;
      }
      // Retry in 4 seconds
      clearTimeout(sseReconnectTimer);
      sseReconnectTimer = setTimeout(() => {
        setupServerEvents();
      }, 4000);
    };
  } catch (err) {
    console.warn('Could not initialize SSE EventSource:', err);
  }
}

export function subscribeToRequestEvents(
  callback: (event: { type: string; request?: HotelRequest }) => void
): () => void {
  eventListeners.add(callback);

  // Start SSE stream if not started
  setupServerEvents();

  // Storage event listener for same-browser other tabs
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        inMemoryCache = JSON.parse(e.newValue);
        callback({ type: 'REQUESTS_UPDATED' });
      } catch {}
    }
  };
  window.addEventListener('storage', handleStorage);

  // Background sync poll (every 2.5 seconds) to ensure 100% guarantee across mobile / desktop
  const pollInterval = setInterval(() => {
    fetchRequestsFromServer();
  }, 2500);

  return () => {
    eventListeners.delete(callback);
    window.removeEventListener('storage', handleStorage);
    clearInterval(pollInterval);
  };
}
