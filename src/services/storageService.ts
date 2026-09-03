import { HotelRequest, RequestCategory, RoomStay, RoomStayStatus, StaffMember, DutyStatus, StayLogRecord } from '../types/hotel';
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

const CHANNEL_NAME = 'madigun_hotel_events_channel';
const FIRESTORE_COLLECTION = 'requests';
const FIRESTORE_ROOM_STAYS = 'room_stays';
const FIRESTORE_STAFF_COLLECTION = 'staff_members';
const FIRESTORE_STAY_LOGS = 'stay_logs';
const LOCAL_STORAGE_ROOM_STAYS_KEY = 'madigun_hotel_room_stays_cache_v2';
const LOCAL_STORAGE_REQUESTS_KEY = 'madigun_hotel_requests_cache_v2';
const LOCAL_STORAGE_STAY_LOGS_KEY = 'madigun_hotel_stay_logs_cache_v2';

/**
 * Remove all keys with `undefined` values from an object before passing to Firestore
 * to prevent Firestore SDK "Unsupported field value: undefined" runtime errors.
 */
export function sanitizeForFirestore<T extends Record<string, any>>(data: T): Record<string, any> {
  const result: Record<string, any> = {};
  Object.keys(data).forEach((key) => {
    const val = data[key];
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        result[key] = sanitizeForFirestore(val);
      } else {
        result[key] = val;
      }
    }
  });
  return result;
}

function loadRoomStaysFromLocalStorage(): Map<string, RoomStay> | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(LOCAL_STORAGE_ROOM_STAYS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map<string, RoomStay>();
          parsed.forEach((stay: RoomStay) => {
            if (stay && stay.roomNumber) {
              map.set(stay.roomNumber, stay);
            }
          });
          return map;
        }
      }
    }
  } catch (err) {
    console.warn('Could not load room stays from local storage:', err);
  }
  return null;
}

function saveRoomStaysToLocalStorage(staysMap: Map<string, RoomStay>) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const list = Array.from(staysMap.values());
      window.localStorage.setItem(LOCAL_STORAGE_ROOM_STAYS_KEY, JSON.stringify(list));
    }
  } catch (err) {
    console.warn('Could not save room stays to local storage:', err);
  }
}

function loadStayLogsFromLocalStorage(): StayLogRecord[] | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(LOCAL_STORAGE_STAY_LOGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('Could not load stay logs from local storage:', err);
  }
  return null;
}

function saveStayLogsToLocalStorage(logs: StayLogRecord[]) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LOCAL_STORAGE_STAY_LOGS_KEY, JSON.stringify(logs));
    }
  } catch (err) {
    console.warn('Could not save stay logs to local storage:', err);
  }
}

/**
 * Generate a distinct, secure, and user-friendly guest room passcode.
 * Example: "MDG-4921"
 */
export function generateRoomAccessCode(roomNumber?: string): string {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `MDG-${rand}`;
}

const NOW = Date.now();
const ONE_HOUR = 1000 * 60 * 60;
const ONE_DAY = ONE_HOUR * 24;

