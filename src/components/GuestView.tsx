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
} from 'lucide-react';
import { CATEGORIES_CONFIG, CategoryInfo, HotelRequest } from '../types/hotel';
import { RequestModal } from './RequestModal';
import { EmergencyModal } from './EmergencyModal';
import { ConfirmationView } from './ConfirmationView';
import { createNewRequest, getStoredRequests, subscribeToRequestEvents } from '../services/storageService';
import { playConciergeBell, playUrgentAlert, playSuccessChime } from '../services/soundService';

interface GuestViewProps {
  roomNumber: string;
  setRoomNumber: (room: string) => void;
  soundEnabled: boolean;
}

export const GuestView: React.FC<GuestViewProps> = ({
  roomNumber,
  setRoomNumber,
  soundEnabled,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryInfo | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [activeConfirmation, setActiveConfirmation] = useState<HotelRequest | null>(null);
  const [isEditingRoom, setIsEditingRoom] = useState(false);
  const [tempRoomInput, setTempRoomInput] = useState(roomNumber);
  const [roomRequests, setRoomRequests] = useState<HotelRequest[]>([]);

  // Sync active requests for this room
  const refreshRoomData = () => {
    const all = getStoredRequests();
    const forThisRoom = all.filter((r) => r.roomNumber.toLowerCase() === roomNumber.toLowerCase());
    setRoomRequests(forThisRoom);

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
    refreshRoomData();
    const unsubscribe = subscribeToRequestEvents(() => {
      refreshRoomData();
    });
    return unsubscribe;
  }, [roomNumber, activeConfirmation]);

  // Handle service button click
  const handleSelectService = (cat: CategoryInfo) => {
    if (cat.isEmergency) {
      setIsEmergencyModalOpen(true);
    } else {
      setSelectedCategory(cat);
      setIsRequestModalOpen(true);
    }
  };

  // Submit standard request
  const handleStandardSubmit = (additionalMessage: string) => {
    if (!selectedCategory) return;
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
    const req = createNewRequest(roomNumber, 'Emergency Assistance', urgentNotes, true);
    setIsEmergencyModalOpen(false);
    setActiveConfirmation(req);

    if (soundEnabled) {
      playUrgentAlert();
    }
  };

  // Icon selector
  const getCategoryIcon = (cat: CategoryInfo) => {
    switch (cat.id) {
      case 'Contact Front Desk':
        return <Bell className="w-6 h-6 text-[#C5A880]" />;
      case 'Housekeeping':
        return <Sparkles className="w-6 h-6 text-[#C5A880]" />;
      case 'Extra Pillow / Blanket':
        return <BedDouble className="w-6 h-6 text-[#C5A880]" />;
      case 'Toiletries':
        return <Package className="w-6 h-6 text-[#C5A880]" />;
      case 'Maintenance':
        return <Wrench className="w-6 h-6 text-[#C5A880]" />;
      case 'Water':
        return <Droplets className="w-6 h-6 text-[#C5A880]" />;
      case 'Emergency Assistance':
        return <AlertTriangle className="w-7 h-7 text-[#E63946]" />;
      default:
        return <MessageSquare className="w-6 h-6 text-[#C5A880]" />;
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Top Banner / Hero */}
      <div className="text-center space-y-2 relative">
        {/* Room Identification Pill */}
        <div className="inline-flex items-center gap-2 bg-[#1E1C19] border border-[#33302A] rounded-full px-3.5 py-1.5 shadow-sm">
          <DoorClosed className="w-3.5 h-3.5 text-[#C5A880]" />
          <span className="text-xs text-[#9E978C] uppercase tracking-wider font-semibold">
            Your Room:
          </span>
          {isEditingRoom ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (tempRoomInput.trim()) {
                  setRoomNumber(tempRoomInput.trim());
                  // Also update URL search param cleanly
                  const url = new URL(window.location.href);
                  url.searchParams.set('room', tempRoomInput.trim());
                  window.history.replaceState({}, '', url.toString());
                }
                setIsEditingRoom(false);
              }}
              className="flex items-center gap-1"
            >
              <input
                type="text"
                value={tempRoomInput}
                onChange={(e) => setTempRoomInput(e.target.value)}
                autoFocus
                className="w-16 bg-[#141311] border border-[#C5A880] rounded px-1.5 py-0.5 text-xs text-[#F3EFEA] font-mono outline-none text-center font-bold"
              />
              <button
                type="submit"
                className="text-[11px] bg-[#C5A880] text-[#121110] px-2 py-0.5 rounded font-bold"
              >
                Save
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setTempRoomInput(roomNumber);
                setIsEditingRoom(true);
              }}
              className="text-xs font-bold text-[#F3EFEA] font-mono hover:text-[#C5A880] transition-colors underline decoration-dotted underline-offset-2"
              title="Click to change room number"
            >
              Room {roomNumber}
            </button>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold font-serif-luxury tracking-wide text-[#F3EFEA] pt-1">
          MADIGUN HOTEL &amp; EVENTS
        </h1>
        <p className="text-sm sm:text-base text-[#C5A880] font-medium tracking-wide">
          How may we assist you?
        </p>
      </div>

      {/* Emergency Assistance Button (Visually Distinct Top/Prominent Anchor) */}
      {(() => {
        const emergencyCat = CATEGORIES_CONFIG.find((c) => c.isEmergency);
        if (!emergencyCat) return null;
        return (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => handleSelectService(emergencyCat)}
              className="w-full bg-[#2A1517] hover:bg-[#381B1E] border-2 border-[#E63946]/80 hover:border-[#E63946] text-white p-4 rounded-xl transition-all shadow-lg flex items-center justify-between gap-4 group cursor-pointer focus-visible:ring-2 focus-visible:ring-[#E63946] focus-visible:outline-none"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-lg bg-[#E63946]/20 border border-[#E63946]/50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <AlertTriangle className="w-7 h-7 text-[#E63946] animate-pulse" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-[#E63946] bg-[#E63946]/20 px-2 py-0.5 rounded">
                      Urgent
                    </span>
                    <h3 className="text-base sm:text-lg font-bold font-serif-luxury text-white">
                      Emergency Assistance
                    </h3>
                  </div>
                  <p className="text-xs text-[#FFB4BE] line-clamp-1 mt-0.5">
                    Direct urgent front desk dispatch to your room
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#E63946] shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        );
      })()}

      {/* Primary Guest Service Category Grid (Large, Touch-Friendly Buttons) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
        {CATEGORIES_CONFIG.filter((c) => !c.isEmergency).map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => handleSelectService(cat)}
            className="w-full text-left bg-[#1B1917] hover:bg-[#24211D] border border-[#2F2C26] hover:border-[#C5A880]/60 p-4 rounded-xl transition-all shadow-sm flex items-center justify-between gap-3 group focus-visible:ring-2 focus-visible:ring-[#C5A880] focus-visible:outline-none cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-lg bg-[#141311] border border-[#2E2B25] flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:border-[#C5A880]/40 transition-transform">
                {getCategoryIcon(cat)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm sm:text-base font-semibold text-[#F3EFEA] group-hover:text-[#C5A880] transition-colors truncate">
                    {cat.label}
                  </h3>
                </div>
                <p className="text-xs text-[#9E978C] truncate mt-0.5">
                  {cat.description}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#5A554D] group-hover:text-[#C5A880] shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </button>
        ))}
      </div>

      {/* Active Room Requests Tray (Real-time Live Tracker for this room) */}
      {roomRequests.length > 0 && (
        <div className="mt-8 pt-6 border-t border-[#262421]">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs uppercase tracking-wider font-semibold text-[#B8B2A7] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Recent Requests for Room {roomNumber}</span>
            </h4>
            <button
              type="button"
              onClick={refreshRoomData}
              className="text-xs text-[#9E978C] hover:text-[#F3EFEA] flex items-center gap-1"
              title="Refresh status"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="space-y-2">
            {roomRequests.slice(0, 3).map((req) => (
              <div
                key={req.id}
                onClick={() => setActiveConfirmation(req)}
                className="bg-[#171614] border border-[#2C2A26] hover:border-[#C5A880]/50 p-3 rounded-lg flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-base shrink-0">
                    {req.isEmergency ? '🚨' : '🛎️'}
                  </span>
                  <div className="min-w-0">
                    <span className="font-semibold text-[#F3EFEA] block truncate">
                      {req.category}
                    </span>
                    {req.additionalMessage && (
                      <span className="text-[#8E877C] block truncate italic">
                        "{req.additionalMessage}"
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {req.status === 'NEW' && (
                    <span className="px-2 py-0.5 rounded-full bg-[#3B82F6]/20 text-[#93C5FD] font-semibold text-[10px]">
                      Queued
                    </span>
                  )}
                  {req.status === 'IN_PROGRESS' && (
                    <span className="px-2 py-0.5 rounded-full bg-[#EAB308]/20 text-[#FDE047] font-semibold text-[10px]">
                      In Progress
                    </span>
                  )}
                  {req.status === 'COMPLETED' && (
                    <span className="px-2 py-0.5 rounded-full bg-[#22C55E]/20 text-[#86EFAC] font-semibold text-[10px] flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Completed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Info */}
      <footer className="text-center pt-4 pb-2 text-xs text-[#706B62] space-y-1">
        <p>Madigun Hotel &amp; Events • 24/7 Concierge &amp; In-Room Assistance</p>
        <p>Instant digital room request • No app download required</p>
      </footer>

      {/* Modals */}
      <RequestModal
        roomNumber={roomNumber}
        category={selectedCategory}
        isOpen={isRequestModalOpen}
        onClose={() => {
          setIsRequestModalOpen(false);
          setSelectedCategory(null);
        }}
        onSubmit={handleStandardSubmit}
      />

      <EmergencyModal
        roomNumber={roomNumber}
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
        onConfirm={handleEmergencySubmit}
      />
    </div>
  );
};
