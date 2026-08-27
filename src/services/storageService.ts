import { HotelRequest, RequestCategory, RoomStay, RoomStayStatus, StaffMember, DutyStatus } from '../types/hotel';
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
const ROOM_STAYS_STORAGE_KEY = 'madigun_hotel_room_stays_v1';
const STAFF_STORAGE_KEY = 'madigun_hotel_staff_members_v1';
const CHANNEL_NAME = 'madigun_hotel_events_channel';
const FIRESTORE_COLLECTION = 'requests';
const FIRESTORE_ROOM_STAYS = 'room_stays';
const FIRESTORE_STAFF_COLLECTION = 'staff_members';

/**
 * Generate a distinct, secure, and user-friendly guest room passcode.
 * Example: "MDG-4921"
 */
export function generateRoomAccessCode(roomNumber?: string): string {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `MDG-${rand}`;
}

// Default initial requests
const INITIAL_DEMO_REQUESTS: HotelRequest[] = [
  {
    id: 'req-init-101',
    roomNumber: '101',
    category: 'Extra Pillow / Blanket',
    additionalMessage: 'Please send two pillows.',
    status: 'NEW',
    isEmergency: false,
    createdAt: Date.now() - 1000 * 60 * 12,
  },
  {
    id: 'req-init-205',
    roomNumber: '205',
    category: 'Housekeeping',
    additionalMessage: 'Please clean the room.',
    status: 'NEW',
    isEmergency: false,
    createdAt: Date.now() - 1000 * 60 * 8,
  },
  {
    id: 'req-init-308',
    roomNumber: '308',
    category: 'Water',
    additionalMessage: '2 bottles of chilled still water, please.',
    status: 'IN_PROGRESS',
    isEmergency: false,
    createdAt: Date.now() - 1000 * 60 * 20,
    acceptedAt: Date.now() - 1000 * 60 * 15,
    acceptedByStaffName: 'Sarah Jenkins',
    assignedStaffName: 'Sarah Jenkins',
    assignedStaffRole: 'Front Desk Supervisor',
    assignedStaffDepartment: 'Front Desk',
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
    acceptedByStaffName: 'Elena Rostova',
    assignedStaffName: 'Elena Rostova',
    completedByStaffName: 'Elena Rostova',
  },
];

// Initial default room stays with pre-generated guest access passcodes
const INITIAL_ROOM_STAYS: RoomStay[] = [
  { roomNumber: '101', status: 'OCCUPIED', accessCode: 'MDG-1014', guestName: 'In-Room Guest', checkInAt: Date.now() - 1000 * 60 * 60 * 14, lastUpdated: Date.now() },
  { roomNumber: '102', status: 'OCCUPIED', accessCode: 'MDG-1028', guestName: 'In-Room Guest', checkInAt: Date.now() - 1000 * 60 * 60 * 20, lastUpdated: Date.now() },
  { roomNumber: '103', status: 'OCCUPIED', accessCode: 'MDG-1035', guestName: 'In-Room Guest', checkInAt: Date.now() - 1000 * 60 * 60 * 8, lastUpdated: Date.now() },
  { roomNumber: '104', status: 'OCCUPIED', accessCode: 'MDG-1042', guestName: 'In-Room Guest', checkInAt: Date.now() - 1000 * 60 * 60 * 30, lastUpdated: Date.now() },
  { roomNumber: '105', status: 'OCCUPIED', accessCode: 'MDG-1059', guestName: 'In-Room Guest', checkInAt: Date.now() - 1000 * 60 * 60 * 12, lastUpdated: Date.now() },
  { roomNumber: '201', status: 'OCCUPIED', accessCode: 'MDG-2016', guestName: 'In-Room Guest', checkInAt: Date.now() - 1000 * 60 * 60 * 18, lastUpdated: Date.now() },
  { roomNumber: '205', status: 'OCCUPIED', accessCode: 'MDG-2051', guestName: 'In-Room Guest', checkInAt: Date.now() - 1000 * 60 * 60 * 6, lastUpdated: Date.now() },
  { roomNumber: '308', status: 'OCCUPIED', accessCode: 'MDG-3087', guestName: 'In-Room Guest', checkInAt: Date.now() - 1000 * 60 * 60 * 24, lastUpdated: Date.now() },
];