// Default initial requests with rich timestamps across today, yesterday, and past few days
const INITIAL_DEMO_REQUESTS: HotelRequest[] = [
  // Today's Requests
  {
    id: 'req-today-101',
    roomNumber: '101',
    category: 'Extra Pillow / Blanket',
    additionalMessage: 'Please deliver 2 feather-soft pillows to Room 101.',
    status: 'NEW',
    isEmergency: false,
    createdAt: NOW - 1000 * 60 * 14, // 14 mins ago
  },
  {
    id: 'req-today-205',
    roomNumber: '205',
    category: 'Housekeeping',
    additionalMessage: 'Please vacuum bedroom carpet and refresh toiletries.',
    status: 'NEW',
    isEmergency: false,
    createdAt: NOW - 1000 * 60 * 28, // 28 mins ago
  },
  {
    id: 'req-today-308',
    roomNumber: '308',
    category: 'Water',
    additionalMessage: '2 bottles of chilled sparkling water & ice bucket, please.',
    status: 'IN_PROGRESS',
    isEmergency: false,
    createdAt: NOW - 1000 * 60 * 45,
    acceptedAt: NOW - 1000 * 60 * 38,
    acceptedByStaffName: 'Sarah Jenkins',
    assignedStaffName: 'Sarah Jenkins',
    assignedStaffRole: 'Front Desk Supervisor',
    assignedStaffDepartment: 'Front Desk',
    staffNotes: 'Dispatched to room runner Liam. On the way.',
  },
  {
    id: 'req-today-401',
    roomNumber: '401',
    category: 'Emergency Assistance',
    additionalMessage: 'Keycard reader flashing red and room safe is unresponsive.',
    status: 'COMPLETED',
    isEmergency: true,
    createdAt: NOW - ONE_HOUR * 2 - 1000 * 60 * 15,
    acceptedAt: NOW - ONE_HOUR * 2 - 1000 * 60 * 10,
    completedAt: NOW - ONE_HOUR * 1 - 1000 * 60 * 45,
    acceptedByStaffName: 'Carlos Ruiz',
    assignedStaffName: 'Carlos Ruiz',
    assignedStaffRole: 'Maintenance Technician',
    assignedStaffDepartment: 'Maintenance',
    completedByStaffName: 'Carlos Ruiz',
    staffNotes: 'Replaced safe override battery and reset master lock.',
  },
  {
    id: 'req-today-104',
    roomNumber: '104',
    category: 'Toiletries',
    additionalMessage: 'Fresh bath towels (x2) and dental hygiene kit.',
    status: 'COMPLETED',
    isEmergency: false,
    createdAt: NOW - ONE_HOUR * 3 - 1000 * 60 * 10,
    acceptedAt: NOW - ONE_HOUR * 3,
    completedAt: NOW - ONE_HOUR * 2 - 1000 * 60 * 40,
    acceptedByStaffName: 'Maria Gonzalez',
    assignedStaffName: 'Maria Gonzalez',
    assignedStaffRole: 'Housekeeping Associate',
    assignedStaffDepartment: 'Housekeeping',
    completedByStaffName: 'Maria Gonzalez',
    staffNotes: 'Delivered directly to guest by hand.',
  },
  {
    id: 'req-today-201',
    roomNumber: '201',
    category: 'Room Service',
    additionalMessage: 'Breakfast tray pickup and fresh coffee set.',
    status: 'COMPLETED',
    isEmergency: false,
    createdAt: NOW - ONE_HOUR * 4 - 1000 * 60 * 30,
    acceptedAt: NOW - ONE_HOUR * 4 - 1000 * 60 * 20,
    completedAt: NOW - ONE_HOUR * 4,
    acceptedByStaffName: 'Liam Vance',
    assignedStaffName: 'Liam Vance',
    assignedStaffRole: 'Room Runner & Porter',
    assignedStaffDepartment: 'Dining & Room Service',
    completedByStaffName: 'Liam Vance',
    staffNotes: 'Tray removed and coffee station restocked.',
  },

  // Yesterday's Requests
  {
    id: 'req-yest-102',
    roomNumber: '102',
    category: 'Housekeeping',
    additionalMessage: 'Evening turn-down service and linen replacement.',
    status: 'COMPLETED',
    isEmergency: false,
    createdAt: NOW - ONE_DAY - ONE_HOUR * 3,
    acceptedAt: NOW - ONE_DAY - ONE_HOUR * 2 - 1000 * 60 * 50,
    completedAt: NOW - ONE_DAY - ONE_HOUR * 2 - 1000 * 60 * 20,
    acceptedByStaffName: 'Maria Gonzalez',
    assignedStaffName: 'Maria Gonzalez',
    assignedStaffRole: 'Housekeeping Associate',
    assignedStaffDepartment: 'Housekeeping',
    completedByStaffName: 'Maria Gonzalez',
    staffNotes: 'Completed turn-down service and placed bedtime chocolates.',
  },
  {
    id: 'req-yest-304',
    roomNumber: '304',
    category: 'Maintenance',
    additionalMessage: 'Air conditioner temperature thermostat feels warm.',
    status: 'COMPLETED',
    isEmergency: false,
    createdAt: NOW - ONE_DAY - ONE_HOUR * 6,
    acceptedAt: NOW - ONE_DAY - ONE_HOUR * 5 - 1000 * 60 * 45,
    completedAt: NOW - ONE_DAY - ONE_HOUR * 5 - 1000 * 60 * 10,
    acceptedByStaffName: 'Carlos Ruiz',
    assignedStaffName: 'Carlos Ruiz',
    assignedStaffRole: 'Maintenance Technician',
    assignedStaffDepartment: 'Maintenance',
    completedByStaffName: 'Carlos Ruiz',
    staffNotes: 'Cleaned intake filter and calibrated thermostat to 20°C.',
  },
  {
    id: 'req-yest-108',
    roomNumber: '108',
    category: 'Water',
    additionalMessage: '4 bottles of complimentary still water.',
    status: 'COMPLETED',
    isEmergency: false,
    createdAt: NOW - ONE_DAY - ONE_HOUR * 8,
    acceptedAt: NOW - ONE_DAY - ONE_HOUR * 7 - 1000 * 60 * 55,
    completedAt: NOW - ONE_DAY - ONE_HOUR * 7 - 1000 * 60 * 35,
    acceptedByStaffName: 'Liam Vance',
    assignedStaffName: 'Liam Vance',
    assignedStaffRole: 'Room Runner & Porter',
    assignedStaffDepartment: 'Dining & Room Service',
    completedByStaffName: 'Liam Vance',
    staffNotes: 'Bottles handed to guest.',
  },

  // 2-4 Days Ago Requests
  {
    id: 'req-past-301',
    roomNumber: '301',
    category: 'Contact Front Desk',
    additionalMessage: 'Requested late checkout at 1:00 PM and airport taxi arrangement.',
    status: 'COMPLETED',
    isEmergency: false,
    createdAt: NOW - ONE_DAY * 2 - ONE_HOUR * 4,
    acceptedAt: NOW - ONE_DAY * 2 - ONE_HOUR * 3 - 1000 * 60 * 50,
    completedAt: NOW - ONE_DAY * 2 - ONE_HOUR * 3 - 1000 * 60 * 30,
    acceptedByStaffName: 'Jessica Taylor',
    assignedStaffName: 'Jessica Taylor',
    assignedStaffRole: 'Front Desk Concierge',
    assignedStaffDepartment: 'Front Desk',
    completedByStaffName: 'Jessica Taylor',
    staffNotes: 'Late checkout confirmed in PMS and executive cab scheduled.',
  },
  {
    id: 'req-past-402',
    roomNumber: '402',
    category: 'Extra Pillow / Blanket',
    additionalMessage: '1 extra duvet and wool blanket for master suite.',
    status: 'COMPLETED',
    isEmergency: false,
    createdAt: NOW - ONE_DAY * 3 - ONE_HOUR * 5,
    acceptedAt: NOW - ONE_DAY * 3 - ONE_HOUR * 4 - 1000 * 60 * 45,
    completedAt: NOW - ONE_DAY * 3 - ONE_HOUR * 4 - 1000 * 60 * 15,
    acceptedByStaffName: 'David Kim',
    assignedStaffName: 'David Kim',
    assignedStaffRole: 'Housekeeping Attendant',
    assignedStaffDepartment: 'Housekeeping',
    completedByStaffName: 'David Kim',
    staffNotes: 'Luxury duvet and wool blanket placed in closet.',
  },
  {
    id: 'req-past-109',
    roomNumber: '109',
    category: 'Laundry',
    additionalMessage: 'Express laundry pickup for 2 business shirts and suit.',
    status: 'COMPLETED',
    isEmergency: false,
    createdAt: NOW - ONE_DAY * 4 - ONE_HOUR * 2,
    acceptedAt: NOW - ONE_DAY * 4 - ONE_HOUR * 1 - 1000 * 60 * 50,
    completedAt: NOW - ONE_DAY * 4 - ONE_HOUR * 1 - 1000 * 60 * 20,
    acceptedByStaffName: 'Antonio Silva',
    assignedStaffName: 'Antonio Silva',
    assignedStaffRole: 'Bellman & Valet Associate',
    assignedStaffDepartment: 'Front Desk',
    completedByStaffName: 'Antonio Silva',
    staffNotes: 'Garment bag collected and transferred to dry cleaning.',
  },
];

