import React, { useState } from 'react';
import {
  X,
  Lock,
  User,
  ShieldCheck,
  Crown,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { UserProfile } from '../types/hotel';
import { login, INITIAL_ACCOUNTS, setCurrentUser } from '../services/authService';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    setTimeout(() => {
      const res = login(usernameInput, passwordInput);
      setIsLoading(false);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
        onClose();
      } else {
        setErrorMsg(res.error || 'Invalid username or password.');
      }
    }, 150);
  };

  const handleQuickLogin = (account: UserProfile) => {
    setErrorMsg(null);
    setCurrentUser(account);
    onLoginSuccess(account);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#191815] border border-[#3E3A33] rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative space-y-5 text-[#F3EFEA]">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#8E877C] hover:text-[#F3EFEA] hover:bg-[#2A2824] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title & Brand */}
        <div className="text-center space-y-1.5 pt-1">
          <div className="w-12 h-12 rounded-xl bg-[#C5A880]/15 border border-[#C5A880]/40 flex items-center justify-center mx-auto text-[#C5A880] shadow-sm">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif-luxury text-[#F3EFEA]">
            Staff &amp; Admin Sign In
          </h2>
          <p className="text-xs text-[#A8A196]">
            Sign in to manage guest requests, staff profiles, and hotel operations
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-[#2A1517] border border-[#E63946]/50 rounded-xl p-3 text-xs text-[#FFCCD5] flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#E63946] shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="block text-[#D8D2C7] font-semibold">
              Username or Staff Email
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#7A756D] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="e.g. developer or sarah.frontdesk"
                required
                className="w-full bg-[#121110] border border-[#33302A] focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] rounded-lg pl-9 pr-3 py-2.5 text-sm text-[#F3EFEA] placeholder-[#6E685F] outline-none transition-colors font-sans"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[#D8D2C7] font-semibold">
              Password / PIN
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-[#7A756D] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter password"
                required
                className="w-full bg-[#121110] border border-[#33302A] focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] rounded-lg pl-9 pr-3 py-2.5 text-sm text-[#F3EFEA] placeholder-[#6E685F] outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-lg bg-[#C5A880] hover:bg-[#B39366] text-[#121110] font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Sign In to Hotel Console</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Sign In Section */}
        <div className="border-t border-[#2C2A26] pt-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A8A196] flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#C5A880]" />
              <span>1-Click Demo Accounts</span>
            </span>
            <span className="text-[10px] text-[#7A756D]">Pre-configured roles</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {INITIAL_ACCOUNTS.map((acc) => {
              const isDev = acc.role === 'developer' || acc.isPrimaryDeveloper;
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => handleQuickLogin(acc)}
                  className={`p-2.5 rounded-lg border text-left transition-all flex items-start gap-2.5 group cursor-pointer ${
                    isDev
                      ? 'bg-[#221F1A] border-[#C5A880]/40 hover:border-[#C5A880] hover:bg-[#2C2720]'
                      : 'bg-[#151412] border-[#2A2824] hover:border-[#3E3A33] hover:bg-[#1E1C19]'
                  }`}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                    style={{ backgroundColor: `${acc.avatarColor}25`, color: acc.avatarColor, border: `1px solid ${acc.avatarColor}60` }}
                  >
                    {isDev ? <Crown className="w-3.5 h-3.5 text-[#C5A880]" /> : acc.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-[#F3EFEA] truncate group-hover:text-[#C5A880] transition-colors">
                        {acc.name.split(' ')[0]} {acc.name.split(' ')[1] || ''}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#9E978C] block truncate">
                      {isDev ? '👑 Primary Admin / Dev' : acc.roleTitle}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-[#7A756D] text-center pt-1">
            * Developer account has full authority to create employee accounts and manage all profiles.
          </p>
        </div>
      </div>
    </div>
  );
};
