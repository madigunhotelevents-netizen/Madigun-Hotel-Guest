import React, { useState, useEffect } from 'react';
import { X, Send, Check } from 'lucide-react';
import { CategoryInfo } from '../types/hotel';

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

    // If chips selected, auto-combine into message if message is empty or chip-based
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
        className="bg-[#1C1B18] border border-[#3D3830] rounded-xl max-w-lg w-full p-5 sm:p-7 shadow-2xl relative overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#2C2A26] mb-5">
          <div className="flex items-center gap-3">
            <span className="text-2xl" role="img" aria-hidden="true">
              {category.emoji}
            </span>
            <div>
              <span className="text-xs uppercase tracking-wider text-[#C5A880] font-semibold">
                Guest Assistance Request
              </span>
              <h3 id="request-modal-title" className="text-lg sm:text-xl font-bold font-serif-luxury text-[#F3EFEA]">
                {category.label}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#9E978C] hover:text-[#F3EFEA] p-1.5 rounded transition-colors focus-visible:ring-2 focus-visible:ring-[#C5A880] focus-visible:outline-none"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Room & Service Details Info Card */}
        <div className="bg-[#141311] border border-[#2E2B25] rounded-lg p-3.5 mb-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-xs text-[#9E978C] block uppercase font-medium">Room Number</span>
            <span className="font-bold text-[#F3EFEA] font-mono text-base">{roomNumber}</span>
          </div>
          <div>
            <span className="text-xs text-[#9E978C] block uppercase font-medium">Service</span>
            <span className="font-medium text-[#C5A880] truncate block">{category.label}</span>
          </div>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Quick Option Pills */}
          {category.quickOptions && category.quickOptions.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-[#B8B2A7] mb-2">
                Quick Select (Tap to include):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {category.quickOptions.map((opt) => {
                  const isSelected = selectedChips.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleChip(opt)}
                      className={`text-xs px-3 py-1.5 rounded-md transition-all flex items-center gap-1 focus-visible:ring-1 focus-visible:ring-[#C5A880] focus-visible:outline-none ${
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

          {/* Additional Message Input */}
          <div>
            <label htmlFor="additional-message-input" className="block text-xs font-medium text-[#B8B2A7] mb-1.5">
              Additional Message {category.id === 'Other Request' ? '(Please specify)' : '(Optional)'}:
            </label>
            <textarea
              id="additional-message-input"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                category.id === 'Other Request'
                  ? 'Please describe how we can assist you...'
                  : 'e.g. Please deliver around 2:00 PM, or specific preferences...'
              }
              required={category.id === 'Other Request'}
              className="w-full bg-[#141311] border border-[#38342E] focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] rounded-lg px-3 py-2.5 text-sm text-[#F3EFEA] placeholder-[#706B62] outline-none resize-none transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-1/3 py-3 px-4 rounded-lg border border-[#3D3830] text-sm font-medium text-[#D8D2C7] hover:bg-[#252320] transition-colors focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:outline-none cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:w-2/3 py-3 px-5 rounded-lg bg-[#C5A880] hover:bg-[#B39366] text-[#121110] text-sm font-bold tracking-wide transition-all shadow-md flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-[#F3EFEA] focus-visible:outline-none cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>SEND REQUEST</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