// Initial realistic check-in / check-out historical stay logs
export const INITIAL_STAY_LOGS: StayLogRecord[] = [
  // Currently Active Stays (Today)
  {
    id: 'stay-101-active',
    roomNumber: '101',
    guestName: 'Jonathan Myers',
    accessCode: 'MDG-4819',
    floor: 1,
    roomType: 'Deluxe King Room',
    bedType: '1 King Bed',
    checkInAt: NOW - ONE_HOUR * 6 - 1000 * 60 * 20,
    status: 'ACTIVE',
    checkedInByStaff: 'Jessica Taylor (Front Desk Concierge)',
    notes: 'Requested high floor next time, VIP loyalty member.',
    createdAt: NOW - ONE_HOUR * 6 - 1000 * 60 * 20,
  },
  {
    id: 'stay-205-active',
    roomNumber: '205',
    guestName: 'Dr. Aris Thorne',
    accessCode: 'MDG-7241',
    floor: 2,
    roomType: 'Executive King Suite',
    bedType: '1 King Bed',
    checkInAt: NOW - ONE_HOUR * 4 - 1000 * 60 * 15,
    status: 'ACTIVE',
    checkedInByStaff: 'Sarah Jenkins (Front Desk Supervisor)',
    notes: 'Conference attendee. Early arrival processed.',
    createdAt: NOW - ONE_HOUR * 4 - 1000 * 60 * 15,
  },
  {
    id: 'stay-308-active',
    roomNumber: '308',
    guestName: 'Sarah & Liam Jenkins',
    accessCode: 'MDG-3190',
    floor: 3,
    roomType: 'Executive Suite',
    bedType: '1 King + Balcony',
    checkInAt: NOW - ONE_DAY - ONE_HOUR * 2,
    status: 'ACTIVE',
    checkedInByStaff: 'Elena Rostova (Front Desk Lead)',
    notes: 'Anniversary celebration package added.',
    createdAt: NOW - ONE_DAY - ONE_HOUR * 2,
  },
  {
    id: 'stay-401-active',
    roomNumber: '401',
    guestName: 'Ambassador C. Vance',
    accessCode: 'MDG-9024',
    floor: 4,
    roomType: 'Presidential Royal Suite',
    bedType: 'Master Suite + Living',
    checkInAt: NOW - ONE_DAY * 2 - ONE_HOUR * 5,
    status: 'ACTIVE',
    checkedInByStaff: 'Alex Rivera (Lead Developer & Manager)',
    notes: 'VIP diplomatic protocol check-in.',
    createdAt: NOW - ONE_DAY * 2 - ONE_HOUR * 5,
  },

  // Completed Historical Check-Outs (Past Days)
  {
    id: 'stay-104-hist',
    roomNumber: '104',
    guestName: 'Elena Rostova',
    accessCode: 'MDG-2281',
    floor: 1,
    roomType: 'Superior Twin Room',
    bedType: '2 Twin Beds',
    checkInAt: NOW - ONE_DAY * 2 - ONE_HOUR * 8,
    checkOutAt: NOW - ONE_DAY - ONE_HOUR * 3,
    durationMs: ONE_DAY + ONE_HOUR * 5,
    status: 'CHECKED_OUT',
    checkedInByStaff: 'Jessica Taylor (Front Desk Concierge)',
    checkedOutByStaff: 'Sarah Jenkins (Front Desk Supervisor)',
    notes: 'Full bill settled. Positive feedback on housekeeping.',
    createdAt: NOW - ONE_DAY * 2 - ONE_HOUR * 8,
  },
  {
    id: 'stay-202-hist',
    roomNumber: '202',
    guestName: 'Marcus Sterling',
    accessCode: 'MDG-5510',
    floor: 2,
    roomType: 'Deluxe King Room',
    bedType: '1 King Bed',
    checkInAt: NOW - ONE_DAY * 3 - ONE_HOUR * 6,
    checkOutAt: NOW - ONE_DAY * 2 - ONE_HOUR * 4,
    durationMs: ONE_DAY + ONE_HOUR * 2,
    status: 'CHECKED_OUT',
    checkedInByStaff: 'Sarah Jenkins (Front Desk Supervisor)',
    checkedOutByStaff: 'Jessica Taylor (Front Desk Concierge)',
    notes: 'Express checkout via room key drop.',
    createdAt: NOW - ONE_DAY * 3 - ONE_HOUR * 6,
  },
  {
    id: 'stay-305-hist',
    roomNumber: '305',
    guestName: 'Hannah Abbott & Family',
    accessCode: 'MDG-8842',
    floor: 3,
    roomType: 'Deluxe Double Queen',
    bedType: '2 Queen Beds',
    checkInAt: NOW - ONE_DAY * 5 - ONE_HOUR * 4,
    checkOutAt: NOW - ONE_DAY * 3 - ONE_HOUR * 2,
    durationMs: ONE_DAY * 2 + ONE_HOUR * 2,
    status: 'CHECKED_OUT',
    checkedInByStaff: 'Jessica Taylor (Front Desk Concierge)',
    checkedOutByStaff: 'Elena Rostova (Front Desk Lead)',
    notes: 'Family vacation stay. Requested airport shuttle on departure.',
    createdAt: NOW - ONE_DAY * 5 - ONE_HOUR * 4,
  },
  {
    id: 'stay-110-hist',
    roomNumber: '110',
    guestName: 'Robert & Clara Vance',
    accessCode: 'MDG-6391',
    floor: 1,
    roomType: 'Executive Suite',
    bedType: '1 King + Sofa Bed',
    checkInAt: NOW - ONE_DAY * 6 - ONE_HOUR * 10,
    checkOutAt: NOW - ONE_DAY * 4 - ONE_HOUR * 7,
    durationMs: ONE_DAY * 2 + ONE_HOUR * 3,
    status: 'CHECKED_OUT',
    checkedInByStaff: 'Sarah Jenkins (Front Desk Supervisor)',
    checkedOutByStaff: 'Sarah Jenkins (Front Desk Supervisor)',
    notes: 'Attended ballroom banquet. No minibar charges.',
    createdAt: NOW - ONE_DAY * 6 - ONE_HOUR * 10,
  },
  {
    id: 'stay-403-hist',
    roomNumber: '403',
    guestName: 'Sophia Laurent',
    accessCode: 'MDG-1194',
    floor: 4,
    roomType: 'Skyline Terrace Suite',
    bedType: '1 King + Private Deck',
    checkInAt: NOW - ONE_DAY * 7 - ONE_HOUR * 3,
    checkOutAt: NOW - ONE_DAY * 5 - ONE_HOUR * 1,
    durationMs: ONE_DAY * 2 + ONE_HOUR * 2,
    status: 'CHECKED_OUT',
    checkedInByStaff: 'Alex Rivera (Lead Developer & Manager)',
    checkedOutByStaff: 'Jessica Taylor (Front Desk Concierge)',
    notes: 'Celebrity guest. Private terrace dinner handled flawlessly.',
    createdAt: NOW - ONE_DAY * 7 - ONE_HOUR * 3,
  },
];

