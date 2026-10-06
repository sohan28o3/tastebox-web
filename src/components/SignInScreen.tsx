import React, { useState } from 'react';
import { Utensils } from 'lucide-react';
import { useStore } from '../services/storeContext';

export const SignInScreen: React.FC = () => {
  const { loginWithGoogle } = useStore();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setMessage(err?.message || "Google sign-in failed. Please verify popup settings or try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F1] flex flex-col items-center justify-between">
      {/* Top Banner */}
      <div className="w-full bg-[#235D5B] flex-1 flex flex-col items-center justify-center p-8 text-center text-white">
        <div className="w-20 h-20 rounded-full bg-[#926017] flex items-center justify-center mb-4 shadow-lg">
          <Utensils className="w-10 h-10 text-white" />
        </div>
        <h1 className="font-serif font-black text-4xl sm:text-5xl text-white tracking-wide">
          Tasteboxd
        </h1>
        <p className="text-[#FFF8E8] opacity-80 text-sm mt-1">
          Your food diary, shaped by your taste.
        </p>
      </div>

      {/* Action Section */}
      <div className="w-full max-w-md p-8 flex flex-col items-center text-center">
        <h2 className="font-serif font-bold text-2xl text-[#233B3B]">
          Find food that feels like you.
        </h2>
        <p className="text-xs text-[#627370] mt-2 mb-8 leading-relaxed max-w-xs">
          Rate your meals, follow friends, build a private taste profile and discover nearby restaurants that match it.
        </p>

        <button
          onClick={handleSignIn}
          disabled={busy}
          className="w-full bg-[#926017] text-white py-3.5 px-6 rounded-2xl font-bold text-base shadow-md hover:bg-[#926017]/90 active:scale-98 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {busy ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#ffffff"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#ffffff"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#ffffff"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#ffffff"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>{busy ? "Signing in…" : "Continue with Google"}</span>
        </button>

        {message && (
          <p className="text-xs text-red-600 font-semibold mt-4 text-center">
            {message}
          </p>
        )}

        <p className="text-[11px] text-[#627370] mt-8 text-center max-w-xs">
          Tasteboxd ratings shown in the app come only from Tasteboxd users.
        </p>
      </div>
    </div>
  );
};
