import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Printer,
  Download,
  Copy,
  ExternalLink,
  Plus,
  Trash2,
  Check,
  Sparkles,
  ConciergeBell,
  Layers,
  FileCheck,
} from 'lucide-react';

interface QRManagementViewProps {
  onTestRoom: (room: string) => void;
}

const DEFAULT_ROOMS = [
  '101', '102', '103', '104', '105', '106', '107', '108', '109', '110',
  '201', '202', '203', '204', '205', '206', '207', '208', '209', '210',
  '301', '302', '303', '304', '305', '306', '307', '308', '309', '310',
  'Suite 401', 'Suite 402', 'Presidential Suite', 'Event Hall A',
];

export const QRManagementView: React.FC<QRManagementViewProps> = ({ onTestRoom }) => {
  const [rooms, setRooms] = useState<string[]>(DEFAULT_ROOMS);
  const [selectedRoom, setSelectedRoom] = useState<string>('101');
  const [newRoomInput, setNewRoomInput] = useState('');
  const [customDomain, setCustomDomain] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('madigun_qr_custom_domain') || window.location.origin;
    }
    return 'https://madigun-hotel.netlify.app';
  });
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [allQrUrls, setAllQrUrls] = useState<{ [room: string]: string }>({});
  const [copiedRoom, setCopiedRoom] = useState<string | null>(null);
  const [printMode, setPrintMode] = useState<'single' | 'all'>('single');
  const cardRef = useRef<HTMLDivElement>(null);

  // Generate Base URL for the QR code
  const getRoomUrl = (room: string) => {
    const rawBase = customDomain.trim() || (typeof window !== 'undefined' ? window.location.origin : 'https://madigun-hotel.netlify.app');
    // Strip trailing slash
    const base = rawBase.replace(/\/+$/, '');
    return `${base}/?room=${encodeURIComponent(room)}`;
  };

  const handleDomainChange = (val: string) => {
    setCustomDomain(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('madigun_qr_custom_domain', val);
    }
  };

  // Generate QR code for currently selected room
  useEffect(() => {
    const url = getRoomUrl(selectedRoom);
    QRCode.toDataURL(url, {
      width: 400,
      margin: 2,
      color: {
        dark: '#121110',
        light: '#FFFFFF',
      },
    })
      .then((data) => setQrDataUrl(data))
      .catch((err) => console.error('Error generating QR code:', err));
  }, [selectedRoom, customDomain]);

  // Pre-generate QR codes for all rooms for batch printing
  useEffect(() => {
    const generateAll = async () => {
      const mapping: { [room: string]: string } = {};
      for (const r of rooms) {
        try {
          const url = getRoomUrl(r);
          const data = await QRCode.toDataURL(url, {
            width: 320,
            margin: 2,
            color: {
              dark: '#121110',
              light: '#FFFFFF',
            },
          });
          mapping[r] = data;
        } catch {
          // ignore error
        }
      }
      setAllQrUrls(mapping);
    };
    generateAll();
  }, [rooms, customDomain]);

  const handleAddRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newRoomInput.trim();
    if (!clean) return;
    if (!rooms.includes(clean)) {
      setRooms([...rooms, clean]);
      setSelectedRoom(clean);
    }
    setNewRoomInput('');
  };

  const handleRemoveRoom = (roomToRemove: string) => {
    const updated = rooms.filter((r) => r !== roomToRemove);
    setRooms(updated);
    if (selectedRoom === roomToRemove && updated.length > 0) {
      setSelectedRoom(updated[0]);
    }
  };

  const handleCopyLink = (room: string) => {
    const url = getRoomUrl(room);
    navigator.clipboard.writeText(url);
    setCopiedRoom(room);
    setTimeout(() => setCopiedRoom(null), 2000);
  };

  const handleDownloadQrImage = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `Madigun_Hotel_Room_${selectedRoom.replace(/\s+/g, '_')}_QR.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = (mode: 'single' | 'all') => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2C2A26] pb-5 no-print">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-[#C5A880] font-semibold">
              In-Room Desk Card Generator
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif-luxury text-[#F3EFEA]">
            Room QR Codes
          </h1>
          <p className="text-xs sm:text-sm text-[#9E978C] mt-0.5">
            Generate and print luxury stand cards for guest rooms and suites
          </p>
        </div>

        {/* Print & Export Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => handlePrint('single')}
            className="text-xs px-3.5 py-2 rounded-lg bg-[#252320] hover:bg-[#322E29] border border-[#3D3830] text-[#D8D2C7] font-semibold transition-colors flex items-center gap-1.5 focus-visible:ring-1 focus-visible:ring-[#C5A880]"
          >
            <Printer className="w-3.5 h-3.5 text-[#C5A880]" />
            <span>Print Current Card</span>
          </button>

          <button
            type="button"
            onClick={() => handlePrint('all')}
            className="text-xs px-3.5 py-2 rounded-lg bg-[#C5A880] hover:bg-[#B39366] text-[#121110] font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Print All ({rooms.length}) Cards</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left = Room Selector, Right = Live Card Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
        {/* Left Column: Room List & Add Room (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Target Host / Netlify Domain Config */}
          <div className="bg-[#191815] border border-[#2D2A24] rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#C5A880] block">
                QR Target Domain (Netlify / Custom)
              </label>
              <button
                type="button"
                onClick={() => handleDomainChange(window.location.origin)}
                className="text-[10px] text-[#A8A196] hover:text-[#C5A880] underline cursor-pointer"
              >
                Use Current Origin
              </button>
            </div>
            <input
              type="text"
              value={customDomain}
              onChange={(e) => handleDomainChange(e.target.value)}
              placeholder="e.g. https://madigun-hotel.netlify.app"
              className="w-full bg-[#141311] border border-[#38342E] focus:border-[#C5A880] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] font-mono outline-none"
            />
            <p className="text-[11px] text-[#8E877C] leading-tight">
              Printed cards embed this URL. Guests scanning this will open the Guest UI directly with <strong className="text-[#86EFAC]">zero login or account required</strong>.
            </p>
          </div>

          {/* Add Room Form */}
          <form onSubmit={handleAddRoom} className="bg-[#191815] border border-[#2D2A24] rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#B8B2A7]">
              Add Room or Area
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newRoomInput}
                onChange={(e) => setNewRoomInput(e.target.value)}
                placeholder="e.g. 501 or VIP Suite 2"
                className="flex-1 bg-[#141311] border border-[#38342E] focus:border-[#C5A880] rounded-lg px-3 py-2 text-xs text-[#F3EFEA] outline-none"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-[#C5A880] hover:bg-[#B39366] text-[#121110] text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </form>

          {/* Quick Floor Filter / Room List */}
          <div className="bg-[#191815] border border-[#2D2A24] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#B8B2A7]">
                Available Rooms ({rooms.length})
              </h3>
              <span className="text-[11px] text-[#7A756D]">Click to preview</span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
              {rooms.map((room) => {
                const isSelected = selectedRoom === room;
                return (
                  <div
                    key={room}
                    onClick={() => setSelectedRoom(room)}
                    className={`relative p-2.5 rounded-lg border text-center cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#C5A880] text-[#121110] font-bold border-[#C5A880] shadow-sm'
                        : 'bg-[#141311] border-[#2C2A24] text-[#D8D2C7] hover:border-[#C5A880]/50 hover:bg-[#1E1C19]'
                    }`}
                  >
                    <span className="text-xs font-mono block truncate">{room}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Live Luxury Card Preview (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#191815] border border-[#2D2A24] rounded-xl p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-[#2C2A26] pb-3">
              <div>
                <span className="text-xs uppercase tracking-wider text-[#C5A880] font-semibold">
                  Card Preview
                </span>
                <h3 className="text-base font-serif-luxury font-bold text-[#F3EFEA]">
                  Room {selectedRoom} Stand Card
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onTestRoom(selectedRoom)}
                  className="text-xs px-2.5 py-1.5 rounded bg-[#252320] hover:bg-[#322E29] border border-[#3E3A33] text-[#C5A880] transition-colors flex items-center gap-1"
                  title="Open guest assistance interface for this room"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Test Guest Screen</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyLink(selectedRoom)}
                  className="text-xs px-2.5 py-1.5 rounded bg-[#252320] hover:bg-[#322E29] border border-[#3E3A33] text-[#D8D2C7] transition-colors flex items-center gap-1"
                >
                  {copiedRoom === selectedRoom ? (
                    <>
                      <Check className="w-3 h-3 text-[#22C55E]" />
                      <span className="text-[#86EFAC]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-[#C5A880]" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadQrImage}
                  className="text-xs px-2.5 py-1.5 rounded bg-[#252320] hover:bg-[#322E29] border border-[#3E3A33] text-[#D8D2C7] transition-colors flex items-center gap-1"
                  title="Download raw QR Code PNG"
                >
                  <Download className="w-3 h-3 text-[#C5A880]" />
                  <span>QR PNG</span>
                </button>
              </div>
            </div>

            {/* Visual Card Display (Standard Hotel Stand Template) */}
            <div className="flex justify-center p-2 sm:p-4 bg-[#121110] rounded-xl border border-[#272521]">
              <div
                ref={cardRef}
                className="w-full max-w-sm bg-white text-[#121110] rounded-xl p-6 sm:p-7 shadow-2xl border-4 border-[#C5A880] text-center space-y-4 relative overflow-hidden"
              >
                {/* Gold Top Header Crest */}
                <div className="space-y-1">
                  <div className="w-8 h-8 rounded-full bg-[#121110] text-[#C5A880] mx-auto flex items-center justify-center font-serif-luxury text-sm font-bold">
                    M
                  </div>
                  <h4 className="font-serif-luxury font-bold text-base tracking-widest text-[#121110] uppercase">
                    Madigun Hotel &amp; Events
                  </h4>
                  <div className="w-12 h-0.5 bg-[#C5A880] mx-auto" />
                </div>

                {/* Room Number Announcement */}
                <div className="bg-[#FAF8F5] border border-[#E8E2D8] rounded-lg py-2 px-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#7D7569] block">
                    Welcome to
                  </span>
                  <span className="text-xl font-bold font-mono text-[#121110]">
                    Room {selectedRoom}
                  </span>
                </div>

                {/* High Res QR Code Display */}
                <div className="bg-white p-2 border-2 border-dashed border-[#D8CEBE] rounded-lg inline-block mx-auto shadow-inner">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`QR Code for Room ${selectedRoom}`}
                      className="w-48 h-48 sm:w-52 sm:h-52 object-contain mx-auto"
                    />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center bg-[#FAF8F5] text-xs text-gray-500">
                      Generating QR...
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-[#121110] uppercase tracking-wide">
                    Scan for In-Room Assistance
                  </p>
                  <p className="text-[11px] text-[#555048] leading-tight max-w-[240px] mx-auto">
                    Open your smartphone camera and point at this code for 24/7 Front Desk, Housekeeping &amp; Services.
                  </p>
                  <div className="flex flex-col items-center gap-1 mt-1">
                    <span className="inline-block text-[9px] font-bold text-[#14532D] bg-[#DCFCE7] border border-[#86EFAC] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      ✓ Instant Guest Access • No Login Required
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Print button footer */}
            <div className="flex items-center justify-between text-xs text-[#8E877C] pt-1">
              <span>Card dimensions: 4" x 6" Tent Stand / Bedside Table standard</span>
              <button
                type="button"
                onClick={() => handlePrint('single')}
                className="text-[#C5A880] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Ready to print</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* PRINT-ONLY CONTAINER (Triggered on window.print()) */}
      <div className="hidden print-only text-black bg-white">
        {printMode === 'single' ? (
          // Single Room Print Layout
          <div className="min-h-screen flex items-center justify-center p-8">
            <div className="w-[360px] bg-white text-black border-4 border-[#C5A880] rounded-xl p-8 text-center space-y-4 shadow-none">
              <div className="space-y-1">
                <div className="w-10 h-10 rounded-full bg-black text-[#C5A880] mx-auto flex items-center justify-center font-serif-luxury text-base font-bold">
                  M
                </div>
                <h2 className="font-serif-luxury font-bold text-lg tracking-widest text-black uppercase">
                  Madigun Hotel &amp; Events
                </h2>
                <div className="w-16 h-0.5 bg-[#C5A880] mx-auto" />
              </div>

              <div className="bg-[#FAF8F5] border border-[#E8E2D8] rounded-lg py-2.5 px-4">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#7D7569] block">
                  Welcome to
                </span>
                <span className="text-2xl font-bold font-mono text-black">
                  Room {selectedRoom}
                </span>
              </div>

              {qrDataUrl && (
                <div className="p-2 border-2 border-dashed border-gray-400 rounded-lg inline-block mx-auto">
                  <img
                    src={qrDataUrl}
                    alt={`Room ${selectedRoom} QR`}
                    className="w-56 h-56 object-contain mx-auto"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <p className="text-sm font-bold text-black uppercase tracking-wide">
                  Scan for In-Room Assistance
                </p>
                <p className="text-xs text-gray-700 leading-normal">
                  Open phone camera to contact Front Desk, Housekeeping, Amenities &amp; Maintenance.
                </p>
                <p className="text-[10px] font-bold text-black uppercase tracking-wider bg-gray-100 py-1 px-2 rounded">
                  Instant Guest Access • No Login or App Download Required
                </p>
              </div>
            </div>
          </div>
        ) : (
          // Batch All Rooms Print Layout (2 cards per page grid)
          <div className="p-4 grid grid-cols-2 gap-8">
            {rooms.map((room) => (
              <div
                key={room}
                className="print-card-page bg-white text-black border-2 border-black rounded-lg p-6 text-center space-y-3"
              >
                <h3 className="font-serif-luxury font-bold text-sm tracking-widest uppercase">
                  Madigun Hotel &amp; Events
                </h3>
                <div className="bg-[#F5F5F5] rounded py-1 px-2 border border-gray-300">
                  <span className="text-lg font-bold font-mono">Room {room}</span>
                </div>

                {allQrUrls[room] && (
                  <img
                    src={allQrUrls[room]}
                    alt={`Room ${room} QR`}
                    className="w-40 h-40 object-contain mx-auto border border-gray-300 p-1"
                  />
                )}

                <p className="text-xs font-bold uppercase">Scan For In-Room Services</p>
                <p className="text-[10px] text-gray-600">
                  Front Desk • Housekeeping • Towels &amp; Pillows • 24/7 Assistance
                </p>
                <p className="text-[9px] font-semibold text-gray-500 uppercase">
                  No Login Required
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