// Initial default room stays with floor, bedType, roomType, all default to CHECKED_OUT (vacant)
export const INITIAL_ROOM_STAYS: RoomStay[] = [
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

const initialLocalStays = loadRoomStaysFromLocalStorage();
const initialLocalStayLogs = loadStayLogsFromLocalStorage();
let inMemoryCache: HotelRequest[] = [...INITIAL_DEMO_REQUESTS];
let roomStaysCache: Map<string, RoomStay> = initialLocalStays || new Map(INITIAL_ROOM_STAYS.map((s) => [s.roomNumber, s]));
let staffMembersCache: StaffMember[] = [...INITIAL_STAFF_MEMBERS];
let stayLogsCache: StayLogRecord[] = initialLocalStayLogs || [...INITIAL_STAY_LOGS];

let isInitialFetchDone = false;
let isRoomStaysInitialFetchDone = false;
let isStaffInitialFetchDone = false;
let isStayLogsInitialFetchDone = false;

let broadcastChannel: BroadcastChannel | null = null;
const eventListeners: Set<(event: { type: string; request?: HotelRequest; roomStay?: RoomStay; staffMember?: StaffMember; stayLog?: StayLogRecord }) => void> = new Set();
let firestoreUnsubscribe: (() => void) | null = null;
let roomStaysFirestoreUnsubscribe: (() => void) | null = null;
let staffFirestoreUnsubscribe: (() => void) | null = null;
let stayLogsFirestoreUnsubscribe: (() => void) | null = null;

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

function notifyListeners(event: { type: string; request?: HotelRequest; roomStay?: RoomStay; staffMember?: StaffMember; stayLog?: StayLogRecord }) {
  eventListeners.forEach((listener) => {
    try {
      listener(event);
    } catch (err) {
      console.error('Error in request event listener:', err);
    }
  });
}

// Setup real-time listeners & server sync immediately
if (typeof window !== 'undefined') {
  initFirestoreRealtimeSync();
  initRoomStaysFirestoreRealtimeSync();
  initStaffFirestoreRealtimeSync();
  initStayLogsFirestoreRealtimeSync();
  fetchRoomStaysFromServer().catch(() => {});
  fetchRequestsFromServer().catch(() => {});
}

export async function fetchRoomStaysFromServer(): Promise<RoomStay[]> {
  try {
    const res = await fetch('/api/room-stays');
    if (res.ok) {
      const serverStays: RoomStay[] = await res.json();
      if (Array.isArray(serverStays) && serverStays.length > 0) {
        serverStays.forEach((stay) => {
          roomStaysCache.set(stay.roomNumber, stay);
        });
        saveRoomStaysToLocalStorage(roomStaysCache);
        notifyListeners({ type: 'ROOM_STAYS_UPDATED' });
        return serverStays;
      }
    }
  } catch (err) {
    // Silent fail in offline or fallback
  }
  return Array.from(roomStaysCache.values());
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
          const defaultRef = INITIAL_ROOM_STAYS.find((r) => r.roomNumber === docSnap.id);
          const isOccupied = data.status === 'OCCUPIED';
          const stay: RoomStay = {
            roomNumber: docSnap.id,
            status: isOccupied ? 'OCCUPIED' : 'CHECKED_OUT',
            guestName: data.guestName,
            accessCode: isOccupied ? (data.accessCode || undefined) : undefined,
            floor: typeof data.floor === 'number' ? data.floor : (defaultRef?.floor || 1),
            bedType: data.bedType || defaultRef?.bedType || '1 King Bed',
            roomType: data.roomType || defaultRef?.roomType || 'Deluxe Room',
            checkInAt: data.checkInAt,
            checkOutAt: data.checkOutAt,
            notes: data.notes,
            lastUpdated: typeof data.lastUpdated === 'number' ? data.lastUpdated : Date.now(),
          };
          freshMap.set(docSnap.id, stay);
        });

        // Ensure all standard rooms exist in map
        INITIAL_ROOM_STAYS.forEach((initStay) => {
          if (!freshMap.has(initStay.roomNumber)) {
            // Keep local status if already cached, otherwise default to CHECKED_OUT
            const existingInCache = roomStaysCache.get(initStay.roomNumber);
            if (existingInCache) {
              freshMap.set(initStay.roomNumber, existingInCache);
            } else {
              freshMap.set(initStay.roomNumber, { ...initStay, status: 'CHECKED_OUT', accessCode: undefined });
            }
          }
        });

        roomStaysCache = freshMap;
        saveRoomStaysToLocalStorage(roomStaysCache);
        isRoomStaysInitialFetchDone = true;
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

