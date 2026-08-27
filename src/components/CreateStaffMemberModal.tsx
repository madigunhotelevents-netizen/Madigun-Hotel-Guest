import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Briefcase,
  Phone,
  Clock,
  FileText,
  Building,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { StaffMember, DutyStatus, UserProfile } from '../types/hotel';
import { addStaffMember } from '../services/storageService';

interface CreateStaffMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onStaffCreated: (staff: StaffMember) => void;
}

const DEPARTMENTS: StaffMember['department'][] = [
  'Housekeeping',
  'Front Desk',
  'Maintenance',
  'Dining & Room Service',
  'Security',
  'General Operations',
];

const SUGGESTED_ROLES: { role: string; dept: StaffMember['department'] }[] = [
  { role: 'Housekeeping Associate', dept: 'Housekeeping' },
  { role: 'Housekeeping Attendant', dept: 'Housekeeping' },
  { role: 'Linen & Laundry Specialist', dept: 'Housekeeping' },
  { role: 'Front Desk Concierge', dept: 'Front Desk' },
  { role: 'Luggage Porter & Bellman', dept: 'Front Desk' },
  { role: 'Maintenance Technician', dept: 'Maintenance' },
  { role: 'HVAC & Electrical Specialist', dept: 'Maintenance' },
  { role: 'Room Runner / Delivery', dept: 'Dining & Room Service' },
  { role: 'Safety & Security Officer', dept: 'Security' },
];