// Initial Hotel Staff Members (Roster for staff who don't need login accounts)
export const INITIAL_STAFF_MEMBERS: StaffMember[] = [
  {
    id: 'staff-maria',
    name: 'Maria Gonzalez',
    roleTitle: 'Housekeeping Associate',
    department: 'Housekeeping',
    phone: '+1 (555) 018-2231',
    shift: 'Morning Shift (07:00 - 15:30)',
    dutyStatus: 'ON_DUTY',
    notes: 'Floor 1 & 2 assigned linen and room turn-down attendant.',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 18,
    createdByAdmin: 'Alex Rivera (Lead Developer)',
  },
  {
    id: 'staff-david',
    name: 'David Kim',
    roleTitle: 'Housekeeping Attendant',
    department: 'Housekeeping',
    phone: '+1 (555) 018-4490',
    shift: 'Day Shift (08:00 - 16:30)',
    dutyStatus: 'ON_DUTY',
    notes: 'Floor 3 and luxury suites turnover cleaning associate.',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
    createdByAdmin: 'Alex Rivera (Lead Developer)',
  },
  {
    id: 'staff-carlos',
    name: 'Carlos Ruiz',
    roleTitle: 'Maintenance Technician',
    department: 'Maintenance',
    phone: '+1 (555) 018-7712',
    shift: 'Evening Shift (14:00 - 22:30)',
    dutyStatus: 'ON_DUTY',
    notes: 'Plumbing, HVAC, electrical, and room fixture repairs.',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 10,
    createdByAdmin: 'Alex Rivera (Lead Developer)',
  },
  {
    id: 'staff-jessica',
    name: 'Jessica Taylor',
    roleTitle: 'Front Desk Concierge',
    department: 'Front Desk',
    phone: '+1 (555) 018-9901',
    shift: 'Swing Shift (11:00 - 19:30)',
    dutyStatus: 'ON_DUTY',
    notes: 'Guest check-ins, keycard issuance, luggage and taxi concierge.',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 8,
    createdByAdmin: 'Alex Rivera (Lead Developer)',
  },
  {
    id: 'staff-liam',
    name: 'Liam Vance',
    roleTitle: 'Room Runner & Porter',
    department: 'Dining & Room Service',
    phone: '+1 (555) 018-3356',
    shift: 'Evening Shift (15:00 - 23:30)',
    dutyStatus: 'ON_DUTY',
    notes: 'In-room bottled water delivery, ice buckets, amenities.',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
    createdByAdmin: 'Alex Rivera (Lead Developer)',
  },
  {
    id: 'staff-antonio',
    name: 'Antonio Silva',
    roleTitle: 'Bellman & Valet Associate',
    department: 'Front Desk',
    phone: '+1 (555) 018-6623',
    shift: 'Day Shift (07:30 - 16:00)',
    dutyStatus: 'ON_BREAK',
    notes: 'Luggage assistance, room escorts, parking.',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 4,
    createdByAdmin: 'Alex Rivera (Lead Developer)',
  },
];

let inMemoryCache: HotelRequest[] = [];
let roomStaysCache: Map<string, RoomStay> = new Map();
let staffMembersCache: StaffMember[] = [];
let isInitialFetchDone = false;
let isRoomStaysInitialFetchDone = false;
let isStaffInitialFetchDone = false;

