import React from 'react';
import { CheckCircle2, Clock, ArrowLeft, ShieldAlert, PhoneCall } from 'lucide-react';
import { HotelRequest } from '../types/hotel';

interface ConfirmationViewProps {
  request: HotelRequest;
  onBackToHome: () => void;
  onNewRequest: () => void;
}

export const ConfirmationView: React.FC<ConfirmationViewProps> = ({
  request,
  onBackToHome,
  onNewRequest,
}) => {
  const getStatusBadge = (status: HotelRequest['status']) => {
    switch (status) {
      case 'NEW':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3B82F6]/20 border border-[#3B82F6]/40 text-[#93C5FD] text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#3B82F6] animate-ping" />
            <span>Received & Queued</span>
          </div>
        );
      case 'IN_PROGRESS':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAB308]/20 border border-[#EAB308]/40 text-[#FDE047] text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#EAB308] animate-pulse" />
            <span>Staff In Progress</span>
          </div>
        );
      case 'COMPLETED':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#22C55E]/20 border border-[#22C55E]/40 text-[#86EFAC] text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Completed</span>
          </div>
        );
    }
  };

  return (
    <div className="max-w-md mx-auto w-full px-4 py-8 animate-fade-in">
      <div className="bg-[#1C1B18] border border-[#3A362E] rounded-2xl p-6 sm:p-8 text-center shadow-xl">
        {/* Success Icon */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#C5A880]/15 border-2 border-[#C5A880] mx-auto flex items-center justify-center text-[#C5A880] mb-5 shadow-inner">
          {request.isEmergency ? (
            <ShieldAlert className="w-9 h-9 text-[#E63946]" />
          ) : (
            <CheckCircle2 className="w-10 h-10 text-[#C5A880]" />
          )}
        </div>

        {/* Heading */}
        <h2 className="text-lg sm:text-xl font-bold font-serif-luxury text-[#F3EFEA] mb-1">
          Request Sent
        </h2>

        {/* Room Display */}
        <div className="my-2.5">
          <span className="text-xs uppercase tracking-widest text-[#B8B2A7] font-semibold block">
            Room
          </span>
          <span className="text-2xl font-bold font-mono text-[#C5A880]">
            {request.roomNumber}
          </span>
        </div>

        {/* Live Status Tracker Card */}
        <div className="bg-[#141311] border border-[#2A2823] rounded-xl p-3.5 text-left mb-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#9E978C] uppercase font-semibold">Status</span>
            {getStatusBadge(request.status)}
          </div>

          <div className="flex items-start justify-between gap-2 border-t border-[#23211D] pt-2 text-xs">
            <span className="text-[#9E978C]">Request:</span>
            <span className="font-semibold text-[#F3EFEA] text-right">{request.category}</span>
          </div>

          {request.additionalMessage && (
            <div className="flex items-start justify-between gap-2 border-t border-[#23211D] pt-2 text-xs">
              <span className="text-[#9E978C]">Note:</span>
              <span className="font-normal text-[#D8D2C7] text-right italic">
                "{request.additionalMessage}"
              </span>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-[#23211D] pt-2 text-xs text-[#7E786E]">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Sent:</span>
            </span>
            <span>{new Date(request.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        {/* Main Action: BACK TO HOME */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={onBackToHome}
            className="w-full py-3 px-5 rounded-xl bg-[#C5A880] hover:bg-[#B39366] text-[#121110] font-bold text-xs tracking-wider uppercase transition-all shadow-md flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-[#F3EFEA] focus-visible:outline-none cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>BACK TO HOME</span>
          </button>

          <button
            type="button"
            onClick={onNewRequest}
            className="w-full py-2.5 px-4 rounded-xl border border-[#38342E] text-[#B8B2A7] hover:text-[#F3EFEA] hover:bg-[#252320] text-xs font-semibold transition-colors cursor-pointer"
          >
            Send Another Request
          </button>
        </div>

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t border-[#282622] text-xs text-[#7E786E] flex items-center justify-center gap-2">
          <PhoneCall className="w-3.5 h-3.5 text-[#C5A880]" />
          <span>Front Desk Direct: Dial <strong>0</strong> on room phone</span>
        </div>
      </div>
    </div>
  );
};
