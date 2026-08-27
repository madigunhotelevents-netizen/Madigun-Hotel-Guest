import React, { useState, useRef, useEffect } from 'react';
import {
  BellRing,
  QrCode,
  ConciergeBell,
  Volume2,
  VolumeX,
  Users,
  User,
  Crown,
  Shield,
  LogOut,
  ChevronDown,
  Activity,
  LogIn,
  KeyRound,
  Cloud,
} from 'lucide-react';
import { UserProfile, DutyStatus } from '../types/hotel';

interface HeaderProps {
  activeTab: 'guest' | 'frontdesk' | 'qr' | 'accounts' | 'storage';
  setActiveTab: (tab: 'guest' | 'frontdesk' | 'qr' | 'accounts' | 'storage') => void;
  newRequestsCount: number;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  currentRoom: string;
  currentUser: UserProfile | null;
  onOpenLogin: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  onSetDutyStatus: (status: DutyStatus) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  newRequestsCount,
  soundEnabled,
  setSoundEnabled,
  currentRoom,
  currentUser,
  onOpenLogin,
  onOpenProfile,
  onLogout,
  onSetDutyStatus,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const isDeveloper = currentUser?.role === 'developer' || currentUser?.isPrimaryDeveloper;

  return (
    <header className="sticky top-0 z-40 bg-[#171614]/95 backdrop-blur-md border-b border-[#2C2A26] px-3 sm:px-6 py-2.5 sm:py-3 transition-colors no-print">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Zone 1: Brand Title */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-sm bg-[#C5A880]/15 border border-[#C5A880]/30 flex items-center justify-center text-[#E5D5B8]">
            <ConciergeBell className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C5A880]" />
          </div>
          <span className="font-serif-luxury tracking-wider text-xs sm:text-base font-bold text-[#F3EFEA] whitespace-nowrap">
            MADIGUN HOTEL &amp; EVENTS
          </span>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('guest')}
            className={`whitespace-nowrap shrink-0 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#C5A880] focus-visible:outline-none cursor-pointer ${
              activeTab === 'guest'
                ? 'bg-[#C5A880] text-[#121110] font-semibold shadow-sm'
                : 'text-[#B8B2A7] hover:text-[#F3EFEA] hover:bg-[#262421]'
            }`}
          >
            <ConciergeBell className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Guest View</span>
            <span className="xs:hidden">Guest</span>
            {activeTab === 'guest' && currentRoom ? (
              <span className="hidden sm:inline opacity-80">(Rm {currentRoom})</span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('frontdesk')}
            className={`whitespace-nowrap shrink-0 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 relative focus-visible:ring-2 focus-visible:ring-[#C5A880] focus-visible:outline-none cursor-pointer ${
              activeTab === 'frontdesk'
                ? 'bg-[#C5A880] text-[#121110] font-semibold shadow-sm'
                : 'text-[#B8B2A7] hover:text-[#F3EFEA] hover:bg-[#262421]'
            }`}
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>Front Desk</span>
            {newRequestsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#E63946] text-white animate-pulse">
                {newRequestsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('accounts')}
            className={`whitespace-nowrap shrink-0 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#C5A880] focus-visible:outline-none cursor-pointer ${
              activeTab === 'accounts'
                ? 'bg-[#C5A880] text-[#121110] font-semibold shadow-sm'
                : 'text-[#B8B2A7] hover:text-[#F3EFEA] hover:bg-[#262421]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Accounts</span>
            {isDeveloper && (
              <Crown className="w-3 h-3 text-[#C5A880] hidden sm:inline" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('storage')}
            className={`whitespace-nowrap shrink-0 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#C5A880] focus-visible:outline-none cursor-pointer ${
              activeTab === 'storage'
                ? 'bg-[#C5A880] text-[#121110] font-semibold shadow-sm'
                : 'text-[#B8B2A7] hover:text-[#F3EFEA] hover:bg-[#262421]'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Drive &amp; Deploy</span>
            <span className="sm:hidden">Drive</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`whitespace-nowrap shrink-0 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#C5A880] focus-visible:outline-none cursor-pointer ${
              activeTab === 'qr'
                ? 'bg-[#C5A880] text-[#121110] font-semibold shadow-sm'
                : 'text-[#B8B2A7] hover:text-[#F3EFEA] hover:bg-[#262421]'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">QR Codes</span>
            <span className="sm:hidden">QR</span>
          </button>
        </nav>

        {/* Zone 3: User Profile & Sound Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Mute Chime Alerts' : 'Enable Chime Alerts'}
            className="p-1.5 sm:p-2 rounded-lg border border-[#2C2A26] bg-[#1E1D1A] text-[#B8B2A7] hover:text-[#F3EFEA] hover:border-[#C5A880]/50 transition-colors focus-visible:ring-2 focus-visible:ring-[#C5A880] focus-visible:outline-none cursor-pointer"
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C5A880]" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#7A756D]" />
            )}
          </button>

          {/* User Account / Profile Menu */}
          {currentUser ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className={`p-1 sm:px-2.5 sm:py-1.5 rounded-lg border flex items-center gap-2 transition-all cursor-pointer ${
                  isDeveloper
                    ? 'bg-[#221E18] border-[#C5A880]/50 text-[#F3EFEA] hover:border-[#C5A880]'
                    : 'bg-[#1C1B18] border-[#33302A] text-[#F3EFEA] hover:border-[#4A443A]'
                }`}
              >
                {/* Avatar with status dot */}
                <div className="relative">
                  <div
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center text-xs font-bold font-serif-luxury"
                    style={{
                      backgroundColor: `${currentUser.avatarColor}25`,
                      color: currentUser.avatarColor,
                      border: `1px solid ${currentUser.avatarColor}60`,
                    }}
                  >
                    {isDeveloper ? <Crown className="w-3.5 h-3.5 text-[#C5A880]" /> : currentUser.name.charAt(0)}
                  </div>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#171614] ${
                      currentUser.dutyStatus === 'ON_DUTY'
                        ? 'bg-[#22C55E]'
                        : currentUser.dutyStatus === 'ON_BREAK'
                        ? 'bg-[#EAB308]'
                        : 'bg-[#6B7280]'
                    }`}
                  />
                </div>

                {/* User Name & Role (Hidden on mobile) */}
                <div className="hidden md:block text-left leading-tight min-w-0 max-w-[120px]">
                  <span className="text-xs font-bold block truncate text-[#F3EFEA]">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-[#C5A880] block truncate">
                    {isDeveloper ? '👑 Primary Admin' : currentUser.roleTitle}
                  </span>
                </div>

                <ChevronDown className="w-3.5 h-3.5 text-[#8E877C] hidden sm:block" />
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-[#1C1B18] border border-[#3E3A33] rounded-xl shadow-2xl p-2.5 z-50 text-xs space-y-2 animate-fade-in">
                  {/* User Profile Header in dropdown */}
                  <div className="p-2 bg-[#141311] border border-[#2B2924] rounded-lg space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#F3EFEA] truncate">
                        {currentUser.name}
                      </span>
                      {isDeveloper && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#C5A880] text-[#121110] uppercase">
                          Developer
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#C5A880] truncate">
                      {currentUser.roleTitle}
                    </p>
                    <p className="text-[10px] text-[#8E877C]">
                      {currentUser.department} • @{currentUser.username}
                    </p>
                  </div>

                  {/* Duty Status Quick Toggle */}
                  <div className="px-1 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-[#8E877C] font-semibold block">
                      Duty Status
                    </span>
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        type="button"
                        onClick={() => onSetDutyStatus('ON_DUTY')}
                        className={`py-1 rounded text-[10px] font-semibold border transition-all ${
                          currentUser.dutyStatus === 'ON_DUTY'
                            ? 'bg-[#22C55E]/20 text-[#86EFAC] border-[#22C55E]/50'
                            : 'bg-[#141311] text-[#8E877C] border-[#2A2824] hover:text-[#F3EFEA]'
                        }`}
                      >
                        🟢 On Duty
                      </button>
                      <button
                        type="button"
                        onClick={() => onSetDutyStatus('ON_BREAK')}
                        className={`py-1 rounded text-[10px] font-semibold border transition-all ${
                          currentUser.dutyStatus === 'ON_BREAK'
                            ? 'bg-[#EAB308]/20 text-[#FDE047] border-[#EAB308]/50'
                            : 'bg-[#141311] text-[#8E877C] border-[#2A2824] hover:text-[#F3EFEA]'
                        }`}
                      >
                        🟡 Break
                      </button>
                      <button
                        type="button"
                        onClick={() => onSetDutyStatus('OFF_DUTY')}
                        className={`py-1 rounded text-[10px] font-semibold border transition-all ${
                          currentUser.dutyStatus === 'OFF_DUTY'
                            ? 'bg-[#6B7280]/20 text-[#D1D5DB] border-[#6B7280]/50'
                            : 'bg-[#141311] text-[#8E877C] border-[#2A2824] hover:text-[#F3EFEA]'
                        }`}
                      >
                        ⚪ Off Duty
                      </button>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="border-t border-[#2B2924] pt-1.5 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenProfile();
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-[#D8D2C7] hover:text-[#F3EFEA] hover:bg-[#252320] transition-colors flex items-center gap-2"
                    >
                      <User className="w-3.5 h-3.5 text-[#C5A880]" />
                      <span>My Personal Profile</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setActiveTab('accounts');
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-[#D8D2C7] hover:text-[#F3EFEA] hover:bg-[#252320] transition-colors flex items-center gap-2"
                    >
                      <Users className="w-3.5 h-3.5 text-[#C5A880]" />
                      <span>Staff Accounts Directory</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setActiveTab('storage');
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-[#D8D2C7] hover:text-[#F3EFEA] hover:bg-[#252320] transition-colors flex items-center gap-2"
                    >
                      <Cloud className="w-3.5 h-3.5 text-[#C5A880]" />
                      <span>Google Drive &amp; Netlify</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenLogin();
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-[#D8D2C7] hover:text-[#F3EFEA] hover:bg-[#252320] transition-colors flex items-center gap-2"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-[#C5A880]" />
                      <span>Switch Account / Sign In</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-[#E63946] hover:bg-[#2A1517] transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenLogin}
              className="text-xs px-3 py-1.5 rounded-lg bg-[#C5A880] hover:bg-[#B39366] text-[#121110] font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Staff Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
