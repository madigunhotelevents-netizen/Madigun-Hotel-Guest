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
    onConfirm(quickNote || 'Immediate assistance requested by guest');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-[#1C1A17] border-2 border-[#E63946] rounded-xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="emergency-modal-title"
      >
        {/* Top Warning Strip */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E63946]/20 border border-[#E63946] flex items-center justify-center text-[#E63946] shrink-0 animate-pulse">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#E63946]">High Priority Alert</span>
              <h3 id="emergency-modal-title" className="text-lg sm:text-xl font-bold font-serif-luxury text-white">
                EMERGENCY ASSISTANCE
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#9E978C] hover:text-white p-1 rounded transition-colors focus-visible:ring-2 focus-visible:ring-[#E63946] focus-visible:outline-none"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-[#2A1618] border border-[#E63946]/30 rounded-lg p-3.5 mb-4">
          <p className="text-sm font-semibold text-[#FFCCD5] mb-1">
            Do you require immediate assistance from the Front Desk?
          </p>
          <p className="text-xs text-[#E0A8B0]">
            Room <strong className="text-white font-mono text-sm">{roomNumber}</strong> — Hotel management and security will be dispatched immediately.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#B8B2A7] mb-1.5">
              Quick description (Optional):
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {['Medical Need', 'Security / Lock Issue', 'Urgent Staff Help', 'Water Leak'].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setQuickNote(chip)}
                  className={`text-xs px-2.5 py-1 rounded transition-colors ${
                    quickNote === chip
                      ? 'bg-[#E63946] text-white font-medium'
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
              placeholder="e.g. Please send staff immediately"
              className="w-full bg-[#141311] border border-[#3E3A34] focus:border-[#E63946] focus:ring-1 focus:ring-[#E63946] rounded-md px-3 py-2 text-sm text-[#F3EFEA] placeholder-[#706B62] outline-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-1/2 py-2.5 px-4 rounded-md border border-[#443F37] text-sm font-medium text-[#D8D2C7] hover:bg-[#2A2723] transition-colors focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:outline-none"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="w-full sm:w-1/2 py-2.5 px-4 rounded-md bg-[#E63946] hover:bg-[#D62828] text-white text-sm font-bold tracking-wide transition-all shadow-lg flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>REQUEST ASSISTANCE</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
