import React, { useState } from 'react';
import { useStore } from '../services/storeContext';
import { BiteHeading, BitePrimaryButton, BitePillLabel } from '../components/BiteUiComponents';
import { onboardingDietaryOptions, onboardingCuisineOptions } from '../types';

export const PreferencesPage: React.FC = () => {
  const { tasteProfile, updateTastePreferences } = useStore();

  const [dietary, setDietary] = useState<string[]>(tasteProfile?.dietaryRestrictions || []);
  const [cuisines, setCuisines] = useState<string[]>(tasteProfile?.favoriteCuisines || []);
  const [budgetMin, setBudgetMin] = useState<number>(tasteProfile?.budgetMin || 100);
  const [budgetMax, setBudgetMax] = useState<number>(tasteProfile?.budgetMax || 5000);
  const [strict, setStrict] = useState<boolean>(tasteProfile?.budgetHardFilter || false);
  const [analyzeText, setAnalyzeText] = useState<boolean>(tasteProfile?.analyzeTextWithAi || false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const toggleDietary = (key: string) => {
    setDietary(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const toggleCuisine = (c: string) => {
    setCuisines(prev => {
      if (prev.includes(c)) return prev.filter(x => x !== c);
      if (prev.length >= 3) return prev;
      return [...prev, c];
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cuisines.length !== 3 || busy) return;
    setBusy(true);
    setMessage('');
    try {
      await updateTastePreferences({
        dietaryRestrictions: dietary,
        favoriteCuisines: cuisines,
        budgetMin,
        budgetMax,
        budgetHardFilter: strict,
        analyzeTextWithAi: analyzeText
      });
      setMessage('Preferences saved');
    } catch (err: any) {
      setMessage(err?.message || "Could not save preferences.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 space-y-4 pb-24 max-w-3xl mx-auto">
      <BiteHeading title="Dining preferences" subtitle="Choose what shapes your restaurant matches." />

      <form onSubmit={handleSave} className="space-y-4 bg-[#FFFFFEFA] border border-[#DDE5DE] rounded-2xl p-5 shadow-xs">
        {/* Dietary requirements */}
        <div>
          <p className="font-semibold text-sm text-[#233B3B] mb-2">Dietary requirements</p>
          <div className="space-y-1.5">
            {Object.entries(onboardingDietaryOptions).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2.5 text-xs text-[#233B3B] cursor-pointer py-1">
                <input 
                  type="checkbox"
                  checked={dietary.includes(key)}
                  disabled={busy}
                  onChange={() => toggleDietary(key)}
                  className="w-4 h-4 rounded text-[#926017] accent-[#926017]"
                />
                <span className="font-medium">{label}</span>
              </label>
            ))}
          </div>
          <p className="text-[11px] text-[#627370] mt-1.5">
            Unknown suitability is excluded. Confirm dietary needs with the restaurant.
          </p>
        </div>

        {/* Favorite cuisines */}
        <div>
          <p className="font-semibold text-sm text-[#233B3B] mb-2">
            Favorite cuisines ({cuisines.length}/3)
          </p>
          <div className="grid grid-cols-2 gap-2">
            {onboardingCuisineOptions.map(label => {
              const selected = cuisines.includes(label);
              const enabled = !busy && (selected || cuisines.length < 3);
              return (
                <button
                  key={label}
                  type="button"
                  disabled={!enabled}
                  onClick={() => toggleCuisine(label)}
                  className={`p-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                    selected 
                      ? 'border-[#926017] bg-[#926017] text-white shadow-xs' 
                      : 'border-[#DDE5DE] bg-white text-[#233B3B] hover:bg-[#FAF8F1] disabled:opacity-40'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Budget */}
        <div>
          <p className="font-semibold text-sm text-[#233B3B] mb-1">
            ₹{budgetMin}–{budgetMax} per person
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-[#627370] w-8">Min</span>
              <input 
                type="range"
                min="100"
                max="5000"
                step="50"
                value={budgetMin}
                disabled={busy}
                onChange={e => {
                  const val = parseInt(e.target.value, 10);
                  setBudgetMin(Math.min(val, budgetMax));
                }}
                className="w-full accent-[#926017] cursor-pointer"
              />
              <span className="text-xs font-bold text-[#233B3B] w-12 text-right">₹{budgetMin}</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] text-[#627370] w-8">Max</span>
              <input 
                type="range"
                min="100"
                max="5000"
                step="50"
                value={budgetMax}
                disabled={busy}
                onChange={e => {
                  const val = parseInt(e.target.value, 10);
                  setBudgetMax(Math.max(val, budgetMin));
                }}
                className="w-full accent-[#926017] cursor-pointer"
              />
              <span className="text-xs font-bold text-[#233B3B] w-12 text-right">₹{budgetMax}</span>
            </div>
          </div>
        </div>

        {/* Strict Budget Switch */}
        <div className="flex items-center justify-between py-1">
          <span className="text-xs font-semibold text-[#233B3B]">Strict budget</span>
          <input 
            type="checkbox"
            checked={strict}
            disabled={busy}
            onChange={e => setStrict(e.target.checked)}
            className="w-4 h-4 rounded text-[#926017] accent-[#926017]"
          />
        </div>

        <BitePrimaryButton 
          label={busy ? "Saving…" : "Save preferences"} 
          onClick={() => {}} 
          disabled={busy || cuisines.length !== 3}
          className="w-full"
        />

        {message && (
          <p className={`text-xs ${message === 'Preferences saved' ? 'text-[#235D5B] font-bold' : 'text-red-600'}`}>
            {message}
          </p>
        )}

        <div className="border-t border-[#DDE5DE] pt-3 space-y-1">
          <div className="flex items-center justify-between py-1">
            <span className="text-xs font-semibold text-[#233B3B]">AI review and comment insights</span>
            <input 
              type="checkbox"
              checked={analyzeText}
              disabled={busy}
              onChange={e => {
                setAnalyzeText(e.target.checked);
                updateTastePreferences({ analyzeTextWithAi: e.target.checked });
              }}
              className="w-4 h-4 rounded text-[#926017] accent-[#926017]"
            />
          </div>
          <p className="text-[11px] text-[#627370]">
            Optionally include your review and comment text in taste analysis.
          </p>
        </div>
      </form>
    </div>
  );
};
