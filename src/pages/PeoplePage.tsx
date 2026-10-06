import React, { useState, useEffect } from 'react';
import { UserPlus } from 'lucide-react';
import { useStore } from '../services/storeContext';
import { BiteHeading, BitePillLabel, ProfileAvatar, BiteEmptyState } from '../components/BiteUiComponents';
import { db, collection, getDocs } from '../services/firebase';
import { PublicProfile } from '../types';

export const PeoplePage: React.FC = () => {
  const { following, followers, toggleFollow, navigateTo, uid } = useStore();
  const [section, setSection] = useState<number>(0); // 0: Discover, 1: Following, 2: Followers
  const [query, setQuery] = useState('');
  const [allProfiles, setAllProfiles] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all public profiles
  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(collection(db, "publicProfiles"));
        const list: PublicProfile[] = [];
        snap.forEach(d => {
          const data = d.data();
          list.push({
            uid: d.id,
            name: data.displayName || "Food explorer",
            username: data.username || "",
            bio: data.bio || "",
            photoUrl: data.photoUrl || ""
          });
        });
        setAllProfiles(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Filter profiles based on selected sub-tab and query
  const shownProfiles = React.useMemo(() => {
    let baseList: PublicProfile[] = [];
    if (section === 0) {
      // Discover: exclude self
      baseList = allProfiles.filter(p => p.uid !== uid);
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        baseList = baseList.filter(p => 
          p.name.toLowerCase().includes(q) || 
          p.username.toLowerCase().includes(q)
        );
      }
    } else if (section === 1) {
      // Following
      baseList = allProfiles.filter(p => following.includes(p.uid));
    } else {
      // Followers
      baseList = allProfiles.filter(p => followers.includes(p.uid));
    }
    return baseList;
  }, [section, allProfiles, following, followers, uid, query]);

  return (
    <div className="p-4 space-y-3 pb-24 max-w-3xl mx-auto">
      <BiteHeading 
        title="Find your food people" 
        subtitle="Follow friends to make your feed and Popular among friends more useful." 
      />

      {/* Sub-tabs row */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
        {['Discover', `Following ${following.length}`, `Followers ${followers.length}`].map((label, idx) => (
          <BitePillLabel 
            key={label}
            text={label}
            selected={section === idx}
            onClick={() => setSection(idx)}
          />
        ))}
      </div>

      {/* Discover Search Bar */}
      {section === 0 && (
        <div className="pt-1">
          <input 
            type="text" 
            placeholder="Search people by name or @username"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-[#FFFFFEFA] border border-[#DDE5DE] rounded-xl px-3.5 py-2.5 text-sm text-[#233B3B] focus:outline-none focus:border-[#235D5B] focus:ring-1 focus:ring-[#235D5B]"
          />
        </div>
      )}

      {/* Profiles Stream */}
      <div className="space-y-2.5 pt-1">
        {loading ? (
          <p className="text-xs text-[#627370] py-4 text-center">Loading profiles…</p>
        ) : shownProfiles.length === 0 ? (
          <BiteEmptyState 
            message={
              section === 0 
                ? "No matching profiles yet." 
                : section === 1 
                  ? "Find someone to follow in Discover." 
                  : "No followers yet."
            } 
          />
        ) : (
          shownProfiles.map(person => {
            const isFollowing = following.includes(person.uid);
            const isMe = person.uid === uid;

            return (
              <div 
                key={person.uid}
                className="bg-[#FFFFFEFA] border border-[#DDE5DE] rounded-2xl p-3.5 shadow-xs hover:shadow-sm flex items-center justify-between gap-3"
              >
                <div 
                  onClick={() => navigateTo(`profile:${person.uid}`)}
                  className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                >
                  <ProfileAvatar 
                    photoUrl={person.photoUrl} 
                    userId={person.uid} 
                    size={46} 
                    placeholderSize={24} 
                  />

                  <div className="flex-1 min-w-0">
                    <h4 className="font-serif font-bold text-base text-[#233B3B] truncate hover:text-[#926017]">
                      {person.name}
                    </h4>
                    {person.username && (
                      <p className="text-xs text-[#627370]">@{person.username}</p>
                    )}
                    {person.bio && (
                      <p className="text-xs text-[#627370] line-clamp-2 mt-0.5">{person.bio}</p>
                    )}
                  </div>
                </div>

                {isMe ? (
                  <span className="text-xs text-[#627370] font-semibold px-2">You</span>
                ) : isFollowing ? (
                  <button 
                    onClick={() => toggleFollow(person.uid)}
                    className="border border-[#DDE5DE] hover:border-red-400 text-[#233B3B] hover:text-red-600 font-semibold text-xs px-4 py-1.5 rounded-full transition-colors flex-shrink-0"
                  >
                    Following
                  </button>
                ) : (
                  <button 
                    onClick={() => toggleFollow(person.uid)}
                    className="bg-[#926017] hover:bg-[#7c5213] text-white font-bold text-xs px-4 py-1.5 rounded-full transition-colors flex items-center gap-1.5 flex-shrink-0"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Follow</span>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