let broadcastChannel: BroadcastChannel | null = null;
const eventListeners: Set<(event: { type: string; request?: HotelRequest; roomStay?: RoomStay; staffMember?: StaffMember }) => void> = new Set();
let firestoreUnsubscribe: (() => void) | null = null;
let roomStaysFirestoreUnsubscribe: (() => void) | null = null;
let staffFirestoreUnsubscribe: (() => void) | null = null;

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

function notifyListeners(event: { type: string; request?: HotelRequest; roomStay?: RoomStay; staffMember?: StaffMember }) {
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
  } catch {}
  if (inMemoryCache.length === 0) {
    inMemoryCache = [...INITIAL_DEMO_REQUESTS];
  }

  try {
    const rawStays = localStorage.getItem(ROOM_STAYS_STORAGE_KEY);
    if (rawStays) {
      const parsedStays = JSON.parse(rawStays);
      if (Array.isArray(parsedStays)) {
        parsedStays.forEach((s: RoomStay) => roomStaysCache.set(s.roomNumber, s));
      }
    }
  } catch {}
  if (roomStaysCache.size === 0) {
    INITIAL_ROOM_STAYS.forEach((s) => roomStaysCache.set(s.roomNumber, s));
  }

  try {
    const rawStaff = localStorage.getItem(STAFF_STORAGE_KEY);
    if (rawStaff) {
      const parsedStaff = JSON.parse(rawStaff);
      if (Array.isArray(parsedStaff) && parsedStaff.length > 0) {
        staffMembersCache = parsedStaff;
      }
    }
  } catch {}
  if (staffMembersCache.length === 0) {
    staffMembersCache = [...INITIAL_STAFF_MEMBERS];
  }

  // Setup Firestore real-time listeners immediately
  initFirestoreRealtimeSync();
  initRoomStaysFirestoreRealtimeSync();
  initStaffFirestoreRealtimeSync();
}

/**
 * Real-time bi-directional synchronization for Requests with Cloud Firestore.
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
            assignedStaffId: data.assignedStaffId,
            assignedStaffName: data.assignedStaffName,
            assignedStaffRole: data.assignedStaffRole,
            assignedStaffDepartment: data.assignedStaffDepartment,
            completedByStaffName: data.completedByStaffName,
          };
          freshList.push(item);

          if (isInitialFetchDone && !prevMap.has(item.id) && item.status === 'NEW') {
            newlyAdded.push(item);
          }
        });

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
        console.warn('Firestore real-time sync error:', err);
      }
    );
  } catch (err) {
    console.warn('Could not initialize Firestore real-time listener:', err);
  }
}

/**
 * Real-time bi-directional synchronization for Room Stays & Occupancy with Cloud Firestore.
 */
function initRoomStaysFirestoreRealtimeSync() {
  if (roomStaysFirestoreUnsubscribe || typeof window === 'undefined') return;

  try {
    const staysRef = collection(db, FIRESTORE_ROOM_STAYS);
    roomStaysFirestoreUnsubscribe = onSnapshot(
      staysRef,
      (snapshot) => {
        if (snapshot.empty && !isRoomStaysInitialFetchDone) {
          seedInitialFirestoreRoomStays();
          return;
        }

        const freshMap = new Map<string, RoomStay>();
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Partial<RoomStay>;
          const stay: RoomStay = {
            roomNumber: docSnap.id,
            status: (data.status as RoomStayStatus) || 'OCCUPIED',
            guestName: data.guestName,
            accessCode: data.accessCode,
            checkInAt: data.checkInAt,
            checkOutAt: data.checkOutAt,
            notes: data.notes,
            lastUpdated: typeof data.lastUpdated === 'number' ? data.lastUpdated : Date.now(),
          };
          freshMap.set(docSnap.id, stay);
        });

        roomStaysCache = freshMap;
        isRoomStaysInitialFetchDone = true;
        try {
          localStorage.setItem(
            ROOM_STAYS_STORAGE_KEY,
            JSON.stringify(Array.from(freshMap.values()))
          );
        } catch {}

        notifyListeners({ type: 'ROOM_STAYS_UPDATED' });
      },
      (err) => {
        console.warn('Firestore room stays real-time sync error:', err);
      }
    );
  } catch (err) {
    console.warn('Could not initialize Firestore room stays listener:', err);
  }
}

