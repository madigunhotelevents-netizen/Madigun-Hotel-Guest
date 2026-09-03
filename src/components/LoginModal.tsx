import React, { useState } from 'react';
import {
  X,
  Lock,
  User,
  ShieldCheck,
  KeyRound,
  AlertCircle,
} from 'lucide-react';
import { UserProfile } from '../types/hotel';
import { login } from '../services/authService';

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

        {/* Title */}
        <div className="text-center space-y-1.5 pt-1">
          <div className="w-12 h-12 rounded-xl bg-[#C5A880]/15 border border-[#C5A880]/40 flex items-center justify-center mx-auto text-[#C5A880] shadow-sm">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif-luxury text-[#F3EFEA]">
            Staff &amp; Admin Sign In
          </h2>
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
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#7A756D] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Username"
                required
                className="w-full bg-[#121110] border border-[#33302A] focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] rounded-lg pl-9 pr-3 py-2.5 text-sm text-[#F3EFEA] placeholder-[#6E685F] outline-none transition-colors font-sans"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[#D8D2C7] font-semibold">
              Password
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-[#7A756D] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Password"
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
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