/**
 * Real-time bi-directional synchronization for Check-In / Check-Out Stay Logs with Cloud Firestore.
 */
function initStayLogsFirestoreRealtimeSync() {
  if (stayLogsFirestoreUnsubscribe || typeof window === 'undefined') return;

  try {
    const logsRef = collection(db, FIRESTORE_STAY_LOGS);
    const q = query(logsRef, orderBy('createdAt', 'desc'));
    stayLogsFirestoreUnsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty && !isStayLogsInitialFetchDone) {
          seedInitialFirestoreStayLogs();
          return;
        }

        const freshLogs: StayLogRecord[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Partial<StayLogRecord>;
          const item: StayLogRecord = {
            id: docSnap.id,
            roomNumber: data.roomNumber || '101',
            guestName: data.guestName || 'Guest',
            accessCode: data.accessCode || 'MDG-0000',
            floor: typeof data.floor === 'number' ? data.floor : 1,
            roomType: data.roomType || 'Deluxe Room',
            bedType: data.bedType || '1 King Bed',
            checkInAt: typeof data.checkInAt === 'number' ? data.checkInAt : Date.now(),
            checkOutAt: typeof data.checkOutAt === 'number' ? data.checkOutAt : undefined,
            durationMs: typeof data.durationMs === 'number' ? data.durationMs : undefined,
            status: data.status || 'ACTIVE',
            checkedInByStaff: data.checkedInByStaff,
            checkedOutByStaff: data.checkedOutByStaff,
            notes: data.notes,
            createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
          };
          freshLogs.push(item);
        });

        if (freshLogs.length > 0) {
          stayLogsCache = freshLogs;
          saveStayLogsToLocalStorage(stayLogsCache);
          isStayLogsInitialFetchDone = true;
          notifyListeners({ type: 'STAY_LOGS_UPDATED' });
        }
      },
      (err) => {
        console.warn('Firestore stay logs real-time sync error:', err);
      }
    );
  } catch (err) {
    console.warn('Could not initialize Firestore stay logs listener:', err);
  }
}

