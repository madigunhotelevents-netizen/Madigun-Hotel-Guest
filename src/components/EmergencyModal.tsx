import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';

interface EmergencyModalProps {
  roomNumber: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes: string) => void;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({
  roomNumber,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [quickNote, setQuickNote] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(quickNote || 'Emergency assistance requested');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-[#1C1A17] border-2 border-[#E63946] rounded-xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="emergency-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#3D1E22] mb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E63946]/20 border border-[#E63946] flex items-center justify-center text-[#E63946] shrink-0 animate-pulse">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 id="emergency-modal-title" className="text-base sm:text-lg font-bold font-serif-luxury text-white">
              EMERGENCY ASSISTANCE
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#9E978C] hover:text-white p-1 rounded transition-colors focus-visible:ring-2 focus-visible:ring-[#E63946] focus-visible:outline-none cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Room Header Pill */}
        <div className="bg-[#2A1618] border border-[#E63946]/40 rounded-lg px-3.5 py-2 mb-3.5 flex items-center justify-between text-xs">
          <span className="text-[#FFCCD5] uppercase font-semibold">Room</span>
          <span className="font-bold text-white font-mono text-sm">{roomNumber}</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-[#B8B2A7] mb-1.5 uppercase tracking-wide">
              Select Issue:
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {['Medical Need', 'Security / Lock Issue', 'Urgent Staff Help', 'Water Leak'].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setQuickNote(chip)}
                  className={`text-xs px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    quickNote === chip
                      ? 'bg-[#E63946] text-white font-semibold'
                      : 'bg-[#2A2723] text-[#D8D2C7] hover:bg-[#38342F] border border-[#3E3A34]'
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              placeholder="Specify issue..."
              className="w-full bg-[#141311] border border-[#3E3A34] focus:border-[#E63946] focus:ring-1 focus:ring-[#E63946] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] placeholder-[#706B62] outline-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2.5 px-3 rounded-lg border border-[#443F37] text-xs font-semibold text-[#D8D2C7] hover:bg-[#2A2723] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-2/3 py-2.5 px-4 rounded-lg bg-[#E63946] hover:bg-[#D62828] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Confirm Emergency</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