/**
 * Real-time bi-directional synchronization for Staff Members Directory with Cloud Firestore.
 */
function initStaffFirestoreRealtimeSync() {
  if (staffFirestoreUnsubscribe || typeof window === 'undefined') return;

  try {
    const staffRef = collection(db, FIRESTORE_STAFF_COLLECTION);
    staffFirestoreUnsubscribe = onSnapshot(
      staffRef,
      (snapshot) => {
        if (snapshot.empty && !isStaffInitialFetchDone) {
          seedInitialFirestoreStaffMembers();
          return;
        }

        const freshStaff: StaffMember[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Partial<StaffMember>;
          const member: StaffMember = {
            id: docSnap.id,
            name: data.name || 'Hotel Staff',
            roleTitle: data.roleTitle || 'Associate',
            department: data.department || 'General Operations',
            phone: data.phone || '',
            shift: data.shift || 'General Shift',
            dutyStatus: data.dutyStatus || 'ON_DUTY',
            notes: data.notes || '',
            createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
            createdByAdmin: data.createdByAdmin,
          };
          freshStaff.push(member);
        });

        if (freshStaff.length > 0) {
          staffMembersCache = freshStaff;
          isStaffInitialFetchDone = true;
          try {
            localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(freshStaff));
          } catch {}
          notifyListeners({ type: 'STAFF_MEMBERS_UPDATED' });
        }
      },
      (err) => {
        console.warn('Firestore staff members real-time sync error:', err);
      }
    );
  } catch (err) {
    console.warn('Could not initialize Firestore staff members listener:', err);
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

async function seedInitialFirestoreRoomStays() {
  try {
    const batch = writeBatch(db);
    INITIAL_ROOM_STAYS.forEach((stay) => {
      const docRef = doc(db, FIRESTORE_ROOM_STAYS, stay.roomNumber);
      batch.set(docRef, stay);
    });
    await batch.commit();
  } catch (err) {
    console.warn('Failed to seed initial Firestore room stays:', err);
  }
}

async function seedInitialFirestoreStaffMembers() {
  try {
    const batch = writeBatch(db);
    INITIAL_STAFF_MEMBERS.forEach((staff) => {
      const docRef = doc(db, FIRESTORE_STAFF_COLLECTION, staff.id);
      batch.set(docRef, staff);
    });
    await batch.commit();
  } catch (err) {
    console.warn('Failed to seed initial Firestore staff members:', err);
  }
}

export function getStoredRequests(): HotelRequest[] {
  return inMemoryCache;
}

export async function fetchRequestsFromServer(): Promise<HotelRequest[]> {
  try {
    const reqsRef = collection(db, FIRESTORE_COLLECTION);
    const q = query(reqsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const serverList: HotelRequest[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Partial<HotelRequest>;
        serverList.push({
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
          assignedStaffId: data.assignedStaffId,
          assignedStaffName: data.assignedStaffName,
          assignedStaffRole: data.assignedStaffRole,
          assignedStaffDepartment: data.assignedStaffDepartment,
          completedByStaffName: data.completedByStaffName,
        });
      });
      inMemoryCache = serverList;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(serverList));
      } catch {}
      notifyListeners({ type: 'REQUESTS_UPDATED' });
      return serverList;
    }
  } catch (err) {
    // Silent fail
  }
  return inMemoryCache;
}

export function saveStoredRequests(requests: HotelRequest[]): void {
  inMemoryCache = requests;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  } catch {}
}

