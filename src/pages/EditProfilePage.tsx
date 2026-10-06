import React, { useState, useRef } from 'react';
import { useStore } from '../services/storeContext';
import { BiteHeading, BitePrimaryButton, ProfileAvatar } from '../components/BiteUiComponents';
import { compressImageFile } from '../services/imageUtils';

export const EditProfilePage: React.FC = () => {
  const { 
    uid, displayName, bio, photoUrl, username, tasteProfile, libraryVisibility,
    saveProfile, uploadProfilePhotoBase64, setTasteSharing, updateLibraryVisibility 
  } = useStore();

  const [name, setName] = useState(displayName);
  const [userBio, setUserBio] = useState(bio);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMessage('');
    try {
      const base64 = await compressImageFile(file, 640);
      await uploadProfilePhotoBase64(base64);
      setMessage('Photo updated');
    } catch (err: any) {
      setMessage(err?.message || "Could not update photo.");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setMessage('');
    try {
      await saveProfile(name.trim(), userBio.trim());
      setMessage('Saved');
    } catch (err: any) {
      setMessage(err?.message || "Could not save. Please retry.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 space-y-4 pb-24 max-w-3xl mx-auto">
      <BiteHeading title="Edit profile" subtitle="Update your profile and sharing settings." />

      <form onSubmit={handleSaveProfile} className="space-y-3.5 bg-[#FFFFFEFA] border border-[#DDE5DE] rounded-2xl p-5 shadow-xs">
        {/* Photo Row */}
        <div className="flex items-center gap-3.5">
          <ProfileAvatar photoUrl={photoUrl} userId={uid} size={64} placeholderSize={32} />
          <input 
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handlePhotoUpload}
            className="hidden"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
            className="border border-[#DDE5DE] hover:border-[#926017] text-[#233B3B] font-semibold text-xs px-3.5 py-2 rounded-xl transition-colors disabled:opacity-50"
          >
            Change photo
          </button>
        </div>

        {username && (
          <p className="text-xs text-[#627370]">@{username}</p>
        )}

        <div>
          <label className="block text-xs font-semibold text-[#627370] mb-1">Display name</label>
          <input 
            type="text"
            required
            maxLength={80}
            disabled={busy}
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full text-sm p-2.5 rounded-xl border border-[#DDE5DE] focus:ring-1 focus:ring-[#235D5B] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#627370] mb-1">Bio</label>
          <textarea 
            maxLength={300}
            disabled={busy}
            rows={3}
            value={userBio}
            onChange={e => setUserBio(e.target.value)}
            className="w-full text-sm p-2.5 rounded-xl border border-[#DDE5DE] focus:ring-1 focus:ring-[#235D5B] focus:outline-none resize-none"
          />
        </div>

        <BitePrimaryButton 
          label={busy ? "Saving…" : "Save profile"} 
          onClick={() => {}} 
          disabled={busy || !name.trim()}
          className="w-full"
        />

        <div className="border-t border-[#DDE5DE] pt-3 space-y-2">
          <p className="font-bold text-sm text-[#233B3B]">Visible to followers</p>
          <p className="text-xs text-[#627370]">
            Sharing changes save immediately. Your private library stays available to you.
          </p>

          <div className="space-y-2 pt-1">
            <label className="flex items-center justify-between text-xs cursor-pointer py-1">
              <span className="font-semibold text-[#233B3B]">Taste profile</span>
              <input 
                type="checkbox"
                checked={tasteProfile?.shareWithFollowers ?? false}
                onChange={e => setTasteSharing(e.target.checked)}
                className="w-4 h-4 rounded text-[#926017] accent-[#926017]"
              />
            </label>

            <label className="flex items-center justify-between text-xs cursor-pointer py-1">
              <span className="font-semibold text-[#233B3B]">Lists</span>
              <input 
                type="checkbox"
                checked={libraryVisibility.showLists}
                onChange={e => updateLibraryVisibility({ ...libraryVisibility, showLists: e.target.checked })}
                className="w-4 h-4 rounded text-[#926017] accent-[#926017]"
              />
            </label>

            <label className="flex items-center justify-between text-xs cursor-pointer py-1">
              <span className="font-semibold text-[#233B3B]">Want to try</span>
              <input 
                type="checkbox"
                checked={libraryVisibility.showWantToTry}
                onChange={e => updateLibraryVisibility({ ...libraryVisibility, showWantToTry: e.target.checked })}
                className="w-4 h-4 rounded text-[#926017] accent-[#926017]"
              />
            </label>

            <label className="flex items-center justify-between text-xs cursor-pointer py-1">
              <span className="font-semibold text-[#233B3B]">Favorites</span>
              <input 
                type="checkbox"
                checked={libraryVisibility.showFavorites}
                onChange={e => updateLibraryVisibility({ ...libraryVisibility, showFavorites: e.target.checked })}
                className="w-4 h-4 rounded text-[#926017] accent-[#926017]"
              />
            </label>
          </div>
        </div>

        {message && (
          <p className={`text-xs ${message === 'Saved' || message === 'Photo updated' ? 'text-[#235D5B] font-bold' : 'text-red-600'}`}>
            {message}
          </p>
        )}
      </form>
    </div>
  );
};
