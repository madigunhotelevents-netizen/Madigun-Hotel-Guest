import React, { useState, useEffect } from 'react';
import { X, Building2, BedDouble, Layers, FileText, CheckCircle2 } from 'lucide-react';
import { RoomStay } from '../types/hotel';

interface EditRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomNumber: string;
  currentStay: RoomStay;
  onSave: (roomNumber: string, details: { floor: number; bedType: string; roomType: string; notes?: string }) => void;
}

const BED_OPTIONS = [
  '1 King Bed',
  '2 Queen Beds',
  '2 Twin Beds',
  '1 Queen Bed',
  '1 King + Sofa Bed',
  '1 King + Lounge',
  '1 King + Balcony',
  'Master Suite + Living',
  '2 King Bedrooms',
  'Custom Bed Configuration',
];

const ROOM_TYPE_OPTIONS = [
  'Deluxe King Room',
  'Deluxe Double Queen',
  'Superior Twin Room',
  'Superior King Room',
  'Executive King Suite',
  'Executive Suite',
  'Junior Suite',
  'Penthouse Junior',
  'Presidential Royal Suite',
  'Madigun Signature Suite',
  'Skyline Terrace Suite',
  'Grand Ambassador Suite',
  'Standard Guest Room',
];

export const EditRoomModal: React.FC<EditRoomModalProps> = ({
  isOpen,
  onClose,
  roomNumber,
  currentStay,
  onSave,
}) => {
  const [floor, setFloor] = useState<number>(currentStay.floor || 1);
  const [roomType, setRoomType] = useState<string>(currentStay.roomType || 'Deluxe King Room');
  const [customRoomType, setCustomRoomType] = useState<string>('');
  const [bedType, setBedType] = useState<string>(currentStay.bedType || '1 King Bed');
  const [customBedType, setCustomBedType] = useState<string>('');
  const [notes, setNotes] = useState<string>(currentStay.notes || '');

  useEffect(() => {
    if (isOpen) {
      setFloor(currentStay.floor || 1);
      const isKnownType = ROOM_TYPE_OPTIONS.includes(currentStay.roomType || '');
      if (isKnownType) {
        setRoomType(currentStay.roomType || 'Deluxe King Room');
        setCustomRoomType('');
      } else {
        setRoomType('Other');
        setCustomRoomType(currentStay.roomType || '');
      }

      const isKnownBed = BED_OPTIONS.includes(currentStay.bedType || '');
      if (isKnownBed) {
        setBedType(currentStay.bedType || '1 King Bed');
        setCustomBedType('');
      } else {
        setBedType('Other');
        setCustomBedType(currentStay.bedType || '');
      }

      setNotes(currentStay.notes || '');
    }
  }, [isOpen, currentStay]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalRoomType = roomType === 'Other' ? customRoomType.trim() || 'Deluxe Room' : roomType;
    const finalBedType = bedType === 'Other' ? customBedType.trim() || '1 King Bed' : bedType;

    onSave(roomNumber, {
      floor: Number(floor),
      roomType: finalRoomType,
      bedType: finalBedType,
      notes: notes.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#191815] border border-[#3E3A33] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-[#F3EFEA]">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[#2C2A26]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C5A880]/15 border border-[#C5A880]/30 flex items-center justify-center text-[#C5A880]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-serif-luxury text-[#F3EFEA]">
                Edit Room {roomNumber} Details
              </h3>
              <span className="text-[11px] text-[#A89F91]">
                Admin Configuration
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#8E877C] hover:text-white rounded-lg hover:bg-[#252320]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Floor Selection */}
          <div>
            <label className="text-[11px] font-semibold text-[#A89F91] uppercase tracking-wider block mb-1">
              Floor Number
            </label>
            <select
              value={floor}
              onChange={(e) => setFloor(Number(e.target.value))}
              className="w-full bg-[#141311] border border-[#2B2822] focus:border-[#C5A880] rounded-xl px-3 py-2 text-xs text-[#F3EFEA] outline-none"
            >
              <option value={1}>Floor 1 (Ground / Lower Level)</option>
              <option value={2}>Floor 2</option>
              <option value={3}>Floor 3</option>
              <option value={4}>Floor 4 (Suites &amp; Penthouse)</option>
              <option value={5}>Floor 5</option>
              <option value={6}>Floor 6</option>
            </select>
          </div>

          {/* Room Type */}
          <div>
            <label className="text-[11px] font-semibold text-[#A89F91] uppercase tracking-wider block mb-1">
              Room Category / Type
            </label>
            <select
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
              className="w-full bg-[#141311] border border-[#2B2822] focus:border-[#C5A880] rounded-xl px-3 py-2 text-xs text-[#F3EFEA] outline-none mb-1.5"
            >
              {ROOM_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
              <option value="Other">Custom Category...</option>
            </select>
            {roomType === 'Other' && (
              <input
                type="text"
                value={customRoomType}
                onChange={(e) => setCustomRoomType(e.target.value)}
                placeholder="Enter custom room category"
                className="w-full bg-[#141311] border border-[#2B2822] focus:border-[#C5A880] rounded-xl px-3 py-2 text-xs text-[#F3EFEA] outline-none"
                required
              />
            )}
          </div>

          {/* Bed Size / Bed Type */}
          <div>
            <label className="text-[11px] font-semibold text-[#A89F91] uppercase tracking-wider block mb-1">
              Bed Size / Bed Configuration
            </label>
            <select
              value={bedType}
              onChange={(e) => setBedType(e.target.value)}
              className="w-full bg-[#141311] border border-[#2B2822] focus:border-[#C5A880] rounded-xl px-3 py-2 text-xs text-[#F3EFEA] outline-none mb-1.5"
            >
              {BED_OPTIONS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
              <option value="Other">Custom Bed Size...</option>
            </select>
            {bedType === 'Other' && (
              <input
                type="text"
                value={customBedType}
                onChange={(e) => setCustomBedType(e.target.value)}
                placeholder="e.g. 2 King Beds or 1 King + 1 Queen"
                className="w-full bg-[#141311] border border-[#2B2822] focus:border-[#C5A880] rounded-xl px-3 py-2 text-xs text-[#F3EFEA] outline-none"
                required
              />
            )}
          </div>

          {/* Internal Notes */}
          <div>
            <label className="text-[11px] font-semibold text-[#A89F91] uppercase tracking-wider block mb-1">
              Internal Room Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Adjoining door to 102, poolside view"
              className="w-full bg-[#141311] border border-[#2B2822] focus:border-[#C5A880] rounded-xl px-3 py-2 text-xs text-[#F3EFEA] outline-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#2C2A26]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#24211D] text-xs font-semibold text-[#D8D2C7] hover:bg-[#322E29]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#C5A880] hover:bg-[#B39366] text-[#121110] text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Save Room Details</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