export function createNewRequest(
  roomNumber: string,
  category: RequestCategory,
  additionalMessage: string = '',
  isEmergency: boolean = false
): HotelRequest {
  const newReq: HotelRequest = {
    id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    roomNumber: roomNumber.trim() || '101',
    category,
    additionalMessage: additionalMessage.trim(),
    status: 'NEW',
    isEmergency,
    createdAt: Date.now(),
  };

  inMemoryCache = [newReq, ...inMemoryCache];
  saveStoredRequests(inMemoryCache);

  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, newReq.id);
    setDoc(docRef, newReq).catch((err) => {
      console.warn('[Firestore] Create doc error:', err);
    });
  } catch (err) {
    console.warn('[Firestore] Error initiating write:', err);
  }

  const payload = {
    type: 'NEW_REQUEST_SUBMITTED',
    request: newReq,
  };

  if (broadcastChannel) {
    broadcastChannel.postMessage(payload);
  }
  notifyListeners(payload);

  fetch('/api/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newReq),
  }).catch(() => {});

  return newReq;
}

export function updateRequestStatus(
  requestId: string,
  newStatus: HotelRequest['status'],
  assignedStaffOrName?: string | { staffId?: string; name: string; roleTitle?: string; department?: string; notes?: string }
): HotelRequest[] {
  let updatedReq: HotelRequest | null = null;

  inMemoryCache = inMemoryCache.map((req) => {
    if (req.id === requestId) {
      const now = Date.now();
      const updated: HotelRequest = {
        ...req,
        status: newStatus,
      };

      if (newStatus === 'IN_PROGRESS') {
        updated.acceptedAt = now;
        if (typeof assignedStaffOrName === 'object' && assignedStaffOrName !== null) {
          updated.assignedStaffId = assignedStaffOrName.staffId;
          updated.assignedStaffName = assignedStaffOrName.name;
          updated.assignedStaffRole = assignedStaffOrName.roleTitle;
          updated.assignedStaffDepartment = assignedStaffOrName.department;
          updated.acceptedByStaffName = assignedStaffOrName.name;
          if (assignedStaffOrName.notes) {
            updated.staffNotes = assignedStaffOrName.notes;
          }
        } else if (typeof assignedStaffOrName === 'string') {
          updated.acceptedByStaffName = assignedStaffOrName;
          updated.assignedStaffName = assignedStaffOrName;
        }
      } else if (newStatus === 'COMPLETED') {
        updated.completedAt = now;
        if (typeof assignedStaffOrName === 'string') {
          updated.completedByStaffName = assignedStaffOrName;
        } else if (typeof assignedStaffOrName === 'object' && assignedStaffOrName?.name) {
          updated.completedByStaffName = assignedStaffOrName.name;
        }
      } else if (newStatus === 'NEW') {
        updated.acceptedAt = undefined;
        updated.completedAt = undefined;
        updated.acceptedByStaffName = undefined;
        updated.assignedStaffId = undefined;
        updated.assignedStaffName = undefined;
        updated.assignedStaffRole = undefined;
        updated.assignedStaffDepartment = undefined;
        updated.completedByStaffName = undefined;
      }

      updatedReq = updated;
      return updated;
    }
    return req;
  });

  saveStoredRequests(inMemoryCache);

  if (updatedReq) {
    try {
      const docRef = doc(db, FIRESTORE_COLLECTION, requestId);
      updateDoc(docRef, { ...updatedReq }).catch((err) => {
        console.warn('[Firestore] Update doc error:', err);
      });
    } catch (err) {
      console.warn('[Firestore] Error initiating update:', err);
    }

    const payload = {
      type: 'REQUEST_STATUS_UPDATED',
      request: updatedReq,
    };
    if (broadcastChannel) {
      broadcastChannel.postMessage(payload);
    }
    notifyListeners(payload);

    fetch(`/api/requests/${encodeURIComponent(requestId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedReq),
    }).catch(() => {});
  }

  return inMemoryCache;
}

export function deleteRequest(requestId: string): HotelRequest[] {
  inMemoryCache = inMemoryCache.filter((r) => r.id !== requestId);
  saveStoredRequests(inMemoryCache);

  const payload = {
    type: 'REQUEST_DELETED',
    request: { id: requestId } as HotelRequest,
  };
  if (broadcastChannel) {
    broadcastChannel.postMessage(payload);
  }
  notifyListeners(payload);

  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, requestId);
    deleteDoc(docRef).catch((err) => {
      console.warn('[Firestore] Delete doc error:', err);
    });
  } catch (err) {
    console.warn('[Firestore] Error deleting doc:', err);
  }

  fetch(`/api/requests/${encodeURIComponent(requestId)}`, {
    method: 'DELETE',
  }).catch(() => {});

  return inMemoryCache;
}

export function resetToDemoRequests(): HotelRequest[] {
  inMemoryCache = [...INITIAL_DEMO_REQUESTS];
  saveStoredRequests(inMemoryCache);
  seedInitialFirestoreRequests();

  fetch('/api/requests/reset', {
    method: 'POST',
  }).catch(() => {});

  return inMemoryCache;
}

// ----------------- Room Stay / Occupancy & Dynamic Access Code Management ----------------- //

export function getRoomStay(roomNumber: string): RoomStay {
  const clean = roomNumber.trim();
  const stay = roomStaysCache.get(clean);
  if (stay) return stay;

  // Default: If room not found, generate an active occupied stay
  return {
    roomNumber: clean,
    status: 'OCCUPIED',
    accessCode: generateRoomAccessCode(clean),
    guestName: `Room ${clean} Guest`,
    checkInAt: Date.now() - 1000 * 60 * 60 * 6,
    lastUpdated: Date.now(),
  };
}

export function getAllRoomStays(): RoomStay[] {
  return Array.from(roomStaysCache.values());
}

/**
 * Check In a Room:
 * Automatically generates a unique access passcode, sets status to OCCUPIED,
 * and syncs to Firestore & broadcast channel in real-time.
 */
export function checkInRoom(
  roomNumber: string,
  guestName: string = 'In-Room Guest',
  customCode?: string
): RoomStay {
  const clean = roomNumber.trim();
  const now = Date.now();
  const generatedCode = customCode?.trim() || generateRoomAccessCode(clean);

  const newStay: RoomStay = {
    roomNumber: clean,
    status: 'OCCUPIED',
    accessCode: generatedCode,
    guestName: guestName.trim() || `Room ${clean} Guest`,
    checkInAt: now,
    checkOutAt: undefined,
    lastUpdated: now,
  };

  roomStaysCache.set(clean, newStay);

  try {
    localStorage.setItem(
      ROOM_STAYS_STORAGE_KEY,
      JSON.stringify(Array.from(roomStaysCache.values()))
    );
  } catch {}

  const eventPayload = {
    type: 'ROOM_STAY_UPDATED',
    roomStay: newStay,
  };

  if (broadcastChannel) {
    broadcastChannel.postMessage(eventPayload);
  }
  notifyListeners(eventPayload);

  // Sync to Cloud Firestore
  try {
    const docRef = doc(db, FIRESTORE_ROOM_STAYS, clean);
    setDoc(docRef, newStay).catch((err) => {
      console.warn('Firestore set room stay error:', err);
    });
  } catch {}

  return newStay;
}

/**
 * Check Out a Room:
 * Sets status to CHECKED_OUT, invalidates / clears the active accessCode,
 * and immediately locks guest access in real time.
 */
export function checkOutRoom(roomNumber: string): RoomStay {
  const clean = roomNumber.trim();
  const now = Date.now();
  const existing = roomStaysCache.get(clean);

  const updatedStay: RoomStay = {
    roomNumber: clean,
    status: 'CHECKED_OUT',
    accessCode: undefined, // Expired / Invalidated
    guestName: existing?.guestName || `Room ${clean} Guest`,
    checkInAt: existing?.checkInAt,
    checkOutAt: now,
    lastUpdated: now,
  };

  roomStaysCache.set(clean, updatedStay);

  try {
    localStorage.setItem(
      ROOM_STAYS_STORAGE_KEY,
      JSON.stringify(Array.from(roomStaysCache.values()))
    );
  } catch {}

  const eventPayload = {
    type: 'ROOM_STAY_UPDATED',
    roomStay: updatedStay,
  };

  if (broadcastChannel) {
    broadcastChannel.postMessage(eventPayload);
  }
  notifyListeners(eventPayload);

  // Sync to Cloud Firestore
  try {
    const docRef = doc(db, FIRESTORE_ROOM_STAYS, clean);
    setDoc(docRef, updatedStay).catch((err) => {
      console.warn('Firestore set room stay error:', err);
    });
  } catch {}

  return updatedStay;
}

/**
 * Regenerate an access code for an active stay
 */
export function regenerateRoomAccessCode(roomNumber: string): RoomStay {
  const clean = roomNumber.trim();
  const existing = getRoomStay(clean);
  const newCode = generateRoomAccessCode(clean);
  const now = Date.now();

  const updatedStay: RoomStay = {
    ...existing,
    accessCode: newCode,
    lastUpdated: now,
  };

  roomStaysCache.set(clean, updatedStay);

  try {
    localStorage.setItem(
      ROOM_STAYS_STORAGE_KEY,
      JSON.stringify(Array.from(roomStaysCache.values()))
    );
  } catch {}

  const eventPayload = {
    type: 'ROOM_STAY_UPDATED',
    roomStay: updatedStay,
  };

  if (broadcastChannel) {
    broadcastChannel.postMessage(eventPayload);
  }
  notifyListeners(eventPayload);

  try {
    const docRef = doc(db, FIRESTORE_ROOM_STAYS, clean);
    setDoc(docRef, updatedStay).catch((err) => {
      console.warn('Firestore set room stay error:', err);
    });
  } catch {}

  return updatedStay;
}

/**
 * Verify whether an entered or URL-provided code is valid for this room.
 */
export function verifyRoomAccessCode(roomNumber: string, inputCode: string): boolean {
  const stay = getRoomStay(roomNumber);
  if (stay.status !== 'OCCUPIED' || !stay.accessCode) {
    return false;
  }

  const cleanInput = inputCode.trim().toUpperCase().replace(/[\s-]/g, '');
  const cleanActive = stay.accessCode.trim().toUpperCase().replace(/[\s-]/g, '');

  return cleanInput === cleanActive || inputCode.trim().toUpperCase() === stay.accessCode.toUpperCase();
}

export function setRoomStayStatus(
  roomNumber: string,
  status: RoomStayStatus,
  guestName?: string
): RoomStay {
  if (status === 'OCCUPIED') {
    return checkInRoom(roomNumber, guestName);
  } else {
    return checkOutRoom(roomNumber);
  }
}

// ----------------- Hotel Staff Directory Management (Admin Only) ----------------- //

export function getAllStaffMembers(): StaffMember[] {
  return staffMembersCache;
}

export function getStaffMemberById(id: string): StaffMember | undefined {
  return staffMembersCache.find((s) => s.id === id);
}

export function addStaffMember(staffData: Omit<StaffMember, 'id' | 'createdAt'>): StaffMember {
  const newStaff: StaffMember = {
    id: `staff-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    ...staffData,
    createdAt: Date.now(),
  };

  staffMembersCache = [newStaff, ...staffMembersCache];

  try {
    localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(staffMembersCache));
  } catch {}

  const payload = {
    type: 'STAFF_MEMBERS_UPDATED',
    staffMember: newStaff,
  };

  if (broadcastChannel) {
    broadcastChannel.postMessage(payload);
  }
  notifyListeners(payload);

  try {
    const docRef = doc(db, FIRESTORE_STAFF_COLLECTION, newStaff.id);
    setDoc(docRef, newStaff).catch((err) => {
      console.warn('Firestore set staff member error:', err);
    });
  } catch {}

  return newStaff;
}

