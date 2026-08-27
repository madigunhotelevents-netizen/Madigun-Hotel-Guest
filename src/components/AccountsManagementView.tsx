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
  Cloud,
} from 'lucide-react';
import { UserProfile, DutyStatus, UserRole } from '../types/hotel';
import {
  getAllAccounts,
  getCurrentUser,
  setCurrentUser,
  subscribeToAuthEvents,
  resetToDemoAccounts,
  deleteAccount,
} from '../services/authService';
import { CreateAccountModal } from './CreateAccountModal';
import { EditAccountModal } from './EditAccountModal';
import { ProfileModal } from './ProfileModal';

interface AccountsManagementViewProps {
  onOpenLoginModal: () => void;
  onOpenGoogleDrive?: () => void;
}

export const AccountsManagementView: React.FC<AccountsManagementViewProps> = ({
  onOpenLoginModal,
  onOpenGoogleDrive,
}) => {
  const [accounts, setAccounts] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUserState] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'developer' | 'staff'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | DutyStatus>('ALL');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<UserProfile | null>(null);
  const [accountToViewProfile, setAccountToViewProfile] = useState<UserProfile | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  const loadData = () => {
    setAccounts(getAllAccounts());
    setCurrentUserState(getCurrentUser());
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToAuthEvents(() => {
      loadData();
    });
    return unsubscribe;
  }, []);

  const isDeveloper = currentUser?.role === 'developer' || currentUser?.isPrimaryDeveloper;

  const showToast = (type: 'success' | 'info' | 'error', text: string) => {
    setNotificationMsg({ type, text });
    setTimeout(() => {
      setNotificationMsg(null);
    }, 3500);
  };

  // Filtered Accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      if (departmentFilter !== 'ALL' && acc.department !== departmentFilter) return false;
      if (roleFilter !== 'ALL' && acc.role !== roleFilter) return false;
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
  }, [accounts, departmentFilter, roleFilter, statusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = accounts.length;
    const onDuty = accounts.filter((a) => a.dutyStatus === 'ON_DUTY').length;
    const onBreak = accounts.filter((a) => a.dutyStatus === 'ON_BREAK').length;
    const devs = accounts.filter((a) => a.role === 'developer' || a.isPrimaryDeveloper).length;
    const depts = new Set(accounts.map((a) => a.department)).size;
    return { total, onDuty, onBreak, devs, depts };
  }, [accounts]);

  // Unique departments for filter
  const departmentsList = useMemo(() => {
    const depts = new Set(accounts.map((a) => a.department));
    return Array.from(depts).filter(Boolean);
  }, [accounts]);

  const handleSwitchUser = (target: UserProfile) => {
    setCurrentUser(target);
    setCurrentUserState(target);
    showToast('success', `Switched active session to ${target.name} (${target.roleTitle})`);
  };

  const handleResetDefaults = () => {
    const res = resetToDemoAccounts();
    setAccounts(res);
    setCurrentUserState(res[0]);
    showToast('info', 'Accounts reset to initial hotel demo staff profiles.');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2C2A26] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-[#C5A880] font-semibold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>Accounts &amp; Access Directory</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif-luxury text-[#F3EFEA]">
            Staff Accounts Management
          </h1>
          <p className="text-xs sm:text-sm text-[#9E978C] mt-0.5">
            Administer employee accounts, profiles, credentials, and departmental roles
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenGoogleDrive && (
            <button
              type="button"
              onClick={onOpenGoogleDrive}
              className="text-xs px-3.5 py-2 rounded-lg bg-[#24211D] hover:bg-[#302B25] border border-[#3E3A33] hover:border-[#C5A880]/50 text-[#D8D2C7] hover:text-[#F3EFEA] font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Google Drive Cloud Backups"
            >
              <Cloud className="w-4 h-4 text-[#C5A880]" />
              <span>Google Drive</span>
            </button>
          )}

          {isDeveloper ? (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="text-xs px-3.5 py-2 rounded-lg bg-[#C5A880] hover:bg-[#B39366] text-[#121110] font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Create Employee Account</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenLoginModal}
              className="text-xs px-3.5 py-2 rounded-lg bg-[#24211D] hover:bg-[#302B25] border border-[#C5A880]/50 text-[#C5A880] font-semibold transition-all flex items-center gap-1.5"
              title="Sign in as developer to create accounts"
            >
              <Crown className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Developer Sign In</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-xs px-3 py-2 rounded-lg bg-[#1C1B18] hover:bg-[#252320] border border-[#33302A] text-[#9E978C] hover:text-[#F3EFEA] transition-colors flex items-center gap-1"
            title="Reset staff list to default demo accounts"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>

      {/* Developer Authority / Access Banner */}
      <div
        className={`rounded-xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm transition-all ${
          isDeveloper
            ? 'bg-[#211C15] border-[#C5A880]/60'
            : 'bg-[#181715] border-[#33302A]'
        }`}
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isDeveloper
                ? 'bg-[#C5A880]/20 text-[#C5A880] border border-[#C5A880]/50'
                : 'bg-[#2A2824] text-[#A8A196] border border-[#3E3A33]'
            }`}
          >
            {isDeveloper ? <Crown className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold font-serif-luxury text-[#F3EFEA]">
                {isDeveloper
                  ? '👑 Primary Admin / Developer Authority Active'
                  : currentUser
                  ? `Logged in as: ${currentUser.name} (${currentUser.roleTitle})`
                  : 'Viewing as Guest / Logged Out'}
              </h3>
              {isDeveloper && (
                <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-[#C5A880] text-[#121110] uppercase tracking-wider">
                  Full Authority
                </span>
              )}
            </div>
            <p className="text-xs text-[#B8B2A7] leading-relaxed">
              {isDeveloper
                ? 'As Primary Developer Admin, you have unrestricted authority to create employee accounts, modify all profiles, update credentials, and manage system roles.'
                : 'Employee accounts can manage front desk requests and update their personal profile. Switch to the Developer Account to create new accounts or edit all staff.'}
            </p>
          </div>
        </div>

        {!isDeveloper && (
          <button
            type="button"
            onClick={() => {
              const devAcc = accounts.find((a) => a.role === 'developer' || a.isPrimaryDeveloper);
              if (devAcc) handleSwitchUser(devAcc);
              else onOpenLoginModal();
            }}
            className="px-3.5 py-2 rounded-lg bg-[#C5A880] hover:bg-[#B39366] text-[#121110] font-bold text-xs whitespace-nowrap shadow-sm shrink-0 flex items-center justify-center gap-1.5"
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Switch to Developer Admin</span>
          </button>
        )}
      </div>

      {/* Toast Notification Alert */}
      {notificationMsg && (
        <div
          className={`rounded-xl p-3.5 text-xs flex items-center gap-2.5 shadow-lg animate-fade-in ${
            notificationMsg.type === 'success'
              ? 'bg-[#14291B] border border-[#22C55E]/50 text-[#86EFAC]'
              : notificationMsg.type === 'error'
              ? 'bg-[#2A1517] border border-[#E63946]/50 text-[#FFCCD5]'
              : 'bg-[#1A2234] border border-[#3B82F6]/50 text-[#93C5FD]'
          }`}
        >
          {notificationMsg.type === 'success' && <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />}
          {notificationMsg.type === 'error' && <AlertCircle className="w-4 h-4 text-[#E63946] shrink-0" />}
          {notificationMsg.type === 'info' && <Sparkles className="w-4 h-4 text-[#3B82F6] shrink-0" />}
          <span className="font-medium">{notificationMsg.text}</span>
        </div>
      )}

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#171614] border border-[#2C2A26] rounded-xl p-3.5 sm:p-4 space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E877C] block">
            Total Accounts
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-[#F3EFEA]">
            {stats.total}
          </span>
        </div>

        <div className="bg-[#171614] border border-[#2C2A26] rounded-xl p-3.5 sm:p-4 space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E877C] block flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
            <span>Staff On Duty</span>
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-[#86EFAC]">
            {stats.onDuty}
          </span>
        </div>

        <div className="bg-[#171614] border border-[#2C2A26] rounded-xl p-3.5 sm:p-4 space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E877C] block">
            Primary / Dev Admins
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-[#C5A880]">
            {stats.devs}
          </span>
        </div>

        <div className="bg-[#171614] border border-[#2C2A26] rounded-xl p-3.5 sm:p-4 space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E877C] block">
            Departments
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-[#D8D2C7]">
            {stats.depts}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Department Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setDepartmentFilter('ALL')}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
                departmentFilter === 'ALL'
                  ? 'bg-[#C5A880] text-[#121110] shadow-sm'
                  : 'bg-[#1C1B18] text-[#B8B2A7] hover:bg-[#252320] border border-[#2E2B25]'
              }`}
            >
              All Departments ({accounts.length})
            </button>

            {departmentsList.map((dept) => (
              <button
                key={dept}
                type="button"
                onClick={() => setDepartmentFilter(dept)}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  departmentFilter === dept
                    ? 'bg-[#C5A880] text-[#121110] shadow-sm'
                    : 'bg-[#1C1B18] text-[#B8B2A7] hover:bg-[#252320] border border-[#2E2B25]'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-[#7A756D] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search staff, username..."
              className="w-full bg-[#171614] border border-[#2E2B25] focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#F3EFEA] placeholder-[#7A756D] outline-none"
            />
          </div>
        </div>

        {/* Secondary Filters: Role & Duty */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[#8E877C] font-semibold">Filter:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="bg-[#1C1B18] border border-[#2E2B25] rounded-md px-2.5 py-1 text-xs text-[#D8D2C7] outline-none"
          >
            <option value="ALL">All Roles</option>
            <option value="developer">👑 Developers / Admins</option>
            <option value="staff">🛡️ Staff Employees</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-[#1C1B18] border border-[#2E2B25] rounded-md px-2.5 py-1 text-xs text-[#D8D2C7] outline-none"
          >
            <option value="ALL">All Duty Statuses</option>
            <option value="ON_DUTY">🟢 On Duty</option>
            <option value="ON_BREAK">🟡 On Break</option>
            <option value="OFF_DUTY">⚪ Off Duty</option>
          </select>
        </div>
      </div>

      {/* Accounts Grid */}
      {filteredAccounts.length === 0 ? (
        <div className="bg-[#171614] border border-[#2C2A26] rounded-xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-[#24211D] border border-[#38342D] mx-auto flex items-center justify-center text-[#7E786E] mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-[#F3EFEA] font-serif-luxury">
            No Accounts Found
          </h3>
          <p className="text-xs text-[#8E877C] mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No accounts matched "${searchQuery}".`
              : 'No accounts in the selected filter.'}
          </p>
          {isDeveloper && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="text-xs px-3.5 py-2 rounded bg-[#C5A880] hover:bg-[#B39366] text-[#121110] font-bold"
              >
                + Create New Account
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAccounts.map((account) => {
            const isTargetDev = account.role === 'developer' || account.isPrimaryDeveloper;
            const isCurrentUserCard = currentUser?.id === account.id;

            return (
              <div
                key={account.id}
                className={`rounded-xl border p-4 sm:p-5 flex flex-col justify-between gap-4 transition-all ${
                  account.isPrimaryDeveloper
                    ? 'bg-[#1D1913] border-[#C5A880]/60 shadow-md'
                    : isCurrentUserCard
                    ? 'bg-[#1A1916] border-[#3B82F6]/50 shadow-sm'
                    : 'bg-[#171614] border-[#2A2824] hover:border-[#3E3A33]'
                }`}
              >
                {/* Top: Avatar, Name, Badges */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Avatar with duty dot */}
                      <div className="relative shrink-0">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold font-serif-luxury shadow-md"
                          style={{
                            backgroundColor: `${account.avatarColor}25`,
                            color: account.avatarColor,
                            border: `1.5px solid ${account.avatarColor}60`,
                          }}
                        >
                          {isTargetDev ? <Crown className="w-6 h-6 text-[#C5A880]" /> : account.name.charAt(0)}
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#171614] ${
                            account.dutyStatus === 'ON_DUTY'
                              ? 'bg-[#22C55E]'
                              : account.dutyStatus === 'ON_BREAK'
                              ? 'bg-[#EAB308]'
                              : 'bg-[#6B7280]'
                          }`}
                          title={`Status: ${account.dutyStatus}`}
                        />
                      </div>

                      {/* Name & Role */}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h4 className="text-sm sm:text-base font-bold text-[#F3EFEA] truncate">
                            {account.name}
                          </h4>
                          {isCurrentUserCard && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#3B82F6]/20 text-[#93C5FD] border border-[#3B82F6]/40 uppercase tracking-wider">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#C5A880] font-medium truncate">
                          {account.roleTitle}
                        </p>
                        <p className="text-[11px] text-[#8E877C] font-mono">
                          @{account.username}
                        </p>
                      </div>
                    </div>

                    {/* Role Badge */}
                    <div className="shrink-0">
                      {account.isPrimaryDeveloper ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#C5A880]/20 text-[#E5D5B8] border border-[#C5A880]/50 uppercase tracking-wider flex items-center gap-1">
                          <Crown className="w-3 h-3 text-[#C5A880]" />
                          Primary Admin
                        </span>
                      ) : isTargetDev ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#C5A880]/20 text-[#E5D5B8] border border-[#C5A880]/50 uppercase tracking-wider">
                          Developer
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#2A2824] text-[#A8A196] border border-[#3E3A33] uppercase tracking-wider">
                          {account.department}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metadata info */}
                  <div className="bg-[#121110] border border-[#262420] rounded-lg p-2.5 text-xs space-y-1.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#B8B2A7]">
                      <div className="flex items-center gap-1.5 truncate">
                        <Briefcase className="w-3 h-3 text-[#C5A880] shrink-0" />
                        <span className="truncate">{account.department}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <Clock className="w-3 h-3 text-[#C5A880] shrink-0" />
                        <span className="truncate">{account.shift || 'Standard'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3 h-3 text-[#C5A880] shrink-0" />
                        <span className="truncate">{account.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <Phone className="w-3 h-3 text-[#C5A880] shrink-0" />
                        <span className="truncate">{account.phone || 'No phone'}</span>
                      </div>
                    </div>

                    {account.bio && (
                      <p className="text-[11px] text-[#8E877C] italic line-clamp-1 border-t border-[#22201D] pt-1">
                        "{account.bio}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Actions Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#262420]">
                  {/* Quick Switch / Active Session Status */}
                  <div>
                    {isCurrentUserCard ? (
                      <span className="text-[11px] font-semibold text-[#86EFAC] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Active Session</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSwitchUser(account)}
                        className="text-[11px] px-2.5 py-1 rounded bg-[#221F1B] hover:bg-[#2F2A24] border border-[#3B362F] text-[#D8D2C7] hover:text-[#C5A880] transition-colors flex items-center gap-1"
                        title="Switch active user to test this account"
                      >
                        <LogIn className="w-3 h-3 text-[#C5A880]" />
                        <span>Switch User</span>
                      </button>
                    )}
                  </div>

                  {/* Edit & Profile Buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAccountToViewProfile(account)}
                      className="px-2.5 py-1 rounded bg-[#1C1B18] hover:bg-[#252320] border border-[#33302A] text-xs text-[#D8D2C7] hover:text-[#F3EFEA] transition-colors flex items-center gap-1"
                      title="View personal profile"
                    >
                      <User className="w-3 h-3 text-[#C5A880]" />
                      <span>Personal Profile</span>
                    </button>

                    {(isDeveloper || isCurrentUserCard) && (
                      <button
                        type="button"
                        onClick={() => setAccountToEdit(account)}
                        className="px-2.5 py-1 rounded bg-[#C5A880] hover:bg-[#B39366] text-[#121110] text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
                        title="Edit account details"
                      >
                        <Edit className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <CreateAccountModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onAccountCreated={(newAcc) => {
          loadData();
          showToast('success', `Employee account for "${newAcc.name}" created successfully!`);
        }}
      />

      <EditAccountModal
        isOpen={Boolean(accountToEdit)}
        onClose={() => setAccountToEdit(null)}
        accountToEdit={accountToEdit}
        onAccountSaved={(saved) => {
          loadData();
          showToast('success', `Account "${saved.name}" updated successfully.`);
        }}
        onAccountDeleted={(deletedId) => {
          loadData();
          showToast('info', 'Employee account removed from directory.');
        }}
      />

      <ProfileModal
        isOpen={Boolean(accountToViewProfile)}
        onClose={() => setAccountToViewProfile(null)}
        targetAccount={accountToViewProfile}
        onProfileUpdated={(updated) => {
          loadData();
          showToast('success', `Personal profile for "${updated.name}" updated.`);
        }}
      />
    </div>
  );
};
