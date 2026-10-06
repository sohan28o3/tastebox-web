import React, { useState, useMemo } from 'react';
import { Sparkles, Star, Share2, Trash2 } from 'lucide-react';
import { useStore } from '../services/storeContext';
import { 
  BiteSectionHeader, BitePillLabel, BitePlaceCard, 
  ProfileAvatar, RestaurantCover, BiteEmptyState 
} from '../components/BiteUiComponents';
import { cuisineDetails, showDiscoveredPlace } from '../types';
import { tasteRank } from '../services/tasteMatching';
import { searchNearbyGoogle } from '../services/placesService';

export const ProfilePage: React.FC = () => {
  const { 
    uid, displayName, username, bio, photoUrl, error, clearError,
    visits, eateries, lists, watchlist, favorites, following, followers,
    tasteProfile, place, tasteMatch, createList, deleteList, navigateTo,
    requestUserLocation, cacheEateries
  } = useStore();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [openListId, setOpenListId] = useState<string | null>(null);
  const [deleteConfirmListId, setDeleteConfirmListId] = useState<string | null>(null);

  const uniquePlaces = useMemo(() => {
    return new Set(visits.map(v => v.eateryId)).size;
  }, [visits]);

  const recentVisits = useMemo(() => {
    return [...visits].sort((a, b) => b.createdAt - a.createdAt).slice(0, 2);
  }, [visits]);

  const details = useMemo(() => {
    return cuisineDetails(tasteProfile, visits, eateries, favorites);
  }, [tasteProfile, visits, eateries, favorites]);

  const ratedCount = useMemo(() => {
    return visits.filter(v => v.rating > 0).length;
  }, [visits]);

  const maturity = useMemo(() => {
    if (ratedCount === 0) return "Getting to know you";
    if (!tasteProfile || tasteProfile.confidence < 70) return "Learning your preferences";
    return "Your preferences are taking shape";
  }, [ratedCount, tasteProfile]);

  // Picked for you state & logic (Android TasteRestaurantPicks parity)
  const [picksLoading, setPicksLoading] = useState(false);
  const [picksMessage, setPicksMessage] = useState('');
  const [nearbyPickIds, setNearbyPickIds] = useState<string[] | null>(null);

  const refreshNearbyPicks = async () => {
    setPicksLoading(true);
    setPicksMessage('');
    try {
      const loc = await requestUserLocation();
      const discovered = await searchNearbyGoogle(loc.latitude, loc.longitude, 4);
      const established = discovered.filter(p => showDiscoveredPlace(p, true));
      cacheEateries(established);
      setNearbyPickIds(established.map(e => e.id));
    } catch (_err) {
      setPicksMessage("Could not find nearby picks. Check your connection and location, then retry.");
    } finally {
      setPicksLoading(false);
    }
  };

  const pickCandidates = useMemo(() => {
    return eateries.filter(e => nearbyPickIds == null || nearbyPickIds.includes(e.id));
  }, [eateries, nearbyPickIds]);

  const picks = useMemo(() => {
    return tasteRank(pickCandidates, tasteProfile)
      .sort((a, b) => tasteMatch(b.eatery) - tasteMatch(a.eatery))
      .slice(0, 3);
  }, [pickCandidates, tasteProfile, tasteMatch]);

  const handleShareList = (title: string, desc: string, eateryIds: string[]) => {
    const placeNames = eateryIds.map(id => place(id)?.name).filter(Boolean).join('\n');
    const text = `${title}\n${desc}\n${placeNames}`;
    if (navigator.share) {
      navigator.share({ title, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      alert('Copied list to clipboard!');
    }
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListTitle.trim()) return;
    try {
      await createList(newListTitle.trim(), newListDescription.trim());
      setNewListTitle('');
      setNewListDescription('');
      setCreateModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-4 space-y-4 pb-24 max-w-3xl mx-auto">
      {/* Profile Header */}
      <div className="flex items-center gap-4">
        <ProfileAvatar 
          photoUrl={photoUrl} 
          userId={uid} 
          size={82} 
          placeholderSize={44} 
          className="border-2 border-white shadow-sm"
        />

        <div className="flex-1 min-w-0">
          <h2 className="font-serif font-bold text-2xl text-[#233B3B] truncate">
            {displayName}
          </h2>
          {username && (
            <p className="text-sm text-[#627370]">@{username}</p>
          )}
          {bio && (
            <p className="text-sm text-[#233B3B] mt-1">{bio}</p>
          )}
        </div>
      </div>

      {/* Sync Error Banner */}
      {error && (
        <div className="bg-red-50 text-red-600 text-xs p-2.5 rounded-xl flex items-center justify-between border border-red-200">
          <span>Sync error: {error}</span>
          <button onClick={clearError} className="font-bold underline ml-2">
            dismiss
          </button>
        </div>
      )}

      {/* 5-Stat Bar Card */}
      <div className="bg-[#FFFFFEFA] border border-[#DDE5DE] rounded-2xl shadow-xs overflow-hidden">
        <div className="grid grid-cols-5 divide-x divide-[#DDE5DE] text-center">
          <button 
            onClick={() => navigateTo('tab:2')}
            className="py-3 hover:bg-[#FAF8F1] transition-colors"
          >
            <span className="font-serif font-bold text-lg text-[#233B3B] block">
              {followers.length}
            </span>
            <span className="text-[11px] text-[#627370]">Followers</span>
          </button>

          <button 
            onClick={() => navigateTo('tab:2')}
            className="py-3 hover:bg-[#FAF8F1] transition-colors"
          >
            <span className="font-serif font-bold text-lg text-[#233B3B] block">
              {following.length}
            </span>
            <span className="text-[11px] text-[#627370]">Following</span>
          </button>

          <div className="py-3">
            <span className="font-serif font-bold text-lg text-[#233B3B] block">
              {visits.length}
            </span>
            <span className="text-[11px] text-[#627370]">Visits</span>
          </div>

          <div className="py-3">
            <span className="font-serif font-bold text-lg text-[#233B3B] block">
              {uniquePlaces}
            </span>
            <span className="text-[11px] text-[#627370]">Places</span>
          </div>

          <div className="py-3">
            <span className="font-serif font-bold text-lg text-[#233B3B] block">
              {favorites.length}
            </span>
            <span className="text-[11px] text-[#627370]">Likes</span>
          </div>
        </div>
      </div>

      {/* TasteProfileSection Card (BiteLilac) */}
      <div className="bg-[#ECF2EC] rounded-2xl p-4 border border-[#DDE5DE]/60 space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#926017]" />
            <h3 className="font-serif font-bold text-lg text-[#233B3B]">Your Taste Profile</h3>
          </div>
          <span className="text-xs text-[#627370]">
            {tasteProfile?.shareWithFollowers ? "Shared" : "Private"}
          </span>
        </div>

        <p className="text-xs font-semibold text-[#235D5B]">{maturity}</p>
        <p className="text-xs text-[#627370]">
          Based on {ratedCount} rated {ratedCount === 1 ? "visit" : "visits"} and {tasteProfile?.favoriteCount ?? favorites.length} {favorites.length === 1 ? "favorite" : "favorites"}
        </p>

        <p className="text-sm text-[#233B3B] leading-relaxed">
          {tasteProfile?.aiSummary || (
            details.length > 0 
              ? `Your current preferences lean toward ${details.filter(d => d.score > 50).map(d => d.label).join(', ') || 'a mix of cuisines'}. Each rated visit helps refine your picks.`
              : "Rate a few visits or choose your favorite cuisines to start building your profile."
          )}
        </p>

        {details.length > 0 && (
          <div className="space-y-2 pt-1">
            <p className="text-xs font-bold text-[#233B3B]">Your preferences</p>
            {details.map((detail, i) => (
              <div key={i} className="bg-white/60 p-2.5 rounded-xl space-y-0.5 border border-[#DDE5DE]/40">
                <p className="text-xs font-semibold text-[#233B3B]">{detail.label}</p>
                <p className="text-xs font-semibold text-[#926017]">{detail.strength}</p>
                <p className="text-[11px] text-[#627370]">{detail.evidence}</p>
              </div>
            ))}
          </div>
        )}

        {tasteProfile?.topTags && tasteProfile.topTags.length > 0 && (
          <div className="pt-1">
            <p className="text-xs font-semibold text-[#233B3B] mb-1.5">What you enjoyed</p>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {tasteProfile.topTags.slice(0, 4).map(tag => (
                <BitePillLabel key={tag} text={tag} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Picked for you (TasteRestaurantPicks parity with Android) */}
      <div className="bg-[#FFFFFEFA] border border-[#DDE5DE] rounded-2xl p-4 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-[#233B3B]">Picked for you</h3>
          <span className="text-[11px] text-[#627370]">
            {nearbyPickIds == null ? "Explored places" : "Nearby search"}
          </span>
        </div>
        <p className="text-xs text-[#627370]">
          {nearbyPickIds == null 
            ? "Matches from places you have explored" 
            : "Matches from your latest nearby search"}
        </p>

        {picks.length === 0 ? (
          <p className="text-xs text-[#627370] py-1">
            No eligible picks yet. Find nearby places or adjust your dining preferences.
          </p>
        ) : (
          <div className="space-y-2.5 pt-1">
            {picks.map(match => (
              <div key={match.eatery.id} className="space-y-1">
                <BitePlaceCard 
                  place={match.eatery} 
                  onOpen={() => navigateTo(`place:${match.eatery.id}`)}
                  matchScore={match.score}
                />
                {match.explanation && (
                  <p className="text-[11px] text-[#627370] px-2 italic">{match.explanation}</p>
                )}
              </div>
            ))}
          </div>
        )}

        <button
          onClick={refreshNearbyPicks}
          disabled={picksLoading}
          className="border border-[#926017] text-[#926017] hover:bg-[#FAF8F1] font-bold text-xs py-2 px-4 rounded-xl transition-colors disabled:opacity-50 mt-1 block"
        >
          {picksLoading ? "Finding picks…" : "Find nearby picks"}
        </button>

        {picksMessage && (
          <p className="text-xs text-red-600 mt-1">{picksMessage}</p>
        )}
      </div>

      {/* Recent Activity */}
      <div>
        <BiteSectionHeader 
          title="Recent Activity" 
          action="View Diary" 
          onAction={() => navigateTo('tab:3')} 
        />
        {recentVisits.length === 0 ? (
          <p className="text-xs text-[#627370]">Your latest reviews will appear here.</p>
        ) : (
          <div className="space-y-2.5">
            {recentVisits.map(visit => {
              const p = place(visit.eateryId);
              if (!p) return null;
              const matchScore = tasteMatch(p);

              return (
                <div 
                  key={visit.id} 
                  onClick={() => navigateTo(`place:${p.id}`)}
                  className="bg-[#FFFFFEFA] border border-[#DDE5DE] rounded-2xl p-3 shadow-xs hover:shadow-sm cursor-pointer flex items-center gap-3"
                >
                  <RestaurantCover place={p} size={56} />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-serif font-bold text-base text-[#233B3B] truncate">
                      {p.name}
                    </h4>
                    <p className="text-xs text-[#627370]">{visit.date}</p>
                    <div className="flex gap-1.5 mt-1 overflow-x-auto no-scrollbar">
                      <BitePillLabel text={p.cuisine || 'Other'} />
                      <BitePillLabel text={`${matchScore}% match`} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[#926017] font-bold text-sm">
                    <Star className="w-4 h-4 fill-[#926017]" />
                    <span>{visit.rating > 0 ? (visit.rating / 2.0).toFixed(1) : '—'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Want to try */}
      <div>
        <BiteSectionHeader title={`Want to try (${watchlist.length})`} />
        {watchlist.length === 0 ? (
          <p className="text-xs text-[#627370]">Save places to build your list.</p>
        ) : (
          <div className="space-y-2.5">
            {watchlist.map(id => {
              const p = place(id);
              if (!p) return null;
              return (
                <BitePlaceCard 
                  key={id} 
                  place={p} 
                  onOpen={() => navigateTo(`place:${id}`)} 
                  status="Want to try"
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Favorites */}
      <div>
        <BiteSectionHeader title={`Favorites (${favorites.length})`} />
        {favorites.length === 0 ? (
          <p className="text-xs text-[#627370]">Like places you enjoyed.</p>
        ) : (
          <div className="space-y-2.5">
            {favorites.map(id => {
              const p = place(id);
              if (!p) return null;
              return (
                <BitePlaceCard 
                  key={id} 
                  place={p} 
                  onOpen={() => navigateTo(`place:${id}`)} 
                  status="Favorite"
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Your lists */}
      <div>
        <BiteSectionHeader 
          title="Your lists" 
          action="+ New list" 
          onAction={() => setCreateModalOpen(true)} 
        />
        {lists.length === 0 ? (
          <BiteEmptyState 
            message="Make a themed list for brunch, coffee or your favorite places." 
            actionText="Explore" 
            onAction={() => navigateTo('tab:1')} 
          />
        ) : (
          <div className="space-y-2.5">
            {lists.map(list => {
              const isOpen = openListId === list.id;
              return (
                <div 
                  key={list.id}
                  className="bg-[#FFFFFEFA] border border-[#DDE5DE] rounded-2xl p-3.5 shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => setOpenListId(isOpen ? null : list.id)}
                      className="font-serif font-bold text-base text-[#233B3B] hover:text-[#926017] text-left"
                    >
                      {list.title} ({list.eateryIds.length})
                    </button>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleShareList(list.title, list.description, list.eateryIds)}
                        className="text-[#627370] hover:text-[#926017] p-1"
                        title="Share list"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setDeleteConfirmListId(list.id)}
                        className="text-[#627370] hover:text-red-600 p-1"
                        title="Delete list"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {list.description && (
                    <p className="text-xs text-[#627370]">{list.description}</p>
                  )}

                  {isOpen && (
                    <div className="pt-2 border-t border-[#DDE5DE] space-y-2">
                      {list.eateryIds.length === 0 ? (
                        <p className="text-xs text-[#627370]">Open any eatery and add it to this list.</p>
                      ) : (
                        list.eateryIds.map(eateryId => {
                          const p = place(eateryId);
                          if (!p) return null;
                          return (
                            <BitePlaceCard 
                              key={eateryId}
                              place={p}
                              onOpen={() => navigateTo(`place:${eateryId}`)}
                            />
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create List Modal */}
      {createModalOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setCreateModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-[#DDE5DE] space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-serif font-bold text-lg text-[#233B3B]">New list</h3>
            <form onSubmit={handleCreateList} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#627370] mb-1">List title</label>
                <input 
                  type="text"
                  required
                  value={newListTitle}
                  onChange={e => setNewListTitle(e.target.value)}
                  placeholder="e.g. Best Cafes in Town"
                  className="w-full text-sm p-2.5 rounded-xl border border-[#DDE5DE] focus:ring-1 focus:ring-[#235D5B] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#627370] mb-1">Description</label>
                <textarea 
                  value={newListDescription}
                  onChange={e => setNewListDescription(e.target.value)}
                  placeholder="e.g. Places with great specialty coffee and work-friendly seats"
                  rows={2}
                  className="w-full text-sm p-2.5 rounded-xl border border-[#DDE5DE] focus:ring-1 focus:ring-[#235D5B] focus:outline-none resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-[#627370] hover:text-[#233B3B]"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!newListTitle.trim()}
                  className="bg-[#926017] hover:bg-[#7c5213] text-white font-bold text-xs px-4 py-1.5 rounded-full disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete List Confirm Modal */}
      {deleteConfirmListId && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setDeleteConfirmListId(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-[#DDE5DE] space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-serif font-bold text-lg text-[#233B3B]">Delete this list?</h3>
            <p className="text-xs text-[#627370]">Are you sure you want to delete this list?</p>
            <div className="flex justify-end gap-2 pt-2">
              <button 
                onClick={() => setDeleteConfirmListId(null)}
                className="px-3 py-1.5 text-xs text-[#627370] hover:text-[#233B3B]"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  await deleteList(deleteConfirmListId);
                  setDeleteConfirmListId(null);
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-1.5 rounded-full"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
