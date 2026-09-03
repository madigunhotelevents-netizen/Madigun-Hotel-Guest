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
  KeyRound,
  RefreshCw,
  DoorClosed,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  getRoomStay,
  checkInRoom,
  checkOutRoom,
  regenerateRoomAccessCode,
  subscribeToRequestEvents,
} from '../services/storageService';
import { RoomStay } from '../types/hotel';

interface QRManagementViewProps {
  onTestRoom: (room: string) => void;
}

const DEFAULT_ROOMS = [
  '101', '102', '103', '104', '105', '106', '107', '108', '109', '110',
  '201', '202', '203', '204', '205', '206', '207', '208', '209', '210',
  '301', '302', '303', '304', '305', '306', '307', '308', '309', '310',
  '401', '402', '403', '404',
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
  const [selectedStay, setSelectedStay] = useState<RoomStay>(() => getRoomStay('101'));
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [allQrUrls, setAllQrUrls] = useState<{ [room: string]: string }>({});
  const [copiedRoom, setCopiedRoom] = useState<string | null>(null);
  const [printMode, setPrintMode] = useState<'single' | 'all'>('single');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const refreshStay = () => {
    setSelectedStay(getRoomStay(selectedRoom));
  };

  useEffect(() => {
    refreshStay();
    const unsub = subscribeToRequestEvents((e) => {
      if (e.type === 'ROOM_STAY_UPDATED' || e.type === 'ROOM_STAYS_UPDATED') {
        refreshStay();
      }
    });
    return unsub;
  }, [selectedRoom]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // Generate Base URL for the QR code
  const getRoomUrl = (room: string) => {
    const rawBase = customDomain.trim() || (typeof window !== 'undefined' ? window.location.origin : 'https://madigun-hotel.netlify.app');
    const base = rawBase.replace(/\/+$/, '');
    const stay = getRoomStay(room);
    const codeParam = stay.accessCode ? `&code=${encodeURIComponent(stay.accessCode)}` : '';
    return `${base}/?room=${encodeURIComponent(room)}${codeParam}`;
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
  }, [selectedRoom, customDomain, selectedStay]);

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
  }, [rooms, customDomain, selectedStay]);

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

  const handleCopyLink = (room: string) => {
    const url = getRoomUrl(room);
    navigator.clipboard.writeText(url);
    setCopiedRoom(room);
    showToast(`Copied QR URL for Room ${room}`);
    setTimeout(() => setCopiedRoom(null), 2000);
  };

  const handleToggleStayStatus = () => {
    if (selectedStay.status === 'OCCUPIED') {
      const updated = checkOutRoom(selectedRoom);
      setSelectedStay(updated);
      showToast(`Checked out Room ${selectedRoom}. Access code expired.`);
    } else {
      const updated = checkInRoom(selectedRoom, 'In-Room Guest');
      setSelectedStay(updated);
      showToast(`Checked in Room ${selectedRoom}. New passcode: ${updated.accessCode}`);
    }
  };

  const handleRegenerateCode = () => {
    const updated = regenerateRoomAccessCode(selectedRoom);
    setSelectedStay(updated);
    showToast(`Generated new passcode: ${updated.accessCode}`);
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

  const isOccupied = selectedStay.status === 'OCCUPIED';

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#C5A880] text-[#121110] px-4 py-2.5 rounded-xl shadow-2xl font-bold text-xs flex items-center gap-2 animate-fade-in border border-[#E5D5B8]">
          <Sparkles className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2C2A26] pb-5 no-print">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-[#C5A880] font-semibold">
              Dynamic In-Room QR Code Generator
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif-luxury text-[#F3EFEA]">
            Room QR Codes &amp; Access Keys
          </h1>
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
              Printed cards embed this URL with the room's dynamic passkey. Guests scanning will unlock services instantly.
            </p>
          </div>

          {/* Room Selector Grid */}
          <div className="bg-[#191815] border border-[#2D2A24] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#B8B2A7]">
                Available Rooms ({rooms.length})
              </h3>
              <span className="text-[11px] text-[#7A756D]">Select to view QR</span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[340px] overflow-y-auto pr-1 scrollbar-thin">
              {rooms.map((room) => {
                const isSelected = selectedRoom === room;
                const stay = getRoomStay(room);
                const occ = stay.status === 'OCCUPIED';

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
                    <span
                      className={`text-[9px] block font-semibold ${
                        isSelected
                          ? 'text-[#121110]/80'
                          : occ
                          ? 'text-[#86EFAC]'
                          : 'text-[#7E786E]'
                      }`}
                    >
                      {occ ? 'Occupied' : 'Vacant'}
                    </span>
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
                  Desk Stand Preview
                </span>
                <h3 className="text-base font-serif-luxury font-bold text-[#F3EFEA]">
                  Room {selectedRoom} Stand Card
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onTestRoom(selectedRoom)}
                  className="text-xs px-2.5 py-1.5 rounded bg-[#252320] hover:bg-[#322E29] border border-[#3E3A33] text-[#C5A880] transition-colors flex items-center gap-1 font-semibold"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Test Guest Screen</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyLink(selectedRoom)}
                  className="text-xs px-2.5 py-1.5 rounded bg-[#252320] hover:bg-[#322E29] border border-[#3E3A33] text-[#D8D2C7] transition-colors flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy QR Link</span>
                </button>
              </div>
            </div>

            {/* Room Status & Passcode Bar */}
            <div className="bg-[#141311] border border-[#2C2A26] rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 ${
                    isOccupied
                      ? 'bg-[#22C55E]/15 text-[#86EFAC] border border-[#22C55E]/30'
                      : 'bg-[#6B7280]/20 text-[#D1D5DB] border border-[#6B7280]/30'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isOccupied ? 'bg-[#22C55E] animate-pulse' : 'bg-[#6B7280]'
                    }`}
                  />
                  {isOccupied ? 'OCCUPIED' : 'VACANT'}
                </span>

                {isOccupied && selectedStay.accessCode && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#8E877C]">Passcode:</span>
                    <span className="font-mono font-bold text-[#E5D5B8] bg-[#C5A880]/15 px-2 py-0.5 rounded border border-[#C5A880]/40">
                      {selectedStay.accessCode}
                    </span>
                    <button
                      type="button"
                      onClick={handleRegenerateCode}
                      title="Regenerate Passcode"
                      className="p-1 rounded bg-[#24211D] hover:bg-[#322E29] text-[#C5A880]"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleToggleStayStatus}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  isOccupied
                    ? 'bg-[#E63946]/15 hover:bg-[#E63946]/25 border border-[#E63946]/40 text-[#FF8B94]'
                    : 'bg-[#22C55E]/15 hover:bg-[#22C55E]/25 border border-[#22C55E]/40 text-[#86EFAC]'
                }`}
              >
                {isOccupied ? (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Check Out</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Check In (Activate Code)</span>
                  </>
                )}
              </button>
            </div>

            {/* Stand Card Realistic Preview */}
            <div className="flex justify-center p-4 bg-[#121110] rounded-xl border border-[#28251F]">
              <div
                ref={cardRef}
                className="w-[280px] sm:w-[320px] bg-[#FAF7F2] text-[#1C1B18] rounded-2xl p-6 sm:p-7 shadow-2xl border border-[#D5C7B2] text-center space-y-4 relative overflow-hidden"
              >
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#8C7A60] block">
                    MADIGUN HOTEL &amp; EVENTS
                  </span>
                  <h2 className="text-xl font-bold font-serif-luxury tracking-wide text-[#1C1B18]">
                    In-Room Concierge
                  </h2>
                  <span className="text-[11px] text-[#6E675F] block">
                    Scan for immediate guest service
                  </span>
                </div>

                <div className="bg-[#1C1B18] text-[#FAF7F2] px-4 py-1 rounded-full font-mono font-bold text-xs inline-block">
                  ROOM {selectedRoom}
                </div>

                <div className="bg-white p-3 rounded-xl shadow-md border border-[#E5D5B8] inline-block mx-auto">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`Room ${selectedRoom} QR Code`}
                      className="w-36 h-36 object-contain mx-auto"
                    />
                  ) : (
                    <div className="w-36 h-36 flex items-center justify-center text-xs text-[#8E877C]">
                      Generating QR...
                    </div>
                  )}
                </div>

                {isOccupied && selectedStay.accessCode && (
                  <div className="bg-[#F0EAE1] border border-[#D5C7B2] rounded-lg py-1.5 px-3">
                    <span className="text-[9px] uppercase font-bold text-[#8C7A60] block">
                      Access Passcode
                    </span>
                    <span className="text-base font-mono font-bold tracking-wider text-[#1C1B18]">
                      {selectedStay.accessCode}
                    </span>
                  </div>
                )}

                <p className="text-[9px] text-[#8C7A60] leading-tight">
                  Point your mobile phone camera to order towels, housekeeping &amp; amenities.
                </p>
              </div>
            </div>

            {/* Download PNG Button */}
            <div className="flex justify-end pt-2 border-t border-[#2C2A26]">
              <button
                type="button"
                onClick={handleDownloadQrImage}
                className="text-xs px-4 py-2 bg-[#252320] hover:bg-[#322E29] border border-[#3E3A33] text-[#E5D5B8] rounded-xl font-semibold transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-[#C5A880]" />
                <span>Download Stand Card QR PNG</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* PRINT-ONLY CONTAINER (Invisible on screen, styled for paper printing) */}
      <div className="hidden print:block print:w-full print:m-0 print:p-0">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body {
              background: white !important;
              color: black !important;
            }
            .no-print {
              display: none !important;
            }
            .print-page {
              page-break-after: always;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              padding: 2rem;
              box-sizing: border-box;
            }
          }
        `}} />

        {(printMode === 'single' ? [selectedRoom] : rooms).map((r) => {
          const stay = getRoomStay(r);
          return (
            <div key={r} className="print-page text-center space-y-6">
              <div className="border-4 border-[#1C1B18] rounded-3xl p-10 max-w-md w-full mx-auto text-center space-y-6 bg-white">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-[#8C7A60] block">
                    MADIGUN HOTEL &amp; EVENTS
                  </span>
                  <h1 className="text-3xl font-bold font-serif-luxury tracking-wide text-[#1C1B18] mt-1">
                    Digital Concierge
                  </h1>
                  <p className="text-xs text-[#555] mt-1">
                    Point your camera at this QR code for instant room service
                  </p>
                </div>

                <div className="inline-block bg-[#1C1B18] text-white px-6 py-2 rounded-full font-mono font-bold text-lg">
                  ROOM {r}
                </div>

                <div className="flex justify-center p-4">
                  {allQrUrls[r] || qrDataUrl ? (
                    <img
                      src={allQrUrls[r] || qrDataUrl}
                      alt={`Room ${r} QR Code`}
                      className="w-56 h-56 object-contain"
                    />
                  ) : null}
                </div>

                {stay.status === 'OCCUPIED' && stay.accessCode && (
                  <div className="border-2 border-[#1C1B18] rounded-xl p-3 inline-block w-full">
                    <span className="text-xs uppercase font-bold text-[#8C7A60] block">
                      Active Passcode
                    </span>
                    <span className="text-2xl font-mono font-bold tracking-widest text-[#1C1B18]">
                      {stay.accessCode}
                    </span>
                  </div>
                )}

                <div className="pt-2 text-xs text-[#666] leading-relaxed">
                  <p>Housekeeping • Extra Pillows • Toiletries • Maintenance</p>
                  <p className="text-[10px] text-[#888] mt-1">Front Desk: Ext. 0 or 100</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
