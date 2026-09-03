import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  Sparkles,
  BedDouble,
  Package,
  Wrench,
  UtensilsCrossed,
  Droplets,
  Shirt,
  AlertTriangle,
  MessageSquare,
  CheckCircle2,
  Clock,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Search,
  Users,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  SlidersHorizontal,
  Plus,
  Trash2,
  Lock,
  UserCheck,
  User,
  Building,
  DoorClosed,
  Check,
  Ban,
  Radio,
  Hourglass,
  ArrowDownUp,
} from 'lucide-react';
import { HotelRequest, UserProfile, RoomStay } from '../types/hotel';
import {
  getStoredRequests,
  updateRequestStatus,
  deleteRequest,
  resetToDemoRequests,
  subscribeToRequestEvents,
  createNewRequest,
  fetchRequestsFromServer,
  getRoomStay,
  getAllRoomStays,
  setRoomStayStatus,
} from '../services/storageService';
import { playConciergeBell, playUrgentAlert, playSuccessChime } from '../services/soundService';
import { AssignPersonnelModal } from './AssignPersonnelModal';
import { CreateAccountModal } from './CreateAccountModal';
import { CreateStaffMemberModal } from './CreateStaffMemberModal';

interface FrontDeskViewProps {
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  onNavigateToGuest?: (roomNumber: string) => void;
  currentUser: UserProfile | null;
  onOpenLoginModal?: () => void;
}

