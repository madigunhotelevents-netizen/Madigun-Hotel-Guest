import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarCheck2,
  Calendar,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  UserCheck,
  Building2,
  DoorOpen,
  DoorClosed,
  Download,
  Printer,
  Sparkles,
  RefreshCw,
  Eye,
  Trash2,
  X,
  FileText,
  KeyRound,
  BedDouble,
  Layers,
  ArrowUpDown,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { StayLogRecord, UserProfile } from '../types/hotel';
import {
  getAllStayLogs,
  subscribeToRequestEvents,
  deleteStayLog,
  getAllRoomStays,
} from '../services/storageService';

interface CheckInCheckOutViewProps {
  currentUser: UserProfile | null;
  onSelectRoomForGuestView?: (roomNumber: string) => void;
}

type DatePreset = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom';
type StayStatusFilter = 'ALL' | 'ACTIVE' | 'CHECKED_OUT';

export const CheckInCheckOutView: React.FC<CheckInCheckOutViewProps> = ({
  currentUser,
  onSelectRoomForGuestView,
}) => {
  const [stayLogs, setStayLogs] = useState<StayLogRecord[]>(() => getAllStayLogs());
  const [selectedLog, setSelectedLog] = useState<StayLogRecord | null>(null);

  // Filter states
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StayStatusFilter>('ALL');
  const [floorFilter, setFloorFilter] = useState<string>('ALL');
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'checkin_desc' | 'checkin_asc' | 'checkout_desc' | 'duration'>('checkin_desc');

  // Real-time synchronization
  useEffect(() => {
    const handleUpdate = () => {
      setStayLogs(getAllStayLogs());
    };

    handleUpdate();
    const unsubscribe = subscribeToRequestEvents(() => {
      handleUpdate();
    });

    return unsubscribe;
  }, []);

  const availableRoomTypes = useMemo(() => {
    const set = new Set<string>();
    stayLogs.forEach((l) => {
      if (l.roomType) set.add(l.roomType);
    });
    return Array.from(set).sort();
  }, [stayLogs]);

  // Filtering logic
  const filteredLogs = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfToday = startOfToday + 24 * 60 * 60 * 1000 - 1;
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const startOfPast7Days = startOfToday - 6 * 24 * 60 * 60 * 1000;
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return stayLogs.filter((log) => {
      const checkIn = log.checkInAt;
      const checkOut = log.checkOutAt;
      const primaryTimestamp = checkOut || checkIn;

      // 1. Date filter
      if (datePreset === 'today') {
        const inToday = (checkIn >= startOfToday && checkIn <= endOfToday) || (checkOut && checkOut >= startOfToday && checkOut <= endOfToday);
        if (!inToday) return false;
      } else if (datePreset === 'yesterday') {
        const inYesterday =
          (checkIn >= startOfYesterday && checkIn < startOfToday) ||
          (checkOut && checkOut >= startOfYesterday && checkOut < startOfToday);
        if (!inYesterday) return false;
      } else if (datePreset === 'week') {
        if (primaryTimestamp < startOfPast7Days) return false;
      } else if (datePreset === 'month') {
        if (primaryTimestamp < startOfThisMonth) return false;
      } else if (datePreset === 'custom') {
        if (customStartDate) {
          const startMs = new Date(customStartDate + 'T00:00:00').getTime();
          if (!isNaN(startMs) && primaryTimestamp < startMs) return false;
        }
        if (customEndDate) {
          const endMs = new Date(customEndDate + 'T23:59:59').getTime();
          if (!isNaN(endMs) && primaryTimestamp > endMs) return false;
        }
      }

      // 2. Status filter
      if (statusFilter === 'ACTIVE' && log.status !== 'ACTIVE') return false;
      if (statusFilter === 'CHECKED_OUT' && log.status !== 'CHECKED_OUT') return false;

      // 3. Floor filter
      if (floorFilter !== 'ALL') {
        const floorStr = String(log.floor || log.roomNumber.charAt(0));
        if (floorStr !== floorFilter) return false;
      }

      // 4. Room Type filter
      if (roomTypeFilter !== 'ALL' && log.roomType !== roomTypeFilter) return false;

      // 5. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchRoom = log.roomNumber.toLowerCase().includes(q);
        const matchGuest = log.guestName.toLowerCase().includes(q);
        const matchCode = log.accessCode.toLowerCase().includes(q);
        const matchNotes = (log.notes || '').toLowerCase().includes(q);
        const matchStaffIn = (log.checkedInByStaff || '').toLowerCase().includes(q);
        const matchStaffOut = (log.checkedOutByStaff || '').toLowerCase().includes(q);

        if (!matchRoom && !matchGuest && !matchCode && !matchNotes && !matchStaffIn && !matchStaffOut) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'checkin_desc') return b.checkInAt - a.checkInAt;
      if (sortBy === 'checkin_asc') return a.checkInAt - b.checkInAt;
      if (sortBy === 'checkout_desc') {
        const outA = a.checkOutAt || a.checkInAt;
        const outB = b.checkOutAt || b.checkInAt;
        return outB - outA;
      }
      if (sortBy === 'duration') {
        const durA = a.durationMs || (Date.now() - a.checkInAt);
        const durB = b.durationMs || (Date.now() - b.checkInAt);
        return durB - durA;
      }
      return 0;
    });
  }, [stayLogs, datePreset, customStartDate, customEndDate, statusFilter, floorFilter, roomTypeFilter, searchQuery, sortBy]);

  // Operational metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfToday = startOfToday + 24 * 60 * 60 * 1000 - 1;

    const totalLogs = stayLogs.length;
    const activeStays = stayLogs.filter((l) => l.status === 'ACTIVE').length;
    const checkedOutLogs = stayLogs.filter((l) => l.status === 'CHECKED_OUT').length;

    const todayCheckIns = stayLogs.filter((l) => l.checkInAt >= startOfToday && l.checkInAt <= endOfToday).length;
    const todayCheckOuts = stayLogs.filter((l) => l.checkOutAt && l.checkOutAt >= startOfToday && l.checkOutAt <= endOfToday).length;

    // Average duration of checked out stays
    const completedWithDuration = stayLogs.filter((l) => l.status === 'CHECKED_OUT' && l.durationMs);
    let avgHours = 0;
    if (completedWithDuration.length > 0) {
      const totalMs = completedWithDuration.reduce((acc, curr) => acc + (curr.durationMs || 0), 0);
      avgHours = Math.round((totalMs / (completedWithDuration.length * 3600000)) * 10) / 10;
    }

    return {
      totalLogs,
      activeStays,
      checkedOutLogs,
      todayCheckIns,
      todayCheckOuts,
      avgHours,
    };
  }, [stayLogs]);

  // Duration Formatter
  const formatStayDuration = (log: StayLogRecord) => {
    const duration = log.durationMs || (Date.now() - log.checkInAt);
    const totalHours = Math.floor(duration / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const remHours = totalHours % 24;
    const mins = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${remHours}h ${mins}m`;
    }
    if (totalHours > 0) {
      return `${totalHours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'Log ID',
      'Room Number',
      'Floor',
      'Room Type',
      'Bed Type',
      'Guest Name',
      'Access Code',
      'Status',
      'Check-In Date/Time',
      'Checked-In By Staff',
      'Check-Out Date/Time',
      'Checked-Out By Staff',
      'Duration (Hours)',
      'Stay Notes',
    ];

    const rows = filteredLogs.map((log) => {
      const durHours = log.durationMs ? Math.round((log.durationMs / 3600000) * 10) / 10 : '';
      return [
        log.id,
        log.roomNumber,
        log.floor,
        `"${(log.roomType || '').replace(/"/g, '""')}"`,
        `"${(log.bedType || '').replace(/"/g, '""')}"`,
        `"${log.guestName.replace(/"/g, '""')}"`,
        log.accessCode,
        log.status,
        `"${new Date(log.checkInAt).toLocaleString()}"`,
        `"${(log.checkedInByStaff || '').replace(/"/g, '""')}"`,
        log.checkOutAt ? `"${new Date(log.checkOutAt).toLocaleString()}"` : '',
        `"${(log.checkedOutByStaff || '').replace(/"/g, '""')}"`,
        durHours,
        `"${(log.notes || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `madigun_hotel_checkin_checkout_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteLog = (id: string) => {
    if (window.confirm('Are you sure you want to remove this historical stay record? This cannot be undone.')) {
      const updated = deleteStayLog(id);
      setStayLogs(updated);
      if (selectedLog?.id === id) {
        setSelectedLog(null);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-[#1A1916] border border-[#2C2A26] rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-[#C5A880]/15 border border-[#C5A880]/30 flex items-center justify-center text-[#C5A880] shrink-0 mt-0.5">
              <CalendarCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold font-serif-luxury text-[#F3EFEA] tracking-wide">
                  Room Check-In &amp; Check-Out Monitoring
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#262421] text-[#C5A880] border border-[#3D3A34]">
                  Admin &amp; Front Desk Only
                </span>
              </div>
              <p className="text-sm text-[#A8A296] mt-1">
                Historical check-in and check-out logs, access code tracking, stay durations, and front desk audit trail.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleExportCSV}
              id="stay-logs-btn-export-csv"
              className="px-3.5 py-2 rounded-lg bg-[#262421] hover:bg-[#322F2A] text-[#E5D5B8] border border-[#3D3A34] text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              id="stay-logs-btn-print"
              className="px-3.5 py-2 rounded-lg bg-[#262421] hover:bg-[#322F2A] text-[#E5D5B8] border border-[#3D3A34] text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Print Logs</span>
            </button>
          </div>
        </div>

        {/* Operational Metrics Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6 pt-5 border-t border-[#2C2A26]">
          <div className="bg-[#121110]/80 rounded-lg p-3 border border-[#262421]">
            <span className="text-[11px] font-medium text-[#8C857B] uppercase tracking-wider block">Today Check-Ins</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-bold text-[#52B788]">{metrics.todayCheckIns}</span>
              <span className="text-[11px] text-[#7A756D]">arrivals</span>
            </div>
          </div>

          <div className="bg-[#121110]/80 rounded-lg p-3 border border-[#262421]">
            <span className="text-[11px] font-medium text-[#8C857B] uppercase tracking-wider block">Today Check-Outs</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-bold text-[#E9C46A]">{metrics.todayCheckOuts}</span>
              <span className="text-[11px] text-[#7A756D]">departures</span>
            </div>
          </div>

          <div className="bg-[#121110]/80 rounded-lg p-3 border border-[#262421]">
            <span className="text-[11px] font-medium text-[#8C857B] uppercase tracking-wider block">Currently In-House</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-bold text-[#C5A880]">{metrics.activeStays}</span>
              <span className="text-[11px] text-[#7A756D]">occupied rooms</span>
            </div>
          </div>

          <div className="bg-[#121110]/80 rounded-lg p-3 border border-[#262421]">
            <span className="text-[11px] font-medium text-[#8C857B] uppercase tracking-wider block">Avg Stay Length</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-bold text-[#F3EFEA]">{metrics.avgHours}h</span>
              <span className="text-[11px] text-[#7A756D]">completed stays</span>
            </div>
          </div>

          <div className="bg-[#121110]/80 rounded-lg p-3 border border-[#262421]">
            <span className="text-[11px] font-medium text-[#8C857B] uppercase tracking-wider block">Total Logged</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-bold text-[#A8A296]">{metrics.totalLogs}</span>
              <span className="text-[11px] text-[#7A756D]">historical records</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#1A1916] border border-[#2C2A26] rounded-xl p-4 sm:p-5 space-y-4 shadow-sm">
        {/* Date Presets Row */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="text-xs font-semibold text-[#E5D5B8] flex items-center gap-1.5 uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5 text-[#C5A880]" />
              Filter By Activity Date
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
              { id: 'all', label: 'All Dates' },
              { id: 'today', label: "Today's Activity" },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'week', label: 'Past 7 Days' },
              { id: 'month', label: 'This Month' },
              { id: 'custom', label: 'Custom Date Range' },
            ].map((preset) => (
              <button
                key={preset.id}
                type="button"
                id={`stay-date-filter-${preset.id}`}
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
                <label htmlFor="custom-stay-start-date" className="text-xs text-[#8C857B]">From:</label>
                <input
                  type="date"
                  id="custom-stay-start-date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-[#1F1D1A] border border-[#3D3A34] text-xs text-[#F3EFEA] rounded-lg px-2.5 py-1.5 focus:border-[#C5A880] focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="custom-stay-end-date" className="text-xs text-[#8C857B]">To:</label>
                <input
                  type="date"
                  id="custom-stay-end-date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-[#1F1D1A] border border-[#3D3A34] text-xs text-[#F3EFEA] rounded-lg px-2.5 py-1.5 focus:border-[#C5A880] focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Dropdowns and Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-3 border-t border-[#2C2A26]">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7A756D]" />
            <input
              type="text"
              id="stay-logs-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guest, room, code..."
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

          {/* Status Filter */}
          <div>
            <select
              id="stay-logs-filter-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StayStatusFilter)}
              className="w-full py-2 px-2.5 rounded-lg bg-[#141311] border border-[#2C2A26] text-xs text-[#F3EFEA] focus:border-[#C5A880] focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Stays (Active &amp; Checked Out)</option>
              <option value="ACTIVE">Currently In-House (Active)</option>
              <option value="CHECKED_OUT">Completed Check-Outs</option>
            </select>
          </div>

          {/* Floor Filter */}
          <div>
            <select
              id="stay-logs-filter-floor"
              value={floorFilter}
              onChange={(e) => setFloorFilter(e.target.value)}
              className="w-full py-2 px-2.5 rounded-lg bg-[#141311] border border-[#2C2A26] text-xs text-[#F3EFEA] focus:border-[#C5A880] focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Floors</option>
              <option value="1">Floor 1</option>
              <option value="2">Floor 2</option>
              <option value="3">Floor 3</option>
              <option value="4">Floor 4 (Suites)</option>
            </select>
          </div>

          {/* Room Type */}
          <div>
            <select
              id="stay-logs-filter-room-type"
              value={roomTypeFilter}
              onChange={(e) => setRoomTypeFilter(e.target.value)}
              className="w-full py-2 px-2.5 rounded-lg bg-[#141311] border border-[#2C2A26] text-xs text-[#F3EFEA] focus:border-[#C5A880] focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Room Types</option>
              {availableRoomTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              id="stay-logs-filter-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full py-2 px-2.5 rounded-lg bg-[#141311] border border-[#2C2A26] text-xs text-[#F3EFEA] focus:border-[#C5A880] focus:outline-none cursor-pointer"
            >
              <option value="checkin_desc">Check-In: Newest First</option>
              <option value="checkin_asc">Check-In: Oldest First</option>
              <option value="checkout_desc">Check-Out: Most Recent</option>
              <option value="duration">Stay Duration: Longest</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[#1A1916] border border-[#2C2A26] rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-[#2C2A26] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck2 className="w-4 h-4 text-[#C5A880]" />
            <h2 className="text-sm font-semibold text-[#F3EFEA]">
              Check-In / Check-Out Monitoring Records ({filteredLogs.length})
            </h2>
          </div>
          <span className="text-xs text-[#7A756D]">
            Live audit of room key access, registration, and departures
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-[#7A756D]">
            <DoorClosed className="w-10 h-10 mx-auto text-[#3D3A34] mb-3" />
            <p className="text-sm font-medium text-[#A8A296]">No check-in or check-out logs found for this filter</p>
            <p className="text-xs text-[#6B665E] mt-1">Try selecting a different date range or clearing your search.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#141311] border-b border-[#2C2A26] text-[#8C857B] uppercase font-semibold text-[11px] tracking-wider">
                  <th className="py-3 px-4">Room &amp; Guest</th>
                  <th className="py-3 px-4">Status &amp; Code</th>
                  <th className="py-3 px-4">Check-In Details</th>
                  <th className="py-3 px-4">Check-Out Details</th>
                  <th className="py-3 px-4">Stay Duration</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#24221E]">
                {filteredLogs.map((log) => {
                  const isActive = log.status === 'ACTIVE';

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-[#201E1A] transition-colors cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      {/* Room & Guest */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded bg-[#2A2722] text-[#E5D5B8] flex items-center justify-center font-mono font-bold text-xs border border-[#3D3A34] shrink-0">
                            {log.roomNumber}
                          </div>
                          <div>
                            <span className="font-semibold text-[#F3EFEA] block text-xs">
                              {log.guestName}
                            </span>
                            <span className="text-[#8C857B] text-[11px] block">
                              Floor {log.floor} • {log.roomType}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Status & Access Code */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#52B788]/15 text-[#52B788] font-semibold text-[11px] border border-[#52B788]/30">
                              <DoorOpen className="w-3 h-3" />
                              Active (In-House)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#322F2A] text-[#A8A296] font-medium text-[11px] border border-[#3D3A34]">
                              <DoorClosed className="w-3 h-3 text-[#7A756D]" />
                              Checked Out
                            </span>
                          )}
                          <div className="flex items-center gap-1 font-mono text-[10px] text-[#C5A880]">
                            <KeyRound className="w-2.5 h-2.5" />
                            <span>{log.accessCode}</span>
                          </div>
                        </div>
                      </td>

                      {/* Check-In Details */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-[#F3EFEA] block font-medium">
                          {new Date(log.checkInAt).toLocaleDateString([], { month: 'short', day: 'numeric' })},{' '}
                          {new Date(log.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {log.checkedInByStaff && (
                          <span className="text-[#8C857B] text-[10px] block">
                            By: {log.checkedInByStaff}
                          </span>
                        )}
                      </td>

                      {/* Check-Out Details */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {log.checkOutAt ? (
                          <div>
                            <span className="text-[#E5D5B8] block font-medium">
                              {new Date(log.checkOutAt).toLocaleDateString([], { month: 'short', day: 'numeric' })},{' '}
                              {new Date(log.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {log.checkedOutByStaff && (
                              <span className="text-[#8C857B] text-[10px] block">
                                By: {log.checkedOutByStaff}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#52B788] text-[11px] italic">Currently In-House</span>
                        )}
                      </td>

                      {/* Stay Duration */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px]">
                        {isActive ? (
                          <span className="text-[#52B788]">
                            Active ({formatStayDuration(log)})
                          </span>
                        ) : (
                          <span className="text-[#C5A880]">
                            {formatStayDuration(log)}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLog(log);
                            }}
                            className="px-2 py-1 rounded bg-[#262421] hover:bg-[#322F2A] text-[#C5A880] text-[11px] font-medium border border-[#3D3A34] transition-colors cursor-pointer inline-flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Details</span>
                          </button>

                          {(currentUser?.role === 'developer' || currentUser?.role === 'admin' || currentUser?.isPrimaryDeveloper) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLog(log.id);
                              }}
                              title="Delete record"
                              className="p-1 rounded text-[#7A756D] hover:text-[#E63946] hover:bg-[#262421] transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="stay-details-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-[#1A1916] border border-[#3D3A34] rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#C5A880]/15 border border-[#C5A880]/30 flex items-center justify-center text-[#C5A880]">
                  <CalendarCheck2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="stay-details-title" className="text-base font-bold text-[#F3EFEA] font-serif-luxury">
                    Room Stay &amp; Keycard Record
                  </h3>
                  <p className="text-xs font-mono text-[#8C857B]">Log ID: {selectedLog.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-[#7A756D] hover:text-[#F3EFEA] hover:bg-[#262421]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#121110] p-4 rounded-lg border border-[#2C2A26] space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[#8C857B] block">Room &amp; Floor:</span>
                  <span className="font-bold text-[#E5D5B8] text-sm">
                    Room {selectedLog.roomNumber} (Floor {selectedLog.floor})
                  </span>
                </div>
                <div>
                  <span className="text-[#8C857B] block">Guest Name:</span>
                  <span className="font-semibold text-[#F3EFEA] text-sm">{selectedLog.guestName}</span>
                </div>
                <div>
                  <span className="text-[#8C857B] block">Room Type:</span>
                  <span className="text-[#F3EFEA] font-medium">{selectedLog.roomType}</span>
                </div>
                <div>
                  <span className="text-[#8C857B] block">Bed Configuration:</span>
                  <span className="text-[#F3EFEA] font-medium">{selectedLog.bedType}</span>
                </div>
                <div>
                  <span className="text-[#8C857B] block">Status:</span>
                  <span className={selectedLog.status === 'ACTIVE' ? 'text-[#52B788] font-bold' : 'text-[#A8A296] font-medium'}>
                    {selectedLog.status === 'ACTIVE' ? 'Active In-House' : 'Checked Out'}
                  </span>
                </div>
                <div>
                  <span className="text-[#8C857B] block">Access Passcode:</span>
                  <span className="font-mono text-[#C5A880] font-bold tracking-wider">{selectedLog.accessCode}</span>
                </div>
              </div>

              {selectedLog.notes && (
                <div className="pt-2 border-t border-[#2C2A26]">
                  <span className="text-[11px] font-semibold text-[#8C857B] block mb-1">Stay Notes:</span>
                  <p className="text-xs text-[#F3EFEA] bg-[#1A1916] p-2.5 rounded border border-[#2C2A26]">
                    "{selectedLog.notes}"
                  </p>
                </div>
              )}
            </div>

            {/* Check-In & Check-Out Audit Details */}
            <div className="space-y-2 text-xs">
              <span className="text-xs font-semibold text-[#E5D5B8] block uppercase tracking-wider">
                Registration &amp; Checkout Timeline
              </span>

              <div className="space-y-2.5 bg-[#141311] p-3.5 rounded-lg border border-[#2C2A26]">
                <div className="flex items-center justify-between">
                  <span className="text-[#8C857B]">Check-In Time:</span>
                  <span className="text-[#F3EFEA] font-mono">
                    {new Date(selectedLog.checkInAt).toLocaleString()}
                  </span>
                </div>

                {selectedLog.checkedInByStaff && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#8C857B]">Checked In By:</span>
                    <span className="text-[#C5A880] font-medium">
                      {selectedLog.checkedInByStaff}
                    </span>
                  </div>
                )}

                {selectedLog.checkOutAt ? (
                  <>
                    <div className="flex items-center justify-between pt-1 border-t border-[#24221E]">
                      <span className="text-[#8C857B]">Check-Out Time:</span>
                      <span className="text-[#E5D5B8] font-mono">
                        {new Date(selectedLog.checkOutAt).toLocaleString()}
                      </span>
                    </div>

                    {selectedLog.checkedOutByStaff && (
                      <div className="flex items-center justify-between">
                        <span className="text-[#8C857B]">Checked Out By:</span>
                        <span className="text-[#C5A880] font-medium">
                          {selectedLog.checkedOutByStaff}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="pt-1 border-t border-[#24221E] flex items-center justify-between text-[#52B788]">
                    <span>Departure Status:</span>
                    <span className="font-semibold">Guest is currently checked in</span>
                  </div>
                )}

                <div className="pt-1 border-t border-[#24221E] flex items-center justify-between font-mono">
                  <span className="text-[#8C857B]">Total Stay Duration:</span>
                  <span className="text-[#C5A880] font-bold">
                    {formatStayDuration(selectedLog)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              {onSelectRoomForGuestView && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectRoomForGuestView(selectedLog.roomNumber);
                    setSelectedLog(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#262421] hover:bg-[#322F2A] text-[#C5A880] text-xs font-medium border border-[#3D3A34] transition-colors"
                >
                  Test Room {selectedLog.roomNumber} Screen
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
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
