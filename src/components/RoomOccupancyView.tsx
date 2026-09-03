import React, { useState, useEffect, useMemo, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Building2,
  KeyRound,
  CheckCircle2,
  XCircle,
  QrCode,
  Search,
  RefreshCw,
  Copy,
  Printer,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Download,
  X,
  Clock,
  User,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  Filter,
  Edit,
  BedDouble,
  Layers,
} from 'lucide-react';
import { RoomStay, RoomStayStatus, UserProfile } from '../types/hotel';
import {
  getAllRoomStays,
  getRoomStay,
  checkInRoom,
  checkOutRoom,
  regenerateRoomAccessCode,
  updateRoomDetails,
  subscribeToRequestEvents,
} from '../services/storageService';
import { EditRoomModal } from './EditRoomModal';

interface RoomOccupancyViewProps {
  currentUser: UserProfile | null;
  onSelectRoomForGuestView?: (roomNumber: string) => void;
}

// Complete Hotel Room Directory
interface RoomMeta {
  roomNumber: string;
  floor: number;
  type: string;
  bedType: string;
}

const ALL_HOTEL_ROOMS: RoomMeta[] = [
  // Floor 1 (101 - 110)
  { roomNumber: '101', floor: 1, type: 'Deluxe King Room', bedType: '1 King Bed' },
  { roomNumber: '102', floor: 1, type: 'Deluxe Double Queen', bedType: '2 Queen Beds' },
  { roomNumber: '103', floor: 1, type: 'Deluxe King Room', bedType: '1 King Bed' },
  { roomNumber: '104', floor: 1, type: 'Superior Twin Room', bedType: '2 Twin Beds' },
  { roomNumber: '105', floor: 1, type: 'Deluxe King Room', bedType: '1 King Bed' },
  { roomNumber: '106', floor: 1, type: 'Deluxe Double Queen', bedType: '2 Queen Beds' },
  { roomNumber: '107', floor: 1, type: 'Deluxe King Room', bedType: '1 King Bed' },
  { roomNumber: '108', floor: 1, type: 'Superior King Room', bedType: '1 King Bed' },
  { roomNumber: '109', floor: 1, type: 'Deluxe Double Queen', bedType: '2 Queen Beds' },
  { roomNumber: '110', floor: 1, type: 'Executive Suite', bedType: '1 King + Sofa Bed' },

  // Floor 2 (201 - 210)
  { roomNumber: '201', floor: 2, type: 'Deluxe King Room', bedType: '1 King Bed' },
  { roomNumber: '202', floor: 2, type: 'Deluxe King Room', bedType: '1 King Bed' },
  { roomNumber: '203', floor: 2, type: 'Deluxe Double Queen', bedType: '2 Queen Beds' },
  { roomNumber: '204', floor: 2, type: 'Deluxe King Room', bedType: '1 King Bed' },
  { roomNumber: '205', floor: 2, type: 'Executive King Suite', bedType: '1 King Bed' },
  { roomNumber: '206', floor: 2, type: 'Superior Twin Room', bedType: '2 Twin Beds' },
  { roomNumber: '207', floor: 2, type: 'Deluxe Double Queen', bedType: '2 Queen Beds' },
  { roomNumber: '208', floor: 2, type: 'Deluxe King Room', bedType: '1 King Bed' },
  { roomNumber: '209', floor: 2, type: 'Deluxe King Room', bedType: '1 King Bed' },
  { roomNumber: '210', floor: 2, type: 'Junior Suite', bedType: '1 King + Lounge' },

  // Floor 3 (301 - 310)
  { roomNumber: '301', floor: 3, type: 'Deluxe King Room', bedType: '1 King Bed' },
  { roomNumber: '302', floor: 3, type: 'Deluxe Double Queen', bedType: '2 Queen Beds' },
  { roomNumber: '303', floor: 3, type: 'Deluxe King Room', bedType: '1 King Bed' },
  { roomNumber: '304', floor: 3, type: 'Superior King Room', bedType: '1 King Bed' },
  { roomNumber: '305', floor: 3, type: 'Deluxe Double Queen', bedType: '2 Queen Beds' },
  { roomNumber: '306', floor: 3, type: 'Deluxe King Room', bedType: '1 King Bed' },
  { roomNumber: '307', floor: 3, type: 'Superior Twin Room', bedType: '2 Twin Beds' },
  { roomNumber: '308', floor: 3, type: 'Executive Suite', bedType: '1 King + Balcony' },
  { roomNumber: '309', floor: 3, type: 'Deluxe Double Queen', bedType: '2 Queen Beds' },
  { roomNumber: '310', floor: 3, type: 'Penthouse Junior', bedType: '1 King Bed' },

  // Floor 4 & Penthouse Suites
  { roomNumber: '401', floor: 4, type: 'Presidential Royal Suite', bedType: 'Master Suite + Living' },
  { roomNumber: '402', floor: 4, type: 'Madigun Signature Suite', bedType: '2 King Bedrooms' },
  { roomNumber: '403', floor: 4, type: 'Skyline Terrace Suite', bedType: '1 King + Private Deck' },
  { roomNumber: '404', floor: 4, type: 'Grand Ambassador Suite', bedType: 'Master Suite' },
];

