import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Crown,
  Shield,
  Search,
  Edit,
  User,
  Mail,
  Phone,
  Briefcase,
  Clock,
  CheckCircle2,
  AlertCircle,
  LogIn,
  RotateCcw,
  Sparkles,
  Layers,
  Activity,
  Trash2,
  ShieldCheck,
  Building,
  KeyRound,
  FileText,
  X,
} from 'lucide-react';
import { UserProfile, DutyStatus, UserRole, StaffMember } from '../types/hotel';
import {
  getAllAccounts,
  getCurrentUser,
  setCurrentUser,
  subscribeToAuthEvents,
  resetToDemoAccounts,
  deleteAccount,
} from '../services/authService';
import {
  getAllStaffMembers,
  deleteStaffMember,
  setStaffMemberDutyStatus,
  resetToDemoStaffMembers,
  subscribeToRequestEvents,
} from '../services/storageService';
import { CreateAccountModal } from './CreateAccountModal';
import { CreateStaffMemberModal } from './CreateStaffMemberModal';
import { EditStaffMemberModal } from './EditStaffMemberModal';
import { EditAccountModal } from './EditAccountModal';
import { ProfileModal } from './ProfileModal';

interface AccountsManagementViewProps {
  onOpenLoginModal: () => void;
}

export const AccountsManagementView: React.FC<AccountsManagementViewProps> = ({
  onOpenLoginModal,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'staff_roster' | 'login_accounts'>('staff_roster');
  
  // Data state
  const [accounts, setAccounts] = useState<UserProfile[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [currentUser, setCurrentUserState] = useState<UserProfile | null>(null);
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | DutyStatus>('ALL');

  // Modals state
  const [isCreateAccountModalOpen, setIsCreateAccountModalOpen] = useState(false);
  const [isCreateStaffModalOpen, setIsCreateStaffModalOpen] = useState(false);
  const [staffToEdit, setStaffToEdit] = useState<StaffMember | null>(null);
  const [accountToEdit, setAccountToEdit] = useState<UserProfile | null>(null);
  const [accountToViewProfile, setAccountToViewProfile] = useState<UserProfile | null>(null);
  
  // Direct deletion confirmations
  const [staffIdToDelete, setStaffIdToDelete] = useState<string | null>(null);
  const [accountIdToDelete, setAccountIdToDelete] = useState<string | null>(null);
  
  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  const loadData = () => {
    setAccounts(getAllAccounts());
    setStaffMembers(getAllStaffMembers());
    setCurrentUserState(getCurrentUser());
  };

  useEffect(() => {
    loadData();
    const unsubAuth = subscribeToAuthEvents(() => loadData());
    const unsubStorage = subscribeToRequestEvents(() => loadData());
    return () => {
      unsubAuth();
      unsubStorage();
    };
  }, []);

  const isDeveloper = currentUser?.role === 'developer' || currentUser?.isPrimaryDeveloper;

  const showToast = (type: 'success' | 'info' | 'error', text: string) => {
    setNotificationMsg({ type, text });
    setTimeout(() => {
      setNotificationMsg(null);
    }, 3500);
  };

  // Filtered Staff Roster
  const filteredStaffMembers = useMemo(() => {
    return staffMembers.filter((staff) => {
      if (departmentFilter !== 'ALL' && staff.department !== departmentFilter) return false;
      if (statusFilter !== 'ALL' && staff.dutyStatus !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = staff.name.toLowerCase().includes(q);
        const matchesRole = staff.roleTitle.toLowerCase().includes(q);
        const matchesDept = staff.department.toLowerCase().includes(q);
        const matchesPhone = (staff.phone || '').toLowerCase().includes(q);
        const matchesNotes = (staff.notes || '').toLowerCase().includes(q);
        return matchesName || matchesRole || matchesDept || matchesPhone || matchesNotes;
      }
      return true;
    });
  }, [staffMembers, departmentFilter, statusFilter, searchQuery]);

  // Filtered System Accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      if (departmentFilter !== 'ALL' && acc.department !== departmentFilter) return false;
      if (statusFilter !== 'ALL' && acc.dutyStatus !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = acc.name.toLowerCase().includes(q);
        const matchesUsername = acc.username.toLowerCase().includes(q);
        const matchesDept = acc.department.toLowerCase().includes(q);
        const matchesRole = acc.roleTitle.toLowerCase().includes(q);
        const matchesEmail = acc.email.toLowerCase().includes(q);
        return matchesName || matchesUsername || matchesDept || matchesRole || matchesEmail;
      }
      return true;
    });
  }, [accounts, departmentFilter, statusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const totalStaff = staffMembers.length;
    const totalAccounts = accounts.length;
    const onDutyCount =
      staffMembers.filter((s) => s.dutyStatus === 'ON_DUTY').length +
      accounts.filter((a) => a.dutyStatus === 'ON_DUTY').length;
    return { totalStaff, totalAccounts, onDutyCount };
  }, [staffMembers, accounts]);

  // Unique departments for filter
  const departmentsList = useMemo(() => {
    const depts = new Set([
      ...accounts.map((a) => a.department),
      ...staffMembers.map((s) => s.department),
    ]);
    return Array.from(depts).filter(Boolean);
  }, [accounts, staffMembers]);

  const handleSwitchUser = (target: UserProfile) => {
    setCurrentUser(target);
    setCurrentUserState(target);
    showToast('success', `Switched active session to ${target.name} (${target.roleTitle})`);
  };

  const handleToggleStaffDuty = (staffId: string, currentStatus: DutyStatus) => {
    const nextStatus: DutyStatus =
      currentStatus === 'ON_DUTY' ? 'ON_BREAK' : currentStatus === 'ON_BREAK' ? 'OFF_DUTY' : 'ON_DUTY';
    const updated = setStaffMemberDutyStatus(staffId, nextStatus);
    setStaffMembers(updated);
    showToast('info', `Updated staff duty status to ${nextStatus.replace('_', ' ')}`);
  };

  const handleConfirmDeleteStaff = (staffId: string, staffName: string) => {
    if (!isDeveloper) {
      showToast('error', 'Only Administrators can remove staff members.');
      return;
    }
    const updated = deleteStaffMember(staffId);
    setStaffMembers(updated);
    setStaffIdToDelete(null);
    showToast('success', `Removed ${staffName} from staff directory.`);
  };

  const handleConfirmDeleteAccount = (accountId: string, accountName: string) => {
    if (!currentUser || !isDeveloper) {
      showToast('error', 'Only Administrators can delete employee accounts.');
      return;
    }
    const res = deleteAccount(currentUser, accountId);
    if (res.success) {
      setAccounts(getAllAccounts());
      setAccountIdToDelete(null);
      showToast('success', `Deleted account for ${accountName}.`);
    } else {
      showToast('error', res.error || 'Failed to delete account.');
    }
  };

  const handleResetDefaults = () => {
    const resAccounts = resetToDemoAccounts();
    const resStaff = resetToDemoStaffMembers();
    setAccounts(resAccounts);
    setStaffMembers(resStaff);
    setCurrentUserState(resAccounts[0]);
    showToast('info', 'Reset both staff directory and system accounts to default hotel roster.');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Toast Notification */}
      {notificationMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl font-bold text-xs flex items-center gap-2 animate-fade-in border ${
            notificationMsg.type === 'success'
              ? 'bg-[#10B981] text-[#121110] border-[#34D399]'
              : notificationMsg.type === 'error'
              ? 'bg-[#E63946] text-white border-[#FCA5A5]'
              : 'bg-[#C5A880] text-[#121110] border-[#E5D5B8]'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>{notificationMsg.text}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2C2A26] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-[#C5A880] font-semibold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>Hotel Staff &amp; System Access Control</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif-luxury text-[#F3EFEA]">
            Staff &amp; Accounts Management
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {isDeveloper ? (
            <>
              <button
                type="button"
                onClick={() => setIsCreateStaffModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#C5A880] hover:bg-[#B39366] text-[#121110] text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Add Staff Member</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCreateAccountModalOpen(true)}
                className="px-3 py-2 rounded-xl bg-[#24211D] hover:bg-[#322E29] border border-[#3E3A33] text-[#E5D5B8] text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#C5A880]" />
                <span className="hidden sm:inline">Add Login Account</span>
                <span className="sm:hidden">Add Login</span>
              </button>
            </>
          ) : (
            <div className="text-xs text-[#A89F91] bg-[#24211D] border border-[#3E3A33] px-3 py-2 rounded-xl flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Admin only can add staff members</span>
            </div>
          )}
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-[#171614] border border-[#2C2A26] rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-[#A89F91] uppercase tracking-wider block font-semibold">
              Hotel Staff Associates
            </span>
            <span className="text-2xl font-bold font-serif-luxury text-[#F3EFEA]">
              {stats.totalStaff}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/15 border border-[#3B82F6]/30 flex items-center justify-center text-[#60A5FA]">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#171614] border border-[#2C2A26] rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-[#A89F91] uppercase tracking-wider block font-semibold">
              System Login Accounts
            </span>
            <span className="text-2xl font-bold font-serif-luxury text-[#C5A880]">
              {stats.totalAccounts}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#C5A880]/15 border border-[#C5A880]/30 flex items-center justify-center text-[#C5A880]">
            <KeyRound className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#171614] border border-[#2C2A26] rounded-xl p-4 flex items-center justify-between col-span-2 sm:col-span-1">
          <div>
            <span className="text-[11px] text-[#A89F91] uppercase tracking-wider block font-semibold">
              Total On Duty Now
            </span>
            <span className="text-2xl font-bold font-serif-luxury text-[#22C55E]">
              {stats.onDutyCount}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/30 flex items-center justify-center text-[#22C55E]">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Sub Tabs: Staff Roster vs System Logins */}
      <div className="flex items-center justify-between border-b border-[#2C2A26] pb-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('staff_roster')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'staff_roster'
                ? 'bg-[#C5A880] text-[#121110] shadow-sm'
                : 'text-[#B8B2A7] hover:text-white hover:bg-[#24211D]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Staff Directory &amp; Associates ({staffMembers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('login_accounts')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'login_accounts'
                ? 'bg-[#C5A880] text-[#121110] shadow-sm'
                : 'text-[#B8B2A7] hover:text-white hover:bg-[#24211D]'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>System Login Accounts ({accounts.length})</span>
          </button>
        </div>

        {isDeveloper && (
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-[11px] text-[#8E877C] hover:text-[#C5A880] flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Reset Default Demo Roster</span>
          </button>
        )}
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-[#171614] border border-[#2C2A26] rounded-2xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#7E786E] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, role title, phone or notes..."
              className="w-full bg-[#141311] border border-[#2B2822] focus:border-[#C5A880] rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-[#F3EFEA] placeholder-[#7E786E] outline-none"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="bg-[#141311] border border-[#2B2822] text-[#D8D2C7] text-xs rounded-xl px-3 py-2 outline-none focus:border-[#C5A880]"
            >
              <option value="ALL">All Departments</option>
              {departmentsList.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-[#141311] border border-[#2B2822] text-[#D8D2C7] text-xs rounded-xl px-3 py-2 outline-none focus:border-[#C5A880]"
            >
              <option value="ALL">All Duty Statuses</option>
              <option value="ON_DUTY">On Duty</option>
              <option value="ON_BREAK">On Break</option>
              <option value="OFF_DUTY">Off Duty</option>
            </select>
          </div>
        </div>
      </div>

      {/* View Section 1: Staff Directory & Associates */}
      {activeSubTab === 'staff_roster' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-[#A89F91]">
            <span>Showing {filteredStaffMembers.length} staff associates</span>
            <span className="text-[#C5A880] font-medium">Available for Task Delegation</span>
          </div>

          {filteredStaffMembers.length === 0 ? (
            <div className="bg-[#171614] border border-[#2C2A26] rounded-2xl p-8 text-center space-y-3">
              <Users className="w-10 h-10 text-[#7E786E] mx-auto" />
              <h3 className="text-base font-bold text-[#F3EFEA]">No staff members found</h3>
              <p className="text-xs text-[#A89F91] max-w-sm mx-auto">
                No hotel staff match your active search filters.
              </p>
              {isDeveloper && (
                <button
                  type="button"
                  onClick={() => setIsCreateStaffModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[#C5A880] text-[#121110] text-xs font-bold mt-2"
                >
                  + Add First Staff Member
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStaffMembers.map((staff) => {
                const isOnDuty = staff.dutyStatus === 'ON_DUTY';
                const isOnBreak = staff.dutyStatus === 'ON_BREAK';
                const isConfirmingDelete = staffIdToDelete === staff.id;

                return (
                  <div
                    key={staff.id}
                    className="bg-[#171614] border border-[#2C2A26] hover:border-[#3E3A33] rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 transition-all"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/15 border border-[#3B82F6]/30 flex items-center justify-center font-bold text-[#60A5FA] text-base shrink-0">
                            {staff.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-[#F3EFEA] truncate">
                              {staff.name}
                            </h3>
                            <span className="text-xs text-[#C5A880] font-medium block truncate">
                              {staff.roleTitle}
                            </span>
                          </div>
                        </div>

                        {/* Duty Status Badge */}
                        <button
                          type="button"
                          onClick={() => handleToggleStaffDuty(staff.id, staff.dutyStatus)}
                          title="Click to toggle duty status"
                          className={`text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            isOnDuty
                              ? 'bg-[#22C55E]/15 text-[#86EFAC] border border-[#22C55E]/30'
                              : isOnBreak
                              ? 'bg-[#EAB308]/15 text-[#FDE047] border border-[#EAB308]/30'
                              : 'bg-[#6B7280]/20 text-[#D1D5DB] border border-[#6B7280]/30'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isOnDuty ? 'bg-[#22C55E]' : isOnBreak ? 'bg-[#EAB308]' : 'bg-[#6B7280]'
                            }`}
                          />
                          {isOnDuty ? 'On Duty' : isOnBreak ? 'On Break' : 'Off Duty'}
                        </button>
                      </div>

                      {/* Details Box */}
                      <div className="mt-3.5 bg-[#121110] border border-[#24211D] rounded-xl p-3 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-[#8E877C]">
                          <span className="flex items-center gap-1">
                            <Building className="w-3 h-3" />
                            <span>Department</span>
                          </span>
                          <span className="font-semibold text-[#D8D2C7]">{staff.department}</span>
                        </div>

                        <div className="flex items-center justify-between text-[#8E877C]">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Assigned Shift</span>
                          </span>
                          <span className="text-[#D8D2C7] truncate max-w-[160px]">{staff.shift}</span>
                        </div>

                        {staff.phone && (
                          <div className="flex items-center justify-between text-[#8E877C]">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              <span>Contact Phone</span>
                            </span>
                            <span className="font-mono text-[#D8D2C7]">{staff.phone}</span>
                          </div>
                        )}

                        {staff.notes && (
                          <div className="pt-1.5 border-t border-[#201E1B] text-[11px] text-[#A89F91] italic">
                            "{staff.notes}"
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Inline Delete Confirmation or Action Bar */}
                    {isConfirmingDelete ? (
                      <div className="pt-2 border-t border-[#24211D] bg-[#2A1215]/80 p-2.5 rounded-xl border border-[#E63946]/40 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-[#FFCCD5] font-medium">Remove {staff.name}?</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setStaffIdToDelete(null)}
                            className="px-2 py-0.5 rounded text-[11px] text-[#B8B2A7] hover:bg-[#3D2528]"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConfirmDeleteStaff(staff.id, staff.name)}
                            className="px-2.5 py-0.5 rounded bg-[#E63946] text-white font-bold text-[11px] hover:bg-[#D62839]"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-[#24211D] flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setStaffToEdit(staff)}
                          className="text-xs text-[#C5A880] hover:text-[#E5D5B8] flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        {isDeveloper && (
                          <button
                            type="button"
                            onClick={() => setStaffIdToDelete(staff.id)}
                            className="text-xs text-[#E63946] hover:text-[#FF8B94] flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* View Section 2: System Login Accounts */}
      {activeSubTab === 'login_accounts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-[#A89F91]">
            <span>Showing {filteredAccounts.length} system login profiles</span>
            <span className="text-[#C5A880] font-medium">Front Desk &amp; Housekeeping Supervisors</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAccounts.map((acc) => {
              const isCurrentSession = currentUser?.id === acc.id;
              const isDev = acc.role === 'developer' || acc.isPrimaryDeveloper;
              const isConfirmingAccountDelete = accountIdToDelete === acc.id;

              return (
                <div
                  key={acc.id}
                  className={`bg-[#171614] border rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 transition-all ${
                    isCurrentSession
                      ? 'border-[#C5A880] shadow-md bg-gradient-to-b from-[#242019] to-[#171614]'
                      : 'border-[#2C2A26] hover:border-[#3E3A33]'
                  }`}
                >
                  <div>
                    {/* Account Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-base shrink-0 shadow-sm"
                          style={{ backgroundColor: acc.avatarColor || '#C5A880' }}
                        >
                          {acc.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-sm font-bold text-[#F3EFEA] truncate">
                              {acc.name}
                            </h3>
                            {isDev && <Crown className="w-3.5 h-3.5 text-[#C5A880] shrink-0" />}
                          </div>
                          <span className="text-xs text-[#C5A880] font-medium block truncate">
                            {acc.roleTitle}
                          </span>
                        </div>
                      </div>

                      {isCurrentSession ? (
                        <span className="text-[10px] bg-[#C5A880] text-[#121110] px-2 py-0.5 rounded-full font-bold uppercase">
                          Active
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSwitchUser(acc)}
                          className="text-[10px] bg-[#24211D] hover:bg-[#322E29] border border-[#3E3A33] text-[#D8D2C7] px-2 py-0.5 rounded-full font-semibold transition-colors cursor-pointer"
                        >
                          Switch User
                        </button>
                      )}
                    </div>

                    {/* Account Details Box */}
                    <div className="mt-3.5 bg-[#121110] border border-[#24211D] rounded-xl p-3 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-[#8E877C]">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>Username</span>
                        </span>
                        <span className="font-mono text-[#D8D2C7] font-semibold">{acc.username}</span>
                      </div>

                      <div className="flex items-center justify-between text-[#8E877C]">
                        <span className="flex items-center gap-1">
                          <Building className="w-3 h-3" />
                          <span>Department</span>
                        </span>
                        <span className="text-[#D8D2C7]">{acc.department}</span>
                      </div>

                      <div className="flex items-center justify-between text-[#8E877C]">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          <span>Email</span>
                        </span>
                        <span className="text-[#D8D2C7] truncate max-w-[150px]">{acc.email}</span>
                      </div>

                      <div className="flex items-center justify-between text-[#8E877C]">
                        <span className="flex items-center gap-1">
                          <KeyRound className="w-3 h-3" />
                          <span>Password</span>
                        </span>
                        <span className="font-mono text-[#7E786E]">••••••••</span>
                      </div>
                    </div>
                  </div>

                  {/* Inline Delete Confirmation or Action Bar */}
                  {isConfirmingAccountDelete ? (
                    <div className="pt-2 border-t border-[#24211D] bg-[#2A1215]/80 p-2.5 rounded-xl border border-[#E63946]/40 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-[#FFCCD5] font-medium">Delete {acc.name}?</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setAccountIdToDelete(null)}
                          className="px-2 py-0.5 rounded text-[11px] text-[#B8B2A7] hover:bg-[#3D2528]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConfirmDeleteAccount(acc.id, acc.name)}
                          className="px-2.5 py-0.5 rounded bg-[#E63946] text-white font-bold text-[11px] hover:bg-[#D62839]"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-[#24211D] flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setAccountToViewProfile(acc)}
                        className="text-xs text-[#C5A880] hover:text-[#E5D5B8] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>Profile</span>
                      </button>

                      <div className="flex items-center gap-2">
                        {isDeveloper && (
                          <button
                            type="button"
                            onClick={() => setAccountToEdit(acc)}
                            className="text-xs text-[#D8D2C7] hover:text-white flex items-center gap-1 font-semibold cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                        )}

                        {isDeveloper && !acc.isPrimaryDeveloper && !isCurrentSession && (
                          <button
                            type="button"
                            onClick={() => setAccountIdToDelete(acc.id)}
                            className="text-xs text-[#E63946] hover:text-[#FF8B94] flex items-center gap-1 font-semibold cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateStaffMemberModal
        isOpen={isCreateStaffModalOpen}
        onClose={() => setIsCreateStaffModalOpen(false)}
        currentUser={currentUser}
        onStaffCreated={(newStaff) => {
          setStaffMembers(getAllStaffMembers());
          showToast('success', `Added ${newStaff.name} to the hotel staff directory.`);
        }}
      />

      <CreateAccountModal
        isOpen={isCreateAccountModalOpen}
        onClose={() => setIsCreateAccountModalOpen(false)}
        onAccountCreated={(newAcc) => {
          setAccounts(getAllAccounts());
          showToast('success', `Created login account for ${newAcc.name}.`);
        }}
      />

      {staffToEdit && (
        <EditStaffMemberModal
          isOpen={Boolean(staffToEdit)}
          staffMember={staffToEdit}
          currentUser={currentUser}
          onClose={() => setStaffToEdit(null)}
          onStaffSaved={(updated) => {
            setStaffMembers(getAllStaffMembers());
            showToast('success', `Updated staff member ${updated.name}.`);
          }}
          onStaffDeleted={(deletedId) => {
            setStaffMembers(getAllStaffMembers());
            showToast('success', 'Staff member removed from directory.');
          }}
        />
      )}

      {accountToEdit && (
        <EditAccountModal
          isOpen={Boolean(accountToEdit)}
          accountToEdit={accountToEdit}
          onClose={() => setAccountToEdit(null)}
          onAccountSaved={(updated) => {
            setAccounts(getAllAccounts());
            showToast('success', `Updated account for ${updated.name}.`);
          }}
          onAccountDeleted={(deletedId) => {
            setAccounts(getAllAccounts());
            showToast('success', 'Account deleted.');
          }}
        />
      )}

      {accountToViewProfile && (
        <ProfileModal
          isOpen={Boolean(accountToViewProfile)}
          targetAccount={accountToViewProfile}
          onClose={() => setAccountToViewProfile(null)}
          onProfileUpdated={(updated) => {
            setAccounts(getAllAccounts());
            showToast('success', `Updated profile for ${updated.name}.`);
          }}
        />
      )}
    </div>
  );
};