export function updateStaffMember(id: string, updates: Partial<StaffMember>): StaffMember[] {
  staffMembersCache = staffMembersCache.map((s) => {
    if (s.id === id) {
      return { ...s, ...updates };
    }
    return s;
  });

  try {
    localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(staffMembersCache));
  } catch {}

  const updatedItem = staffMembersCache.find((s) => s.id === id);
  const payload = {
    type: 'STAFF_MEMBERS_UPDATED',
    staffMember: updatedItem,
  };

  if (broadcastChannel) {
    broadcastChannel.postMessage(payload);
  }
  notifyListeners(payload);

  if (updatedItem) {
    try {
      const docRef = doc(db, FIRESTORE_STAFF_COLLECTION, id);
      setDoc(docRef, updatedItem).catch((err) => {
        console.warn('Firestore update staff member error:', err);
      });
    } catch {}
  }

  return staffMembersCache;
}

export function setStaffMemberDutyStatus(id: string, dutyStatus: DutyStatus): StaffMember[] {
  return updateStaffMember(id, { dutyStatus });
}

export function deleteStaffMember(id: string): StaffMember[] {
  staffMembersCache = staffMembersCache.filter((s) => s.id !== id);

  try {
    localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(staffMembersCache));
  } catch {}

  const payload = {
    type: 'STAFF_MEMBERS_UPDATED',
  };

  if (broadcastChannel) {
    broadcastChannel.postMessage(payload);
  }
  notifyListeners(payload);

  try {
    const docRef = doc(db, FIRESTORE_STAFF_COLLECTION, id);
    deleteDoc(docRef).catch((err) => {
      console.warn('Firestore delete staff member error:', err);
    });
  } catch {}

  return staffMembersCache;
}

