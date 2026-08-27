export type RequestStatus = 'NEW' | 'IN_PROGRESS' | 'COMPLETED';

export type RequestCategory =
  | 'Contact Front Desk'
  | 'Housekeeping'
  | 'Extra Pillow / Blanket'
  | 'Toiletries'
  | 'Maintenance'
  | 'Room Service'
  | 'Water'
  | 'Laundry'
  | 'Emergency Assistance'
  | 'Other Request';

export interface CategoryInfo {
  id: RequestCategory;
  label: string;
  emoji: string;
  iconName: string;
  description: string;
  quickOptions: string[];
  isEmergency?: boolean;
}

export interface HotelRequest {
  id: string;
  roomNumber: string;
  category: RequestCategory;
  additionalMessage: string;
  status: RequestStatus;
  isEmergency: boolean;
  createdAt: number;
  acceptedAt?: number;
  completedAt?: number;
  staffNotes?: string;
  acceptedByStaffName?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  assignedStaffRole?: string;
  assignedStaffDepartment?: string;
  completedByStaffName?: string;
}

export type RoomStayStatus = 'OCCUPIED' | 'CHECKED_OUT';

export interface RoomStay {
  roomNumber: string;
  status: RoomStayStatus;
  guestName?: string;
  accessCode?: string; // Automatically generated code e.g. "MDG-4821" or "7849"
  checkInAt?: number;
  checkOutAt?: number;
  lastUpdated: number;
  notes?: string;
}

export type UserRole = 'developer' | 'staff';

export type DutyStatus = 'ON_DUTY' | 'ON_BREAK' | 'OFF_DUTY';

export interface UserProfile {
  id: string;
  username: string;
  password: string;
  name: string;
  email: string;
  role: UserRole;
  roleTitle: string;
  department: string;
  phone: string;
  shift: string;
  bio: string;
  avatarColor: string;
  isPrimaryDeveloper?: boolean;
  dutyStatus: DutyStatus;
  createdAt: number;
  lastLoginAt?: number;
}

export interface StaffMember {
  id: string;
  name: string;
  roleTitle: string; // e.g. "Housekeeping Associate", "Front Desk Concierge", "Maintenance Technician", "Room Runner", "Luggage Porter"
  department: 'Front Desk' | 'Housekeeping' | 'Maintenance' | 'Dining & Room Service' | 'Security' | 'General Operations';
  phone: string;
  shift: string;
  dutyStatus: DutyStatus;
  notes?: string;
  createdAt: number;
  createdByAdmin?: string;
}


export const CATEGORIES_CONFIG: CategoryInfo[] = [
  {
    id: 'Contact Front Desk',
    label: 'Contact Front Desk',
    emoji: '🛎️',
    iconName: 'Bell',
    description: 'Speak with our front desk concierge or request general information',
    quickOptions: ['Send staff to room', 'Need wake-up call', 'Question about checkout', 'Taxi reservation'],
  },
  {
    id: 'Housekeeping',
    label: 'Housekeeping',
    emoji: '🧹',
    iconName: 'Sparkles',
    description: 'Room cleaning, bed making, or trash disposal',
    quickOptions: ['Please clean room now', 'Change bed linens', 'Empty trash bins', 'Turn-down service'],
  },
  {
    id: 'Extra Pillow / Blanket',
    label: 'Extra Pillow / Blanket',
    emoji: '🛏️',
    iconName: 'BedDouble',
    description: 'Additional bedding, firm/soft pillows, or warm blankets',
    quickOptions: ['2 Extra Pillows', '1 Warm Blanket', 'Hypoallergenic Pillow', 'Duvet'],
  },
  {
    id: 'Toiletries',
    label: 'Toiletries',
    emoji: '🧻',
    iconName: 'Package',
    description: 'Towels, soap, shampoo, dental kits, or bath essentials',
    quickOptions: ['Fresh Bath Towels (x2)', 'Dental Kit / Toothbrush', 'Shampoo & Body Wash', 'Shaving Kit', 'Extra Toilet Paper'],
  },
  {
    id: 'Maintenance',
    label: 'Maintenance',
    emoji: '🚿',
    iconName: 'Wrench',
    description: 'Air conditioning, plumbing, lighting, or TV support',
    quickOptions: ['AC / Temperature issue', 'Shower / Hot water', 'TV / Remote control', 'Lighting issue', 'Safe box assistance'],
  },
  {
    id: 'Water',
    label: 'Water & Ice',
    emoji: '💧',
    iconName: 'Droplets',
    description: 'Complimentary bottled water or ice bucket',
    quickOptions: ['2 Bottles Still Water', '4 Bottles Still Water', '1 Ice Bucket with Tongs', 'Hot drinking water'],
  },
  {
    id: 'Emergency Assistance',
    label: 'Emergency Assistance',
    emoji: '🚨',
    iconName: 'AlertTriangle',
    description: 'Immediate front desk response to your room for urgent matters',
    quickOptions: ['Urgent Staff Presence', 'Medical First Aid Need', 'Security Concern', 'Room Lock Issue'],
    isEmergency: true,
  },
  {
    id: 'Other Request',
    label: 'Other Request',
    emoji: '💬',
    iconName: 'MessageSquare',
    description: 'Any custom request or inquiry not listed above',
    quickOptions: ['Luggage assistance', 'Baby cot / crib', 'Adapter / Charger plug', 'Do Not Disturb inquiry'],
  },
];