export const CreateStaffMemberModal: React.FC<CreateStaffMemberModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onStaffCreated,
}) => {
  const [name, setName] = useState('');
  const [roleTitle, setRoleTitle] = useState('Housekeeping Associate');
  const [department, setDepartment] = useState<StaffMember['department']>('Housekeeping');
  const [phone, setPhone] = useState('');
  const [shift, setShift] = useState('Morning Shift (07:00 - 15:30)');
  const [dutyStatus, setDutyStatus] = useState<DutyStatus>('ON_DUTY');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isDev = currentUser?.role === 'developer' || currentUser?.isPrimaryDeveloper;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isDev) {
      setErrorMsg('Authority Required: Only Administrators can add staff members to the directory.');
      return;
    }

    if (!name.trim()) {
      setErrorMsg('Please provide the staff member full name.');
      return;
    }

    const created = addStaffMember({
      name: name.trim(),
      roleTitle: roleTitle.trim() || 'Hotel Associate',
      department,
      phone: phone.trim() || '+1 (555) 019-0000',
      shift: shift.trim() || 'General Shift',
      dutyStatus,
      notes: notes.trim(),
      createdByAdmin: currentUser?.name || 'Administrator',
    });

    onStaffCreated(created);
    onClose();
  };

  const handleRoleSelect = (role: string, dept: StaffMember['department']) => {
    setRoleTitle(role);
    setDepartment(dept);
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

        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-[#2C2A26]">
          <div className="w-10 h-10 rounded-xl bg-[#C5A880]/15 border border-[#C5A880]/30 flex items-center justify-center text-[#C5A880] shrink-0">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold font-serif-luxury text-[#F3EFEA]">
              Add Hotel Staff Member
            </h2>
            <p className="text-xs text-[#A89F91]">
              Add personnel to the staff directory for task assignments (no login account required).
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-[#24211D] border border-[#3E3A33] rounded-xl p-3 text-xs text-[#D8D2C7] flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#C5A880] shrink-0 mt-0.5" />
          <span>
            General hotel staff (cleaners, porters, technicians) do not need system logins. They will appear directly in the Front Desk dispatch roster for task delegation.
          </span>
        </div>

        {errorMsg && (
          <div className="bg-[#E63946]/15 border border-[#E63946]/30 text-[#FF8B94] rounded-xl p-3 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Staff Full Name */}
          <div>
            <label className="text-[11px] font-semibold text-[#A89F91] uppercase tracking-wider block mb-1">
              Staff Full Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Maria Gonzalez"
              className="w-full bg-[#141311] border border-[#2B2822] focus:border-[#C5A880] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] placeholder-[#7E786E] outline-none"
            />
          </div>

          {/* Quick Role Suggestions */}
          <div>
            <label className="text-[10px] font-medium text-[#7E786E] uppercase tracking-wider block mb-1.5">
              Quick Role Presets
            </label>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_ROLES.map((item) => (
                <button
                  type="button"
                  key={item.role}
                  onClick={() => handleRoleSelect(item.role, item.dept)}
                  className={`text-[11px] px-2.5 py-1 rounded-md transition-all border ${
                    roleTitle === item.role
                      ? 'bg-[#C5A880] text-[#121110] font-bold border-[#C5A880]'
                      : 'bg-[#171614] text-[#B8B2A7] border-[#2A2823] hover:border-[#3E3A33]'
                  }`}
                >
                  {item.role}
                </button>
              ))}
            </div>
          </div>

          {/* Role Title & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-[#A89F91] uppercase tracking-wider block mb-1">
                Role / Job Title *
              </label>
              <input
                type="text"
                required
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="e.g., Housekeeping Associate"
                className="w-full bg-[#141311] border border-[#2B2822] focus:border-[#C5A880] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#A89F91] uppercase tracking-wider block mb-1">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value as StaffMember['department'])}
                className="w-full bg-[#141311] border border-[#2B2822] focus:border-[#C5A880] text-[#F3EFEA] text-xs rounded-lg px-3 py-2 outline-none"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Shift & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-[#A89F91] uppercase tracking-wider block mb-1">
                Assigned Shift
              </label>
              <input
                type="text"
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                placeholder="e.g., Morning Shift (07:00 - 15:30)"
                className="w-full bg-[#141311] border border-[#2B2822] focus:border-[#C5A880] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#A89F91] uppercase tracking-wider block mb-1">
                Contact Phone / Radio
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g., +1 (555) 018-2231"
                className="w-full bg-[#141311] border border-[#2B2822] focus:border-[#C5A880] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] outline-none"
              />
            </div>
          </div>

          {/* Initial Duty Status */}
          <div>
            <label className="text-[11px] font-semibold text-[#A89F91] uppercase tracking-wider block mb-1.5">
              Initial Duty Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDutyStatus('ON_DUTY')}
                className={`py-2 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                  dutyStatus === 'ON_DUTY'
                    ? 'bg-[#22C55E]/20 text-[#86EFAC] border-[#22C55E]'
                    : 'bg-[#141311] text-[#7E786E] border-[#2A2823]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
                On Duty
              </button>

              <button
                type="button"
                onClick={() => setDutyStatus('ON_BREAK')}
                className={`py-2 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                  dutyStatus === 'ON_BREAK'
                    ? 'bg-[#EAB308]/20 text-[#FDE047] border-[#EAB308]'
                    : 'bg-[#141311] text-[#7E786E] border-[#2A2823]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#EAB308]" />
                On Break
              </button>

              <button
                type="button"
                onClick={() => setDutyStatus('OFF_DUTY')}
                className={`py-2 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                  dutyStatus === 'OFF_DUTY'
                    ? 'bg-[#6B7280]/20 text-[#D1D5DB] border-[#6B7280]'
                    : 'bg-[#141311] text-[#7E786E] border-[#2A2823]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#6B7280]" />
                Off Duty
              </button>
            </div>
          </div>

          {/* Notes / Specialization */}
          <div>
            <label className="text-[11px] font-semibold text-[#A89F91] uppercase tracking-wider block mb-1">
              Duty Notes / Assigned Floors
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Assigned to Floors 1 & 2 guest room turnover"
              className="w-full bg-[#141311] border border-[#2B2822] focus:border-[#C5A880] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#2C2A26]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#252320] hover:bg-[#322E29] text-[#D8D2C7] text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-[#C5A880] hover:bg-[#B39366] text-[#121110] text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add to Staff Directory</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
