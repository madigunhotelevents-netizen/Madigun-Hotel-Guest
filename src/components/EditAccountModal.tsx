import React, { useState, useEffect } from 'react';
import {
  X,
  Edit,
  KeyRound,
  Crown,
  Trash2,
  AlertCircle,
  Palette,
  Shield,
} from 'lucide-react';
import { UserProfile, DutyStatus, UserRole } from '../types/hotel';
import { updateAccount, deleteAccount, getCurrentUser } from '../services/authService';

interface EditAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountToEdit: UserProfile | null;
  onAccountSaved: (account: UserProfile) => void;
  onAccountDeleted?: (accountId: string) => void;
}

const AVATAR_COLORS = [
  '#C5A880', // Gold
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#E63946', // Coral Red
];

const DEPARTMENTS = [
  'Front Desk',
  'Housekeeping',
  'Maintenance & Engineering',
  'Guest Services & Concierge',
  'Food & Beverage / Room Service',
  'Security & Safety',
  'IT & System Administration',
];

export const EditAccountModal: React.FC<EditAccountModalProps> = ({
  isOpen,
  onClose,
  accountToEdit,
  onAccountSaved,
  onAccountDeleted,
}) => {
  const currentUser = getCurrentUser();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('staff');
  const [roleTitle, setRoleTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [shift, setShift] = useState('');
  const [bio, setBio] = useState('');
  const [avatarColor, setAvatarColor] = useState('#3B82F6');
  const [dutyStatus, setDutyStatus] = useState<DutyStatus>('ON_DUTY');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (accountToEdit) {
      setName(accountToEdit.name || '');
      setUsername(accountToEdit.username || '');
      setPassword('');
      setEmail(accountToEdit.email || '');
      setPhone(accountToEdit.phone || '');
      setRole(accountToEdit.role || 'staff');
      setRoleTitle(accountToEdit.roleTitle || '');
      setDepartment(accountToEdit.department || 'Front Desk');
      setShift(accountToEdit.shift || '');
      setBio(accountToEdit.bio || '');
      setAvatarColor(accountToEdit.avatarColor || '#3B82F6');
      setDutyStatus(accountToEdit.dutyStatus || 'ON_DUTY');
      setErrorMsg(null);
      setShowDeleteConfirm(false);
    }
  }, [accountToEdit, isOpen]);

  if (!isOpen || !accountToEdit) return null;

  const isDevActor = currentUser?.role === 'developer' || currentUser?.isPrimaryDeveloper;
  const isPrimaryDevTarget = accountToEdit.isPrimaryDeveloper;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!currentUser) {
      setErrorMsg('You must be logged in.');
      return;
    }

    setIsSubmitting(true);

    const updates: Partial<UserProfile> = {
      name: name.trim(),
      username: username.trim().toLowerCase(),
      email: email.trim(),
      phone: phone.trim(),
      roleTitle: roleTitle.trim(),
      department: department.trim(),
      shift: shift.trim(),
      bio: bio.trim(),
      avatarColor,
      dutyStatus,
    };

    if (isDevActor && !isPrimaryDevTarget) {
      updates.role = role;
    }

    if (password.trim()) {
      if (password.trim().length < 4) {
        setErrorMsg('Password must be at least 4 characters.');
        setIsSubmitting(false);
        return;
      }
      updates.password = password.trim();
    }

    const res = updateAccount(currentUser, accountToEdit.id, updates);
    setIsSubmitting(false);

    if (res.success && res.account) {
      onAccountSaved(res.account);
      onClose();
    } else {
      setErrorMsg(res.error || 'Failed to update account.');
    }
  };

  const handleDelete = () => {
    if (!currentUser) return;
    const res = deleteAccount(currentUser, accountToEdit.id);
    if (res.success) {
      onAccountDeleted?.(accountToEdit.id);
      onClose();
    } else {
      setErrorMsg(res.error || 'Failed to delete account.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-[#191815] border border-[#3E3A33] rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative space-y-5 text-[#F3EFEA] my-8">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#8E877C] hover:text-[#F3EFEA] hover:bg-[#2A2824] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Title */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#C5A880]/15 border border-[#C5A880]/40 flex items-center justify-center text-[#C5A880]">
              <Edit className="w-4 h-4" />
            </div>
            <span className="text-xs uppercase tracking-widest text-[#C5A880] font-semibold">
              {isPrimaryDevTarget ? 'Primary Developer Account' : 'Edit Employee Account'}
            </span>
          </div>
          <h2 className="text-xl font-bold font-serif-luxury text-[#F3EFEA]">
            Edit Account: {accountToEdit.name}
          </h2>
          <p className="text-xs text-[#A8A196]">
            Modify account credentials, role assignments, contact info, and shift schedule
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-[#2A1517] border border-[#E63946]/50 rounded-xl p-3 text-xs text-[#FFCCD5] flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#E63946] shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Row 1: Name and Username */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[#D8D2C7] font-semibold">Full Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-[#121110] border border-[#33302A] focus:border-[#C5A880] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[#D8D2C7] font-semibold">Username *</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-[#121110] border border-[#33302A] focus:border-[#C5A880] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] font-mono outline-none"
              />
            </div>
          </div>

          {/* Row 2: Email & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[#D8D2C7] font-semibold">Work Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#121110] border border-[#33302A] focus:border-[#C5A880] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[#D8D2C7] font-semibold">Contact Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-[#121110] border border-[#33302A] focus:border-[#C5A880] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] outline-none"
              />
            </div>
          </div>

          {/* Row 3: Role & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[#D8D2C7] font-semibold">Account Role</label>
              {isPrimaryDevTarget ? (
                <div className="px-3 py-2 bg-[#221F1A] border border-[#C5A880]/40 rounded-lg text-xs text-[#C5A880] font-semibold flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5" />
                  <span>Primary Developer Admin</span>
                </div>
              ) : isDevActor ? (
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full bg-[#121110] border border-[#33302A] focus:border-[#C5A880] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] outline-none"
                >
                  <option value="staff">🛡️ Staff Employee</option>
                  <option value="developer">👑 Developer / Admin</option>
                </select>
              ) : (
                <div className="px-3 py-2 bg-[#121110] border border-[#33302A] rounded-lg text-xs text-[#9E978C]">
                  {role === 'developer' ? '👑 Developer' : '🛡️ Staff Employee'}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-[#D8D2C7] font-semibold">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-[#121110] border border-[#33302A] focus:border-[#C5A880] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] outline-none"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 4: Role Title & Shift */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[#D8D2C7] font-semibold">Role Title</label>
              <input
                type="text"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="e.g. Front Desk Specialist"
                className="w-full bg-[#121110] border border-[#33302A] focus:border-[#C5A880] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[#D8D2C7] font-semibold">Shift Schedule</label>
              <input
                type="text"
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                placeholder="e.g. Morning Shift (07:00 - 15:30)"
                className="w-full bg-[#121110] border border-[#33302A] focus:border-[#C5A880] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] outline-none"
              />
            </div>
          </div>

          {/* Row 5: Duty Status & Reset Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[#D8D2C7] font-semibold">Duty Status</label>
              <select
                value={dutyStatus}
                onChange={(e) => setDutyStatus(e.target.value as DutyStatus)}
                className="w-full bg-[#121110] border border-[#33302A] focus:border-[#C5A880] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] outline-none"
              >
                <option value="ON_DUTY">🟢 On Duty (Active)</option>
                <option value="ON_BREAK">🟡 On Break</option>
                <option value="OFF_DUTY">⚪ Off Duty</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[#D8D2C7] font-semibold flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>Reset Password</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to keep unchanged"
                className="w-full bg-[#121110] border border-[#33302A] focus:border-[#C5A880] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] outline-none"
              />
            </div>
          </div>

          {/* Avatar Color */}
          <div className="space-y-1.5">
            <label className="block text-[#D8D2C7] font-semibold flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Avatar Color</span>
            </label>
            <div className="flex items-center gap-2">
              {AVATAR_COLORS.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setAvatarColor(col)}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    avatarColor === col ? 'scale-125 ring-2 ring-[#F3EFEA]' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: col }}
                />
              ))}
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-1">
            <label className="block text-[#D8D2C7] font-semibold">Personal Bio &amp; Duties</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              className="w-full bg-[#121110] border border-[#33302A] focus:border-[#C5A880] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] outline-none resize-none"
            />
          </div>

          {/* Delete Danger Section (For Dev Admin, if not primary dev) */}
          {isDevActor && !isPrimaryDevTarget && (
            <div className="border-t border-[#2C2A26] pt-3">
              {showDeleteConfirm ? (
                <div className="bg-[#2A1215] border border-[#E63946] rounded-xl p-3 flex items-center justify-between gap-3">
                  <div className="text-xs text-[#FFCCD5]">
                    Confirm delete account <strong>{accountToEdit.name}</strong>?
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-2.5 py-1 text-xs rounded border border-[#44383A] text-[#B8B2A7]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="px-2.5 py-1 text-xs rounded bg-[#E63946] text-white font-bold"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-xs text-[#E63946] hover:text-[#FF6B6B] flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Employee Account</span>
                </button>
              )}
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex gap-2 pt-3 border-t border-[#2C2A26]">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 rounded-lg border border-[#33302A] text-[#B8B2A7] hover:bg-[#252320] font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-1/2 py-2.5 rounded-lg bg-[#C5A880] hover:bg-[#B39366] text-[#121110] font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Account Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
