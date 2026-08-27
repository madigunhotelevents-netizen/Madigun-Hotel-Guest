import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  Briefcase,
  Clock,
  Shield,
  Crown,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  FileText,
  Palette,
  Sparkles,
  Activity,
} from 'lucide-react';
import { UserProfile, DutyStatus } from '../types/hotel';
import { updateAccount, getCurrentUser } from '../services/authService';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetAccount?: UserProfile | null; // If null, edits current user
  onProfileUpdated?: (updated: UserProfile) => void;
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

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  targetAccount,
  onProfileUpdated,
}) => {
  const currentUser = getCurrentUser();
  const profileToEdit = targetAccount || currentUser;

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [shift, setShift] = useState('');
  const [bio, setBio] = useState('');
  const [avatarColor, setAvatarColor] = useState('#C5A880');
  const [dutyStatus, setDutyStatus] = useState<DutyStatus>('ON_DUTY');
  const [newPassword, setNewPassword] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profileToEdit) {
      setName(profileToEdit.name || '');
      setUsername(profileToEdit.username || '');
      setEmail(profileToEdit.email || '');
      setPhone(profileToEdit.phone || '');
      setDepartment(profileToEdit.department || '');
      setRoleTitle(profileToEdit.roleTitle || '');
      setShift(profileToEdit.shift || '');
      setBio(profileToEdit.bio || '');
      setAvatarColor(profileToEdit.avatarColor || '#C5A880');
      setDutyStatus(profileToEdit.dutyStatus || 'ON_DUTY');
      setNewPassword('');
      setStatusMessage(null);
    }
  }, [profileToEdit, isOpen]);

  if (!isOpen || !profileToEdit) return null;

  const isDev = profileToEdit.role === 'developer' || profileToEdit.isPrimaryDeveloper;
  const isSelf = currentUser?.id === profileToEdit.id;
  const canEdit = isSelf || currentUser?.role === 'developer' || currentUser?.isPrimaryDeveloper;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setStatusMessage(null);
    setIsSaving(true);

    const updates: Partial<UserProfile> = {
      name: name.trim(),
      username: username.trim().toLowerCase(),
      email: email.trim(),
      phone: phone.trim(),
      department: department.trim(),
      roleTitle: roleTitle.trim(),
      shift: shift.trim(),
      bio: bio.trim(),
      avatarColor,
      dutyStatus,
    };

    if (newPassword.trim()) {
      if (newPassword.trim().length < 4) {
        setStatusMessage({ type: 'error', text: 'Password must be at least 4 characters.' });
        setIsSaving(false);
        return;
      }
      updates.password = newPassword.trim();
    }

    const res = updateAccount(currentUser, profileToEdit.id, updates);
    setIsSaving(false);

    if (res.success && res.account) {
      setStatusMessage({ type: 'success', text: 'Personal profile updated successfully!' });
      setIsEditing(false);
      onProfileUpdated?.(res.account);
      setTimeout(() => {
        setStatusMessage(null);
      }, 3000);
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Failed to update profile.' });
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

        {/* Profile Header Badge */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pt-2 border-b border-[#2C2A26] pb-5">
          <div className="relative">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold font-serif-luxury shadow-lg"
              style={{
                backgroundColor: `${avatarColor}25`,
                color: avatarColor,
                border: `2px solid ${avatarColor}70`,
              }}
            >
              {isDev ? <Crown className="w-8 h-8 text-[#C5A880]" /> : name.charAt(0)}
            </div>
            {/* Duty status indicator dot */}
            <span
              className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#191815] ${
                dutyStatus === 'ON_DUTY'
                  ? 'bg-[#22C55E]'
                  : dutyStatus === 'ON_BREAK'
                  ? 'bg-[#EAB308]'
                  : 'bg-[#6B7280]'
              }`}
              title={`Status: ${dutyStatus}`}
            />
          </div>

          <div className="text-center sm:text-left min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl font-bold font-serif-luxury text-[#F3EFEA] truncate">
                {name}
              </h2>
              {isDev ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#C5A880]/20 text-[#E5D5B8] border border-[#C5A880]/50 uppercase tracking-wider flex items-center gap-1">
                  <Crown className="w-3 h-3 text-[#C5A880]" />
                  Primary Developer
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#3B82F6]/20 text-[#93C5FD] border border-[#3B82F6]/40 uppercase tracking-wider flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Staff Account
                </span>
              )}
            </div>
            <p className="text-xs text-[#C5A880] font-medium">{roleTitle}</p>
            <p className="text-xs text-[#8E877C]">
              {department} • @{username}
            </p>
          </div>
        </div>

        {/* Status Alerts */}
        {statusMessage && (
          <div
            className={`rounded-xl p-3 text-xs flex items-center gap-2.5 ${
              statusMessage.type === 'success'
                ? 'bg-[#14291B] border border-[#22C55E]/50 text-[#86EFAC]'
                : 'bg-[#2A1517] border border-[#E63946]/50 text-[#FFCCD5]'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[#E63946] shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Profile Content View / Edit Mode */}
        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[#B8B2A7] font-semibold">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-[#121110] border border-[#33302A] focus:border-[#C5A880] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[#B8B2A7] font-semibold">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full bg-[#121110] border border-[#33302A] focus:border-[#C5A880] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] font-mono outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[#B8B2A7] font-semibold">Staff Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-[#121110] border border-[#33302A] focus:border-[#C5A880] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[#B8B2A7] font-semibold">Contact Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#121110] border border-[#33302A] focus:border-[#C5A880] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[#B8B2A7] font-semibold">Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-[#121110] border border-[#33302A] focus:border-[#C5A880] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[#B8B2A7] font-semibold">Role Title</label>
                <input
                  type="text"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  className="w-full bg-[#121110] border border-[#33302A] focus:border-[#C5A880] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[#B8B2A7] font-semibold">Duty Status</label>
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
                <label className="block text-[#B8B2A7] font-semibold">Shift Schedule</label>
                <input
                  type="text"
                  value={shift}
                  onChange={(e) => setShift(e.target.value)}
                  placeholder="e.g. Day Shift (07:00 - 15:30)"
                  className="w-full bg-[#121110] border border-[#33302A] focus:border-[#C5A880] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] outline-none"
                />
              </div>
            </div>

            {/* Avatar Color Palette */}
            <div className="space-y-1.5">
              <label className="block text-[#B8B2A7] font-semibold flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>Profile Theme Color</span>
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

            {/* Bio / Notes */}
            <div className="space-y-1">
              <label className="block text-[#B8B2A7] font-semibold">Personal Bio &amp; Duties</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                placeholder="Brief description of your role and responsibilities..."
                className="w-full bg-[#121110] border border-[#33302A] focus:border-[#C5A880] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] outline-none resize-none"
              />
            </div>

            {/* Password Update */}
            <div className="space-y-1 border-t border-[#2C2A26] pt-3">
              <label className="block text-[#B8B2A7] font-semibold flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>Change Password (leave blank to keep current)</span>
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full bg-[#121110] border border-[#33302A] focus:border-[#C5A880] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] outline-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="w-1/2 py-2 rounded-lg border border-[#33302A] text-[#B8B2A7] hover:bg-[#252320]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="w-1/2 py-2 rounded-lg bg-[#C5A880] hover:bg-[#B39366] text-[#121110] font-bold transition-all shadow-md disabled:opacity-50"
              >
                {isSaving ? 'Saving Changes...' : 'Save Profile'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 text-xs">
            {/* Contact & Department Details */}
            <div className="bg-[#121110] border border-[#2B2924] rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-[#D8D2C7]">
                  <Mail className="w-3.5 h-3.5 text-[#C5A880] shrink-0" />
                  <span className="truncate">{email}</span>
                </div>
                <div className="flex items-center gap-2 text-[#D8D2C7]">
                  <Phone className="w-3.5 h-3.5 text-[#C5A880] shrink-0" />
                  <span>{phone || 'No phone set'}</span>
                </div>
                <div className="flex items-center gap-2 text-[#D8D2C7]">
                  <Briefcase className="w-3.5 h-3.5 text-[#C5A880] shrink-0" />
                  <span>{department}</span>
                </div>
                <div className="flex items-center gap-2 text-[#D8D2C7]">
                  <Clock className="w-3.5 h-3.5 text-[#C5A880] shrink-0" />
                  <span className="truncate">{shift || 'Standard Shift'}</span>
                </div>
              </div>
            </div>

            {/* Personal Bio */}
            <div className="bg-[#121110] border border-[#2B2924] rounded-xl p-4 space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E877C] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>Personal Bio &amp; Role Overview</span>
              </span>
              <p className="text-xs text-[#D8D2C7] leading-relaxed">
                {bio || 'No personal bio added yet.'}
              </p>
            </div>

            {/* Duty Status & System Authority Card */}
            <div className="bg-[#141311] border border-[#2E2B25] rounded-xl p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Activity className="w-4 h-4 text-[#C5A880]" />
                <div>
                  <span className="text-xs font-semibold text-[#F3EFEA] block">
                    Current Duty Status:
                  </span>
                  <span className="text-[11px] text-[#8E877C]">
                    {dutyStatus === 'ON_DUTY'
                      ? '🟢 On Duty (Actively responding to guest calls)'
                      : dutyStatus === 'ON_BREAK'
                      ? '🟡 On Break'
                      : '⚪ Off Duty'}
                  </span>
                </div>
              </div>

              {canEdit && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1.5 rounded-lg bg-[#C5A880] hover:bg-[#B39366] text-[#121110] font-bold text-xs transition-colors shrink-0 shadow-sm"
                >
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
