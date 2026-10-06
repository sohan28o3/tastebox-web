import React, { useState } from 'react';
import { useStore } from '../services/storeContext';
import { 
  onboardingDietaryOptions, 
  onboardingCuisineOptions, 
  normalizeUsername 
} from '../types';
import { 
  completeOnboarding, 
  isUsernameAvailable, 
  USERNAME_REGEX 
} from '../services/onboardingService';

export const OnboardingGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { uid, onboardingDone, setOnboardingDone } = useStore();

  const [step, setStep] = useState<number>(0);
  const [username, setUsername] = useState<string>('');
  const [usernameMessage, setUsernameMessage] = useState<string>('');
  const [dietary, setDietary] = useState<string[]>([]);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [budgetMin, setBudgetMin] = useState<number>(300);
  const [budgetMax, setBudgetMax] = useState<number>(1500);
  const [hardBudget, setHardBudget] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  if (onboardingDone) {
    return <>{children}</>;
  }

  const cleanUsername = normalizeUsername(username);
  const isUsernameSyntaxValid = USERNAME_REGEX.test(cleanUsername);

  const handleNextFromUsername = async () => {
    if (!isUsernameSyntaxValid) {
      setUsernameMessage("Must be 3–20 characters using letters, numbers, . or _");
      return;
    }
    setBusy(true);
    setUsernameMessage('');
    try {
      const avail = await isUsernameAvailable(cleanUsername, uid);
      if (!avail) {
        setUsernameMessage("That username is already taken. Try another.");
        return;
      }
      setStep(1);
    } catch (e: any) {
      setUsernameMessage(e?.message || "Could not check username.");
    } finally {
      setBusy(false);
    }
  };

  const toggleDietary = (key: string) => {
    setDietary(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const toggleCuisine = (c: string) => {
    setCuisines(prev => {
      if (prev.includes(c)) return prev.filter(x => x !== c);
      if (prev.length >= 3) return prev; // Exactly 3
      return [...prev, c];
    });
  };

  const handleComplete = async () => {
    setBusy(true);
    setError('');
    try {
      await completeOnboarding(uid, cleanUsername, {
        dietaryRestrictions: dietary,
        favoriteCuisines: cuisines,
        budgetMin,
        budgetMax,
        budgetHardFilter: hardBudget,
        budgetCurrency: "INR"
      });
      setOnboardingDone(true);
    } catch (e: any) {
      setError(e?.message || "Failed to complete onboarding.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F1] flex flex-col items-center p-4 sm:p-8">
      <div className="w-full max-w-lg bg-[#FFFFFEFA] border border-[#DDE5DE] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 animate-fade-in">
        <div>
          <h1 className="font-serif font-black text-2xl text-[#235D5B]">Tasteboxd</h1>
          <h2 className="font-serif font-bold text-xl text-[#233B3B] mt-1">Set up your taste profile</h2>
          <p className="text-xs text-[#627370] mt-1">
            A few quick choices make your recommendations useful from day one.
          </p>

          <div className="w-full bg-[#DDE5DE] h-1.5 rounded-full mt-4 overflow-hidden">
            <div 
              className="bg-[#926017] h-full transition-all duration-300"
              style={{ width: `${((step + 1) / 4) * 100}%` }}
            />
          </div>
          <span className="text-[11px] font-bold text-[#627370] block mt-1">Step {step + 1} of 4</span>
        </div>

        {/* Step 0: Username */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-serif font-bold text-lg text-[#233B3B]">Choose a username</h3>
              <p className="text-xs text-[#627370] mt-1">
                This is your unique @name on Tasteboxd. Usernames are lowercase and cannot be shared by two accounts.
              </p>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-3 text-[#627370] font-bold">@</span>
              <input 
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 20));
                  setUsernameMessage('');
                }}
                placeholder="username"
                className="w-full pl-8 pr-4 py-2.5 bg-[#FAF8F1] border border-[#DDE5DE] rounded-xl text-sm font-semibold text-[#233B3B] focus:outline-none focus:border-[#235D5B]"
              />
            </div>

            {usernameMessage && (
              <p className="text-xs text-red-600 font-semibold">{usernameMessage}</p>
            )}

            <button
              onClick={handleNextFromUsername}
              disabled={busy || !isUsernameSyntaxValid}
              className="w-full bg-[#926017] text-white py-2.5 rounded-xl font-bold text-sm shadow-md disabled:opacity-50"
            >
              {busy ? "Checking…" : "Continue"}
            </button>
          </div>
        )}

        {/* Step 1: Dietary restrictions */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-serif font-bold text-lg text-[#233B3B]">Dietary restrictions & allergies</h3>
              <p className="text-xs text-[#627370] mt-1">
                These are treated as hard filters. Unknown restaurant compliance is excluded rather than guessed.
              </p>
            </div>

            <div className="space-y-2">
              {Object.entries(onboardingDietaryOptions).map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 p-2.5 bg-[#FAF8F1] rounded-xl border border-[#DDE5DE] cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={dietary.includes(key)}
                    onChange={() => toggleDietary(key)}
                    className="w-4 h-4 accent-[#235D5B]"
                  />
                  <span className="text-sm font-bold text-[#233B3B]">{label}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep(0)} className="px-4 py-2 border border-[#DDE5DE] rounded-xl text-xs font-bold text-[#233B3B]">Back</button>
              <button onClick={() => setStep(2)} className="flex-1 bg-[#926017] text-white py-2 rounded-xl text-xs font-bold shadow-md">Continue</button>
            </div>
          </div>
        )}

        {/* Step 2: Cuisines */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-serif font-bold text-lg text-[#233B3B]">Choose exactly 3 favorite cuisines</h3>
              <p className="text-xs text-[#627370] mt-1">
                Selected: {cuisines.length} of 3
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {onboardingCuisineOptions.map(c => {
                const isSelected = cuisines.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCuisine(c)}
                    className={`p-2.5 rounded-xl text-xs font-bold transition-all border ${
                      isSelected 
                        ? 'bg-[#926017] text-white border-[#926017] shadow-xs' 
                        : 'bg-[#FAF8F1] text-[#233B3B] border-[#DDE5DE] hover:bg-[#E2F0EB]'
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="px-4 py-2 border border-[#DDE5DE] rounded-xl text-xs font-bold text-[#233B3B]">Back</button>
              <button 
                onClick={() => setStep(3)} 
                disabled={cuisines.length !== 3}
                className="flex-1 bg-[#926017] text-white py-2 rounded-xl text-xs font-bold shadow-md disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Budget Range */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-serif font-bold text-lg text-[#233B3B]">Budget range per person</h3>
              <p className="text-xs text-[#627370] mt-1">
                Typical amount you prefer to spend per person (INR ₹).
              </p>
            </div>

            <div className="bg-[#FAF8F1] p-4 rounded-xl border border-[#DDE5DE] space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold text-[#233B3B] mb-1">
                  <span>Minimum: ₹{budgetMin}</span>
                  <span>Maximum: ₹{budgetMax}</span>
                </div>
                <input 
                  type="range"
                  min={100}
                  max={2500}
                  step={50}
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(Math.min(Number(e.target.value), budgetMax - 100))}
                  className="w-full accent-[#235D5B]"
                />
                <input 
                  type="range"
                  min={500}
                  max={5000}
                  step={100}
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(Math.max(Number(e.target.value), budgetMin + 100))}
                  className="w-full accent-[#926017]"
                />
              </div>

              <label className="flex items-center gap-2 pt-2 border-t border-[#DDE5DE] cursor-pointer">
                <input 
                  type="checkbox"
                  checked={hardBudget}
                  onChange={(e) => setHardBudget(e.target.checked)}
                  className="w-4 h-4 accent-[#235D5B]"
                />
                <span className="text-xs font-bold text-[#233B3B]">
                  Hard filter (Strictly hide restaurants exceeding this range)
                </span>
              </label>
            </div>

            {error && (
              <p className="text-xs text-red-600 font-semibold">{error}</p>
            )}

            <div className="flex gap-2">
              <button onClick={() => setStep(2)} className="px-4 py-2 border border-[#DDE5DE] rounded-xl text-xs font-bold text-[#233B3B]">Back</button>
              <button 
                onClick={handleComplete} 
                disabled={busy}
                className="flex-1 bg-[#235D5B] text-white py-2.5 rounded-xl text-xs font-bold shadow-md hover:bg-[#2C6864] disabled:opacity-50"
              >
                {busy ? "Setting up Tasteboxd…" : "Complete Setup & Launch"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
