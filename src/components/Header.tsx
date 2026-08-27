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
  LogOut,
  ChevronDown,
  LogIn,
  KeyRound,
  Building2,
} from 'lucide-react';
import { UserProfile, DutyStatus } from '../types/hotel';

export type AppTab = 'guest' | 'frontdesk' | 'occupancy' | 'qr' | 'accounts';

interface HeaderProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
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
  const isFrontDeskOrStaff = currentUser && !isDeveloper;

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
          {/* Guest View Tab (Hidden when logged in as Front Desk staff to focus on Front Desk tasks) */}
          {!isFrontDeskOrStaff && (
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
          )}

          {/* Front Desk Tab (Always available to Front Desk staff and Admins) */}
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

          {/* Room Occupancy & Keycards Tab (Front Desk and Admin) */}
          <button
            type="button"
            onClick={() => setActiveTab('occupancy')}
            className={`whitespace-nowrap shrink-0 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#C5A880] focus-visible:outline-none cursor-pointer ${
              activeTab === 'occupancy'
                ? 'bg-[#C5A880] text-[#121110] font-semibold shadow-sm'
                : 'text-[#B8B2A7] hover:text-[#F3EFEA] hover:bg-[#262421]'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Room Occupancy</span>
            <span className="sm:hidden">Occupancy</span>
          </button>

          {/* Admin-only tabs: Staff & Accounts, QR Stand Cards */}
          {isDeveloper && (
            <>
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
                <span>Staff &amp; Accounts</span>
                <Crown className="w-3 h-3 text-[#C5A880] hidden sm:inline" />
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
                <span className="hidden sm:inline">QR Cards</span>
                <span className="sm:hidden">QR</span>
              </button>
            </>
          )}
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

                <div className="hidden sm:block text-left">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-[#F3EFEA] truncate max-w-[100px]">
                      {currentUser.name}
                    </span>
                    {isDeveloper && <Crown className="w-3 h-3 text-[#C5A880]" />}
                  </div>
                  <span className="text-[10px] text-[#A89F91] block truncate max-w-[100px]">
                    {currentUser.roleTitle}
                  </span>
                </div>

                <ChevronDown className="w-3.5 h-3.5 text-[#8E877C] hidden sm:block" />
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-[#191815] border border-[#3E3A33] rounded-xl shadow-2xl p-3 text-xs space-y-3 z-50 animate-fade-in">
                  <div className="flex items-center gap-3 pb-2 border-b border-[#2C2A26]">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm"
                      style={{
                        backgroundColor: `${currentUser.avatarColor}25`,
                        color: currentUser.avatarColor,
                      }}
                    >
                      {currentUser.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-[#F3EFEA] truncate flex items-center gap-1">
                        <span>{currentUser.name}</span>
                        {isDeveloper && <Crown className="w-3.5 h-3.5 text-[#C5A880]" />}
                      </div>
                      <span className="text-[11px] text-[#C5A880] font-medium block truncate">
                        {currentUser.roleTitle}
                      </span>
                      <span className="text-[10px] text-[#8E877C] block truncate">
                        @{currentUser.username} • {currentUser.department}
                      </span>
                    </div>
                  </div>

                  {/* Duty Status Selector */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-[#8E877C] uppercase tracking-wider font-semibold block">
                      Duty Status
                    </span>
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        type="button"
                        onClick={() => onSetDutyStatus('ON_DUTY')}
                        className={`py-1 px-1.5 rounded text-[10px] font-semibold transition-all ${
                          currentUser.dutyStatus === 'ON_DUTY'
                            ? 'bg-[#22C55E] text-[#121110] font-bold'
                            : 'bg-[#24211D] text-[#A89F91] hover:text-white'
                        }`}
                      >
                        On Duty
                      </button>
                      <button
                        type="button"
                        onClick={() => onSetDutyStatus('ON_BREAK')}
                        className={`py-1 px-1.5 rounded text-[10px] font-semibold transition-all ${
                          currentUser.dutyStatus === 'ON_BREAK'
                            ? 'bg-[#EAB308] text-[#121110] font-bold'
                            : 'bg-[#24211D] text-[#A89F91] hover:text-white'
                        }`}
                      >
                        On Break
                      </button>
                      <button
                        type="button"
                        onClick={() => onSetDutyStatus('OFF_DUTY')}
                        className={`py-1 px-1.5 rounded text-[10px] font-semibold transition-all ${
                          currentUser.dutyStatus === 'OFF_DUTY'
                            ? 'bg-[#6B7280] text-white font-bold'
                            : 'bg-[#24211D] text-[#A89F91] hover:text-white'
                        }`}
                      >
                        Off Duty
                      </button>
                    </div>
                  </div>

                  {/* Links */}
                  <div className="pt-2 border-t border-[#2C2A26] space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenProfile();
                      }}
                      className="w-full text-left py-1.5 px-2 rounded-lg hover:bg-[#24211D] text-[#D8D2C7] hover:text-white transition-colors flex items-center gap-2"
                    >
                      <User className="w-3.5 h-3.5 text-[#C5A880]" />
                      <span>View Profile &amp; Bio</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full text-left py-1.5 px-2 rounded-lg hover:bg-[#E63946]/15 text-[#FF8B94] hover:text-[#FF8B94] transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out of System</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenLogin}
              className="px-3 py-1.5 rounded-lg bg-[#C5A880] hover:bg-[#B39366] text-[#121110] text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Staff Login</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