export const RoomOccupancyView: React.FC<RoomOccupancyViewProps> = ({
  currentUser,
  onSelectRoomForGuestView,
}) => {
  const [roomStays, setRoomStays] = useState<Map<string, RoomStay>>(new Map());
  const [selectedFloor, setSelectedFloor] = useState<number | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OCCUPIED' | 'CHECKED_OUT'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Modals & Notifications
  const [activeKeycardModal, setActiveKeycardModal] = useState<{
    roomNumber: string;
    stay: RoomStay;
    meta: RoomMeta;
  } | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Check-In Guest Modal State
  const [checkInModalRoom, setCheckInModalRoom] = useState<RoomMeta | null>(null);
  const [checkInGuestName, setCheckInGuestName] = useState<string>('');

  // Admin Edit Room Details Modal State
  const [editingRoom, setEditingRoom] = useState<{
    roomNumber: string;
    currentStay: RoomStay;
  } | null>(null);

  const isDeveloper = currentUser?.role === 'developer' || currentUser?.isPrimaryDeveloper;

  const refreshData = () => {
    const stays = getAllRoomStays();
    const map = new Map<string, RoomStay>();
    stays.forEach((s) => map.set(s.roomNumber, s));
    setRoomStays(map);
  };

  useEffect(() => {
    refreshData();
    const unsubscribe = subscribeToRequestEvents((e) => {
      if (e.type === 'ROOM_STAY_UPDATED' || e.type === 'ROOM_STAYS_UPDATED') {
        refreshData();
      }
    });
    return unsubscribe;
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Generate QR Code data URL when Keycard Modal opens
  useEffect(() => {
    if (activeKeycardModal) {
      const stay = activeKeycardModal.stay;
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const guestUrl = `${origin}/?room=${encodeURIComponent(stay.roomNumber)}${
        stay.accessCode ? `&code=${encodeURIComponent(stay.accessCode)}` : ''
      }`;

      QRCode.toDataURL(guestUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#121110',
          light: '#FFFFFF',
        },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error('Failed to generate QR code:', err));
    } else {
      setQrCodeDataUrl('');
    }
  }, [activeKeycardModal]);

  // Merge static directory with dynamic overrides from Firestore
  const allRoomsMerged = useMemo(() => {
    return ALL_HOTEL_ROOMS.map((base) => {
      const stay = roomStays.get(base.roomNumber) || getRoomStay(base.roomNumber);
      return {
        roomNumber: base.roomNumber,
        floor: stay.floor || base.floor,
        type: stay.roomType || base.type,
        bedType: stay.bedType || base.bedType,
      };
    });
  }, [roomStays]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = allRoomsMerged.length;
    let occupied = 0;
    let checkedOut = 0;
    let activeCodes = 0;

    allRoomsMerged.forEach((r) => {
      const stay = roomStays.get(r.roomNumber) || getRoomStay(r.roomNumber);
      if (stay.status === 'OCCUPIED') {
        occupied++;
        if (stay.accessCode) activeCodes++;
      } else {
        checkedOut++;
      }
    });

    const occupancyRate = Math.round((occupied / total) * 100);

    return { total, occupied, checkedOut, activeCodes, occupancyRate };
  }, [allRoomsMerged, roomStays]);

  // Filtered rooms list
  const filteredRooms = useMemo(() => {
    return allRoomsMerged.filter((r) => {
      if (selectedFloor !== 'ALL' && r.floor !== selectedFloor) return false;

      const stay = roomStays.get(r.roomNumber) || getRoomStay(r.roomNumber);
      if (statusFilter !== 'ALL' && stay.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesRoom = r.roomNumber.toLowerCase().includes(q);
        const matchesType = r.type.toLowerCase().includes(q);
        const matchesBed = r.bedType.toLowerCase().includes(q);
        const matchesGuest = (stay.guestName || '').toLowerCase().includes(q);
        const matchesCode = (stay.accessCode || '').toLowerCase().includes(q);
        return matchesRoom || matchesType || matchesBed || matchesGuest || matchesCode;
      }

      return true;
    });
  }, [allRoomsMerged, roomStays, selectedFloor, statusFilter, searchQuery]);

  // Actions
  const handleCheckOut = (roomNumber: string) => {
    const updated = checkOutRoom(roomNumber, currentUser?.name);
    refreshData();
    showToast(`Room ${roomNumber} has been Checked Out. Guest access code expired.`);
    if (activeKeycardModal?.roomNumber === roomNumber) {
      const meta = allRoomsMerged.find((r) => r.roomNumber === roomNumber)!;
      setActiveKeycardModal({ roomNumber, stay: updated, meta });
    }
  };

  const handleOpenCheckIn = (room: RoomMeta) => {
    setCheckInModalRoom(room);
    const existing = roomStays.get(room.roomNumber);
    setCheckInGuestName(existing?.guestName && existing.guestName !== 'In-Room Guest' ? existing.guestName : '');
  };

  const handleConfirmCheckIn = () => {
    if (!checkInModalRoom) return;
    const name = checkInGuestName.trim() || `In-Room Guest`;
    const newStay = checkInRoom(checkInModalRoom.roomNumber, name, undefined, currentUser?.name);
    refreshData();
    showToast(`Checked in Room ${checkInModalRoom.roomNumber} with new code: ${newStay.accessCode}`);
    setCheckInModalRoom(null);
    setCheckInGuestName('');
  };

  const handleRegenerateCode = (roomNumber: string) => {
    const updated = regenerateRoomAccessCode(roomNumber);
    refreshData();
    showToast(`Generated fresh passcode for Room ${roomNumber}: ${updated.accessCode}`);
    if (activeKeycardModal?.roomNumber === roomNumber) {
      const meta = allRoomsMerged.find((r) => r.roomNumber === roomNumber)!;
      setActiveKeycardModal({ roomNumber, stay: updated, meta });
    }
  };

  const handleOpenKeycard = (meta: RoomMeta) => {
    const stay = roomStays.get(meta.roomNumber) || getRoomStay(meta.roomNumber);
    setActiveKeycardModal({ roomNumber: meta.roomNumber, stay, meta });
  };

  const handleOpenEditRoom = (meta: RoomMeta) => {
    const stay = roomStays.get(meta.roomNumber) || getRoomStay(meta.roomNumber);
    setEditingRoom({ roomNumber: meta.roomNumber, currentStay: stay });
  };

  const handleSaveRoomDetails = (
    roomNum: string,
    details: { floor: number; bedType: string; roomType: string; notes?: string }
  ) => {
    updateRoomDetails(roomNum, details);
    refreshData();
    showToast(`Updated Room ${roomNum} details (Floor ${details.floor}, ${details.bedType}).`);
  };

  const handleCopyCode = (code: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      showToast(`Copied code ${code} to clipboard.`);
    }
  };

  const handleCopyGuestLink = (roomNumber: string, code?: string) => {
    if (typeof window === 'undefined') return;
    const link = `${window.location.origin}/?room=${encodeURIComponent(roomNumber)}${
      code ? `&code=${encodeURIComponent(code)}` : ''
    }`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link);
      showToast(`Copied guest link for Room ${roomNumber} to clipboard.`);
    }
  };

  const handlePrintSlip = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#C5A880] text-[#121110] px-4 py-2.5 rounded-xl shadow-2xl font-bold text-xs flex items-center gap-2 animate-fade-in border border-[#E5D5B8]">
          <Sparkles className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header (Without Refresh Data button or descriptions) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2C2A26] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-[#C5A880] font-semibold flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              <span>Front Desk &amp; Concierge Operations</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif-luxury text-[#F3EFEA] mt-1">
            Room Occupancy &amp; Dynamic QR Access
          </h1>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#171614] border border-[#2C2A26] rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-[#A89F91] uppercase tracking-wider block font-semibold">
              Total Rooms
            </span>
            <span className="text-2xl font-bold font-serif-luxury text-[#F3EFEA]">
              {stats.total}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#2C2A26] flex items-center justify-center text-[#C5A880]">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#171614] border border-[#2C2A26] rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-[#A89F91] uppercase tracking-wider block font-semibold">
              Occupied Rooms
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-serif-luxury text-[#22C55E]">
                {stats.occupied}
              </span>
              <span className="text-xs text-[#86EFAC] font-semibold">
                ({stats.occupancyRate}%)
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/30 flex items-center justify-center text-[#22C55E]">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#171614] border border-[#2C2A26] rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-[#A89F91] uppercase tracking-wider block font-semibold">
              Vacant / Available
            </span>
            <span className="text-2xl font-bold font-serif-luxury text-[#E5D5B8]">
              {stats.checkedOut}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#C5A880]/15 border border-[#C5A880]/30 flex items-center justify-center text-[#C5A880]">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#171614] border border-[#2C2A26] rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-[#A89F91] uppercase tracking-wider block font-semibold">
              Active Guest Codes
            </span>
            <span className="text-2xl font-bold font-serif-luxury text-[#F3EFEA]">
              {stats.activeCodes}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#C5A880]/15 border border-[#C5A880]/30 flex items-center justify-center text-[#C5A880]">
            <KeyRound className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Floor & Status Filter Tabs + Search */}
      <div className="bg-[#171614] border border-[#2C2A26] rounded-2xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Floor selector tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setSelectedFloor('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                selectedFloor === 'ALL'
                  ? 'bg-[#C5A880] text-[#121110] shadow-sm'
                  : 'bg-[#24211D] text-[#B8B2A7] hover:text-white'
              }`}
            >
              All Floors ({allRoomsMerged.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFloor(1)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                selectedFloor === 1
                  ? 'bg-[#C5A880] text-[#121110] shadow-sm'
                  : 'bg-[#24211D] text-[#B8B2A7] hover:text-white'
              }`}
            >
              Floor 1
            </button>
            <button
              type="button"
              onClick={() => setSelectedFloor(2)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                selectedFloor === 2
                  ? 'bg-[#C5A880] text-[#121110] shadow-sm'
                  : 'bg-[#24211D] text-[#B8B2A7] hover:text-white'
              }`}
            >
              Floor 2
            </button>
            <button
              type="button"
              onClick={() => setSelectedFloor(3)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                selectedFloor === 3
                  ? 'bg-[#C5A880] text-[#121110] shadow-sm'
                  : 'bg-[#24211D] text-[#B8B2A7] hover:text-white'
              }`}
            >
              Floor 3
            </button>
            <button
              type="button"
              onClick={() => setSelectedFloor(4)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                selectedFloor === 4
                  ? 'bg-[#C5A880] text-[#121110] shadow-sm'
                  : 'bg-[#24211D] text-[#B8B2A7] hover:text-white'
              }`}
            >
              Floor 4 (Suites)
            </button>
          </div>

          {/* Status filter toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center bg-[#24211D] border border-[#3E3A33] rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-[#C5A880] text-[#121110]'
                    : 'text-[#A89F91] hover:text-white'
                }`}
              >
                All Status
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('OCCUPIED')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  statusFilter === 'OCCUPIED'
                    ? 'bg-[#22C55E] text-[#121110]'
                    : 'text-[#A89F91] hover:text-white'
                }`}
              >
                Occupied
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('CHECKED_OUT')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  statusFilter === 'CHECKED_OUT'
                    ? 'bg-[#6B7280] text-white'
                    : 'text-[#A89F91] hover:text-white'
                }`}
              >
                Vacant
              </button>
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#7E786E] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by room number (e.g. 101), bed size, or active passcode..."
            className="w-full bg-[#141311] border border-[#2B2822] focus:border-[#C5A880] rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-[#F3EFEA] placeholder-[#7E786E] outline-none"
          />
        </div>
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRooms.map((meta) => {
          const stay = roomStays.get(meta.roomNumber) || getRoomStay(meta.roomNumber);
          const isOccupied = stay.status === 'OCCUPIED';

          return (
            <div
              key={meta.roomNumber}
              className={`bg-[#171614] border rounded-2xl p-4 sm:p-5 transition-all relative flex flex-col justify-between space-y-4 ${
                isOccupied
                  ? 'border-[#22C55E]/40 hover:border-[#22C55E] bg-gradient-to-b from-[#1a221a] to-[#171614]'
                  : 'border-[#2C2A26] hover:border-[#3E3A33] opacity-90'
              }`}
            >
              {/* Room Card Header */}
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl sm:text-2xl font-bold font-mono text-[#F3EFEA]">
                        Room {meta.roomNumber}
                      </span>
                      <span className="text-[10px] text-[#A89F91] bg-[#24211D] px-2 py-0.5 rounded border border-[#3E3A33]">
                        Floor {meta.floor}
                      </span>
                    </div>
                    <span className="text-xs text-[#C5A880] font-medium block mt-0.5">
                      {meta.type} • {meta.bedType}
                    </span>
                  </div>

                  {/* Occupancy Status Badge */}
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 ${
                      isOccupied
                        ? 'bg-[#22C55E]/15 text-[#86EFAC] border border-[#22C55E]/30'
                        : 'bg-[#6B7280]/20 text-[#D1D5DB] border border-[#6B7280]/30'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isOccupied ? 'bg-[#22C55E] animate-pulse' : 'bg-[#6B7280]'
                      }`}
                    />
                    {isOccupied ? 'OCCUPIED' : 'VACANT'}
                  </span>
                </div>

                {/* Guest & Code Info Box */}
                <div className="mt-3.5 bg-[#121110] border border-[#262421] rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#8E877C] flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      <span>Guest Name</span>
                    </span>
                    <span className="font-semibold text-[#F3EFEA]">
                      {isOccupied ? stay.guestName || 'In-Room Guest' : 'No Active Guest'}
                    </span>
                  </div>

                  {/* Dynamic Passcode Section */}
                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-[#22201D]">
                    <span className="text-[#8E877C] flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5 text-[#C5A880]" />
                      <span>Guest QR Passcode</span>
                    </span>

                    {isOccupied && stay.accessCode ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs bg-[#C5A880]/15 text-[#E5D5B8] px-2 py-0.5 rounded border border-[#C5A880]/40">
                          {stay.accessCode}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(stay.accessCode!)}
                          title="Copy Passcode"
                          className="p-1 rounded bg-[#24211D] hover:bg-[#322E29] text-[#A89F91] hover:text-white transition-colors cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRegenerateCode(meta.roomNumber)}
                          title="Regenerate New Passcode"
                          className="p-1 rounded bg-[#24211D] hover:bg-[#322E29] text-[#A89F91] hover:text-white transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-[#7E786E] italic">
                        Access Expired
                      </span>
                    )}
                  </div>

                  {/* Stay Duration / Check-In Time */}
                  {isOccupied && stay.checkInAt && (
                    <div className="flex items-center justify-between text-[11px] text-[#7E786E] pt-1">
                      <span>Checked In:</span>
                      <span className="font-mono">
                        {new Date(stay.checkInAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        {new Date(stay.checkInAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-[#24211D] space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {/* Check In / Check Out Toggle */}
                  {isOccupied ? (
                    <button
                      type="button"
                      onClick={() => handleCheckOut(meta.roomNumber)}
                      className="w-full py-2 px-3 rounded-xl bg-[#E63946]/15 hover:bg-[#E63946]/25 border border-[#E63946]/40 text-[#FF8B94] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Check Out</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenCheckIn(meta)}
                      className="w-full py-2 px-3 rounded-xl bg-[#22C55E]/15 hover:bg-[#22C55E]/25 border border-[#22C55E]/40 text-[#86EFAC] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Check In Guest</span>
                    </button>
                  )}

                  {/* View Keycard & QR Code */}
                  <button
                    type="button"
                    onClick={() => handleOpenKeycard(meta)}
                    className="w-full py-2 px-3 rounded-xl bg-[#24211D] hover:bg-[#322E29] border border-[#3E3A33] text-[#E5D5B8] hover:text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5 text-[#C5A880]" />
                    <span>View Keycard</span>
                  </button>
                </div>

                {/* Secondary row: Edit Details & Guest Preview Helper */}
                <div className="flex items-center justify-between text-[11px] pt-0.5">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEditRoom(meta)}
                      className="text-[#C5A880] hover:text-[#E5D5B8] transition-colors flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <Edit className="w-3 h-3" />
                      <span>Edit Details</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyGuestLink(meta.roomNumber, stay.accessCode)}
                      className="text-[#8E877C] hover:text-[#C5A880] transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy Link</span>
                    </button>
                  </div>

                  {onSelectRoomForGuestView && (
                    <button
                      type="button"
                      onClick={() => onSelectRoomForGuestView(meta.roomNumber)}
                      className="text-[#D8D2C7] hover:text-white font-medium transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>Preview</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Check-In New Guest */}
      {checkInModalRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#191815] border border-[#3E3A33] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-[#F3EFEA]">
            <div className="flex items-start justify-between pb-3 border-b border-[#2C2A26]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/30 flex items-center justify-center text-[#22C55E]">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-serif-luxury text-[#F3EFEA]">
                    Check In Guest: Room {checkInModalRoom.roomNumber}
                  </h3>
                  <p className="text-xs text-[#A89F91]">
                    {checkInModalRoom.type}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCheckInModalRoom(null)}
                className="p-1 text-[#8E877C] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-[#A89F91] uppercase tracking-wider block mb-1">
                  Guest Name (Optional)
                </label>
                <input
                  type="text"
                  value={checkInGuestName}
                  onChange={(e) => setCheckInGuestName(e.target.value)}
                  placeholder="e.g. Mr. & Mrs. Davis"
                  className="w-full bg-[#141311] border border-[#2B2822] focus:border-[#C5A880] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] outline-none"
                />
              </div>

              <div className="bg-[#24211D] border border-[#3E3A33] rounded-xl p-3 text-xs text-[#D8D2C7] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#C5A880] shrink-0" />
                <span className="font-semibold text-[#E5D5B8]">
                  Automatic QR Passcode will be generated for this stay.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2C2A26]">
              <button
                type="button"
                onClick={() => setCheckInModalRoom(null)}
                className="px-4 py-2 rounded-lg bg-[#252320] text-xs font-semibold text-[#D8D2C7] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCheckIn}
                className="px-5 py-2 rounded-lg bg-[#22C55E] hover:bg-[#16A34A] text-[#121110] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm Check In</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Guest Keycard & QR Code Display */}
      {activeKeycardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-[#191815] border border-[#3E3A33] rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 text-[#F3EFEA] my-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-[#2C2A26]">
              <div>
                <h3 className="text-xl font-bold font-serif-luxury text-[#F3EFEA] flex items-center gap-2">
                  <span>Room {activeKeycardModal.roomNumber} Keycard &amp; QR Pass</span>
                </h3>
                <p className="text-xs text-[#A89F91]">
                  {activeKeycardModal.meta.type} • Floor {activeKeycardModal.meta.floor}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveKeycardModal(null)}
                className="p-1.5 text-[#8E877C] hover:text-white rounded-lg hover:bg-[#2A2824] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Luxury Keycard Presentation */}
            <div className="bg-[#FAF7F2] text-[#1C1B18] rounded-2xl p-6 shadow-xl border border-[#E5D5B8] flex flex-col items-center text-center space-y-4 relative overflow-hidden">
              {/* Hotel Branding */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#8C7A60] block">
                  MADIGUN HOTEL &amp; EVENTS
                </span>
                <h2 className="text-2xl font-bold font-serif-luxury tracking-wide text-[#1C1B18]">
                  Digital Concierge Access
                </h2>
              </div>

              {/* Room Badge */}
              <div className="bg-[#1C1B18] text-[#FAF7F2] px-4 py-1.5 rounded-full font-mono font-bold text-sm">
                ROOM {activeKeycardModal.roomNumber}
              </div>

              {/* QR Code Container */}
              <div className="bg-white p-3 rounded-xl shadow-md border border-[#E5D5B8]">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt={`Room ${activeKeycardModal.roomNumber} QR Code`}
                    className="w-44 h-44 object-contain"
                  />
                ) : (
                  <div className="w-44 h-44 flex items-center justify-center text-xs text-[#8E877C]">
                    Generating QR...
                  </div>
                )}
              </div>

              {/* Active Access Code Box */}
              {activeKeycardModal.stay.status === 'OCCUPIED' && activeKeycardModal.stay.accessCode ? (
                <div className="bg-[#F0EAE1] border border-[#D5C7B2] rounded-xl p-3 w-full max-w-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#8C7A60] block tracking-wider">
                    Guest Access Passcode
                  </span>
                  <span className="text-xl font-mono font-bold tracking-widest text-[#1C1B18]">
                    {activeKeycardModal.stay.accessCode}
                  </span>
                </div>
              ) : (
                <div className="bg-[#FEE2E2] border border-[#FCA5A5] rounded-xl p-2.5 w-full max-w-xs text-xs text-[#B91C1C] font-semibold">
                  Room is Checked Out. QR code access is currently inactive.
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handlePrintSlip}
                  className="py-2.5 rounded-xl bg-[#24211D] hover:bg-[#322E29] border border-[#3E3A33] text-[#E5D5B8] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Keycard Slip</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (qrCodeDataUrl) {
                      const link = document.createElement('a');
                      link.download = `madigun-room-${activeKeycardModal.roomNumber}-qr.png`;
                      link.href = qrCodeDataUrl;
                      link.click();
                    }
                  }}
                  className="py-2.5 rounded-xl bg-[#24211D] hover:bg-[#322E29] border border-[#3E3A33] text-[#E5D5B8] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PNG</span>
                </button>
              </div>

              {activeKeycardModal.stay.status === 'OCCUPIED' && (
                <div className="flex items-center justify-between pt-2 border-t border-[#2C2A26]">
                  <button
                    type="button"
                    onClick={() => handleRegenerateCode(activeKeycardModal.roomNumber)}
                    className="text-xs text-[#C5A880] hover:text-[#E5D5B8] flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Regenerate Passcode</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyGuestLink(activeKeycardModal.roomNumber, activeKeycardModal.stay.accessCode)}
                    className="text-xs text-[#D8D2C7] hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Direct Link</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Edit Room Details Modal */}
      {editingRoom && (
        <EditRoomModal
          isOpen={Boolean(editingRoom)}
          onClose={() => setEditingRoom(null)}
          roomNumber={editingRoom.roomNumber}
          currentStay={editingRoom.currentStay}
          onSave={handleSaveRoomDetails}
        />
      )}
    </div>
  );
};