export function resetToDemoStaffMembers(): StaffMember[] {
  staffMembersCache = [...INITIAL_STAFF_MEMBERS];
  try {
    localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(staffMembersCache));
  } catch {}
  seedInitialFirestoreStaffMembers();
  notifyListeners({ type: 'STAFF_MEMBERS_UPDATED' });
  return staffMembersCache;
}

export function subscribeToRequestEvents(
  callback: (event: { type: string; request?: HotelRequest; roomStay?: RoomStay; staffMember?: StaffMember }) => void
): () => void {
  eventListeners.add(callback);

  initFirestoreRealtimeSync();
  initRoomStaysFirestoreRealtimeSync();
  initStaffFirestoreRealtimeSync();

  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        inMemoryCache = JSON.parse(e.newValue);
        callback({ type: 'REQUESTS_UPDATED' });
      } catch {}
    }
    if (e.key === ROOM_STAYS_STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed)) {
          const map = new Map<string, RoomStay>();
          parsed.forEach((s: RoomStay) => map.set(s.roomNumber, s));
          roomStaysCache = map;
          callback({ type: 'ROOM_STAYS_UPDATED' });
        }
      } catch {}
    }
    if (e.key === STAFF_STORAGE_KEY && e.newValue) {
      try {
        const parsedStaff = JSON.parse(e.newValue);
        if (Array.isArray(parsedStaff)) {
          staffMembersCache = parsedStaff;
          callback({ type: 'STAFF_MEMBERS_UPDATED' });
        }
      } catch {}
    }
  };
  window.addEventListener('storage', handleStorage);

  const pollInterval = setInterval(() => {
    fetchRequestsFromServer().catch(() => {});
  }, 4000);

  return () => {
    eventListeners.delete(callback);
    window.removeEventListener('storage', handleStorage);
    clearInterval(pollInterval);
  };
}
