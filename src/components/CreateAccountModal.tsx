import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Crown,
  KeyRound,
  Mail,
  User,
  Phone,
  Briefcase,
  Clock,
  Palette,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { UserProfile, DutyStatus, UserRole } from '../types/hotel';
import { createAccount, getCurrentUser } from '../services/authService';

interface CreateAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountCreated: (account: UserProfile) => void;
}

const AVATAR_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#C5A880', // Gold
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

export const CreateAccountModal: React.FC<CreateAccountModalProps> = ({
  isOpen,
  onClose,
  onAccountCreated,
}) => {
  const currentUser = getCurrentUser();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('password123');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('staff');
  const [roleTitle, setRoleTitle] = useState('Staff Concierge');
  const [department, setDepartment] = useState('Front Desk');
  const [shift, setShift] = useState('Day Shift (07:00 - 15:30)');
  const [bio, setBio] = useState('');
  const [avatarColor, setAvatarColor] = useState('#3B82F6');
  const [dutyStatus, setDutyStatus] = useState<DutyStatus>('ON_DUTY');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!currentUser || (currentUser.role !== 'developer' && !currentUser.isPrimaryDeveloper)) {
      setErrorMsg('Authority Denied: Only the Primary Admin / Developer account has authority to create employee accounts.');
      return;
    }

    if (!name.trim() || !username.trim() || !password.trim()) {
      setErrorMsg('Please complete all required fields (Name, Username, Password).');
      return;
    }

    setIsSubmitting(true);

    const newAccountData = {
      name: name.trim(),
      username: username.trim().toLowerCase(),
      password: password.trim(),
      email: email.trim() || `${username.trim().toLowerCase()}@madigunhotel.com`,
      phone: phone.trim() || '+1 (555) 010-0000',
      role,
      roleTitle: roleTitle.trim(),
      department: department.trim(),
      shift: shift.trim(),
      bio: bio.trim() || `Madigun Hotel employee in ${department}.`,
      avatarColor,
      dutyStatus,
    };

    const res = createAccount(currentUser, newAccountData);
    setIsSubmitting(false);

    if (res.success && res.account) {
      onAccountCreated(res.account);
      onClose();
    } else {
      setErrorMsg(res.error || 'Failed to create account.');
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
              <UserPlus className="w-4 h-4" />
            </div>
            <span className="text-xs uppercase tracking-widest text-[#C5A880] font-semibold">
              Primary Admin Authority
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif-luxury text-[#F3EFEA]">
            Create Employee Account
          </h2>
          <p className="text-xs text-[#A8A196]">
            Provision credentials and permissions for new hotel staff members
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
              <label className="block text-[#D8D2C7] font-semibold">
                Employee Full Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!username && e.target.value) {
                    const firstPart = e.target.value.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
                    setUsername(firstPart);
                    setEmail(`${firstPart}@madigunhotel.com`);
                  }
                }}
                placeholder="e.g. Jordan Miller"
                required
                className="w-full bg-[#121110] border border-[#33302A] focus:border-[#C5A880] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[#D8D2C7] font-semibold">
                Username / Login ID *
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (!email || email.endsWith('@madigunhotel.com')) {
                    setEmail(`${e.target.value.toLowerCase()}@madigunhotel.com`);
                  }
                }}
                placeholder="e.g. jordan.frontdesk"
                required
                className="w-full bg-[#121110] border border-[#33302A] focus:border-[#C5A880] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] font-mono outline-none"
              />
            </div>
          </div>

          {/* Row 2: Initial Password and Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[#D8D2C7] font-semibold">
                Temporary Password *
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="e.g. password123"
                className="w-full bg-[#121110] border border-[#33302A] focus:border-[#C5A880] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] font-mono outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[#D8D2C7] font-semibold">
                Work Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. jordan.m@madigunhotel.com"
                className="w-full bg-[#121110] border border-[#33302A] focus:border-[#C5A880] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] outline-none"
              />
            </div>
          </div>

          {/* Row 3: Role & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[#D8D2C7] font-semibold">
                Account Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full bg-[#121110] border border-[#33302A] focus:border-[#C5A880] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] outline-none"
              >
                <option value="staff">🛡️ Staff Employee</option>
                <option value="developer">👑 Administrator / Developer</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[#D8D2C7] font-semibold">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => {
                  setDepartment(e.target.value);
                  if (e.target.value === 'Housekeeping') setRoleTitle('Housekeeping Attendant');
                  else if (e.target.value === 'Maintenance & Engineering') setRoleTitle('Maintenance Technician');
                  else if (e.target.value === 'Front Desk') setRoleTitle('Front Desk Concierge');
                }}
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
              <label className="block text-[#D8D2C7] font-semibold">
                Role Title
              </label>
              <input
                type="text"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="e.g. Front Desk Specialist"
                className="w-full bg-[#121110] border border-[#33302A] focus:border-[#C5A880] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[#D8D2C7] font-semibold">
                Shift Schedule
              </label>
              <input
                type="text"
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                placeholder="e.g. Morning Shift (07:00 - 15:30)"
                className="w-full bg-[#121110] border border-[#33302A] focus:border-[#C5A880] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] outline-none"
              />
            </div>
          </div>

          {/* Row 5: Contact Phone & Duty Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[#D8D2C7] font-semibold">
                Contact Phone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 012-3456"
                className="w-full bg-[#121110] border border-[#33302A] focus:border-[#C5A880] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[#D8D2C7] font-semibold">
                Initial Duty Status
              </label>
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
            <label className="block text-[#D8D2C7] font-semibold">
              Employee Bio &amp; Responsibilities
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              placeholder="Brief description of duties and specialties..."
              className="w-full bg-[#121110] border border-[#33302A] focus:border-[#C5A880] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] outline-none resize-none"
            />
          </div>

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
              className="w-1/2 py-2.5 rounded-lg bg-[#C5A880] hover:bg-[#B39366] text-[#121110] font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isSubmitting ? 'Creating...' : 'Create Account'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
