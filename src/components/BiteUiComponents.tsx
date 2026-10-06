import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, Compass, Users, BookOpen, User as UserIcon, ArrowLeft, Plus, Settings, 
  Star, Bookmark, MapPin, ChevronRight, ShieldAlert, LogOut, Heart, MessageSquare, 
  Trash2, Info, Image as ImageIcon, X
} from 'lucide-react';
import { Eatery, ReviewComment, enrichmentDetails } from '../types';
import { useStore } from '../services/storeContext';
import { db, doc, collection, onSnapshot, query, orderBy, limit, getDoc } from '../services/firebase';
import { compressImageFile, getCachedPhoto, setCachedPhoto } from '../services/imageUtils';
import { fetchCoverPhotoGoogle } from '../services/placesService';

interface TopBarProps {
  title: string;
  isRoot?: boolean;
  brandTitle?: boolean;
  onBack?: () => void;
  onAction?: () => void;
}

export const BiteTopBar: React.FC<TopBarProps> = ({
  title,
  isRoot = true,
  brandTitle = false,
  onBack,
  onAction,
}) => {
  const { isAdmin, navigateTo, signOut } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="w-full bg-gradient-to-r from-[#2C6864] to-[#235D5B] text-white shadow-md sticky top-0 z-40">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {!isRoot && onBack && (
            <button 
              onClick={onBack} 
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className={`font-serif font-bold truncate text-white ${brandTitle ? 'text-2xl tracking-wide' : 'text-xl'}`}>
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-1">
          {onAction && (
            <button 
              onClick={onAction}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-[#FFF8E8]"
              title="Add / Search Restaurant"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}

          <div className="relative">
            <button 
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-[#FFF8E8]"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>

            {menuOpen && (
              <div 
                className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-[#DDE5DE] py-2 z-50 text-[#233B3B]"
                onClick={() => setMenuOpen(false)}
              >
                {isAdmin && (
                  <>
                    <button 
                      onClick={() => navigateTo('admin:dashboard')}
                      className="w-full text-left px-4 py-2 hover:bg-[#E2F0EB] text-[#235D5B] font-bold flex items-center gap-2"
                    >
                      <ShieldAlert className="w-4 h-4" /> Admin Dashboard
                    </button>
                    <div className="border-t border-[#DDE5DE] my-1" />
                  </>
                )}
                <button 
                  onClick={() => navigateTo('settings:edit')}
                  className="w-full text-left px-4 py-2 hover:bg-[#FAF8F1] text-[#233B3B] font-semibold text-sm"
                >
                  Edit profile
                </button>
                <button 
                  onClick={() => navigateTo('settings:preferences')}
                  className="w-full text-left px-4 py-2 hover:bg-[#FAF8F1] text-[#233B3B] font-semibold text-sm"
                >
                  Preferences
                </button>
                <div className="border-t border-[#DDE5DE] my-1" />
                <button 
                  onClick={async () => {
                    await signOut();
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 font-semibold text-sm flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export const BiteBottomBar: React.FC<{ selectedTab: number; onSelect: (idx: number) => void }> = ({
  selectedTab,
  onSelect
}) => {
  const tabs = [
    { label: 'Feed', icon: Home },
    { label: 'Explore', icon: Compass },
    { label: 'People', icon: Users },
    { label: 'Diary', icon: BookOpen },
    { label: 'Tasteboxd', icon: UserIcon }
  ];

  return (
    <nav className="w-full bg-gradient-to-r from-[#2C6864] to-[#235D5B] border-t border-[#235D5B]/30 fixed bottom-0 left-0 right-0 z-40">
      <div className="max-w-3xl mx-auto px-2 py-1.5 flex justify-around items-center">
        {tabs.map((tab, idx) => {
          const Icon = tab.icon;
          const active = selectedTab === idx;
          return (
            <button
              key={tab.label}
              onClick={() => onSelect(idx)}
              className="flex flex-col items-center justify-center flex-1 py-1 transition-all"
            >
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  active ? 'bg-[#926017] text-white shadow-md' : 'text-[#C1D9D1] hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-xs mt-0.5 ${active ? 'font-bold text-white' : 'font-medium text-[#C1D9D1]'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export const BiteHeading: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="mb-4">
    <h2 className="font-serif text-2xl font-bold text-[#233B3B]">{title}</h2>
    {subtitle && <p className="text-sm text-[#627370] mt-0.5">{subtitle}</p>}
  </div>
);

export const BiteSectionHeader: React.FC<{ title: string; action?: string; onAction?: () => void }> = ({
  title,
  action,
  onAction
}) => (
  <div className="flex justify-between items-center my-3">
    <h3 className="font-serif text-lg font-bold text-[#233B3B]">{title}</h3>
    {action && onAction && (
      <button 
        onClick={onAction}
        className="text-[#926017] font-bold text-sm flex items-center hover:underline"
      >
        {action} <ChevronRight className="w-4 h-4 ml-0.5" />
      </button>
    )}
  </div>
);

export const BitePillLabel: React.FC<{ text: string; selected?: boolean; onClick?: () => void }> = ({
  text,
  selected = false,
  onClick
}) => (
  <button
    onClick={onClick}
    disabled={!onClick}
    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
      selected 
        ? 'bg-[#926017] text-white shadow-sm' 
        : 'bg-[#F3EAD5] text-[#233B3B] hover:bg-[#E2F0EB]'
    } ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
  >
    {text}
  </button>
);

export const BitePrimaryButton: React.FC<{
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}> = ({ label, onClick, disabled = false, className = '' }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`bg-[#926017] hover:bg-[#7c5213] text-white font-bold py-2.5 px-5 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
  >
    {label}
  </button>
);

export const RestaurantCover: React.FC<{
  place: Eatery;
  size?: number; // 48, 56, 70, 82, etc.
  className?: string;
}> = ({ place, size = 64, className = '' }) => {
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(place.coverImage || null);
  const [failed, setFailed] = useState(false);
  const initial = (place.name || '🍴').charAt(0).toUpperCase();

  // Dynamically resolve cover photo for Google places matching Android Store.coverPhoto
  useEffect(() => {
    let active = true;
    setFailed(false);

    if (place.coverImage) {
      setPhotoUrl(place.coverImage);
      return;
    }

    // Attempt to fetch cover photo from Google Places
    fetchCoverPhotoGoogle(place.id, place.name).then(resolved => {
      if (active && resolved) {
        setPhotoUrl(resolved);
      }
    }).catch(() => {});

    return () => { active = false; };
  }, [place.id, place.coverImage, place.name]);

  const handleImageError = () => {
    // If current photoUrl failed and was a places.googleapis.com URL, attempt to resolve direct CDN URL
    if (photoUrl && !photoUrl.includes('googleusercontent.com')) {
      fetchCoverPhotoGoogle(place.id, place.name).then(resolved => {
        if (resolved && resolved !== photoUrl) {
          setPhotoUrl(resolved);
          return;
        }
        setFailed(true);
      }).catch(() => setFailed(true));
    } else {
      setFailed(true);
    }
  };

  return (
    <div className={`relative flex-shrink-0 ${className}`} style={{ width: size, height: size }}>
      <div 
        className="w-full h-full rounded-xl overflow-hidden bg-[#E2F0EB] flex items-center justify-center relative shadow-xs border border-[#DDE5DE]/50"
      >
        {/* Base layer: clean initial letter badge */}
        <span 
          className="font-serif font-bold text-[#235D5B] select-none" 
          style={{ fontSize: Math.max(16, Math.round(size * 0.42)) }}
        >
          {initial}
        </span>

        {/* Dynamic Image Overlay */}
        {photoUrl && !failed && (
          <img 
            src={photoUrl} 
            alt="" 
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={handleImageError}
            className="w-full h-full object-cover absolute inset-0 rounded-xl" 
          />
        )}

        {photoUrl && !failed && (
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCreditsOpen(true);
            }}
            className="absolute bottom-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded p-0.5 z-10 transition-colors"
            title="Photo source and credits"
          >
            <Info className="w-3 h-3" />
          </button>
        )}
      </div>

      {creditsOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setCreditsOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl max-w-sm w-full p-4 shadow-2xl border border-[#DDE5DE]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-serif font-bold text-[#233B3B] text-base">Photo · Google Maps</h4>
              <button onClick={() => setCreditsOpen(false)} className="text-[#627370] hover:text-[#233B3B]">
                <X className="w-5 h-5" />
              </button>
            </div>
            {photoUrl && !failed && (
              <img src={photoUrl} alt={place.name} referrerPolicy="no-referrer" className="w-full h-44 object-cover rounded-xl mb-3" />
            )}
            <p className="text-xs text-[#627370]">Google Maps photo for {place.name}</p>
            <div className="mt-4 flex justify-end">
              <button 
                onClick={() => setCreditsOpen(false)}
                className="text-[#926017] font-bold text-sm px-3 py-1 hover:underline"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const ProfileAvatar: React.FC<{
  photoUrl?: string;
  userId: string;
  size?: number;
  placeholderSize?: number;
  className?: string;
}> = ({ photoUrl, userId, size = 44, placeholderSize = 22, className = '' }) => {
  const [resolvedPhoto, setResolvedPhoto] = useState<string>('');

  useEffect(() => {
    if (!photoUrl) {
      setResolvedPhoto('');
      return;
    }
    if (photoUrl.startsWith('firestore://profileImages/')) {
      const cached = getCachedPhoto(`profileImages/${userId}`);
      if (cached) {
        setResolvedPhoto(`data:image/jpeg;base64,${cached}`);
        return;
      }
      getDoc(doc(db, "profileImages", userId)).then(snap => {
        if (snap.exists() && snap.data()?.imageBase64) {
          const b64 = snap.data().imageBase64;
          setCachedPhoto(`profileImages/${userId}`, b64);
          setResolvedPhoto(`data:image/jpeg;base64,${b64}`);
        }
      }).catch(() => {});
    } else {
      setResolvedPhoto(photoUrl);
    }
  }, [photoUrl, userId]);

  return (
    <div 
      className={`rounded-full overflow-hidden bg-[#ECF2EC] flex items-center justify-center flex-shrink-0 border border-white shadow-xs ${className}`}
      style={{ width: size, height: size }}
    >
      {resolvedPhoto ? (
        <img 
          src={resolvedPhoto} 
          alt="User Avatar" 
          className="w-full h-full object-cover" 
          referrerPolicy="no-referrer"
          onError={() => setResolvedPhoto('')}
        />
      ) : (
        <span 
          className="font-bold text-[#233B3B] font-serif uppercase"
          style={{ fontSize: placeholderSize }}
        >
          {userId ? userId.charAt(0).toUpperCase() : 'U'}
        </span>
      )}
    </div>
  );
};

export const ReviewImages: React.FC<{ photoPaths: string[] }> = ({ photoPaths }) => {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!photoPaths || photoPaths.length === 0) {
      setImages([]);
      return;
    }

    setLoading(true);
    const validPaths = photoPaths.filter(p => !!p).slice(0, 5);

    Promise.all(validPaths.map(async path => {
      if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
        return path;
      }
      const cached = getCachedPhoto(path);
      if (cached) return `data:image/jpeg;base64,${cached}`;

      try {
        const snap = await getDoc(doc(db, path));
        if (snap.exists() && snap.data()?.imageBase64) {
          const b64 = snap.data().imageBase64;
          setCachedPhoto(path, b64);
          return `data:image/jpeg;base64,${b64}`;
        }
      } catch (err) {
        console.error('Failed to load review photo', path, err);
      }
      return null;
    })).then(results => {
      setImages(results.filter(Boolean) as string[]);
      setLoading(false);
    });
  }, [photoPaths]);

  if (!photoPaths || photoPaths.length === 0) return null;

  return (
    <div className="mt-2.5">
      {loading && images.length === 0 && (
        <p className="text-xs text-[#627370] italic">Loading review photos…</p>
      )}
      {images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {images.map((src, i) => (
            <img 
              key={i} 
              src={src} 
              alt="Review attachment" 
              className="w-24 h-24 object-cover rounded-xl border border-[#DDE5DE] flex-shrink-0" 
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const SelectedReviewImages: React.FC<{ photos: string[] }> = ({ photos }) => {
  if (!photos || photos.length === 0) return null;

  return (
    <div className="my-2">
      <p className="text-xs text-[#627370] mb-1.5">{photos.length} photo{photos.length === 1 ? '' : 's'} selected</p>
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {photos.map((src, i) => (
          <img 
            key={i} 
            src={src.startsWith('data:') ? src : `data:image/jpeg;base64,${src}`} 
            alt="Selected attachment" 
            className="w-16 h-16 object-cover rounded-lg border border-[#DDE5DE] flex-shrink-0" 
          />
        ))}
      </div>
    </div>
  );
};

export const ReviewActions: React.FC<{ reviewId: string; authorId?: string }> = ({ reviewId, authorId }) => {
  const { uid, likeReview, addComment, deleteComment, profiles, getProfileName, photoUrl } = useStore();
  const [liked, setLiked] = useState<boolean>(false);
  const [likeCount, setLikeCount] = useState<number>(0);
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [expanded, setExpanded] = useState<boolean>(false);
  const [body, setBody] = useState<string>('');
  const [selectedPhotoB64, setSelectedPhotoB64] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!reviewId) return;

    // Observe likes count
    const unsubLikes = onSnapshot(collection(db, "reviewLikes", reviewId, "users"), (snap) => {
      setLikeCount(snap.size);
      if (uid) {
        setLiked(snap.docs.some(d => d.id === uid));
      }
    }, () => {});

    // Observe comments
    const q = query(collection(db, "reviewComments", reviewId, "entries"), orderBy("createdAtMillis", "desc"), limit(30));
    const unsubComments = onSnapshot(q, (snap) => {
      const loaded: ReviewComment[] = snap.docs.map(d => ({
        id: d.id,
        userId: d.data().userId || '',
        text: d.data().text || '',
        photoPath: d.data().photoPath || '',
        createdAtMillis: d.data().createdAtMillis || 0,
        userDisplayName: d.data().userDisplayName || 'Food explorer'
      })).reverse();
      setComments(loaded);
    }, () => {});

    return () => {
      unsubLikes();
      unsubComments();
    };
  }, [reviewId, uid]);

  const handleToggleLike = async () => {
    if (busy || !uid) return;
    setBusy(true);
    setError('');
    try {
      await likeReview(reviewId, !liked);
    } catch (e: any) {
      setError(e.message || 'Could not update like.');
    } finally {
      setBusy(false);
    }
  };

  const handlePostComment = async () => {
    if (busy || (!body.trim() && !selectedPhotoB64)) return;
    setBusy(true);
    setError('');
    try {
      await addComment(reviewId, body.trim(), selectedPhotoB64 || undefined);
      setBody('');
      setSelectedPhotoB64('');
    } catch (e: any) {
      setError(e.message || 'Could not post comment.');
    } finally {
      setBusy(false);
    }
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await compressImageFile(file, 640);
      setSelectedPhotoB64(b64);
    } catch (err) {
      setError('Could not process photo.');
    }
  };

  return (
    <div className="w-full mt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleToggleLike} 
            disabled={busy}
            className="flex items-center gap-1.5 text-xs text-[#627370] hover:text-[#926017] transition-colors"
          >
            <Heart className={`w-4 h-4 ${liked ? 'fill-[#926017] text-[#926017]' : ''}`} />
            <span className="font-semibold">{likeCount}</span>
          </button>

          <button 
            onClick={() => setExpanded(!expanded)} 
            className="flex items-center gap-1.5 text-xs text-[#627370] hover:text-[#926017] transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="font-semibold">{comments.length}</span>
          </button>
        </div>

        {expanded && (
          <button 
            onClick={() => setExpanded(false)} 
            className="text-xs text-[#926017] font-bold hover:underline"
          >
            Hide
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}

      {expanded && (
        <div className="mt-3 pt-3 border-t border-[#DDE5DE]/60 space-y-3">
          {comments.length === 0 ? (
            <p className="text-xs text-[#627370]">No comments yet.</p>
          ) : (
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {comments.map((item) => {
                const isMyComment = item.userId === uid;
                const canDelete = isMyComment || authorId === uid;
                const authorName = isMyComment ? 'You' : getProfileName(item.userId);
                const authorPhoto = isMyComment ? photoUrl : profiles[item.userId]?.photoUrl;

                return (
                  <div key={item.id} className="flex items-start gap-2 text-xs">
                    <ProfileAvatar photoUrl={authorPhoto} userId={item.userId} size={28} placeholderSize={12} />
                    <div className="flex-1 bg-[#FAF8F1] p-2 rounded-xl border border-[#DDE5DE]/60">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <span className="font-bold text-[#233B3B]">
                          {authorName}
                        </span>
                        {canDelete && (
                          <button 
                            onClick={async () => {
                              try {
                                await deleteComment(reviewId, item.id, item.photoPath, item.userId);
                              } catch (e: any) {
                                setError(e.message || 'Could not delete comment.');
                              }
                            }}
                            className="text-[#627370] hover:text-red-600 ml-2"
                            title="Delete comment"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      {item.text && <p className="text-[#233B3B]">{item.text}</p>}
                      {item.photoPath && <ReviewImages photoPaths={[item.photoPath]} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-2 pt-1">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 500))}
              placeholder="Write a comment…"
              rows={2}
              className="w-full text-xs p-2.5 rounded-xl border border-[#DDE5DE] focus:outline-none focus:ring-1 focus:ring-[#235D5B] bg-white resize-none"
            />

            {selectedPhotoB64 && (
              <div className="flex items-center gap-2">
                <img 
                  src={`data:image/jpeg;base64,${selectedPhotoB64}`} 
                  alt="Comment attachment" 
                  className="w-12 h-12 object-cover rounded-lg border border-[#DDE5DE]" 
                />
                <button 
                  onClick={() => setSelectedPhotoB64('')}
                  className="text-xs text-[#627370] hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                onChange={handlePhotoSelect} 
                className="hidden" 
              />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                className="text-xs text-[#926017] font-semibold flex items-center gap-1 hover:underline"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                {selectedPhotoB64 ? 'Change photo' : 'Add photo'}
              </button>

              <button
                onClick={handlePostComment}
                disabled={busy || (!body.trim() && !selectedPhotoB64)}
                className="bg-[#926017] hover:bg-[#7c5213] text-white font-bold text-xs px-3.5 py-1.5 rounded-full transition-colors disabled:opacity-50"
              >
                {busy ? 'Posting…' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const PlaceDetailsCard: React.FC<{ place: Eatery }> = ({ place }) => {
  const details = enrichmentDetails(place);
  if (details.length === 0) return null;

  return (
    <div className="w-full bg-[#FFFFFEFA] border border-[#DDE5DE] rounded-2xl p-3 shadow-xs my-3">
      <p className="text-[11px] text-[#627370] mb-2 font-medium">At a glance · swipe for details</p>
      <div className="flex gap-5 overflow-x-auto no-scrollbar py-0.5">
        {details.map(([label, value], i) => (
          <div key={i} className="flex-shrink-0 min-w-[70px]">
            <p className="text-[10px] text-[#627370] uppercase tracking-wider">{label}</p>
            <p className="text-xs font-semibold text-[#233B3B] mt-0.5 whitespace-nowrap">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export const BiteRatingLine: React.FC<{ place: Eatery; compact?: boolean; overrideScore?: number }> = ({ 
  place, 
  compact = false,
  overrideScore
}) => {
  const { ratingStats, tasteMatch } = useStore();
  const stats = ratingStats(place.id);
  const match = overrideScore !== undefined ? overrideScore : tasteMatch(place);

  return (
    <div className="flex items-center justify-between text-xs w-full">
      <div className="flex items-center gap-1">
        <Star className={`fill-[#926017] text-[#926017] ${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
        <span className={`font-bold ${stats.count > 0 ? 'text-[#233B3B]' : 'text-[#627370]'}`}>
          {stats.count > 0 ? stats.average.toFixed(1) : 'New'}
        </span>
        <span className="text-[#627370]">
          ({stats.count} {stats.count === 1 ? 'rating' : 'ratings'})
        </span>
      </div>

      <span className="font-bold text-[#926017]">
        {match}% match
      </span>
    </div>
  );
};

export const BitePlaceCard: React.FC<{
  place: Eatery;
  onOpen: () => void;
  status?: string;
  showBookmark?: boolean;
  matchScore?: number;
  trailingDistance?: boolean;
}> = ({ place, onOpen, status, showBookmark = true, matchScore, trailingDistance = true }) => {
  const { watchlist, toggleWatchlist } = useStore();
  const isSaved = watchlist.includes(place.id);

  return (
    <div 
      onClick={onOpen}
      className="w-full bg-[#FFFFFEFA] border border-[#DDE5DE] rounded-2xl p-3 shadow-xs hover:shadow-md transition-all cursor-pointer mb-3 flex gap-3 items-center group"
    >
      <RestaurantCover place={place} size={64} />

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-1">
          <h4 className="font-serif font-bold text-base text-[#233B3B] truncate group-hover:text-[#926017] transition-colors">
            {place.name}
          </h4>
          {showBookmark && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleWatchlist(place.id);
              }}
              className="text-[#627370] hover:text-[#926017] p-1"
              title={isSaved ? "Remove from want to try" : "Save to want to try"}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-[#926017] text-[#926017]' : ''}`} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 mt-1 overflow-x-auto no-scrollbar">
          <BitePillLabel text={place.cuisine || 'Other'} />
          {status && <BitePillLabel text={status} />}
          {trailingDistance && place.distanceKm && (
            <span className="text-xs text-[#627370] flex items-center gap-0.5 ml-auto">
              <MapPin className="w-3 h-3" /> {place.distanceKm} km
            </span>
          )}
        </div>

        <div className="mt-2">
          <BiteRatingLine place={place} compact overrideScore={matchScore} />
        </div>
      </div>
    </div>
  );
};

export const BiteEmptyState: React.FC<{ message: string; actionText?: string; onAction?: () => void }> = ({
  message,
  actionText,
  onAction
}) => (
  <div className="py-10 flex flex-col items-center justify-center text-center">
    <div className="w-14 h-14 rounded-full bg-[#ECF2EC] flex items-center justify-center mb-3">
      <Star className="w-6 h-6 text-[#627370]" />
    </div>
    <p className="text-[#627370] text-sm max-w-xs">{message}</p>
    {actionText && onAction && (
      <button 
        onClick={onAction}
        className="mt-3 text-[#926017] font-bold text-sm hover:underline"
      >
        {actionText}
      </button>
    )}
  </div>
);

export const AddEateryDialog: React.FC<{
  onClose: () => void;
  onAdded: (eateryId: string) => void;
}> = ({ onClose, onAdded }) => {
  const { createCustomEatery } = useStore();
  const [name, setName] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState('Restaurant');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const saved = await createCustomEatery({
        name: name.trim(),
        cuisine: cuisine.trim() || 'Other',
        address: address.trim(),
        category
      });
      onClose();
      onAdded(saved.id);
    } catch (err) {
      console.error(err);
      setSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-[#DDE5DE]"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-serif font-bold text-xl text-[#233B3B] mb-3">Add an eatery</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#627370] mb-1">Name *</label>
            <input 
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Restaurant name"
              className="w-full text-sm p-2.5 rounded-xl border border-[#DDE5DE] focus:ring-1 focus:ring-[#235D5B] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#627370] mb-1">Cuisine</label>
            <input 
              type="text"
              value={cuisine}
              onChange={e => setCuisine(e.target.value)}
              placeholder="e.g. South Indian, Cafe"
              className="w-full text-sm p-2.5 rounded-xl border border-[#DDE5DE] focus:ring-1 focus:ring-[#235D5B] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#627370] mb-1">Area or address</label>
            <input 
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="e.g. Indiranagar, Bengaluru"
              className="w-full text-sm p-2.5 rounded-xl border border-[#DDE5DE] focus:ring-1 focus:ring-[#235D5B] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#627370] mb-1.5">Category</label>
            <div className="flex gap-2">
              {['Restaurant', 'Cafe', 'Bar'].map(cat => (
                <BitePillLabel 
                  key={cat} 
                  text={cat} 
                  selected={category === cat} 
                  onClick={() => setCategory(cat)} 
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-sm text-[#627370] hover:text-[#233B3B]"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={!name.trim() || saving}
              className="bg-[#926017] hover:bg-[#7c5213] text-white font-bold text-sm px-5 py-2 rounded-full transition-colors disabled:opacity-50"
            >
              {saving ? 'Adding…' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
