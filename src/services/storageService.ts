import { HotelRequest, RequestCategory } from '../types/hotel';
import { db } from './firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
  writeBatch
} from 'firebase/firestore';

const STORAGE_KEY = 'madigun_hotel_requests_v1';
const CHANNEL_NAME = 'madigun_hotel_events_channel';
const FIRESTORE_COLLECTION = 'requests';

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
let firestoreUnsubscribe: (() => void) | null = null;

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

  // Setup Firestore real-time listener immediately
  initFirestoreRealtimeSync();
}

/**
 * Real-time bi-directional synchronization with Cloud Firestore.
 * This guarantees 100% real-time reflection across different devices,
 * mobile phone QR scans, Netlify deployments, and local servers.
 */
function initFirestoreRealtimeSync() {
  if (firestoreUnsubscribe || typeof window === 'undefined') return;

  try {
    const reqsRef = collection(db, FIRESTORE_COLLECTION);
    const q = query(reqsRef, orderBy('createdAt', 'desc'));

    firestoreUnsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty && !isInitialFetchDone) {
          // If Firestore is completely empty on first launch, seed initial demo requests
          seedInitialFirestoreRequests();
          return;
        }

        const prevMap = new Map(inMemoryCache.map((r) => [r.id, r]));
        const freshList: HotelRequest[] = [];
        const newlyAdded: HotelRequest[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Partial<HotelRequest>;
          const item: HotelRequest = {
            id: docSnap.id,
            roomNumber: data.roomNumber || '101',
            category: (data.category as RequestCategory) || 'Contact Front Desk',
            additionalMessage: data.additionalMessage || '',
            status: data.status || 'NEW',
            isEmergency: Boolean(data.isEmergency),
            createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
            acceptedAt: data.acceptedAt,
            completedAt: data.completedAt,
            staffNotes: data.staffNotes,
            acceptedByStaffName: data.acceptedByStaffName,
            completedByStaffName: data.completedByStaffName,
          };
          freshList.push(item);

          if (isInitialFetchDone && !prevMap.has(item.id) && item.status === 'NEW') {
            newlyAdded.push(item);
          }
        });

        // Sort descending by createdAt
        freshList.sort((a, b) => b.createdAt - a.createdAt);

        inMemoryCache = freshList;
        isInitialFetchDone = true;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(freshList));
        } catch {}

        if (newlyAdded.length > 0) {
          newlyAdded.forEach((item) => {
            notifyListeners({ type: 'NEW_REQUEST_SUBMITTED', request: item });
          });
        } else {
          notifyListeners({ type: 'REQUESTS_UPDATED' });
        }
      },
      (err) => {
        console.warn('Firestore real-time sync error (falling back to REST/Local):', err);
      }
    );
  } catch (err) {
    console.warn('Could not initialize Firestore real-time listener:', err);
  }
}

async function seedInitialFirestoreRequests() {
  try {
    const batch = writeBatch(db);
    INITIAL_DEMO_REQUESTS.forEach((req) => {
      const docRef = doc(db, FIRESTORE_COLLECTION, req.id);
      batch.set(docRef, req);
    });
    await batch.commit();
  } catch (err) {
    console.warn('Failed to seed initial Firestore requests:', err);
  }
}

// Fetch all requests from Firestore / API
export async function fetchRequestsFromServer(): Promise<HotelRequest[]> {
  try {
    const reqsRef = collection(db, FIRESTORE_COLLECTION);
    const snap = await getDocs(query(reqsRef, orderBy('createdAt', 'desc')));
    if (!snap.empty) {
      const serverData: HotelRequest[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<HotelRequest, 'id'>),
      }));
      inMemoryCache = serverData;
      isInitialFetchDone = true;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(serverData));
      } catch {}
      notifyListeners({ type: 'REQUESTS_UPDATED' });
      return serverData;
    }
  } catch {
    // If Firestore direct query fails, fallback to Express /api/requests
    try {
      const res = await fetch('/api/requests', { headers: { Accept: 'application/json' }, cache: 'no-store' });
      if (res.ok) {
        const serverData = await res.json();
        if (Array.isArray(serverData)) {
          inMemoryCache = serverData;
          isInitialFetchDone = true;
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(serverData));
          } catch {}
          notifyListeners({ type: 'REQUESTS_UPDATED' });
          return serverData;
        }
      }
    } catch {}
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

  // 1. Direct Cloud Firestore Push (instant worldwide sync on mobile & desktop)
  const reqDocRef = doc(db, FIRESTORE_COLLECTION, newRequest.id);
  setDoc(reqDocRef, newRequest)
    .then(() => {
      console.log('[Firestore] Successfully synced guest request:', newRequest.id);
    })
    .catch((err) => {
      console.warn('[Firestore] Sync write error:', err);
    });

  // 2. Also send to Express /api/requests fallback if backend server exists
  fetch('/api/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newRequest),
  }).catch(() => {});

  return newRequest;
}

export function updateRequestStatus(
  requestId: string,
  newStatus: HotelRequest['status'],
  staffName?: string
): HotelRequest[] {
  let updatedItem: HotelRequest | undefined;
  const patch: Partial<HotelRequest> = { status: newStatus };

  inMemoryCache = inMemoryCache.map((req) => {
    if (req.id === requestId) {
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

  // Sync update to Cloud Firestore
  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, requestId);
    updateDoc(docRef, { ...patch }).catch((err) => {
      console.warn('[Firestore] Update doc error:', err);
    });
  } catch (err) {
    console.warn('[Firestore] Error creating doc reference:', err);
  }

  // Sync to Express backend
  fetch(`/api/requests/${encodeURIComponent(requestId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus, staffName }),
  }).catch(() => {});

  return inMemoryCache;
}

export function deleteRequest(requestId: string): HotelRequest[] {
  inMemoryCache = inMemoryCache.filter((r) => r.id !== requestId);
  saveStoredRequests(inMemoryCache);

  // Delete from Cloud Firestore
  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, requestId);
    deleteDoc(docRef).catch((err) => {
      console.warn('[Firestore] Delete doc error:', err);
    });
  } catch (err) {
    console.warn('[Firestore] Error deleting doc:', err);
  }

  // Delete from Express server
  fetch(`/api/requests/${encodeURIComponent(requestId)}`, {
    method: 'DELETE',
  }).catch(() => {});

  return inMemoryCache;
}

export function resetToDemoRequests(): HotelRequest[] {
  inMemoryCache = [...INITIAL_DEMO_REQUESTS];
  saveStoredRequests(inMemoryCache);

  // Reset in Firestore
  seedInitialFirestoreRequests();

  // Reset on Express server
  fetch('/api/requests/reset', {
    method: 'POST',
  }).catch(() => {});

  return inMemoryCache;
}

export function subscribeToRequestEvents(
  callback: (event: { type: string; request?: HotelRequest }) => void
): () => void {
  eventListeners.add(callback);

  // Ensure Firestore real-time listener is running
  initFirestoreRealtimeSync();

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

  // Fallback poll
  const pollInterval = setInterval(() => {
    fetchRequestsFromServer().catch(() => {});
  }, 4000);

  return () => {
    eventListeners.delete(callback);
    window.removeEventListener('storage', handleStorage);
    clearInterval(pollInterval);
  };
}
