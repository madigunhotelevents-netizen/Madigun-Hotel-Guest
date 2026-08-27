import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  RotateCcw,
  Search,
  Plus,
  Volume2,
  VolumeX,
  Sparkles,
  BedDouble,
  Package,
  Wrench,
  UtensilsCrossed,
  Droplets,
  Shirt,
  MessageSquare,
  ShieldAlert,
  Trash2,
  Moon,
  Sun,
  Cloud,
} from 'lucide-react';
import { HotelRequest, RequestStatus, UserProfile } from '../types/hotel';
import {
  getStoredRequests,
  fetchRequestsFromServer,
  updateRequestStatus,
  deleteRequest,
  resetToDemoRequests,
  subscribeToRequestEvents,
  createNewRequest,
} from '../services/storageService';
import { playConciergeBell, playUrgentAlert, playSuccessChime } from '../services/soundService';
import { useServiceSchedule } from '../services/scheduleService';
import { getDriveStatus } from '../services/googleDriveService';

interface FrontDeskViewProps {
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  onNavigateToGuest?: (room: string) => void;
  currentUser?: UserProfile | null;
  onOpenLoginModal?: () => void;
  onOpenGoogleDrive?: () => void;
}

export const FrontDeskView: React.FC<FrontDeskViewProps> = ({
  soundEnabled,
  setSoundEnabled,
  onNavigateToGuest,
  currentUser,
  onOpenLoginModal,
  onOpenGoogleDrive,
}) => {
  const [requests, setRequests] = useState<HotelRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'ALL'>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [quickTestModalOpen, setQuickTestModalOpen] = useState(false);
  const [testRoom, setTestRoom] = useState('102');
  const [testCategory, setTestCategory] = useState<HotelRequest['category']>('Housekeeping');
  const [testMessage, setTestMessage] = useState('Fresh towels please');
  const schedule = useServiceSchedule();

  // Load and subscribe to real-time events
  const loadRequests = () => {
    setRequests([...getStoredRequests()]);
    fetchRequestsFromServer().then((data) => {
      if (Array.isArray(data)) {
        setRequests([...data]);
      }
    }).catch(() => {});
  };

  useEffect(() => {
    loadRequests();

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    const unsubscribe = subscribeToRequestEvents((event) => {
      setRequests([...getStoredRequests()]);
      if (event.type === 'NEW_REQUEST_SUBMITTED' && event.request) {
        if (soundEnabled) {
          if (event.request.isEmergency) {
            playUrgentAlert();
          } else {
            playConciergeBell();
          }
        }

        // Show native browser notification if granted
        if (
          typeof window !== 'undefined' &&
          'Notification' in window &&
          Notification.permission === 'granted'
        ) {
          new Notification(
            event.request.isEmergency
              ? `🚨 URGENT: Emergency Room ${event.request.roomNumber}`
              : `🛎️ New Request: Room ${event.request.roomNumber}`,
            {
              body: `${event.request.category}${
                event.request.additionalMessage ? `: "${event.request.additionalMessage}"` : ''
              }`,
              icon: '/favicon.ico',
            }
          );
        }
      }
    });

    // Auto-poll every 2 seconds as a safety heartbeat
    const interval = setInterval(loadRequests, 2000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [soundEnabled]);

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
      } catch (err) {
        console.error('Failed to request notification permission', err);
      }
    }
  };

  // Status handlers
  const handleAccept = (requestId: string) => {
    const staffName = currentUser?.name || 'Front Desk Staff';
    const updated = updateRequestStatus(requestId, 'IN_PROGRESS', staffName);
    setRequests(updated);
    if (soundEnabled) {
      playSuccessChime();
    }
  };

  const handleComplete = (requestId: string) => {
    const staffName = currentUser?.name || 'Front Desk Staff';
    const updated = updateRequestStatus(requestId, 'COMPLETED', staffName);
    setRequests(updated);
    if (soundEnabled) {
      playSuccessChime();
    }
  };

  const handleReopen = (requestId: string) => {
    const updated = updateRequestStatus(requestId, 'NEW');
    setRequests(updated);
  };

  const handleDelete = (requestId: string) => {
    const updated = deleteRequest(requestId);
    setRequests(updated);
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

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
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
        return matchesRoom || matchesCategory || matchesMsg;
      }

      return true;
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
        return <Bell className="w-5 h-5 text-[#C5A880]" />;
      case 'Housekeeping':
        return <Sparkles className="w-5 h-5 text-[#C5A880]" />;
      case 'Extra Pillow / Blanket':
        return <BedDouble className="w-5 h-5 text-[#C5A880]" />;
      case 'Toiletries':
        return <Package className="w-5 h-5 text-[#C5A880]" />;
      case 'Maintenance':
        return <Wrench className="w-5 h-5 text-[#C5A880]" />;
      case 'Room Service':
        return <UtensilsCrossed className="w-5 h-5 text-[#C5A880]" />;
      case 'Water':
        return <Droplets className="w-5 h-5 text-[#C5A880]" />;
      case 'Laundry':
        return <Shirt className="w-5 h-5 text-[#C5A880]" />;
      case 'Emergency Assistance':
        return <AlertTriangle className="w-5 h-5 text-[#E63946]" />;
      default:
        return <MessageSquare className="w-5 h-5 text-[#C5A880]" />;
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Top Banner / Status Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2C2A26] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E] animate-pulse" />
            <span className="text-xs uppercase tracking-widest text-[#C5A880] font-semibold">
              Live Console
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif-luxury text-[#F3EFEA]">
            Front Desk
          </h1>
        </div>

        {/* Quick Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {onOpenGoogleDrive && (
            <button
              type="button"
              onClick={onOpenGoogleDrive}
              className="text-xs px-3 py-1.5 rounded-md bg-[#1F1E1B] hover:bg-[#2C2924] border border-[#3E3A33] text-[#D8D2C7] hover:text-[#F3EFEA] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Open Google Drive Cloud Storage & Backups"
            >
              <Cloud className={`w-3.5 h-3.5 ${getDriveStatus().connected ? 'text-[#22C55E]' : 'text-[#C5A880]'}`} />
              <span>{getDriveStatus().connected ? 'Drive Cloud: Active' : 'Google Drive'}</span>
            </button>
          )}

          {notificationPermission !== 'granted' && typeof window !== 'undefined' && 'Notification' in window && (
            <button
              type="button"
              onClick={requestNotificationPermission}
              className="text-xs px-3 py-1.5 rounded-md bg-[#252320] hover:bg-[#322E29] border border-[#3D3830] text-[#D8D2C7] transition-colors flex items-center gap-1.5 focus-visible:ring-1 focus-visible:ring-[#C5A880] cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Browser Alerts</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (soundEnabled) {
                playConciergeBell();
              } else {
                setSoundEnabled(true);
                playConciergeBell();
              }
            }}
            className="text-xs px-3 py-1.5 rounded-md bg-[#252320] hover:bg-[#322E29] border border-[#3D3830] text-[#D8D2C7] transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Test concierge chime"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#C5A880]" /> : <VolumeX className="w-3.5 h-3.5 text-[#7E786E]" />}
            <span>Test Chime</span>
          </button>

          <button
            type="button"
            onClick={() => setQuickTestModalOpen(true)}
            className="text-xs px-3 py-1.5 rounded-md bg-[#C5A880] hover:bg-[#B39366] text-[#121110] font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Simulate Request</span>
          </button>

          <button
            type="button"
            onClick={handleResetDemo}
            className="text-xs px-3 py-1.5 rounded-md bg-[#1C1B18] hover:bg-[#252320] border border-[#33302A] text-[#9E978C] hover:text-[#F3EFEA] transition-colors flex items-center gap-1 cursor-pointer"
            title="Reset to sample initial requests"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>

      {/* Housekeeping & Concierge Duty Hours Strip */}
      <div className={`border rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
        schedule.isOffDuty 
          ? 'bg-[#241A14] border-[#EAB308]/40 text-[#F3EFEA]' 
          : 'bg-[#171614] border-[#2A2823] text-[#D8D2C7]'
      }`}>
        <div className="flex items-center gap-2.5">
          {schedule.isOffDuty ? (
            <div className="w-6 h-6 rounded bg-[#EAB308]/20 border border-[#EAB308]/40 flex items-center justify-center text-[#FDE047]">
              <Moon className="w-3.5 h-3.5" />
            </div>
          ) : (
            <div className="w-6 h-6 rounded bg-[#C5A880]/20 border border-[#C5A880]/40 flex items-center justify-center text-[#C5A880]">
              <Sun className="w-3.5 h-3.5" />
            </div>
          )}
          <div>
            <span className="font-bold text-[#F3EFEA] block">
              {schedule.isOffDuty ? 'Housekeeping & Concierge: Off Duty (10:00 PM – 6:00 AM)' : 'Housekeeping & Concierge: On Duty (6:00 AM – 10:00 PM)'}
            </span>
            <span className="text-[11px] text-[#A89F91]">
              {schedule.isOffDuty ? 'Services resume at 6:00 AM' : 'Overnight off-duty begins at 10:00 PM'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <span className="text-[10px] uppercase font-semibold text-[#A89F91]">
            {schedule.isOffDuty ? 'Resumes in:' : 'Shift ends in:'}
          </span>
          <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
            schedule.isOffDuty ? 'bg-[#16120D] text-[#FDE047] border border-[#3A2E1F]' : 'bg-[#141311] text-[#C5A880] border border-[#2E2B25]'
          }`}>
            {schedule.formattedCountdown}
          </span>
        </div>
      </div>

      {/* Emergency Alert Banner (if any active emergency exists) */}
      {counts.emergency > 0 && (
        <div className="bg-[#2A1215] border-2 border-[#E63946] rounded-xl p-4 flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E63946]/20 border border-[#E63946] flex items-center justify-center text-[#E63946] shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {counts.emergency} Active Emergency Assistance Alert{counts.emergency > 1 ? 's' : ''}
              </h3>
              <p className="text-xs text-[#FFCCD5]">
                Immediate front desk response required. Check high-priority cards below.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStatusFilter('ACTIVE')}
            className="px-3 py-1.5 rounded bg-[#E63946] hover:bg-[#D62828] text-white text-xs font-bold whitespace-nowrap"
          >
            View Urgent
          </button>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setStatusFilter('ACTIVE')}
            className={`text-xs px-3 py-2 rounded-lg font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === 'ACTIVE'
                ? 'bg-[#C5A880] text-[#121110] shadow-sm'
                : 'bg-[#1C1B18] text-[#B8B2A7] hover:bg-[#252320] border border-[#2E2B25]'
            }`}
          >
            <span>Active Requests</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              statusFilter === 'ACTIVE' ? 'bg-[#121110]/20 text-[#121110]' : 'bg-[#2A2824] text-[#D8D2C7]'
            }`}>
              {counts.active}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('NEW')}
            className={`text-xs px-3 py-2 rounded-lg font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === 'NEW'
                ? 'bg-[#3B82F6] text-white shadow-sm'
                : 'bg-[#1C1B18] text-[#B8B2A7] hover:bg-[#252320] border border-[#2E2B25]'
            }`}
          >
            <span>New</span>
            {counts.new > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                statusFilter === 'NEW' ? 'bg-white text-[#3B82F6]' : 'bg-[#3B82F6]/30 text-[#93C5FD]'
              }`}>
                {counts.new}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('IN_PROGRESS')}
            className={`text-xs px-3 py-2 rounded-lg font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === 'IN_PROGRESS'
                ? 'bg-[#EAB308] text-[#121110] shadow-sm'
                : 'bg-[#1C1B18] text-[#B8B2A7] hover:bg-[#252320] border border-[#2E2B25]'
            }`}
          >
            <span>In Progress</span>
            {counts.inProgress > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                statusFilter === 'IN_PROGRESS' ? 'bg-[#121110]/20 text-[#121110]' : 'bg-[#EAB308]/30 text-[#FDE047]'
              }`}>
                {counts.inProgress}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('COMPLETED')}
            className={`text-xs px-3 py-2 rounded-lg font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === 'COMPLETED'
                ? 'bg-[#22C55E] text-white shadow-sm'
                : 'bg-[#1C1B18] text-[#B8B2A7] hover:bg-[#252320] border border-[#2E2B25]'
            }`}
          >
            <span>Completed</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              statusFilter === 'COMPLETED' ? 'bg-white text-[#22C55E]' : 'bg-[#22C55E]/30 text-[#86EFAC]'
            }`}>
              {counts.completed}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`text-xs px-3 py-2 rounded-lg font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === 'ALL'
                ? 'bg-[#E5D5B8] text-[#121110] shadow-sm'
                : 'bg-[#1C1B18] text-[#B8B2A7] hover:bg-[#252320] border border-[#2E2B25]'
            }`}
          >
            <span>All ({counts.total})</span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-[#7A756D] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search room, request..."
            className="w-full bg-[#171614] border border-[#2E2B25] focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#F3EFEA] placeholder-[#7A756D] outline-none"
          />
        </div>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="bg-[#171614] border border-[#2C2A26] rounded-xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-[#24211D] border border-[#38342D] mx-auto flex items-center justify-center text-[#7E786E] mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-[#F3EFEA] font-serif-luxury">
            No Requests in This View
          </h3>
          <p className="text-xs text-[#8E877C] mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No requests match "${searchQuery}".`
              : statusFilter === 'ACTIVE'
              ? 'All guest requests have been completed. The front desk queue is clear.'
              : `No requests currently with status ${statusFilter}.`}
          </p>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setQuickTestModalOpen(true)}
              className="text-xs px-3.5 py-2 rounded bg-[#2A2824] hover:bg-[#35322E] text-[#C5A880] border border-[#3E3A33] transition-colors"
            >
              + Create Test Request
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => {
            const isNew = req.status === 'NEW';
            const isInProgress = req.status === 'IN_PROGRESS';
            const isCompleted = req.status === 'COMPLETED';

            return (
              <div
                key={req.id}
                className={`rounded-xl border transition-all p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  req.isEmergency
                    ? 'bg-[#231214] border-[#E63946] shadow-lg shadow-red-950/20'
                    : isNew
                    ? 'bg-[#1C1B18] border-[#3F3A31] hover:border-[#C5A880]/70 shadow-sm'
                    : isInProgress
                    ? 'bg-[#1A1916] border-[#38342C] opacity-95'
                    : 'bg-[#151412] border-[#262420] opacity-75'
                }`}
              >
                {/* Left zone: Room, Category, Message, Meta */}
                <div className="flex items-start gap-4 min-w-0">
                  {/* Room Number Block */}
                  <div
                    onClick={() => onNavigateToGuest?.(req.roomNumber)}
                    title={`Click to preview Room ${req.roomNumber} guest screen`}
                    className={`px-3.5 py-2.5 rounded-lg border text-center shrink-0 cursor-pointer transition-transform hover:scale-105 ${
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

                  {/* Request Details */}
                  <div className="min-w-0 space-y-1">
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
                      <p className="text-xs sm:text-sm text-[#D8D2C7] bg-[#141311]/70 border border-[#2B2924] rounded px-2.5 py-1.5 font-normal">
                        "{req.additionalMessage}"
                      </p>
                    )}

                    {/* Timestamps */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#8E877C] pt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#C5A880]" />
                        <span>Received: {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({formatTimeAgo(req.createdAt)})</span>
                      </span>

                      {req.acceptedAt && (
                        <span className="text-[#B8B2A7]">
                          • Accepted: {new Date(req.acceptedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {req.acceptedByStaffName ? ` (${req.acceptedByStaffName})` : ''}
                        </span>
                      )}

                      {req.completedAt && (
                        <span className="text-[#86EFAC]">
                          • Finished: {new Date(req.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {req.completedByStaffName ? ` by ${req.completedByStaffName}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right zone: Action buttons (ACCEPT and COMPLETED) */}
                <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#2A2823]">
                  {/* If status is NEW: Show prominent ACCEPT button */}
                  {isNew && (
                    <button
                      type="button"
                      onClick={() => handleAccept(req.id)}
                      className="flex-1 sm:flex-initial px-4 py-2.5 rounded-lg bg-[#C5A880] hover:bg-[#B39366] text-[#121110] font-bold text-xs tracking-wider uppercase transition-all shadow-md flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#F3EFEA] focus-visible:outline-none cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>ACCEPT</span>
                    </button>
                  )}

                  {/* If status is IN_PROGRESS: Show prominent COMPLETED button */}
                  {isInProgress && (
                    <button
                      type="button"
                      onClick={() => handleComplete(req.id)}
                      className="flex-1 sm:flex-initial px-4 py-2.5 rounded-lg bg-[#22C55E] hover:bg-[#16A34A] text-white font-bold text-xs tracking-wider uppercase transition-all shadow-md flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>COMPLETED</span>
                    </button>
                  )}

                  {/* If status is COMPLETED: Allow re-opening or delete */}
                  {isCompleted && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleReopen(req.id)}
                        className="px-2.5 py-1.5 rounded border border-[#33302A] text-[11px] text-[#B8B2A7] hover:text-[#F3EFEA] hover:bg-[#252320] transition-colors"
                        title="Reopen as New"
                      >
                        Re-open
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(req.id)}
                        className="p-1.5 rounded text-[#7E786E] hover:text-[#E63946] hover:bg-[#252320] transition-colors"
                        title="Delete record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Test Request Simulation Modal */}
      {quickTestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1C1B18] border border-[#3E3A33] rounded-xl max-w-md w-full p-6 shadow-2xl">
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
                  className="w-full bg-[#141311] border border-[#38342E] rounded px-3 py-2 text-sm text-[#F3EFEA] font-mono outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[#B8B2A7] font-semibold mb-1">Service Category:</label>
                <select
                  value={testCategory}
                  onChange={(e) => setTestCategory(e.target.value as HotelRequest['category'])}
                  className="w-full bg-[#141311] border border-[#38342E] rounded px-3 py-2 text-sm text-[#F3EFEA] outline-none"
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
                  className="w-full bg-[#141311] border border-[#38342E] rounded px-3 py-2 text-sm text-[#F3EFEA] outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickTestModalOpen(false)}
                  className="w-1/2 py-2 rounded border border-[#38342E] text-[#B8B2A7] hover:bg-[#252320]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 rounded bg-[#C5A880] text-[#121110] font-bold"
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
