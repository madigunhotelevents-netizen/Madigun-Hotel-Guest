import React, { useState, useEffect } from 'react';
import { X, Send, Check, Moon } from 'lucide-react';
import { CategoryInfo } from '../types/hotel';
import { useServiceSchedule } from '../services/scheduleService';

interface RequestModalProps {
  roomNumber: string;
  category: CategoryInfo | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (additionalMessage: string) => void;
}

export const RequestModal: React.FC<RequestModalProps> = ({
  roomNumber,
  category,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [message, setMessage] = useState('');
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const schedule = useServiceSchedule();

  useEffect(() => {
    if (isOpen) {
      setMessage('');
      setSelectedChips([]);
    }
  }, [isOpen, category]);

  if (!isOpen || !category) return null;

  const toggleChip = (chip: string) => {
    const exists = selectedChips.includes(chip);
    let updated: string[];
    if (exists) {
      updated = selectedChips.filter((c) => c !== chip);
    } else {
      updated = [...selectedChips, chip];
    }
    setSelectedChips(updated);

    if (updated.length > 0) {
      setMessage(updated.join(', '));
    } else {
      setMessage('');
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalMsg = message.trim() || selectedChips.join(', ') || 'Service requested';
    onSubmit(finalMsg);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-[#1C1B18] border border-[#3D3830] rounded-xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2C2A26] mb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-xl" role="img" aria-hidden="true">
              {category.emoji}
            </span>
            <h3 id="request-modal-title" className="text-lg font-bold font-serif-luxury text-[#F3EFEA]">
              {category.label}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#9E978C] hover:text-[#F3EFEA] p-1 rounded transition-colors focus-visible:ring-2 focus-visible:ring-[#C5A880] focus-visible:outline-none cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Room Header Pill */}
        <div className="bg-[#141311] border border-[#2E2B25] rounded-lg px-3.5 py-2 mb-3.5 flex items-center justify-between text-xs">
          <span className="text-[#9E978C] uppercase font-semibold">Room</span>
          <span className="font-bold text-[#F3EFEA] font-mono text-sm">{roomNumber}</span>
        </div>

        {/* Off-Duty Notice (if 10 PM - 6 AM) */}
        {schedule.isOffDuty && (
          <div className="bg-[#241A14] border border-[#EAB308]/40 rounded-lg p-2.5 mb-3.5 flex items-center gap-2 text-xs text-[#FDE047]">
            <Moon className="w-4 h-4 shrink-0 text-[#FDE047]" />
            <span>Off Duty (10:00 PM – 6:00 AM) • Request will be queued for 6:00 AM</span>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-3.5">
          {/* Quick Option Pills */}
          {category.quickOptions && category.quickOptions.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-[#B8B2A7] mb-1.5 uppercase tracking-wide">
                Select Option:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {category.quickOptions.map((opt) => {
                  const isSelected = selectedChips.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleChip(opt)}
                      className={`text-xs px-2.5 py-1 rounded transition-all flex items-center gap-1 cursor-pointer focus-visible:ring-1 focus-visible:ring-[#C5A880] focus-visible:outline-none ${
                        isSelected
                          ? 'bg-[#C5A880] text-[#121110] font-semibold'
                          : 'bg-[#252320] text-[#D8D2C7] border border-[#38342E] hover:border-[#C5A880]/60'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes / Message */}
          <div>
            <label htmlFor="additional-message-input" className="block text-xs font-semibold text-[#B8B2A7] mb-1 uppercase tracking-wide">
              Note {category.id === 'Other Request' ? '' : '(Optional)'}:
            </label>
            <textarea
              id="additional-message-input"
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add details..."
              required={category.id === 'Other Request'}
              className="w-full bg-[#141311] border border-[#38342E] focus:border-[#C5A880] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] placeholder-[#706B62] outline-none resize-none transition-colors font-sans"
            />
          </div>

          {/* Actions */}
          <div className="pt-1 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2.5 px-3 rounded-lg border border-[#3D3830] text-xs font-semibold text-[#D8D2C7] hover:bg-[#252320] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-2/3 py-2.5 px-4 rounded-lg bg-[#C5A880] hover:bg-[#B39366] text-[#121110] text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
