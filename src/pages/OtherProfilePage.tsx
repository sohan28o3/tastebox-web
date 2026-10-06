import React, { useState, useEffect } from 'react';
import { Sparkles, Star } from 'lucide-react';
import { useStore } from '../services/storeContext';
import { 
  db, doc, getDoc, collection, query, where, getDocs, limit, orderBy, onSnapshot, collectionGroup 
} from '../services/firebase';
import { PublicProfile, SocialReview, ratingText, ratingNumericLabel } from '../types';
import { 
  ProfileAvatar, RestaurantCover, BiteSectionHeader, BitePillLabel, 
  ReviewImages, ReviewActions, BiteEmptyState 
} from '../components/BiteUiComponents';

export const OtherProfilePage: React.FC<{ userId: string }> = ({ userId }) => {
  const { following, toggleFollow, uid, place, navigateTo, appReviews } = useStore();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [reviews, setReviews] = useState<SocialReview[]>([]);
  const [followerCount, setFollowerCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);
  const [sharedTaste, setSharedTaste] = useState<{
    summary?: string;
    topCuisines?: string[];
    topTags?: string[];
    confidence?: number;
  } | null>(null);
  const [sharedLibrary, setSharedLibrary] = useState<{
    showFavorites?: boolean;
    showWantToTry?: boolean;
    showLists?: boolean;
    favorites?: string[];
    wantToTry?: string[];
    lists?: Array<{ id: string; title: string; description?: string; restaurantIds?: string[] }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedListId, setExpandedListId] = useState<string | null>(null);

  const isFollowing = following.includes(userId);

  useEffect(() => {
    async function loadData() {
      try {
        const userDoc = await getDoc(doc(db, "publicProfiles", userId));
        if (userDoc.exists()) {
          const d = userDoc.data();
          setProfile({
            uid: userId,
            name: d.displayName || "Food explorer",
            username: d.username || "",
            bio: d.bio || "",
            photoUrl: d.photoUrl || ""
          });
        }

        // Fetch counts
        try {
          const followersSnap = await getDocs(
            query(collectionGroup(db, "targets"), where("followedId", "==", userId))
          );
          setFollowerCount(followersSnap.size);
        } catch {
          // If indexing or collection group restricted
        }

        try {
          const targetsSnap = await getDocs(collection(db, "follows", userId, "targets"));
          setFollowingCount(targetsSnap.size);
        } catch {
          // In case user hasn't followed anyone or restricted
        }

        // Fetch user's reviews (use store's active in-memory appReviews as primary source)
        const cached = appReviews.filter(r => r.userId === userId).slice(0, 20);
        if (cached.length > 0) {
          setReviews(cached);
        } else {
          try {
            const revQuery = query(
              collection(db, "reviews"),
              where("userId", "==", userId)
            );
            const revSnap = await getDocs(revQuery);
            const revList: SocialReview[] = [];
            revSnap.forEach(snap => {
              const d = snap.data();
              revList.push({
                id: snap.id,
                userId,
                restaurantId: d.restaurantId || "",
                rating: Number(d.rating) || 0,
                review: d.review || "",
                visitDate: d.visitDate || "",
                createdAtMillis: d.createdAtMillis || d.createdAt?.toMillis?.() || 0,
                photoPaths: Array.isArray(d.photoPaths) ? d.photoPaths : []
              });
            });
            revList.sort((a, b) => (b.createdAtMillis || 0) - (a.createdAtMillis || 0));
            setReviews(revList.slice(0, 20));
          } catch {
            // Silently fallback
          }
        }
      } catch (err) {
        // Silently handle any optional profile details restriction
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [userId]);

  // If following, observe shared taste profile & shared library
  useEffect(() => {
    if (!isFollowing) {
      setSharedTaste(null);
      setSharedLibrary(null);
      return;
    }

    const unsubTaste = onSnapshot(doc(db, "sharedTasteProfiles", userId), snap => {
      if (snap.exists()) {
        const d = snap.data();
        setSharedTaste({
          summary: d.summary || '',
          topCuisines: d.topCuisines || [],
          topTags: d.topTags || [],
          confidence: d.confidence || 0
        });
      } else {
        setSharedTaste(null);
      }
    }, () => {});

    const unsubLib = onSnapshot(doc(db, "sharedLibraries", userId), snap => {
      if (snap.exists()) {
        const d = snap.data();
        setSharedLibrary({
          showFavorites: d.showFavorites,
          showWantToTry: d.showWantToTry,
          showLists: d.showLists,
          favorites: d.favorites || [],
          wantToTry: d.wantToTry || [],
          lists: d.lists || []
        });
      } else {
        setSharedLibrary(null);
      }
    }, () => {});

    return () => {
      unsubTaste();
      unsubLib();
    };
  }, [userId, isFollowing]);

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-[#627370]">
        Loading profile…
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 text-center text-xs text-[#627370]">
        Profile not found.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-24 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <ProfileAvatar 
          photoUrl={profile.photoUrl} 
          userId={profile.uid} 
          size={78} 
          placeholderSize={42} 
        />

        <div className="flex-1 min-w-0">
          <h2 className="font-serif font-bold text-2xl text-[#233B3B] truncate">
            {profile.name}
          </h2>
          {profile.username && (
            <p className="text-xs text-[#627370]">@{profile.username}</p>
          )}
          {profile.bio && (
            <p className="text-xs text-[#627370] mt-1">{profile.bio}</p>
          )}
        </div>
      </div>

      {/* 3-Stat Card */}
      <div className="bg-[#FFFFFEFA] border border-[#DDE5DE] rounded-2xl shadow-xs overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-[#DDE5DE] text-center">
          <div className="py-3">
            <span className="font-serif font-bold text-lg text-[#233B3B] block">
              {followerCount}
            </span>
            <span className="text-[11px] text-[#627370]">Followers</span>
          </div>

          <div className="py-3">
            <span className="font-serif font-bold text-lg text-[#233B3B] block">
              {followingCount}
            </span>
            <span className="text-[11px] text-[#627370]">Following</span>
          </div>

          <div className="py-3">
            <span className="font-serif font-bold text-lg text-[#233B3B] block">
              {reviews.length}
            </span>
            <span className="text-[11px] text-[#627370]">Reviews</span>
          </div>
        </div>
      </div>

      {/* Follow Toggle Button */}
      {userId !== uid && (
        <button
          onClick={() => toggleFollow(userId)}
          className={`w-full py-2.5 rounded-xl font-bold text-sm transition-colors ${
            isFollowing 
              ? 'bg-[#E2F0EB] text-[#235D5B] hover:bg-red-50 hover:text-red-600' 
              : 'bg-[#926017] hover:bg-[#7c5213] text-white shadow-xs'
          }`}
        >
          {isFollowing ? 'Following · tap to unfollow' : 'Follow'}
        </button>
      )}

      {/* Shared Taste Profile Section */}
      {sharedTaste && (
        <div className="bg-[#ECF2EC] rounded-2xl p-4 border border-[#DDE5DE]/60 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#926017]" />
            <h3 className="font-serif font-bold text-lg text-[#233B3B]">Taste profile</h3>
          </div>
          {sharedTaste.summary && (
            <p className="text-xs text-[#233B3B] leading-relaxed">{sharedTaste.summary}</p>
          )}
          {sharedTaste.topCuisines && sharedTaste.topCuisines.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {sharedTaste.topCuisines.map(c => (
                <BitePillLabel key={c} text={c} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Shared Library Section */}
      {sharedLibrary && (
        <div className="space-y-3 pt-1">
          {sharedLibrary.showFavorites && sharedLibrary.favorites && sharedLibrary.favorites.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#233B3B] mb-1.5">Favorites</p>
              <div className="flex flex-wrap gap-1.5">
                {sharedLibrary.favorites.map(id => {
                  const p = place(id);
                  return (
                    <button
                      key={id}
                      onClick={() => navigateTo(`place:${id}`)}
                      className="text-xs text-[#235D5B] font-semibold hover:underline bg-[#FFFFFEFA] px-2.5 py-1 rounded-lg border border-[#DDE5DE]"
                    >
                      {p?.name || 'Restaurant'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {sharedLibrary.showWantToTry && sharedLibrary.wantToTry && sharedLibrary.wantToTry.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#233B3B] mb-1.5">Want to try</p>
              <div className="flex flex-wrap gap-1.5">
                {sharedLibrary.wantToTry.map(id => {
                  const p = place(id);
                  return (
                    <button
                      key={id}
                      onClick={() => navigateTo(`place:${id}`)}
                      className="text-xs text-[#235D5B] font-semibold hover:underline bg-[#FFFFFEFA] px-2.5 py-1 rounded-lg border border-[#DDE5DE]"
                    >
                      {p?.name || 'Restaurant'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {sharedLibrary.showLists && sharedLibrary.lists && sharedLibrary.lists.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#233B3B] mb-1.5">Lists</p>
              <div className="space-y-2">
                {sharedLibrary.lists.map(list => {
                  const expanded = expandedListId === list.id;
                  return (
                    <div key={list.id} className="bg-[#FFFFFEFA] p-3 rounded-xl border border-[#DDE5DE]">
                      <button 
                        onClick={() => setExpandedListId(expanded ? null : list.id)}
                        className="text-xs font-bold text-[#233B3B] hover:text-[#926017] block"
                      >
                        {list.title}
                      </button>
                      {expanded && (
                        <div className="pt-2 mt-1 border-t border-[#DDE5DE] space-y-1">
                          {list.description && <p className="text-[11px] text-[#627370]">{list.description}</p>}
                          {list.restaurantIds?.map(rid => {
                            const p = place(rid);
                            return (
                              <button
                                key={rid}
                                onClick={() => navigateTo(`place:${rid}`)}
                                className="block text-xs text-[#235D5B] hover:underline"
                              >
                                {p?.name || 'Restaurant'}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Reviews Section */}
      <div className="pt-2 space-y-2.5">
        <BiteSectionHeader title="Recent reviews" />
        {reviews.length === 0 ? (
          <BiteEmptyState message="No reviews yet." />
        ) : (
          <div className="space-y-3">
            {reviews.map(review => {
              const p = place(review.restaurantId);

              return (
                <div 
                  key={review.id}
                  className="bg-[#FFFFFEFA] border border-[#DDE5DE] rounded-2xl p-3.5 shadow-xs space-y-2"
                >
                  <div className="flex items-center gap-3">
                    {p && <RestaurantCover place={p} size={58} />}

                    <div className="flex-1 min-w-0">
                      <h4 
                        onClick={() => p && navigateTo(`place:${p.id}`)}
                        className={`font-serif font-bold text-base text-[#233B3B] truncate ${p ? 'cursor-pointer hover:text-[#926017]' : ''}`}
                      >
                        {p?.name || 'Loading eatery…'}
                      </h4>
                      <p className="text-xs text-[#627370]">{review.visitDate || 'Recent'}</p>
                    </div>

                    {review.rating > 0 && (
                      <div className="flex items-center gap-1 text-[#926017] font-bold text-sm">
                        <Star className="w-4 h-4 fill-[#926017]" />
                        <span>{(review.rating / 2.0).toFixed(1)}</span>
                      </div>
                    )}
                  </div>

                  {review.review && (
                    <p className="text-sm text-[#233B3B] mt-1">{review.review}</p>
                  )}

                  <ReviewImages photoPaths={review.photoPaths || []} />

                  <div className="border-t border-[#DDE5DE]/70 pt-1">
                    <ReviewActions reviewId={review.id} authorId={review.userId} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