export const FrontDeskView: React.FC<FrontDeskViewProps> = ({
  soundEnabled,
  setSoundEnabled,
  onNavigateToGuest,
  currentUser,
  onOpenLoginModal,
}) => {
  const [requests, setRequests] = useState<HotelRequest[]>([]);
  const [roomStays, setRoomStays] = useState<RoomStay[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'ACTIVE'>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickTestModalOpen, setQuickTestModalOpen] = useState(false);
  const [showRoomCheckoutManager, setShowRoomCheckoutManager] = useState(false);

  // Personnel Assignment Modal state
  const [assigningRequest, setAssigningRequest] = useState<HotelRequest | null>(null);
  const [isCreateAccountModalOpen, setIsCreateAccountModalOpen] = useState(false);
  const [isCreateStaffModalOpen, setIsCreateStaffModalOpen] = useState(false);

  // Test request modal form state
  const [testRoom, setTestRoom] = useState('101');
  const [testCategory, setTestCategory] = useState<HotelRequest['category']>('Housekeeping');
  const [testMessage, setTestMessage] = useState('');

  const isDeveloper = currentUser?.role === 'developer' || currentUser?.isPrimaryDeveloper;

  const loadRequests = () => {
    setRequests(getStoredRequests());
    setRoomStays(getAllRoomStays());
  };

  useEffect(() => {
    loadRequests();

    // Initial server fetch to hydrate Firestore data
    fetchRequestsFromServer().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setRequests(data);
      }
    });

    const unsubscribe = subscribeToRequestEvents((event) => {
      loadRequests();
      if (event.type === 'NEW_REQUEST_SUBMITTED' && event.request) {
        if (soundEnabled) {
          if (event.request.isEmergency) {
            playUrgentAlert();
          } else {
            playConciergeBell();
          }
        }
      }
    });

    return unsubscribe;
  }, [soundEnabled]);

  // Request Action Handlers
  const handleOpenAcceptModal = (req: HotelRequest) => {
    setAssigningRequest(req);
  };

  const handleConfirmAssignment = (personnel: {
    staffId?: string;
    name: string;
    roleTitle?: string;
    department?: string;
    notes?: string;
  }) => {
    if (!assigningRequest) return;
    const updated = updateRequestStatus(assigningRequest.id, 'IN_PROGRESS', personnel);
    setRequests(updated);
    setAssigningRequest(null);
  };

  const handleComplete = (id: string, staffName?: string) => {
    const defaultStaff = staffName || currentUser?.name || 'Front Desk Staff';
    const res = updateRequestStatus(id, 'COMPLETED', defaultStaff);
    setRequests(res);
    if (soundEnabled) {
      playSuccessChime();
    }
  };

  const handleReopen = (id: string) => {
    const res = updateRequestStatus(id, 'NEW');
    setRequests(res);
  };

  const handleDelete = (id: string) => {
    const res = deleteRequest(id);
    setRequests(res);
  };

  const handleResetDemo = () => {
    const res = resetToDemoRequests();
    setRequests(res);
  };

  const handleCreateTestRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const req = createNewRequest(testRoom, testCategory, testMessage, testCategory === 'Emergency Assistance');
    loadRequests();
    setQuickTestModalOpen(false);
    if (soundEnabled) {
      if (req.isEmergency) playUrgentAlert();
      else playConciergeBell();
    }
  };

  // Toggle Room Occupancy / Checkout status
  const handleToggleRoomCheckout = (roomNum: string, currentStatus: 'OCCUPIED' | 'CHECKED_OUT') => {
    const nextStatus = currentStatus === 'OCCUPIED' ? 'CHECKED_OUT' : 'OCCUPIED';
    setRoomStayStatus(roomNum, nextStatus);
    setRoomStays(getAllRoomStays());
  };

  // FIRST-COME-FIRST-SERVED (FIFO) SORTING:
  // Active / New / In-Progress requests are sorted by createdAt ASCENDING (Oldest first)
  // Emergencies are prioritized at the top of active queue, followed by oldest to newest requests.
  const filteredRequests = useMemo(() => {
    const list = requests.filter((req) => {
      // Status filter
      if (statusFilter === 'ACTIVE' && req.status === 'COMPLETED') return false;
      if (statusFilter === 'NEW' && req.status !== 'NEW') return false;
      if (statusFilter === 'IN_PROGRESS' && req.status !== 'IN_PROGRESS') return false;
      if (statusFilter === 'COMPLETED' && req.status !== 'COMPLETED') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesRoom = req.roomNumber.toLowerCase().includes(q);
        const matchesCategory = req.category.toLowerCase().includes(q);
        const matchesMsg = req.additionalMessage.toLowerCase().includes(q);
        const matchesStaff = (req.assignedStaffName || req.acceptedByStaffName || '').toLowerCase().includes(q);
        return matchesRoom || matchesCategory || matchesMsg || matchesStaff;
      }

      return true;
    });

    // FIFO Sorting Rule:
    // If viewing completed items only: Sort by completedAt descending (most recently completed first)
    if (statusFilter === 'COMPLETED') {
      return list.sort((a, b) => (b.completedAt || b.createdAt) - (a.completedAt || a.createdAt));
    }

    // For Active / New / In-Progress / All:
    // 1. Uncompleted emergencies first (FIFO among emergencies)
    // 2. Active New & In-Progress requests sorted by OLDEST FIRST (a.createdAt - b.createdAt)
    // 3. Completed items at the bottom
    return list.sort((a, b) => {
      const aIsActive = a.status !== 'COMPLETED';
      const bIsActive = b.status !== 'COMPLETED';

      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;

      // Both active
      if (aIsActive && bIsActive) {
        if (a.isEmergency && !b.isEmergency) return -1;
        if (!a.isEmergency && b.isEmergency) return 1;
        // Oldest request first (First-Come, First-Served)
        return a.createdAt - b.createdAt;
      }

      // Both completed
      return (b.completedAt || b.createdAt) - (a.completedAt || a.createdAt);
    });
  }, [requests, statusFilter, searchQuery]);

  // Counts
  const counts = useMemo(() => {
    const newCount = requests.filter((r) => r.status === 'NEW').length;
    const progressCount = requests.filter((r) => r.status === 'IN_PROGRESS').length;
    const completedCount = requests.filter((r) => r.status === 'COMPLETED').length;
    const emergencyCount = requests.filter((r) => r.isEmergency && r.status !== 'COMPLETED').length;
    return {
      new: newCount,
      inProgress: progressCount,
      completed: completedCount,
      active: newCount + progressCount,
      total: requests.length,
      emergency: emergencyCount,
    };
  }, [requests]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Contact Front Desk':
        return <Bell className="w-4 h-4 text-[#C5A880]" />;
      case 'Housekeeping':
        return <Sparkles className="w-4 h-4 text-[#C5A880]" />;
      case 'Extra Pillow / Blanket':
        return <BedDouble className="w-4 h-4 text-[#C5A880]" />;
      case 'Toiletries':
        return <Package className="w-4 h-4 text-[#C5A880]" />;
      case 'Maintenance':
        return <Wrench className="w-4 h-4 text-[#C5A880]" />;
      case 'Room Service':
        return <UtensilsCrossed className="w-4 h-4 text-[#C5A880]" />;
      case 'Water':
        return <Droplets className="w-4 h-4 text-[#C5A880]" />;
      case 'Laundry':
        return <Shirt className="w-4 h-4 text-[#C5A880]" />;
      case 'Emergency Assistance':
        return <AlertTriangle className="w-4 h-4 text-[#E63946]" />;
      default:
        return <MessageSquare className="w-4 h-4 text-[#C5A880]" />;
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const elapsedSec = Math.floor((Date.now() - timestamp) / 1000);
    if (elapsedSec < 30) return 'Just now';
    if (elapsedSec < 60) return `${elapsedSec}s ago`;
    const mins = Math.floor(elapsedSec / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ago`;
  };

  // Rooms list for checkout manager
  const ALL_ROOMS = ['101', '102', '103', '104', '105', '201', '202', '203', '204', '205', '301', '302', '305', '308'];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Top Header & Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2C2A26] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-[#C5A880] font-semibold flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-[#22C55E] animate-pulse" />
              <span>Real-Time Request Dispatch</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif-luxury text-[#F3EFEA] flex items-center gap-3">
            <span>Front Desk Dispatch Queue</span>
            <span className="text-xs font-sans font-normal px-2.5 py-1 rounded-full bg-[#262420] text-[#C5A880] border border-[#3E3A33]">
              First-Come, First-Served (FIFO)
            </span>
          </h1>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Room Checkout & Occupancy Manager Button */}
          <button
            type="button"
            onClick={() => setShowRoomCheckoutManager(!showRoomCheckoutManager)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              showRoomCheckoutManager
                ? 'bg-[#C5A880] text-[#121110] border-[#C5A880]'
                : 'bg-[#1C1B18] text-[#D8D2C7] border-[#38342E] hover:border-[#C5A880]'
            }`}
          >
            <DoorClosed className="w-3.5 h-3.5" />
            <span>Room Checkout Control</span>
          </button>

          {/* Simulate In-Room Request */}
          <button
            type="button"
            onClick={() => setQuickTestModalOpen(true)}
            className="px-3 py-2 rounded-lg bg-[#2A2824] hover:bg-[#35322E] text-[#D8D2C7] text-xs font-medium border border-[#3E3A33] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#C5A880]" />
            <span>Test Request</span>
          </button>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              soundEnabled
                ? 'bg-[#1C1B18] border-[#38342E] text-[#C5A880]'
                : 'bg-[#1C1B18] border-[#38342E] text-[#6E685E]'
            }`}
            title={soundEnabled ? 'Mute Alert Bells' : 'Enable Alert Bells'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Reset Demo Requests */}
          <button
            type="button"
            onClick={handleResetDemo}
            className="p-2 rounded-lg bg-[#1C1B18] border border-[#38342E] text-[#8E877C] hover:text-[#F3EFEA] hover:bg-[#252320] transition-colors cursor-pointer"
            title="Reset to default demo requests"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Room Checkout & Occupancy Control Drawer (Method for preventing checked-out guest access) */}
      {showRoomCheckoutManager && (
        <div className="bg-[#1A1916] border border-[#C5A880]/40 rounded-2xl p-4 sm:p-5 space-y-4 animate-fade-in shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2D2A24] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <DoorClosed className="w-4 h-4 text-[#C5A880]" />
                <h3 className="text-sm sm:text-base font-bold text-[#F3EFEA] font-serif-luxury">
                  Room Stay Status &amp; Digital Checkout Access Control
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowRoomCheckoutManager(false)}
              className="text-xs text-[#8E877C] hover:text-[#F3EFEA] underline self-start sm:self-center"
            >
              Hide Panel
            </button>
          </div>

          {/* Rooms Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 pt-1">
            {ALL_ROOMS.map((rm) => {
              const stay = getRoomStay(rm);
              const isOccupied = stay.status === 'OCCUPIED';

              return (
                <div
                  key={rm}
                  className={`p-3 rounded-xl border transition-all text-center space-y-2 ${
                    isOccupied
                      ? 'bg-[#141311] border-[#2E2B25]'
                      : 'bg-[#261517] border-[#E63946]/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm text-[#F3EFEA]">
                      Rm {rm}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isOccupied ? 'bg-[#22C55E]' : 'bg-[#E63946]'
                      }`}
                    />
                  </div>

                  <div className="text-[10px] uppercase font-bold tracking-wider">
                    {isOccupied ? (
                      <span className="text-[#86EFAC]">Occupied</span>
                    ) : (
                      <span className="text-[#FCA5A5]">Checked Out</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleRoomCheckout(rm, stay.status)}
                    className={`w-full py-1 rounded text-[11px] font-bold transition-all ${
                      isOccupied
                        ? 'bg-[#252320] hover:bg-[#E63946] text-[#B8B2A7] hover:text-white border border-[#3A362F]'
                        : 'bg-[#22C55E] hover:bg-[#16A34A] text-[#121110]'
                    }`}
                  >
                    {isOccupied ? 'Check Out' : 'Check In'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => setStatusFilter('ACTIVE')}
          className={`p-4 rounded-xl border text-left transition-all ${
            statusFilter === 'ACTIVE'
              ? 'bg-[#25221C] border-[#C5A880] shadow-md ring-1 ring-[#C5A880]/50'
              : 'bg-[#181715] border-[#2E2B25] hover:border-[#423E35]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#A89F91] font-medium uppercase tracking-wider">Active Queue</span>
            <Hourglass className="w-4 h-4 text-[#C5A880]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-[#F3EFEA] mt-1">
            {counts.active}
          </div>
          <span className="text-[11px] text-[#A89F91] block mt-0.5">First-Come First-Served</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('NEW')}
          className={`p-4 rounded-xl border text-left transition-all ${
            statusFilter === 'NEW'
              ? 'bg-[#1D2535] border-[#3B82F6] shadow-md ring-1 ring-[#3B82F6]/50'
              : 'bg-[#181715] border-[#2E2B25] hover:border-[#423E35]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#93C5FD] font-medium uppercase tracking-wider">Unassigned New</span>
            <Bell className="w-4 h-4 text-[#3B82F6]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-[#93C5FD] mt-1">
            {counts.new}
          </div>
          <span className="text-[11px] text-[#8E877C] block mt-0.5">Awaiting Acceptance</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('IN_PROGRESS')}
          className={`p-4 rounded-xl border text-left transition-all ${
            statusFilter === 'IN_PROGRESS'
              ? 'bg-[#2A2414] border-[#EAB308] shadow-md ring-1 ring-[#EAB308]/50'
              : 'bg-[#181715] border-[#2E2B25] hover:border-[#423E35]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#FDE047] font-medium uppercase tracking-wider">In Progress</span>
            <UserCheck className="w-4 h-4 text-[#EAB308]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-[#FDE047] mt-1">
            {counts.inProgress}
          </div>
          <span className="text-[11px] text-[#8E877C] block mt-0.5">Assigned to Staff</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('COMPLETED')}
          className={`p-4 rounded-xl border text-left transition-all ${
            statusFilter === 'COMPLETED'
              ? 'bg-[#16271D] border-[#22C55E] shadow-md ring-1 ring-[#22C55E]/50'
              : 'bg-[#181715] border-[#2E2B25] hover:border-[#423E35]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#86EFAC] font-medium uppercase tracking-wider">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-[#86EFAC] mt-1">
            {counts.completed}
          </div>
          <span className="text-[11px] text-[#8E877C] block mt-0.5">Resolved Requests</span>
        </button>
      </div>

      {/* Emergency Alert Banner if any emergency is pending */}
      {counts.emergency > 0 && (
        <div className="bg-[#2B1417] border-2 border-[#E63946] rounded-xl p-4 flex items-center justify-between gap-3 animate-pulse shadow-lg shadow-red-950/30">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-[#E63946] shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                🚨 Immediate Action Required: {counts.emergency} Active Emergency Assistance Alert
              </h4>
              <p className="text-xs text-[#FCA5A5]">
                Guests require urgent in-room attention. Prioritized at the top of the queue.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStatusFilter('ACTIVE')}
            className="px-3 py-1.5 rounded bg-[#E63946] text-white text-xs font-bold shrink-0 hover:bg-[#CC2936] transition-colors"
          >
            View Alert
          </button>
        </div>
      )}

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1 bg-[#181715] p-1 rounded-xl border border-[#2E2B25] overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              statusFilter === 'ACTIVE'
                ? 'bg-[#C5A880] text-[#121110] font-bold'
                : 'text-[#8E877C] hover:text-[#F3EFEA]'
            }`}
          >
            Active Queue ({counts.active})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('NEW')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              statusFilter === 'NEW'
                ? 'bg-[#C5A880] text-[#121110] font-bold'
                : 'text-[#8E877C] hover:text-[#F3EFEA]'
            }`}
          >
            New ({counts.new})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('IN_PROGRESS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              statusFilter === 'IN_PROGRESS'
                ? 'bg-[#C5A880] text-[#121110] font-bold'
                : 'text-[#8E877C] hover:text-[#F3EFEA]'
            }`}
          >
            In Progress ({counts.inProgress})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('COMPLETED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              statusFilter === 'COMPLETED'
                ? 'bg-[#C5A880] text-[#121110] font-bold'
                : 'text-[#8E877C] hover:text-[#F3EFEA]'
            }`}
          >
            Completed ({counts.completed})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-[#C5A880] text-[#121110] font-bold'
                : 'text-[#8E877C] hover:text-[#F3EFEA]'
            }`}
          >
            All ({counts.total})
          </button>
        </div>

        {/* Search Box */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-[#7E786E] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search room, service, personnel..."
            className="w-full bg-[#181715] border border-[#2E2B25] focus:border-[#C5A880] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#F3EFEA] placeholder-[#7E786E] outline-none"
          />
        </div>
      </div>

      {/* Main Request Queue List */}
      {filteredRequests.length === 0 ? (
        <div className="p-12 text-center bg-[#181715] border border-[#2B2924] rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#262420] text-[#C5A880] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#F3EFEA]">No requests found in this queue</h3>
          <p className="text-xs text-[#8E877C] max-w-sm mx-auto">
            All guest requests for this filter have been satisfied. New in-room requests submitted via QR code will appear here in real time.
          </p>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setQuickTestModalOpen(true)}
              className="text-xs px-3.5 py-2 rounded-lg bg-[#2A2824] hover:bg-[#35322E] text-[#C5A880] border border-[#3E3A33] transition-colors cursor-pointer"
            >
              + Create Test Request
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req, index) => {
            const isNew = req.status === 'NEW';
            const isInProgress = req.status === 'IN_PROGRESS';
            const isCompleted = req.status === 'COMPLETED';

            // Calculate FIFO Queue Position for active requests
            const activeQueuePosition = isNew || isInProgress ? index + 1 : null;

            return (
              <div
                key={req.id}
                className={`rounded-2xl border transition-all p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden ${
                  req.isEmergency
                    ? 'bg-[#231214] border-[#E63946] shadow-lg shadow-red-950/20'
                    : isNew
                    ? 'bg-[#1C1B18] border-[#3F3A31] hover:border-[#C5A880]/70 shadow-sm'
                    : isInProgress
                    ? 'bg-[#1A1916] border-[#38342C] opacity-95'
                    : 'bg-[#151412] border-[#262420] opacity-75'
                }`}
              >
                {/* Left zone: Room, Category, Message, Meta, Personnel */}
                <div className="flex items-start gap-4 min-w-0">
                  {/* Room Number Block with Queue Position */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div
                      onClick={() => onNavigateToGuest?.(req.roomNumber)}
                      title={`Click to preview Room ${req.roomNumber} guest screen`}
                      className={`px-3.5 py-2.5 rounded-xl border text-center cursor-pointer transition-transform hover:scale-105 ${
                        req.isEmergency
                          ? 'bg-[#E63946] text-white border-[#E63946] font-bold'
                          : 'bg-[#141311] border-[#333029] text-[#F3EFEA]'
                      }`}
                    >
                      <span className="text-[10px] block uppercase tracking-wider font-semibold opacity-80">
                        Room
                      </span>
                      <span className="text-lg sm:text-xl font-bold font-mono leading-none">
                        {req.roomNumber}
                      </span>
                    </div>

                    {/* Queue Priority Indicator (First-Come, First-Served) */}
                    {activeQueuePosition && (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider ${
                          activeQueuePosition === 1
                            ? 'bg-[#C5A880] text-[#121110]'
                            : 'bg-[#262420] text-[#8E877C] border border-[#3E3A33]'
                        }`}
                        title="Position in First-Come, First-Served queue"
                      >
                        {activeQueuePosition === 1 ? 'Queue #1 (Next)' : `Queue #${activeQueuePosition}`}
                      </span>
                    )}
                  </div>

                  {/* Request Details */}
                  <div className="min-w-0 space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1.5 text-sm sm:text-base font-bold text-[#F3EFEA]">
                        {getCategoryIcon(req.category)}
                        <span>{req.category}</span>
                      </span>

                      {/* Status Badges */}
                      {req.isEmergency && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E63946] text-white uppercase tracking-wider animate-pulse">
                          🚨 Emergency
                        </span>
                      )}

                      {isNew && !req.isEmergency && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#3B82F6]/20 text-[#93C5FD] border border-[#3B82F6]/40 uppercase tracking-wider">
                          New Request
                        </span>
                      )}

                      {isInProgress && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EAB308]/20 text-[#FDE047] border border-[#EAB308]/40 uppercase tracking-wider flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#EAB308] animate-ping" />
                          In Progress
                        </span>
                      )}

                      {isCompleted && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#22C55E]/20 text-[#86EFAC] border border-[#22C55E]/40 uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Completed
                        </span>
                      )}
                    </div>

                    {/* Guest Additional Message */}
                    {req.additionalMessage && (
                      <p className="text-xs sm:text-sm text-[#D8D2C7] bg-[#141311]/70 border border-[#2B2924] rounded-lg px-3 py-1.5 font-normal">
                        "{req.additionalMessage}"
                      </p>
                    )}

                    {/* Assigned Personnel Box (Visible when In-Progress or Completed) */}
                    {(req.assignedStaffName || req.acceptedByStaffName) && (
                      <div className="flex items-center gap-2 text-xs bg-[#221F1B] border border-[#3A352D] rounded-lg px-2.5 py-1 text-[#D8D2C7] w-fit">
                        <UserCheck className="w-3.5 h-3.5 text-[#C5A880]" />
                        <span>Assisting Personnel:</span>
                        <strong className="text-[#F3EFEA] font-semibold">
                          {req.assignedStaffName || req.acceptedByStaffName}
                        </strong>
                        {req.assignedStaffRole && (
                          <span className="text-[10px] text-[#A89F91]">
                            ({req.assignedStaffRole})
                          </span>
                        )}
                        {isInProgress && (
                          <button
                            type="button"
                            onClick={() => handleOpenAcceptModal(req)}
                            className="text-[10px] text-[#C5A880] hover:underline ml-1 font-semibold cursor-pointer"
                          >
                            Reassign
                          </button>
                        )}
                      </div>
                    )}

                    {/* Staff Notes if any */}
                    {req.staffNotes && (
                      <div className="text-[11px] text-[#A89F91] italic bg-[#141311] px-2 py-0.5 rounded border border-[#2A2824] w-fit">
                        Notes: {req.staffNotes}
                      </div>
                    )}

                    {/* Timestamps */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#8E877C] pt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#C5A880]" />
                        <span>Received: {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({formatTimeAgo(req.createdAt)})</span>
                      </span>

                      {req.acceptedAt && (
                        <span className="text-[#B8B2A7]">
                          • Started: {new Date(req.acceptedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}

                      {req.completedAt && (
                        <span className="text-[#86EFAC]">
                          • Resolved: {new Date(req.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {req.completedByStaffName ? ` by ${req.completedByStaffName}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right zone: Action buttons (ACCEPT, COMPLETED, REOPEN, DELETE) */}
                <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#2A2823]">
                  {/* If status is NEW: Show prominent ACCEPT button which prompts for personnel assignment */}
                  {isNew && (
                    <button
                      type="button"
                      onClick={() => handleOpenAcceptModal(req)}
                      className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-[#C5A880] hover:bg-[#B39366] text-[#121110] font-bold text-xs tracking-wider uppercase transition-all shadow-md flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#F3EFEA] focus-visible:outline-none cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>ACCEPT &amp; ASSIGN</span>
                    </button>
                  )}

                  {/* If status is IN_PROGRESS: Show prominent COMPLETED button */}
                  {isInProgress && (
                    <button
                      type="button"
                      onClick={() => handleComplete(req.id, req.assignedStaffName || currentUser?.name)}
                      className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-[#22C55E] hover:bg-[#16A34A] text-white font-bold text-xs tracking-wider uppercase transition-all shadow-md flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>COMPLETED</span>
                    </button>
                  )}

                  {/* If status is COMPLETED: Allow re-opening or delete */}
                  {isCompleted && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleReopen(req.id)}
                        className="px-2.5 py-1.5 rounded-lg border border-[#33302A] text-[11px] text-[#B8B2A7] hover:text-[#F3EFEA] hover:bg-[#252320] transition-colors cursor-pointer"
                        title="Reopen as New"
                      >
                        Re-open
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(req.id)}
                        className="p-1.5 rounded-lg text-[#7E786E] hover:text-[#E63946] hover:bg-[#252320] transition-colors cursor-pointer"
                        title="Delete record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Personnel Assignment Modal */}
      <AssignPersonnelModal
        isOpen={Boolean(assigningRequest)}
        onClose={() => setAssigningRequest(null)}
        request={assigningRequest}
        currentUser={currentUser}
        onConfirmAssignment={handleConfirmAssignment}
        onOpenCreateAccount={() => setIsCreateAccountModalOpen(true)}
        onOpenCreateStaff={() => setIsCreateStaffModalOpen(true)}
      />

      {/* Admin Add Staff Member Modal */}
      <CreateStaffMemberModal
        isOpen={isCreateStaffModalOpen}
        onClose={() => setIsCreateStaffModalOpen(false)}
        currentUser={currentUser}
        onStaffCreated={() => {
          setIsCreateStaffModalOpen(false);
        }}
      />

      {/* Admin Quick Create Account / Add Personnel Modal */}
      <CreateAccountModal
        isOpen={isCreateAccountModalOpen}
        onClose={() => setIsCreateAccountModalOpen(false)}
        onAccountCreated={(newAcc) => {
          setIsCreateAccountModalOpen(false);
        }}
      />

      {/* Quick Test Request Simulation Modal */}
      {quickTestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1C1B18] border border-[#3E3A33] rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold font-serif-luxury text-[#F3EFEA] mb-4">
              Simulate In-Room Guest Request
            </h3>
            <form onSubmit={handleCreateTestRequest} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#B8B2A7] font-semibold mb-1">Room Number:</label>
                <input
                  type="text"
                  value={testRoom}
                  onChange={(e) => setTestRoom(e.target.value)}
                  className="w-full bg-[#141311] border border-[#38342E] rounded-lg px-3 py-2 text-sm text-[#F3EFEA] font-mono outline-none focus:border-[#C5A880]"
                  required
                />
              </div>

              <div>
                <label className="block text-[#B8B2A7] font-semibold mb-1">Service Category:</label>
                <select
                  value={testCategory}
                  onChange={(e) => setTestCategory(e.target.value as HotelRequest['category'])}
                  className="w-full bg-[#141311] border border-[#38342E] rounded-lg px-3 py-2 text-sm text-[#F3EFEA] outline-none focus:border-[#C5A880]"
                >
                  <option value="Contact Front Desk">🛎️ Contact Front Desk</option>
                  <option value="Housekeeping">🧹 Housekeeping</option>
                  <option value="Extra Pillow / Blanket">🛏️ Extra Pillow / Blanket</option>
                  <option value="Toiletries">🧻 Toiletries</option>
                  <option value="Maintenance">🚿 Maintenance</option>
                  <option value="Water">💧 Water</option>
                  <option value="Emergency Assistance">🚨 Emergency Assistance</option>
                  <option value="Other Request">💬 Other Request</option>
                </select>
              </div>

              <div>
                <label className="block text-[#B8B2A7] font-semibold mb-1">Additional Message:</label>
                <input
                  type="text"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="e.g. Please send two pillows."
                  className="w-full bg-[#141311] border border-[#38342E] rounded-lg px-3 py-2 text-sm text-[#F3EFEA] outline-none focus:border-[#C5A880]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickTestModalOpen(false)}
                  className="w-1/2 py-2 rounded-lg border border-[#38342E] text-[#B8B2A7] hover:bg-[#252320]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 rounded-lg bg-[#C5A880] text-[#121110] font-bold"
                >
                  Send Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
