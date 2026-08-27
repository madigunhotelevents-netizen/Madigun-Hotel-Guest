import React, { useState, useEffect } from 'react';
import {
  Bell,
  Sparkles,
  BedDouble,
  Package,
  Wrench,
  Droplets,
  AlertTriangle,
  MessageSquare,
  DoorClosed,
  CheckCircle2,
  Clock,
  ChevronRight,
  RefreshCw,
  Moon,
  Sun,
  ShieldAlert,
  PhoneCall,
  KeyRound,
  Lock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { CATEGORIES_CONFIG, CategoryInfo, HotelRequest, RoomStay } from '../types/hotel';
import { RequestModal } from './RequestModal';
import { EmergencyModal } from './EmergencyModal';
import { ConfirmationView } from './ConfirmationView';
import {
  createNewRequest,
  getStoredRequests,
  subscribeToRequestEvents,
  getRoomStay,
  verifyRoomAccessCode,
} from '../services/storageService';
import { playConciergeBell, playUrgentAlert, playSuccessChime } from '../services/soundService';
import { useServiceSchedule } from '../services/scheduleService';

interface GuestViewProps {
  roomNumber: string;
  setRoomNumber?: (room: string) => void;
  soundEnabled: boolean;
}

export const GuestView: React.FC<GuestViewProps> = ({
  roomNumber,
  soundEnabled,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryInfo | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [activeConfirmation, setActiveConfirmation] = useState<HotelRequest | null>(null);
  const [roomRequests, setRoomRequests] = useState<HotelRequest[]>([]);
  const [roomStay, setRoomStay] = useState<RoomStay>(() => getRoomStay(roomNumber));
  
  // Access Passcode State
  const [enteredPasscode, setEnteredPasscode] = useState<string>('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const schedule = useServiceSchedule();

  // Check URL params for room access code without local/session cache
  const checkAccessAuth = (currentStay: RoomStay) => {
    // If room is checked out, no access is allowed
    if (currentStay.status === 'CHECKED_OUT') {
      setIsAuthenticated(false);
      return false;
    }

    // If already authenticated in current state for this room, maintain it if code still matches
    if (isAuthenticated) {
      return true;
    }

    // If room stay doesn't have an accessCode requirement, grant access
    if (!currentStay.accessCode) {
      setIsAuthenticated(true);
      return true;
    }

    return false;
  };

  // Sync active requests and room stay status for this room
  const refreshRoomData = () => {
    const all = getStoredRequests();
    const forThisRoom = all.filter((r) => r.roomNumber.toLowerCase() === roomNumber.toLowerCase());
    setRoomRequests(forThisRoom);
    
    const freshStay = getRoomStay(roomNumber);
    setRoomStay(freshStay);

    // If room checked out, immediately revoke access
    if (freshStay.status === 'CHECKED_OUT') {
      setIsAuthenticated(false);
    }

    // If we have an active confirmation, keep its status updated in real-time!
    if (activeConfirmation) {
      const updated = forThisRoom.find((r) => r.id === activeConfirmation.id);
      if (updated && updated.status !== activeConfirmation.status) {
        setActiveConfirmation(updated);
        if (soundEnabled && updated.status === 'COMPLETED') {
          playSuccessChime();
        }
      }
    }
  };

  useEffect(() => {
    // Reset authentication when roomNumber changes
    setIsAuthenticated(false);
    setEnteredPasscode('');
    setPasscodeError(null);
    refreshRoomData();

    const unsubscribe = subscribeToRequestEvents(() => {
      refreshRoomData();
    });
    return unsubscribe;
  }, [roomNumber]);

  // Handle manually entering room access passcode
  const handleVerifyPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeError(null);

    const cleanInput = enteredPasscode.trim().toUpperCase();
    if (!cleanInput) {
      setPasscodeError('Please enter the access passcode found on your keycard slip.');
      return;
    }

    if (verifyRoomAccessCode(roomNumber, cleanInput)) {
      setIsAuthenticated(true);
      setPasscodeError(null);
      if (soundEnabled) {
        playSuccessChime();
      }
    } else {
      setPasscodeError('Invalid passcode for Room ' + roomNumber + '. Please check your keycard slip or contact Front Desk.');
    }
  };

  // Handle service button click
  const handleSelectService = (cat: CategoryInfo) => {
    if (roomStay.status === 'CHECKED_OUT' || !isAuthenticated) return;
    if (cat.isEmergency) {
      setIsEmergencyModalOpen(true);
    } else {
      setSelectedCategory(cat);
      setIsRequestModalOpen(true);
    }
  };

  // Submit standard request
  const handleStandardSubmit = (additionalMessage: string) => {
    if (!selectedCategory || roomStay.status === 'CHECKED_OUT') return;
    const req = createNewRequest(roomNumber, selectedCategory.id, additionalMessage, false);
    setIsRequestModalOpen(false);
    setSelectedCategory(null);
    setActiveConfirmation(req);

    if (soundEnabled) {
      playConciergeBell();
    }
  };

  // Submit emergency request
  const handleEmergencySubmit = (urgentNotes: string) => {
    if (roomStay.status === 'CHECKED_OUT') return;
    const req = createNewRequest(roomNumber, 'Emergency Assistance', urgentNotes, true);
    setIsEmergencyModalOpen(false);
    setActiveConfirmation(req);

    if (soundEnabled) {
      playUrgentAlert();
    }
  };

  // If in confirmation view state
  if (activeConfirmation) {
    return (
      <ConfirmationView
        request={activeConfirmation}
        onBackToHome={() => setActiveConfirmation(null)}
        onNewRequest={() => {
          setActiveConfirmation(null);
        }}
      />
    );
  }

  // State 1: If room is currently checked out, display the checkout protective screen
  if (roomStay.status === 'CHECKED_OUT') {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center space-y-6 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-[#261517] border border-[#E63946]/50 flex items-center justify-center mx-auto text-[#E63946] shadow-xl">
          <DoorClosed className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 bg-[#1E1C19] border border-[#33302A] rounded-full px-4 py-1 text-xs">
            <span className="text-[#9E978C] uppercase font-semibold">Room</span>
            <span className="font-bold text-[#F3EFEA] font-mono">{roomNumber}</span>
            <span className="text-[#FCA5A5] font-bold uppercase">• Checked Out</span>
          </div>

          <h2 className="text-2xl font-bold font-serif-luxury text-[#F3EFEA]">
            Room Currently Checked Out
          </h2>

          <p className="text-xs sm:text-sm text-[#A89F91] leading-relaxed max-w-sm mx-auto">
            Thank you for staying at <strong>Madigun Hotel &amp; Events</strong>. Digital guest services for Room {roomNumber} are currently dormant following guest checkout.
          </p>
        </div>

        <div className="bg-[#191815] border border-[#2F2C26] rounded-2xl p-5 text-left space-y-3 text-xs">
          <div className="flex items-center gap-2 text-[#C5A880] font-bold uppercase tracking-wider text-[11px]">
            <PhoneCall className="w-4 h-4" />
            <span>Need Assistance?</span>
          </div>
          <p className="text-[#D8D2C7] leading-relaxed">
            If you have just arrived and checked into Room {roomNumber}, please inform the Front Desk receptionist so they can activate your room's digital concierge.
          </p>
          <div className="pt-2 border-t border-[#292621] text-[#8E877C] flex justify-between items-center text-[11px]">
            <span>Front Desk Dial: <strong>Ext. 0</strong> or <strong>Ext. 100</strong></span>
            <button
              type="button"
              onClick={refreshRoomData}
              className="text-[#C5A880] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Check Status</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // State 2: Room is OCCUPIED, but requires Passcode Verification
  if (!isAuthenticated && roomStay.accessCode) {
    return (
      <div className="max-w-md mx-auto px-4 py-10 space-y-6 animate-fade-in">
        {/* Verification Card */}
        <div className="bg-[#171614] border border-[#2C2A26] rounded-2xl p-6 sm:p-7 shadow-2xl text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-[#C5A880]/15 border border-[#C5A880]/30 flex items-center justify-center mx-auto text-[#C5A880] shadow-md">
            <KeyRound className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 bg-[#121110] border border-[#2A2823] rounded-full px-3.5 py-1 text-xs">
              <span className="text-[#8E877C] uppercase font-semibold">In-Room Concierge</span>
              <span className="font-bold text-[#C5A880] font-mono">Room {roomNumber}</span>
            </div>

            <h2 className="text-2xl font-bold font-serif-luxury text-[#F3EFEA]">
              Guest Access Verification
            </h2>

            <p className="text-xs text-[#A89F91] leading-relaxed max-w-xs mx-auto">
              Please enter the <strong>Guest Access Code</strong> printed on your keycard slip, or scan the QR code located in your room.
            </p>
          </div>

          {passcodeError && (
            <div className="bg-[#E63946]/15 border border-[#E63946]/30 text-[#FF8B94] rounded-xl p-3 text-xs flex items-center gap-2 text-left">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{passcodeError}</span>
            </div>
          )}

          <form onSubmit={handleVerifyPasscode} className="space-y-4 text-left">
            <div>
              <label className="text-[11px] font-semibold text-[#A89F91] uppercase tracking-wider block mb-1.5">
                Room {roomNumber} Access Code
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#7E786E] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={enteredPasscode}
                  onChange={(e) => setEnteredPasscode(e.target.value.toUpperCase())}
                  placeholder="e.g. MDG-1014"
                  className="w-full bg-[#121110] border border-[#2B2822] focus:border-[#C5A880] rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono tracking-widest text-[#F3EFEA] placeholder-[#7E786E] outline-none transition-all uppercase"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-[#C5A880] hover:bg-[#B39366] text-[#121110] font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
            >
              <span>Unlock Concierge Services</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-4 border-t border-[#24211D] text-center space-y-1">
            <span className="text-[11px] text-[#7E786E] block">
              Lost your keycard slip or need code assistance?
            </span>
            <span className="text-xs text-[#C5A880] font-semibold block">
              Contact Front Desk: Ext. 0 or Ext. 100
            </span>
          </div>
        </div>
      </div>
    );
  }

  // State 3: Authenticated Occupied Guest View
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-5">
      {/* Top Banner / Room Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 bg-[#1E1C19] border border-[#33302A] rounded-full px-4 py-1.5 shadow-sm">
          <DoorClosed className="w-3.5 h-3.5 text-[#C5A880]" />
          <span className="text-xs text-[#9E978C] uppercase tracking-wider font-semibold">
            Room:
          </span>
          <span className="text-xs font-bold text-[#C5A880] font-mono tracking-wide">
            {roomNumber}
          </span>
          <span className="text-[10px] text-[#22C55E] font-semibold bg-[#22C55E]/15 px-2 py-0.5 rounded-full border border-[#22C55E]/30">
            Active Stay
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold font-serif-luxury tracking-wide text-[#F3EFEA] pt-1">
          MADIGUN HOTEL &amp; EVENTS
        </h1>
        <p className="text-xs text-[#A89F91]">
          Digital In-Room Concierge &amp; Hospitality Services
        </p>
      </div>

      {/* Service Schedule Timer Banner (10 PM to 6 AM Off Duty) */}
      {schedule.isOffDuty ? (
        <div className="bg-[#241A14] border border-[#EAB308]/40 rounded-xl p-3.5 sm:p-4 text-[#F3EFEA] shadow-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#EAB308]/20 border border-[#EAB308]/40 flex items-center justify-center text-[#FDE047] shrink-0">
                <Moon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-[#FDE047] tracking-wide">
                  Housekeeping &amp; Concierge: Off Duty (10:00 PM – 6:00 AM)
                </h3>
                <span className="text-[11px] text-[#D8D2C7] block">
                  Services resume at 6:00 AM
                </span>
              </div>
            </div>

            <div className="text-right shrink-0 bg-[#16120D] border border-[#3A2E1F] px-3 py-1.5 rounded-lg">
              <span className="text-[10px] text-[#A89F91] uppercase tracking-wider block font-semibold">
                Resumes in
              </span>
              <span className="text-xs sm:text-sm font-bold font-mono text-[#FDE047]">
                {schedule.formattedCountdown}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#171614] border border-[#2A2823] rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs text-[#B8B2A7]">
          <div className="flex items-center gap-2">
            <Sun className="w-3.5 h-3.5 text-[#C5A880]" />
            <span className="font-semibold text-[#F3EFEA]">
              Housekeeping &amp; Concierge On Duty (6:00 AM – 10:00 PM)
            </span>
          </div>
          <span className="text-[11px] font-mono text-[#C5A880]">
            Until 10:00 PM ({schedule.formattedCountdown})
          </span>
        </div>
      )}

      {/* Emergency Assistance Button */}
      {(() => {
        const emergencyCat = CATEGORIES_CONFIG.find((c) => c.isEmergency);
        if (!emergencyCat) return null;
        return (
          <button
            type="button"
            onClick={() => handleSelectService(emergencyCat)}
            className="w-full bg-[#2A1517] hover:bg-[#381B1E] border-2 border-[#E63946]/80 hover:border-[#E63946] text-white p-3.5 rounded-xl transition-all shadow-lg flex items-center justify-between gap-4 group cursor-pointer focus-visible:ring-2 focus-visible:ring-[#E63946] focus-visible:outline-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#E63946]/20 border border-[#E63946]/50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <AlertTriangle className="w-5 h-5 text-[#E63946] animate-pulse" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#E63946] bg-[#E63946]/20 px-1.5 py-0.5 rounded">
                    Urgent
                  </span>
                  <h3 className="text-base font-bold font-serif-luxury text-white">
                    Emergency Assistance
                  </h3>
                </div>
                <span className="text-xs text-[#FCA5A5] block">
                  Immediate dispatch for medical or safety concerns
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#E63946] shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </button>
        );
      })()}

      {/* Primary Guest Service Category Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
        {CATEGORIES_CONFIG.filter((c) => !c.isEmergency).map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => handleSelectService(cat)}
            className="w-full text-left bg-[#1B1917] hover:bg-[#24211D] border border-[#2F2C26] hover:border-[#C5A880]/60 p-3.5 rounded-xl transition-all shadow-sm flex items-center justify-between gap-3 group focus-visible:ring-2 focus-visible:ring-[#C5A880] focus-visible:outline-none cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl shrink-0 p-1.5 rounded-lg bg-[#121110] border border-[#292621]">
                {cat.emoji}
              </span>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-[#F3EFEA] tracking-wide group-hover:text-[#C5A880] transition-colors truncate">
                  {cat.label}
                </h3>
                <span className="text-[11px] text-[#8E877C] line-clamp-1 block">
                  {cat.description}
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8E877C] group-hover:text-[#C5A880] group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>
        ))}
      </div>

      {/* Active In-Room Request Tracker */}
      {roomRequests.length > 0 && (
        <div className="mt-6 pt-5 border-t border-[#262421] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#C5A880] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Active Requests for Room {roomNumber}</span>
            </span>
            <button
              type="button"
              onClick={refreshRoomData}
              className="text-[#8E877C] hover:text-[#F3EFEA] text-[11px] flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="space-y-2">
            {roomRequests.map((req) => (
              <div
                key={req.id}
                onClick={() => setActiveConfirmation(req)}
                className="bg-[#171614] border border-[#2A2823] hover:border-[#3E3A33] p-3 rounded-xl flex items-center justify-between gap-3 text-xs transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      req.status === 'NEW'
                        ? 'bg-[#E63946] animate-pulse'
                        : req.status === 'IN_PROGRESS'
                        ? 'bg-[#C5A880]'
                        : 'bg-[#22C55E]'
                    }`}
                  />
                  <div className="min-w-0">
                    <span className="font-bold text-[#F3EFEA] block truncate">
                      {req.category}
                    </span>
                    <span className="text-[#8E877C] text-[10px]">
                      {new Date(req.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      req.status === 'NEW'
                        ? 'bg-[#E63946]/15 text-[#FF8B94]'
                        : req.status === 'IN_PROGRESS'
                        ? 'bg-[#C5A880]/15 text-[#E5D5B8]'
                        : 'bg-[#22C55E]/15 text-[#86EFAC]'
                    }`}
                  >
                    {req.status === 'NEW'
                      ? 'Queued'
                      : req.status === 'IN_PROGRESS'
                      ? 'En Route'
                      : 'Completed'}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#8E877C]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Service Request Modal */}
      {selectedCategory && (
        <RequestModal
          isOpen={isRequestModalOpen}
          onClose={() => {
            setIsRequestModalOpen(false);
            setSelectedCategory(null);
          }}
          category={selectedCategory}
          roomNumber={roomNumber}
          onSubmit={handleStandardSubmit}
        />
      )}

      {/* Emergency Request Modal */}
      <EmergencyModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
        roomNumber={roomNumber}
        onSubmit={handleEmergencySubmit}
      />
    </div>
  );
};