async function seedInitialFirestoreRequests() {
  try {
    const batch = writeBatch(db);
    INITIAL_DEMO_REQUESTS.forEach((req) => {
      const docRef = doc(db, FIRESTORE_COLLECTION, req.id);
      batch.set(docRef, sanitizeForFirestore(req));
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
      batch.set(docRef, sanitizeForFirestore(stay));
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
      batch.set(docRef, sanitizeForFirestore(staff));
    });
    await batch.commit();
  } catch (err) {
    console.warn('Failed to seed initial Firestore staff members:', err);
  }
}

async function seedInitialFirestoreStayLogs() {
  try {
    const batch = writeBatch(db);
    INITIAL_STAY_LOGS.forEach((log) => {
      const docRef = doc(db, FIRESTORE_STAY_LOGS, log.id);
      batch.set(docRef, sanitizeForFirestore(log));
    });
    await batch.commit();
  } catch (err) {
    console.warn('Failed to seed initial Firestore stay logs:', err);
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

  if (updatedReq) {
    try {
      const docRef = doc(db, FIRESTORE_COLLECTION, requestId);
      const sanitized = sanitizeForFirestore(updatedReq);
      setDoc(docRef, sanitized, { merge: true }).catch((err) => {
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

  const defaultMeta = INITIAL_ROOM_STAYS.find((r) => r.roomNumber === clean);

  // Default fallback for any room not actively checked in: CHECKED_OUT (vacant)
  const defaultStay: RoomStay = {
    roomNumber: clean,
    status: 'CHECKED_OUT',
    floor: defaultMeta?.floor || 1,
    bedType: defaultMeta?.bedType || '1 King Bed',
    roomType: defaultMeta?.roomType || 'Deluxe Room',
    lastUpdated: Date.now(),
  };

  roomStaysCache.set(clean, defaultStay);
  saveRoomStaysToLocalStorage(roomStaysCache);
  return defaultStay;
}

export function getAllRoomStays(): RoomStay[] {
  return Array.from(roomStaysCache.values());
}

/**
 * Check In a Room:
 * Automatically generates a unique access passcode, sets status to OCCUPIED,
 * and syncs to localStorage, Express backend, Firestore & broadcast channel in real-time.
 */
export function checkInRoom(
  roomNumber: string,
  guestName: string = 'In-Room Guest',
  customCode?: string,
  staffName?: string
): RoomStay {
  const clean = roomNumber.trim();
  const now = Date.now();
  const existing = roomStaysCache.get(clean);
  const generatedCode = customCode?.trim() || generateRoomAccessCode(clean);

  const newStay: RoomStay = {
    roomNumber: clean,
    status: 'OCCUPIED',
    accessCode: generatedCode,
    guestName: guestName.trim() || `Room ${clean} Guest`,
    floor: existing?.floor ?? 1,
    bedType: existing?.bedType ?? '1 King Bed',
    roomType: existing?.roomType ?? 'Deluxe Room',
    checkInAt: now,
    notes: existing?.notes,
    lastUpdated: now,
  };

  roomStaysCache.set(clean, newStay);
  saveRoomStaysToLocalStorage(roomStaysCache);

  // Track in Stay Logs
  const logId = `stay-${clean}-${now}`;
  const newStayLog: StayLogRecord = {
    id: logId,
    roomNumber: clean,
    guestName: newStay.guestName,
    accessCode: generatedCode,
    floor: newStay.floor ?? 1,
    roomType: newStay.roomType ?? 'Deluxe Room',
    bedType: newStay.bedType ?? '1 King Bed',
    checkInAt: now,
    status: 'ACTIVE',
    checkedInByStaff: staffName || undefined,
    createdAt: now,
  };

  stayLogsCache = [newStayLog, ...stayLogsCache.filter((l) => !(l.roomNumber === clean && l.status === 'ACTIVE'))];
  saveStayLogsToLocalStorage(stayLogsCache);

  try {
    const logDocRef = doc(db, FIRESTORE_STAY_LOGS, logId);
    setDoc(logDocRef, sanitizeForFirestore(newStayLog)).catch((err) => {
      console.warn('Firestore set stay log error:', err);
    });
  } catch (err) {
    console.warn('Firestore error in checkInRoom stay log:', err);
  }

  const eventPayload = {
    type: 'ROOM_STAY_UPDATED',
    roomStay: newStay,
    stayLog: newStayLog,
  };

  if (broadcastChannel) {
    broadcastChannel.postMessage(eventPayload);
  }
  notifyListeners(eventPayload);

  // Sync to Express Backend
  fetch('/api/room-stays/checkin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomNumber: clean, guestName: newStay.guestName, accessCode: generatedCode }),
  }).catch(() => {});

  // Sync to Cloud Firestore
  try {
    const docRef = doc(db, FIRESTORE_ROOM_STAYS, clean);
    const sanitized = sanitizeForFirestore(newStay);
    setDoc(docRef, sanitized).catch((err) => {
      console.warn('Firestore set room stay error:', err);
    });
  } catch (err) {
    console.warn('Firestore error in checkInRoom:', err);
  }

  return newStay;
}

/**
 * Check Out a Room:
 * Sets status to CHECKED_OUT, invalidates / clears the active accessCode,
 * and immediately locks guest access in real time across browser refresh, backend and Firestore.
 */
export function checkOutRoom(roomNumber: string, staffName?: string): RoomStay {
  const clean = roomNumber.trim();
  const now = Date.now();
  const existing = roomStaysCache.get(clean);

  const updatedStay: RoomStay = {
    roomNumber: clean,
    status: 'CHECKED_OUT',
    guestName: existing?.guestName || `Room ${clean} Guest`,
    floor: existing?.floor ?? 1,
    bedType: existing?.bedType ?? '1 King Bed',
    roomType: existing?.roomType ?? 'Deluxe Room',
    checkInAt: existing?.checkInAt,
    checkOutAt: now,
    notes: existing?.notes,
    lastUpdated: now,
  };

  roomStaysCache.set(clean, updatedStay);
  saveRoomStaysToLocalStorage(roomStaysCache);

  // Update or Create completed StayLogRecord
  let updatedStayLog: StayLogRecord | null = null;
  const activeLogIndex = stayLogsCache.findIndex((l) => l.roomNumber === clean && l.status === 'ACTIVE');

  if (activeLogIndex >= 0) {
    const currentLog = stayLogsCache[activeLogIndex];
    updatedStayLog = {
      ...currentLog,
      checkOutAt: now,
      durationMs: now - currentLog.checkInAt,
      status: 'CHECKED_OUT',
      checkedOutByStaff: staffName || undefined,
    };
    stayLogsCache[activeLogIndex] = updatedStayLog;
  } else {
    const logId = `stay-${clean}-${now}`;
    const checkInTime = existing?.checkInAt || (now - 1000 * 60 * 60 * 8);
    updatedStayLog = {
      id: logId,
      roomNumber: clean,
      guestName: updatedStay.guestName,
      accessCode: existing?.accessCode || generateRoomAccessCode(clean),
      floor: updatedStay.floor ?? 1,
      roomType: updatedStay.roomType ?? 'Deluxe Room',
      bedType: updatedStay.bedType ?? '1 King Bed',
      checkInAt: checkInTime,
      checkOutAt: now,
      durationMs: now - checkInTime,
      status: 'CHECKED_OUT',
      checkedOutByStaff: staffName || undefined,
      createdAt: checkInTime,
    };
    stayLogsCache = [updatedStayLog, ...stayLogsCache];
  }

  saveStayLogsToLocalStorage(stayLogsCache);

  if (updatedStayLog) {
    try {
      const logDocRef = doc(db, FIRESTORE_STAY_LOGS, updatedStayLog.id);
      setDoc(logDocRef, sanitizeForFirestore(updatedStayLog)).catch((err) => {
        console.warn('Firestore update stay log error:', err);
      });
    } catch (err) {
      console.warn('Firestore error in checkOutRoom stay log:', err);
    }
  }

  const eventPayload = {
    type: 'ROOM_STAY_UPDATED',
    roomStay: updatedStay,
    stayLog: updatedStayLog || undefined,
  };

  if (broadcastChannel) {
    broadcastChannel.postMessage(eventPayload);
  }
  notifyListeners(eventPayload);

  // Sync to Express Backend
  fetch('/api/room-stays/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomNumber: clean }),
  }).catch(() => {});

  // Sync to Cloud Firestore
  try {
    const docRef = doc(db, FIRESTORE_ROOM_STAYS, clean);
    const sanitized = sanitizeForFirestore(updatedStay);
    setDoc(docRef, sanitized).catch((err) => {
      console.warn('Firestore set room stay error:', err);
    });
  } catch (err) {
    console.warn('Firestore error in checkOutRoom:', err);
  }

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
  saveRoomStaysToLocalStorage(roomStaysCache);

  const eventPayload = {
    type: 'ROOM_STAY_UPDATED',
    roomStay: updatedStay,
  };

  if (broadcastChannel) {
    broadcastChannel.postMessage(eventPayload);
  }
  notifyListeners(eventPayload);

  fetch('/api/room-stays/checkin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomNumber: clean, guestName: updatedStay.guestName, accessCode: newCode }),
  }).catch(() => {});

  try {
    const docRef = doc(db, FIRESTORE_ROOM_STAYS, clean);
    const sanitized = sanitizeForFirestore(updatedStay);
    setDoc(docRef, sanitized).catch((err) => {
      console.warn('Firestore set room stay error:', err);
    });
  } catch (err) {
    console.warn('Firestore error in regenerateRoomAccessCode:', err);
  }

  return updatedStay;
}

/**
 * Admin / Manager Room Details Modification:
 * Allows modifying floor, bed size / bed type, room type, and notes.
 * Directly persists to Cloud Firestore and updates in-memory cache in real-time.
 */
export function updateRoomDetails(
  roomNumber: string,
  details: {
    floor?: number;
    bedType?: string;
    roomType?: string;
    notes?: string;
  }
): RoomStay {
  const clean = roomNumber.trim();
  const existing = getRoomStay(clean);
  const now = Date.now();

  const updatedStay: RoomStay = {
    ...existing,
    floor: typeof details.floor === 'number' ? details.floor : existing.floor,
    bedType: details.bedType !== undefined ? details.bedType.trim() : existing.bedType,
    roomType: details.roomType !== undefined ? details.roomType.trim() : existing.roomType,
    notes: details.notes !== undefined ? details.notes.trim() : existing.notes,
    lastUpdated: now,
  };

  roomStaysCache.set(clean, updatedStay);
  saveRoomStaysToLocalStorage(roomStaysCache);

  const eventPayload = {
    type: 'ROOM_STAY_UPDATED',
    roomStay: updatedStay,
  };

  if (broadcastChannel) {
    broadcastChannel.postMessage(eventPayload);
  }
  notifyListeners(eventPayload);

  fetch(`/api/room-stays/${encodeURIComponent(clean)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(details),
  }).catch(() => {});

  try {
    const docRef = doc(db, FIRESTORE_ROOM_STAYS, clean);
    const sanitized = sanitizeForFirestore(updatedStay);
    setDoc(docRef, sanitized, { merge: true }).catch((err) => {
      console.warn('Firestore update room details error:', err);
    });
  } catch (err) {
    console.warn('Firestore error in updateRoomDetails:', err);
  }

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
  seedInitialFirestoreStaffMembers();
  notifyListeners({ type: 'STAFF_MEMBERS_UPDATED' });
  return staffMembersCache;
}

// ----------------- Stay Logs (Check-In / Check-Out Monitoring) ----------------- //

export function getAllStayLogs(): StayLogRecord[] {
  return stayLogsCache;
}

export function deleteStayLog(id: string): StayLogRecord[] {
  stayLogsCache = stayLogsCache.filter((log) => log.id !== id);
  saveStayLogsToLocalStorage(stayLogsCache);

  const payload = {
    type: 'STAY_LOGS_UPDATED',
  };

  if (broadcastChannel) {
    broadcastChannel.postMessage(payload);
  }
  notifyListeners(payload);

  try {
    const docRef = doc(db, FIRESTORE_STAY_LOGS, id);
    deleteDoc(docRef).catch((err) => {
      console.warn('Firestore delete stay log error:', err);
    });
  } catch {}

  return stayLogsCache;
}

export function resetToDemoStayLogs(): StayLogRecord[] {
  stayLogsCache = [...INITIAL_STAY_LOGS];
  saveStayLogsToLocalStorage(stayLogsCache);
  seedInitialFirestoreStayLogs();
  notifyListeners({ type: 'STAY_LOGS_UPDATED' });
  return stayLogsCache;
}

export function subscribeToRequestEvents(
  callback: (event: { type: string; request?: HotelRequest; roomStay?: RoomStay; staffMember?: StaffMember; stayLog?: StayLogRecord }) => void
): () => void {
  eventListeners.add(callback);

  initFirestoreRealtimeSync();
  initRoomStaysFirestoreRealtimeSync();
  initStaffFirestoreRealtimeSync();
  initStayLogsFirestoreRealtimeSync();

  const pollInterval = setInterval(() => {
    fetchRequestsFromServer().catch(() => {});
  }, 5000);

  return () => {
    eventListeners.delete(callback);
    clearInterval(pollInterval);
  };
}
