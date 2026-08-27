import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  UserCheck,
  User,
  Briefcase,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertTriangle,
  Building,
  Plus,
  ShieldCheck,
  Phone,
} from 'lucide-react';
import { HotelRequest, UserProfile, StaffMember, DutyStatus } from '../types/hotel';
import { getAllAccounts, fetchAccountsFromServer } from '../services/authService';
import { getAllStaffMembers } from '../services/storageService';

interface UnifiedPersonnel {
  id: string;
  name: string;
  roleTitle: string;
  department: string;
  phone: string;
  shift: string;
  dutyStatus: DutyStatus;
  isSystemAccount: boolean;
  avatarColor?: string;
  notes?: string;
}

interface AssignPersonnelModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: HotelRequest | null;
  currentUser: UserProfile | null;
  onConfirmAssignment: (personnel: {
    staffId?: string;
    name: string;
    roleTitle?: string;
    department?: string;
    notes?: string;
  }) => void;
  onOpenCreateAccount?: () => void;
  onOpenCreateStaff?: () => void;
}

export const AssignPersonnelModal: React.FC<AssignPersonnelModalProps> = ({
  isOpen,
  onClose,
  request,
  currentUser,
  onConfirmAssignment,
  onOpenCreateAccount,
  onOpenCreateStaff,
}) => {
  const [personnelList, setPersonnelList] = useState<UnifiedPersonnel[]>([]);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');
  const [assignmentNotes, setAssignmentNotes] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');

  const loadUnifiedPersonnel = () => {
    const accounts = getAllAccounts();
    const staff = getAllStaffMembers();

    const unified: UnifiedPersonnel[] = [];

    // Add system accounts (Front Desk, Housekeeping supervisors, Admin)
    accounts.forEach((acc) => {
      unified.push({
        id: acc.id,
        name: acc.name,
        roleTitle: acc.roleTitle,
        department: acc.department,
        phone: acc.phone,
        shift: acc.shift,
        dutyStatus: acc.dutyStatus,
        isSystemAccount: true,
        avatarColor: acc.avatarColor,
        notes: acc.bio,
      });
    });

    // Add hotel associates (cleaners, porters, runners, maintenance techs)
    staff.forEach((st) => {
      // Avoid duplicate names if any
      if (!unified.some((u) => u.id === st.id || u.name.toLowerCase() === st.name.toLowerCase())) {
        unified.push({
          id: st.id,
          name: st.name,
          roleTitle: st.roleTitle,
          department: st.department,
          phone: st.phone,
          shift: st.shift,
          dutyStatus: st.dutyStatus,
          isSystemAccount: false,
          avatarColor: st.department === 'Housekeeping' ? '#10B981' : st.department === 'Maintenance' ? '#F59E0B' : '#3B82F6',
          notes: st.notes,
        });
      }
    });

    setPersonnelList(unified);

    // Default selection: Current user if logged in, otherwise the first on-duty staff
    if (currentUser) {
      setSelectedPersonnelId(currentUser.id);
    } else {
      const onDuty = unified.find((u) => u.dutyStatus === 'ON_DUTY');
      if (onDuty) {
        setSelectedPersonnelId(onDuty.id);
      } else if (unified.length > 0) {
        setSelectedPersonnelId(unified[0].id);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUnifiedPersonnel();
      fetchAccountsFromServer().then(() => {
        loadUnifiedPersonnel();
      });
      setAssignmentNotes('');
      setCustomName('');
      setSearchQuery('');
      setDepartmentFilter('ALL');
    }
  }, [isOpen, currentUser]);

  const departments = useMemo(() => {
    const depts = new Set(personnelList.map((a) => a.department).filter(Boolean));
    return Array.from(depts);
  }, [personnelList]);

  const filteredPersonnel = useMemo(() => {
    return personnelList.filter((acc) => {
      if (departmentFilter !== 'ALL' && acc.department !== departmentFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mName = acc.name.toLowerCase().includes(q);
        const mRole = acc.roleTitle.toLowerCase().includes(q);
        const mDept = acc.department.toLowerCase().includes(q);
        return mName || mRole || mDept;
      }
      return true;
    });
  }, [personnelList, departmentFilter, searchQuery]);

  if (!isOpen || !request) return null;

  const selectedPerson = personnelList.find((a) => a.id === selectedPersonnelId);
  const isDev = currentUser?.role === 'developer' || currentUser?.isPrimaryDeveloper;

  const handleConfirm = () => {
    if (selectedPerson) {
      onConfirmAssignment({
        staffId: selectedPerson.id,
        name: selectedPerson.name,
        roleTitle: selectedPerson.roleTitle,
        department: selectedPerson.department,
        notes: assignmentNotes.trim(),
      });
    } else if (customName.trim()) {
      onConfirmAssignment({
        name: customName.trim(),
        roleTitle: 'Assisting Staff Associate',
        department: 'Front Desk',
        notes: assignmentNotes.trim(),
      });
    } else {
      onConfirmAssignment({
        name: currentUser?.name || 'Front Desk Staff',
        roleTitle: currentUser?.roleTitle || 'Concierge',
        department: currentUser?.department || 'Front Desk',
        notes: assignmentNotes.trim(),
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-[#191815] border border-[#3E3A33] rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl relative space-y-4 text-[#F3EFEA] my-6 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[#2C2A26]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C5A880]/15 border border-[#C5A880]/30 flex items-center justify-center text-[#C5A880] shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#F3EFEA] font-serif-luxury flex items-center gap-2">
                Assign Assisting Personnel
              </h2>
              <p className="text-xs text-[#A89F91]">
                Select the associate or supervisor who will fulfill this guest request.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8E877C] hover:text-[#F3EFEA] hover:bg-[#2A2824] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Request Brief Box */}
        <div className="bg-[#141311] border border-[#2B2822] rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="px-3 py-1.5 bg-[#C5A880] text-[#121110] font-bold rounded-lg font-mono text-sm shrink-0">
              Room {request.roomNumber}
            </div>
            <div className="min-w-0 truncate">
              <span className="font-bold text-[#F3EFEA] block truncate">{request.category}</span>
              {request.additionalMessage && (
                <span className="text-[#A89F91] text-[11px] block truncate">
                  "{request.additionalMessage}"
                </span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] text-[#7E786E] block uppercase">Received</span>
            <span className="font-mono text-[#D8D2C7] font-semibold text-[11px]">
              {new Date(request.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Quick Assign to Self (if logged in) */}
        {currentUser && (
          <div className="flex items-center justify-between bg-[#24211D] border border-[#3E3A33] rounded-xl p-2.5">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#A89F91]">Current User:</span>
              <span className="font-bold text-[#F3EFEA]">{currentUser.name}</span>
              <span className="text-[10px] text-[#C5A880] bg-[#C5A880]/15 px-2 py-0.5 rounded border border-[#C5A880]/30 font-medium">
                {currentUser.roleTitle}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedPersonnelId(currentUser.id)}
              className={`text-xs px-3 py-1 rounded font-semibold transition-all ${
                selectedPersonnelId === currentUser.id
                  ? 'bg-[#C5A880] text-[#121110]'
                  : 'bg-[#141311] text-[#D8D2C7] hover:text-white border border-[#3A362F]'
              }`}
            >
              {selectedPersonnelId === currentUser.id ? '✓ Assigned to You' : 'Assign to Me'}
            </button>
          </div>
        )}

        {/* Search & Department Filters */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[#7E786E] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search personnel by name, role or department..."
              className="w-full bg-[#141311] border border-[#2B2822] focus:border-[#C5A880] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#F3EFEA] placeholder-[#7E786E] outline-none"
            />
          </div>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="bg-[#141311] border border-[#2B2822] text-[#D8D2C7] text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-[#C5A880]"
          >
            <option value="ALL">All Depts</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        {/* Personnel List (Scrollable) */}
        <div className="flex-1 overflow-y-auto max-h-56 space-y-1.5 pr-1 scrollbar-thin">
          {filteredPersonnel.length === 0 ? (
            <div className="text-center py-6 text-xs text-[#7E786E]">
              No personnel match your search query.
            </div>
          ) : (
            filteredPersonnel.map((person) => {
              const isSelected = selectedPersonnelId === person.id;
              const isOnDuty = person.dutyStatus === 'ON_DUTY';
              const isOnBreak = person.dutyStatus === 'ON_BREAK';

              return (
                <div
                  key={person.id}
                  onClick={() => {
                    setSelectedPersonnelId(person.id);
                    setCustomName('');
                  }}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-[#292520] border-[#C5A880] shadow-sm'
                      : 'bg-[#141311] border-[#2A2823] hover:border-[#3E3A33] hover:bg-[#1A1916]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0"
                      style={{ backgroundColor: person.avatarColor || '#C5A880' }}
                    >
                      {person.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-[#F3EFEA] truncate">
                          {person.name}
                        </span>
                        {person.isSystemAccount ? (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#C5A880]/20 text-[#C5A880] font-semibold">
                            Supervisor / Login
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#3B82F6]/20 text-[#93C5FD] font-medium">
                            Associate
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#A89F91] truncate flex items-center gap-1.5">
                        <span>{person.roleTitle}</span>
                        <span>•</span>
                        <span>{person.department}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Duty Status Badge */}
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 ${
                        isOnDuty
                          ? 'bg-[#22C55E]/15 text-[#86EFAC] border border-[#22C55E]/30'
                          : isOnBreak
                          ? 'bg-[#EAB308]/15 text-[#FDE047] border border-[#EAB308]/30'
                          : 'bg-[#7E786E]/20 text-[#A89F91] border border-[#7E786E]/30'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isOnDuty ? 'bg-[#22C55E]' : isOnBreak ? 'bg-[#EAB308]' : 'bg-[#7E786E]'
                        }`}
                      />
                      {isOnDuty ? 'On Duty' : isOnBreak ? 'On Break' : 'Off Duty'}
                    </span>

                    {/* Radio/Check circle */}
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? 'border-[#C5A880] bg-[#C5A880] text-[#121110]'
                          : 'border-[#4A453C]'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 fill-current" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Admin only: Add Staff Member or System Account links */}
        {isDev && (
          <div className="flex items-center justify-between text-xs pt-1 border-t border-[#2C2A26]">
            <span className="text-[#8E877C]">Admin Roster Controls:</span>
            <div className="flex items-center gap-3">
              {onOpenCreateStaff && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCreateStaff();
                  }}
                  className="text-[#C5A880] hover:text-[#E5D5B8] font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Staff Associate</span>
                </button>
              )}
              {onOpenCreateAccount && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCreateAccount();
                  }}
                  className="text-[#A89F91] hover:text-[#F3EFEA] flex items-center gap-1 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Login Account</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Optional Assistance Notes */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-[#A89F91] uppercase tracking-wider block">
            Optional Instructions / Notes for Assisting Staff
          </label>
          <input
            type="text"
            value={assignmentNotes}
            onChange={(e) => setAssignmentNotes(e.target.value)}
            placeholder="e.g., Grab 2 extra pillows from linen closet and deliver to room"
            className="w-full bg-[#141311] border border-[#2B2822] focus:border-[#C5A880] rounded-lg px-3 py-1.5 text-xs text-[#F3EFEA] placeholder-[#7E786E] outline-none"
          />
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2C2A26]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#252320] hover:bg-[#322E29] text-[#D8D2C7] text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2 rounded-lg bg-[#C5A880] hover:bg-[#B39366] text-[#121110] text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Confirm &amp; Start Assistance</span>
          </button>
        </div>
      </div>
    </div>
  );
};
