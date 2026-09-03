import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardList,
  Calendar,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserCheck,
  Building,
  Download,
  Printer,
  Sparkles,
  RefreshCw,
  Eye,
  X,
  FileText,
  BedDouble,
  ShieldCheck,
  ArrowUpDown,
  Layers,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { HotelRequest, RequestCategory, UserProfile } from '../types/hotel';
import { getStoredRequests, subscribeToRequestEvents, getAllStaffMembers } from '../services/storageService';

interface RecordsMonitoringViewProps {
  currentUser: UserProfile | null;
  onNavigateToGuest?: (roomNumber: string) => void;
}

type DatePreset = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom';
type StatusFilter = 'ALL' | 'COMPLETED' | 'IN_PROGRESS' | 'NEW' | 'EMERGENCY';

export const RecordsMonitoringView: React.FC<RecordsMonitoringViewProps> = ({
  currentUser,
  onNavigateToGuest,
}) => {
  const [requests, setRequests] = useState<HotelRequest[]>(() => getStoredRequests());
  const [selectedRequest, setSelectedRequest] = useState<HotelRequest | null>(null);

  // Filter states
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [staffFilter, setStaffFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [floorFilter, setFloorFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'duration'>('newest');

  // Real-time synchronization
  useEffect(() => {
    const handleUpdate = () => {
      setRequests(getStoredRequests());
    };

    handleUpdate();
    const unsubscribe = subscribeToRequestEvents(() => {
      handleUpdate();
    });

    return unsubscribe;
  }, []);

  const staffRoster = useMemo(() => {
    return getAllStaffMembers();
  }, []);

  // Distinct staff names who have handled/accepted/completed requests
  const activeStaffHandlers = useMemo(() => {
    const set = new Set<string>();
    requests.forEach((r) => {
      if (r.acceptedByStaffName) set.add(r.acceptedByStaffName);
      if (r.assignedStaffName) set.add(r.assignedStaffName);
      if (r.completedByStaffName) set.add(r.completedByStaffName);
    });
    staffRoster.forEach((s) => set.add(s.name));
    return Array.from(set).sort();
  }, [requests, staffRoster]);

  // Unique categories in requests
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    requests.forEach((r) => {
      if (r.category) set.add(r.category);
    });
    return Array.from(set).sort();
  }, [requests]);

  // Date filtering logic
  const filteredRequests = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfToday = startOfToday + 24 * 60 * 60 * 1000 - 1;
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const startOfPast7Days = startOfToday - 6 * 24 * 60 * 60 * 1000;
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return requests.filter((req) => {
      const created = req.createdAt;

      // 1. Date filter
      if (datePreset === 'today') {
        if (created < startOfToday || created > endOfToday) return false;
      } else if (datePreset === 'yesterday') {
        if (created < startOfYesterday || created >= startOfToday) return false;
      } else if (datePreset === 'week') {
        if (created < startOfPast7Days) return false;
      } else if (datePreset === 'month') {
        if (created < startOfThisMonth) return false;
      } else if (datePreset === 'custom') {
        if (customStartDate) {
          const startMs = new Date(customStartDate + 'T00:00:00').getTime();
          if (!isNaN(startMs) && created < startMs) return false;
        }
        if (customEndDate) {
          const endMs = new Date(customEndDate + 'T23:59:59').getTime();
          if (!isNaN(endMs) && created > endMs) return false;
        }
      }

      // 2. Status filter
      if (statusFilter === 'COMPLETED' && req.status !== 'COMPLETED') return false;
      if (statusFilter === 'IN_PROGRESS' && req.status !== 'IN_PROGRESS') return false;
      if (statusFilter === 'NEW' && req.status !== 'NEW') return false;
      if (statusFilter === 'EMERGENCY' && !req.isEmergency) return false;

      // 3. Category filter
      if (categoryFilter !== 'ALL' && req.category !== categoryFilter) return false;

      // 4. Staff filter
      if (staffFilter !== 'ALL') {
        const matchesStaff =
          req.acceptedByStaffName === staffFilter ||
          req.assignedStaffName === staffFilter ||
          req.completedByStaffName === staffFilter;
        if (!matchesStaff) return false;
      }

      // 5. Floor filter
      if (floorFilter !== 'ALL') {
        const floorNum = req.roomNumber.charAt(0);
        if (floorNum !== floorFilter) return false;
      }

      // 6. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchRoom = req.roomNumber.toLowerCase().includes(q);
        const matchCategory = req.category.toLowerCase().includes(q);
        const matchMessage = (req.additionalMessage || '').toLowerCase().includes(q);
        const matchStaffNotes = (req.staffNotes || '').toLowerCase().includes(q);
        const matchAcceptedStaff = (req.acceptedByStaffName || '').toLowerCase().includes(q);
        const matchAssignedStaff = (req.assignedStaffName || '').toLowerCase().includes(q);
        const matchCompletedStaff = (req.completedByStaffName || '').toLowerCase().includes(q);

        if (
          !matchRoom &&
          !matchCategory &&
          !matchMessage &&
          !matchStaffNotes &&
          !matchAcceptedStaff &&
          !matchAssignedStaff &&
          !matchCompletedStaff
        ) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'newest') return b.createdAt - a.createdAt;
      if (sortBy === 'oldest') return a.createdAt - b.createdAt;
      if (sortBy === 'duration') {
        const durationA = a.completedAt ? a.completedAt - a.createdAt : 0;
        const durationB = b.completedAt ? b.completedAt - b.createdAt : 0;
        return durationB - durationA;
      }
      return 0;
    });
  }, [requests, datePreset, customStartDate, customEndDate, statusFilter, categoryFilter, staffFilter, floorFilter, searchQuery, sortBy]);

  // Key metrics calculation
  const metrics = useMemo(() => {
    const total = filteredRequests.length;
    const completed = filteredRequests.filter((r) => r.status === 'COMPLETED').length;
    const inProgress = filteredRequests.filter((r) => r.status === 'IN_PROGRESS').length;
    const newRequests = filteredRequests.filter((r) => r.status === 'NEW').length;
    const emergencies = filteredRequests.filter((r) => r.isEmergency).length;

    // Average turnaround time for completed requests
    const completedWithTimes = filteredRequests.filter((r) => r.status === 'COMPLETED' && r.completedAt && r.createdAt);
    let avgMinutes = 0;
    if (completedWithTimes.length > 0) {
      const totalMs = completedWithTimes.reduce((acc, curr) => acc + ((curr.completedAt || curr.createdAt) - curr.createdAt), 0);
      avgMinutes = Math.round(totalMs / (completedWithTimes.length * 60 * 1000));
    }

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 100;

    return {
      total,
      completed,
      inProgress,
      newRequests,
      emergencies,
      avgMinutes,
      completionRate,
    };
  }, [filteredRequests]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Request ID',
      'Room Number',
      'Category',
      'Status',
      'Emergency',
      'Created Date/Time',
      'Accepted At',
      'Accepted/Assigned By',
      'Completed At',
      'Completed By',
      'Duration (Minutes)',
      'Guest Message',
      'Staff Notes',
    ];

    const rows = filteredRequests.map((req) => {
      const durationMin = req.completedAt ? Math.round((req.completedAt - req.createdAt) / 60000) : '';
      return [
        req.id,
        req.roomNumber,
        `"${req.category.replace(/"/g, '""')}"`,
        req.status,
        req.isEmergency ? 'YES' : 'NO',
        `"${new Date(req.createdAt).toLocaleString()}"`,
        req.acceptedAt ? `"${new Date(req.acceptedAt).toLocaleString()}"` : '',
        `"${(req.assignedStaffName || req.acceptedByStaffName || '').replace(/"/g, '""')}"`,
        req.completedAt ? `"${new Date(req.completedAt).toLocaleString()}"` : '',
        `"${(req.completedByStaffName || '').replace(/"/g, '""')}"`,
        durationMin,
        `"${(req.additionalMessage || '').replace(/"/g, '""')}"`,
        `"${(req.staffNotes || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `madigun_hotel_guest_requests_records_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDuration = (startMs: number, endMs?: number) => {
    if (!endMs) return 'In Progress';
    const diff = Math.max(0, endMs - startMs);
    const mins = Math.floor(diff / (1000 * 60));
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}h ${remMins}m`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-[#1A1916] border border-[#2C2A26] rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-[#C5A880]/15 border border-[#C5A880]/30 flex items-center justify-center text-[#C5A880] shrink-0 mt-0.5">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold font-serif-luxury text-[#F3EFEA] tracking-wide">
                  Guest Request Records Monitoring
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#262421] text-[#C5A880] border border-[#3D3A34]">
                  Admin &amp; Front Desk
                </span>
              </div>
              <p className="text-sm text-[#A8A296] mt-1">
                Audit log and fulfillment records for all in-room service requests handled and completed by hotel staff.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleExportCSV}
              id="records-btn-export-csv"
              className="px-3.5 py-2 rounded-lg bg-[#262421] hover:bg-[#322F2A] text-[#E5D5B8] border border-[#3D3A34] text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              id="records-btn-print"
              className="px-3.5 py-2 rounded-lg bg-[#262421] hover:bg-[#322F2A] text-[#E5D5B8] border border-[#3D3A34] text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Print Records</span>
            </button>
          </div>
        </div>

        {/* Operational Metrics Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-[#2C2A26]">
          <div className="bg-[#121110]/80 rounded-lg p-3 border border-[#262421]">
            <span className="text-[11px] font-medium text-[#8C857B] uppercase tracking-wider block">Total Logged</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-bold text-[#F3EFEA]">{metrics.total}</span>
              <span className="text-[11px] text-[#7A756D]">requests</span>
            </div>
          </div>

          <div className="bg-[#121110]/80 rounded-lg p-3 border border-[#262421]">
            <span className="text-[11px] font-medium text-[#8C857B] uppercase tracking-wider block">Completed</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-bold text-[#52B788]">{metrics.completed}</span>
              <span className="text-[11px] text-[#52B788]/80 font-medium">({metrics.completionRate}%)</span>
            </div>
          </div>

          <div className="bg-[#121110]/80 rounded-lg p-3 border border-[#262421]">
            <span className="text-[11px] font-medium text-[#8C857B] uppercase tracking-wider block">In Progress</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-bold text-[#E9C46A]">{metrics.inProgress}</span>
              <span className="text-[11px] text-[#7A756D]">active</span>
            </div>
          </div>

          <div className="bg-[#121110]/80 rounded-lg p-3 border border-[#262421]">
            <span className="text-[11px] font-medium text-[#8C857B] uppercase tracking-wider block">New / Pending</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-bold text-[#F4A261]">{metrics.newRequests}</span>
              <span className="text-[11px] text-[#7A756D]">queued</span>
            </div>
          </div>

          <div className="bg-[#121110]/80 rounded-lg p-3 border border-[#262421]">
            <span className="text-[11px] font-medium text-[#8C857B] uppercase tracking-wider block">Avg Turnaround</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-bold text-[#C5A880]">{metrics.avgMinutes}m</span>
              <span className="text-[11px] text-[#7A756D]">fulfill time</span>
            </div>
          </div>

          <div className="bg-[#121110]/80 rounded-lg p-3 border border-[#262421]">
            <span className="text-[11px] font-medium text-[#8C857B] uppercase tracking-wider block">Emergency</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-bold text-[#E63946]">{metrics.emergencies}</span>
              <span className="text-[11px] text-[#7A756D]">urgent flags</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#1A1916] border border-[#2C2A26] rounded-xl p-4 sm:p-5 space-y-4 shadow-sm">
        {/* Date Filter Selection Row */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="text-xs font-semibold text-[#E5D5B8] flex items-center gap-1.5 uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5 text-[#C5A880]" />
              Filter By Date
            </span>
            {(datePreset !== 'all' || customStartDate || customEndDate) && (
              <button
                type="button"
                onClick={() => {
                  setDatePreset('all');
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
                className="text-[11px] text-[#C5A880] hover:underline cursor-pointer"
              >
                Reset Date Filter
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: "Today's Requests" },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'week', label: 'Past 7 Days' },
              { id: 'month', label: 'This Month' },
              { id: 'custom', label: 'Custom Range' },
            ].map((preset) => (
              <button
                key={preset.id}
                type="button"
                id={`date-filter-preset-${preset.id}`}
                onClick={() => setDatePreset(preset.id as DatePreset)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  datePreset === preset.id
                    ? 'bg-[#C5A880] text-[#121110] font-semibold shadow-sm'
                    : 'bg-[#221E18] text-[#B8B2A7] hover:bg-[#2C2822] hover:text-[#F3EFEA] border border-[#322F2A]'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          {datePreset === 'custom' && (
            <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-[#2C2A26] bg-[#141311] p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <label htmlFor="custom-start-date" className="text-xs text-[#8C857B]">From:</label>
                <input
                  type="date"
                  id="custom-start-date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-[#1F1D1A] border border-[#3D3A34] text-xs text-[#F3EFEA] rounded-lg px-2.5 py-1.5 focus:border-[#C5A880] focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="custom-end-date" className="text-xs text-[#8C857B]">To:</label>
                <input
                  type="date"
                  id="custom-end-date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-[#1F1D1A] border border-[#3D3A34] text-xs text-[#F3EFEA] rounded-lg px-2.5 py-1.5 focus:border-[#C5A880] focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Multi-Dimensional Dropdowns Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-3 border-t border-[#2C2A26]">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7A756D]" />
            <input
              type="text"
              id="records-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search room, staff, message..."
              className="w-full pl-8 pr-7 py-2 rounded-lg bg-[#141311] border border-[#2C2A26] text-xs text-[#F3EFEA] placeholder-[#7A756D] focus:border-[#C5A880] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A756D] hover:text-[#F3EFEA]"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Status Dropdown */}
          <div>
            <select
              id="records-filter-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full py-2 px-2.5 rounded-lg bg-[#141311] border border-[#2C2A26] text-xs text-[#F3EFEA] focus:border-[#C5A880] focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed Only</option>
              <option value="IN_PROGRESS">In Progress Only</option>
              <option value="NEW">New / Pending Only</option>
              <option value="EMERGENCY">Emergency Flags</option>
            </select>
          </div>

          {/* Category Dropdown */}
          <div>
            <select
              id="records-filter-category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full py-2 px-2.5 rounded-lg bg-[#141311] border border-[#2C2A26] text-xs text-[#F3EFEA] focus:border-[#C5A880] focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Handled By Staff Dropdown */}
          <div>
            <select
              id="records-filter-staff"
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="w-full py-2 px-2.5 rounded-lg bg-[#141311] border border-[#2C2A26] text-xs text-[#F3EFEA] focus:border-[#C5A880] focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Staff Handlers</option>
              {activeStaffHandlers.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div>
            <select
              id="records-filter-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full py-2 px-2.5 rounded-lg bg-[#141311] border border-[#2C2A26] text-xs text-[#F3EFEA] focus:border-[#C5A880] focus:outline-none cursor-pointer"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="duration">Sort: Longest Turnaround</option>
            </select>
          </div>
        </div>
      </div>

      {/* Records Table & Audit Stream */}
      <div className="bg-[#1A1916] border border-[#2C2A26] rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-[#2C2A26] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#C5A880]" />
            <h2 className="text-sm font-semibold text-[#F3EFEA]">
              Audit Log Records ({filteredRequests.length})
            </h2>
          </div>
          <span className="text-xs text-[#7A756D]">
            Showing matching records based on active date and category filters
          </span>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-[#7A756D]">
            <ClipboardList className="w-10 h-10 mx-auto text-[#3D3A34] mb-3" />
            <p className="text-sm font-medium text-[#A8A296]">No records found for the selected criteria</p>
            <p className="text-xs text-[#6B665E] mt-1">Try expanding your date range or adjusting status filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#141311] border-b border-[#2C2A26] text-[#8C857B] uppercase font-semibold text-[11px] tracking-wider">
                  <th className="py-3 px-4">Room &amp; Category</th>
                  <th className="py-3 px-4">Status &amp; Urgency</th>
                  <th className="py-3 px-4">Requested At</th>
                  <th className="py-3 px-4">Handled / Completed By</th>
                  <th className="py-3 px-4">Turnaround</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#24221E]">
                {filteredRequests.map((req) => {
                  const isDone = req.status === 'COMPLETED';
                  const isInProg = req.status === 'IN_PROGRESS';
                  const isNew = req.status === 'NEW';
                  const staffName = req.completedByStaffName || req.assignedStaffName || req.acceptedByStaffName;

                  return (
                    <tr
                      key={req.id}
                      className="hover:bg-[#201E1A] transition-colors cursor-pointer"
                      onClick={() => setSelectedRequest(req)}
                    >
                      {/* Room & Category */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2 py-0.5 rounded bg-[#2A2722] text-[#E5D5B8] font-mono font-bold text-xs border border-[#3D3A34]">
                            Rm {req.roomNumber}
                          </span>
                          <div>
                            <span className="font-semibold text-[#F3EFEA] block">{req.category}</span>
                            {req.additionalMessage && (
                              <span className="text-[#8C857B] text-[11px] line-clamp-1 max-w-xs mt-0.5">
                                {req.additionalMessage}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {isDone && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#52B788]/15 text-[#52B788] font-semibold text-[11px] border border-[#52B788]/30">
                              <CheckCircle2 className="w-3 h-3" />
                              Completed
                            </span>
                          )}
                          {isInProg && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#E9C46A]/15 text-[#E9C46A] font-semibold text-[11px] border border-[#E9C46A]/30">
                              <Clock className="w-3 h-3 animate-spin" />
                              In Progress
                            </span>
                          )}
                          {isNew && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F4A261]/15 text-[#F4A261] font-semibold text-[11px] border border-[#F4A261]/30">
                              <Clock className="w-3 h-3" />
                              New
                            </span>
                          )}
                          {req.isEmergency && (
                            <span className="px-1.5 py-0.5 rounded bg-[#E63946]/20 text-[#E63946] font-bold text-[10px] border border-[#E63946]/40">
                              URGENT
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Requested At */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-[#F3EFEA] block font-medium">
                          {new Date(req.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })},{' '}
                          {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-[#7A756D] text-[10px]">
                          {new Date(req.createdAt).toLocaleDateString([], { year: 'numeric' })}
                        </span>
                      </td>

                      {/* Handled / Completed By */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {staffName ? (
                          <div>
                            <div className="flex items-center gap-1 text-[#E5D5B8] font-medium">
                              <UserCheck className="w-3 h-3 text-[#C5A880]" />
                              <span>{staffName}</span>
                            </div>
                            {req.assignedStaffDepartment && (
                              <span className="text-[#7A756D] text-[10px] block pl-4">
                                {req.assignedStaffDepartment}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#6B665E] italic">Unassigned (Pending)</span>
                        )}
                      </td>

                      {/* Turnaround */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px]">
                        {req.completedAt ? (
                          <span className="text-[#52B788]">
                            {formatDuration(req.createdAt, req.completedAt)}
                          </span>
                        ) : req.acceptedAt ? (
                          <span className="text-[#E9C46A]">
                            Active ({formatDuration(req.createdAt, Date.now())})
                          </span>
                        ) : (
                          <span className="text-[#7A756D]">Queued</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRequest(req);
                          }}
                          className="px-2.5 py-1 rounded bg-[#262421] hover:bg-[#322F2A] text-[#C5A880] text-[11px] font-medium border border-[#3D3A34] transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Details Modal */}
      {selectedRequest && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="record-details-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setSelectedRequest(null)}
        >
          <div
            className="bg-[#1A1916] border border-[#3D3A34] rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#C5A880]/15 border border-[#C5A880]/30 flex items-center justify-center text-[#C5A880]">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="record-details-title" className="text-base font-bold text-[#F3EFEA] font-serif-luxury">
                    Request Record Details
                  </h3>
                  <p className="text-xs font-mono text-[#8C857B]">{selectedRequest.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="p-1 rounded-lg text-[#7A756D] hover:text-[#F3EFEA] hover:bg-[#262421]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#121110] p-4 rounded-lg border border-[#2C2A26] space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[#8C857B] block">Room Number:</span>
                  <span className="font-bold text-[#E5D5B8] text-sm">Room {selectedRequest.roomNumber}</span>
                </div>
                <div>
                  <span className="text-[#8C857B] block">Category:</span>
                  <span className="font-semibold text-[#F3EFEA]">{selectedRequest.category}</span>
                </div>
                <div>
                  <span className="text-[#8C857B] block">Status:</span>
                  <span className="font-semibold text-[#52B788]">{selectedRequest.status}</span>
                </div>
                <div>
                  <span className="text-[#8C857B] block">Emergency:</span>
                  <span className={selectedRequest.isEmergency ? 'text-[#E63946] font-bold' : 'text-[#8C857B]'}>
                    {selectedRequest.isEmergency ? 'YES (High Priority)' : 'Standard'}
                  </span>
                </div>
              </div>

              {selectedRequest.additionalMessage && (
                <div className="pt-2 border-t border-[#2C2A26]">
                  <span className="text-[11px] font-semibold text-[#8C857B] block mb-1">Guest Message:</span>
                  <p className="text-xs text-[#F3EFEA] bg-[#1A1916] p-2.5 rounded border border-[#2C2A26]">
                    "{selectedRequest.additionalMessage}"
                  </p>
                </div>
              )}
            </div>

            {/* Timeline of fulfillment */}
            <div className="space-y-2 text-xs">
              <span className="text-xs font-semibold text-[#E5D5B8] block uppercase tracking-wider">
                Fulfillment Timeline &amp; Staff
              </span>

              <div className="space-y-2 bg-[#141311] p-3.5 rounded-lg border border-[#2C2A26]">
                <div className="flex items-center justify-between">
                  <span className="text-[#8C857B]">1. Logged / Submitted:</span>
                  <span className="text-[#F3EFEA] font-mono">
                    {new Date(selectedRequest.createdAt).toLocaleString()}
                  </span>
                </div>

                {selectedRequest.acceptedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#8C857B]">2. Accepted / Assigned:</span>
                    <span className="text-[#E9C46A] font-mono">
                      {new Date(selectedRequest.acceptedAt).toLocaleString()}
                    </span>
                  </div>
                )}

                {selectedRequest.completedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#8C857B]">3. Completed / Resolved:</span>
                    <span className="text-[#52B788] font-mono">
                      {new Date(selectedRequest.completedAt).toLocaleString()}
                    </span>
                  </div>
                )}

                {(selectedRequest.acceptedByStaffName || selectedRequest.completedByStaffName) && (
                  <div className="pt-2 border-t border-[#2C2A26] flex items-center justify-between">
                    <span className="text-[#8C857B]">Handled By Staff:</span>
                    <span className="text-[#C5A880] font-semibold">
                      {selectedRequest.completedByStaffName || selectedRequest.acceptedByStaffName}
                    </span>
                  </div>
                )}

                {selectedRequest.staffNotes && (
                  <div className="pt-2 border-t border-[#2C2A26]">
                    <span className="text-[#8C857B] block mb-1">Staff Handover Notes:</span>
                    <p className="text-[#E5D5B8] text-[11px] italic bg-[#1E1D1A] p-2 rounded">
                      "{selectedRequest.staffNotes}"
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              {onNavigateToGuest && (
                <button
                  type="button"
                  onClick={() => {
                    onNavigateToGuest(selectedRequest.roomNumber);
                    setSelectedRequest(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#262421] hover:bg-[#322F2A] text-[#C5A880] text-xs font-medium border border-[#3D3A34] transition-colors"
                >
                  View Room {selectedRequest.roomNumber} Screen
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-1.5 rounded-lg bg-[#C5A880] text-[#121110] text-xs font-semibold hover:bg-[#D4BC96] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
