import React, { useState, useEffect } from 'react';
import {
  X,
  Edit,
  Trash2,
  AlertCircle,
  Building,
  Clock,
  Phone,
  Briefcase,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { StaffMember, DutyStatus, UserProfile } from '../types/hotel';
import { updateStaffMember, deleteStaffMember } from '../services/storageService';

interface EditStaffMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffMember: StaffMember | null;
  currentUser: UserProfile | null;
  onStaffSaved: (staff: StaffMember) => void;
  onStaffDeleted?: (staffId: string) => void;
}

const DEPARTMENTS: StaffMember['department'][] = [
  'Housekeeping',
  'Front Desk',
  'Maintenance',
  'Dining & Room Service',
  'Security',
  'General Operations',
];

export const EditStaffMemberModal: React.FC<EditStaffMemberModalProps> = ({
  isOpen,
  onClose,
  staffMember,
  currentUser,
  onStaffSaved,
  onStaffDeleted,
}) => {
  const [name, setName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [department, setDepartment] = useState<StaffMember['department']>('Housekeeping');
  const [phone, setPhone] = useState('');
  const [shift, setShift] = useState('');
  const [dutyStatus, setDutyStatus] = useState<DutyStatus>('ON_DUTY');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (staffMember) {
      setName(staffMember.name || '');
      setRoleTitle(staffMember.roleTitle || '');
      setDepartment(staffMember.department || 'Housekeeping');
      setPhone(staffMember.phone || '');
      setShift(staffMember.shift || '');
      setDutyStatus(staffMember.dutyStatus || 'ON_DUTY');
      setNotes(staffMember.notes || '');
      setErrorMsg(null);
      setShowDeleteConfirm(false);
    }
  }, [staffMember, isOpen]);

  if (!isOpen || !staffMember) return null;

  const isDev = currentUser?.role === 'developer' || currentUser?.isPrimaryDeveloper;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Staff member name cannot be empty.');
      return;
    }

    setIsSubmitting(true);

    const updates: Partial<StaffMember> = {
      name: name.trim(),
      roleTitle: roleTitle.trim() || 'Hotel Associate',
      department,
      phone: phone.trim(),
      shift: shift.trim(),
      dutyStatus,
      notes: notes.trim(),
    };

    const updatedList = updateStaffMember(staffMember.id, updates);
    setIsSubmitting(false);

    const savedStaff = updatedList.find((s) => s.id === staffMember.id) || { ...staffMember, ...updates };
    onStaffSaved(savedStaff);
    onClose();
  };

  const handleDelete = () => {
    if (!isDev) {
      setErrorMsg('Authority Required: Only Administrators can remove staff members.');
      return;
    }

    deleteStaffMember(staffMember.id);
    onStaffDeleted?.(staffMember.id);
    onClose();
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
        <div className="flex items-center gap-3 pb-3 border-b border-[#2C2A26]">
          <div className="w-10 h-10 rounded-xl bg-[#C5A880]/15 border border-[#C5A880]/30 flex items-center justify-center text-[#C5A880] shrink-0">
            <Edit className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold font-serif-luxury text-[#F3EFEA]">
              Edit Staff Member
            </h2>
            <span className="text-xs text-[#A89F91] block">
              {staffMember.name} • {staffMember.roleTitle}
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-[#E63946]/15 border border-[#E63946]/30 text-[#FF8B94] rounded-xl p-3 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="text-[11px] font-semibold text-[#A89F91] uppercase tracking-wider block mb-1">
              Staff Full Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#141311] border border-[#2B2822] focus:border-[#C5A880] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] outline-none"
            />
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
                className="w-full bg-[#141311] border border-[#2B2822] focus:border-[#C5A880] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] outline-none"
              />
            </div>
          </div>

          {/* Duty Status */}
          <div>
            <label className="text-[11px] font-semibold text-[#A89F91] uppercase tracking-wider block mb-1.5">
              Duty Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDutyStatus('ON_DUTY')}
                className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                  dutyStatus === 'ON_DUTY'
                    ? 'bg-[#22C55E]/20 text-[#86EFAC] border-[#22C55E]'
                    : 'bg-[#141311] text-[#9E978C] border-[#2B2822]'
                }`}
              >
                On Duty
              </button>
              <button
                type="button"
                onClick={() => setDutyStatus('ON_BREAK')}
                className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                  dutyStatus === 'ON_BREAK'
                    ? 'bg-[#EAB308]/20 text-[#FDE047] border-[#EAB308]'
                    : 'bg-[#141311] text-[#9E978C] border-[#2B2822]'
                }`}
              >
                On Break
              </button>
              <button
                type="button"
                onClick={() => setDutyStatus('OFF_DUTY')}
                className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                  dutyStatus === 'OFF_DUTY'
                    ? 'bg-[#6B7280]/20 text-[#D1D5DB] border-[#6B7280]'
                    : 'bg-[#141311] text-[#9E978C] border-[#2B2822]'
                }`}
              >
                Off Duty
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[11px] font-semibold text-[#A89F91] uppercase tracking-wider block mb-1">
              Internal Notes &amp; Assigned Areas
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-[#141311] border border-[#2B2822] focus:border-[#C5A880] rounded-lg p-2.5 text-xs text-[#F3EFEA] outline-none resize-none"
            />
          </div>

          {/* Danger Zone: Delete Staff Member */}
          {isDev && (
            <div className="border-t border-[#2C2A26] pt-3">
              {showDeleteConfirm ? (
                <div className="bg-[#2A1215] border border-[#E63946] rounded-xl p-3 flex items-center justify-between gap-3">
                  <div className="text-xs text-[#FFCCD5]">
                    Remove <strong>{staffMember.name}</strong> from directory?
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-2.5 py-1 text-xs rounded border border-[#44383A] text-[#B8B2A7] hover:bg-[#322A2B]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="px-2.5 py-1 text-xs rounded bg-[#E63946] text-white font-bold hover:bg-[#D62839]"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-xs text-[#E63946] hover:text-[#FF8B94] flex items-center gap-1.5 font-semibold transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove from Staff Directory</span>
                </button>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-3 border-t border-[#2C2A26]">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 rounded-lg border border-[#33302A] text-[#B8B2A7] hover:bg-[#252320] font-medium text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-1/2 py-2.5 rounded-lg bg-[#C5A880] hover:bg-[#B39366] text-[#121110] font-bold text-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
