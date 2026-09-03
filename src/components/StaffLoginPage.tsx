import React, { useState } from 'react';
import {
  Lock,
  User,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  ConciergeBell,
  Eye,
  EyeOff,
} from 'lucide-react';
import { UserProfile } from '../types/hotel';
import { login } from '../services/authService';

interface StaffLoginPageProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const StaffLoginPage: React.FC<StaffLoginPageProps> = ({
  onLoginSuccess,
}) => {
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    setTimeout(() => {
      const res = login(usernameInput, passwordInput);
      setIsLoading(false);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setErrorMsg(res.error || 'Invalid username or password.');
      }
    }, 150);
  };

  return (
    <div className="min-h-screen bg-[#0F0E0D] text-[#F3EFEA] flex flex-col justify-between selection:bg-[#C5A880]/30 selection:text-[#F3EFEA]">
      {/* Brand Header */}
      <header className="w-full border-b border-[#24211D] bg-[#141311]/90 backdrop-blur px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-[#C5A880]/15 border border-[#C5A880]/35 flex items-center justify-center text-[#E5D5B8] shadow-sm">
            <ConciergeBell className="w-4 h-4 text-[#C5A880]" />
          </div>
          <div>
            <h1 className="font-serif-luxury text-sm sm:text-base font-bold tracking-wider text-[#F3EFEA]">
              MADIGUN HOTEL &amp; EVENTS
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#A89F91]">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1F1D19] border border-[#332F28] text-[11px] text-[#C5A880]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#C5A880]" />
            <span>Staff Portal</span>
          </span>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 sm:p-6 flex items-center justify-center">
        <div className="w-full bg-[#171614] border border-[#2F2C26] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="space-y-3 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C5A880]/10 border border-[#C5A880]/25 text-[#C5A880] text-xs font-semibold">
              <Lock className="w-3.5 h-3.5" />
              <span>Staff &amp; Admin Sign In</span>
            </div>
            <h2 className="text-2xl font-bold font-serif-luxury text-[#F3EFEA] tracking-tight">
              Sign In
            </h2>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="bg-[#2A1517] border border-[#E63946]/50 rounded-xl p-3.5 text-xs text-[#FFCCD5] flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-[#E63946] shrink-0" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#D8D2C7]">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#7A756D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Username"
                  required
                  className="w-full bg-[#100F0E] border border-[#33302A] focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-[#F3EFEA] placeholder-[#6E685F] outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#D8D2C7]">
                Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#7A756D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Password"
                  required
                  className="w-full bg-[#100F0E] border border-[#33302A] focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#F3EFEA] placeholder-[#6E685F] outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#7A756D] hover:text-[#C5A880] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-[#C5A880] hover:bg-[#B39366] text-[#121110] font-bold text-sm transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span>Signing In...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1F1D1A] bg-[#121110] px-4 py-3 text-center text-xs text-[#7A756D]">
        <span>&copy; {new Date().getFullYear()} Madigun Hotel &amp; Events</span>
      </footer>
    </div>
  );
};
