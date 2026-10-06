import React, { useState, useEffect } from 'react';
import { 
  Heart, Bookmark, Map, Trash2 
} from 'lucide-react';
import { useStore } from '../services/storeContext';
import { 
  RestaurantCover, ProfileAvatar, BiteRatingLine, BitePrimaryButton, 
  PlaceDetailsCard, BiteSectionHeader, BiteEmptyState, ReviewImages, 
  ReviewActions 
} from '../components/BiteUiComponents';
import { ReviewDialog } from '../components/ReviewDialog';
import { SocialReview, ratingText, ratingNumericLabel } from '../types';
import { db, collection, query, where, orderBy, onSnapshot } from '../services/firebase';
import { fetchPlacePhotosGoogle, PlacePhotoInfo } from '../services/placesService';

export const DetailPage: React.FC<{ placeId: string }> = ({ placeId }) => {
  const { 
    place, ratingStats, watchlist, favorites, lists, uid, photoUrl,
    toggleWatchlist, toggleFavorite, toggleListMember, deleteReview, 
    navigateTo, profiles, getProfileName 
  } = useStore();
  
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [communityReviews, setCommunityReviews] = useState<SocialReview[]>([]);
  const [reviewStatus, setReviewStatus] = useState<string>('Loading community reviews…');

  const eatery = place(placeId);

  // Observe restaurant community reviews in real time
  useEffect(() => {
    if (!placeId) return;
    const q = query(
      collection(db, "reviews"),
      where("restaurantId", "==", placeId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: SocialReview[] = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId || '',
          restaurantId: data.restaurantId || placeId,
          rating: data.rating || 0,
          review: data.review || '',
          visitDate: data.visitDate || '',
          createdAtMillis: data.createdAtMillis || data.createdAt?.toMillis?.() || Date.now(),
          photoPaths: data.photoPaths || [],
          userDisplayName: data.userDisplayName || 'Food explorer',
          userPhotoUrl: data.userPhotoUrl || ''
        };
      });
      list.sort((a, b) => (b.createdAtMillis || 0) - (a.createdAtMillis || 0));
      setCommunityReviews(list);
      setReviewStatus('');
    }, (err) => {
      console.warn("Failed to load community reviews:", err);
      setReviewStatus('');
    });

    return () => unsub();
  }, [placeId]);

  if (!eatery) {
    return (
      <div className="p-8 text-center text-[#627370]">
        <p>Restaurant details not loaded or place not found.</p>
        <button onClick={() => navigateTo('tab:1')} className="mt-3 text-[#926017] font-bold text-sm hover:underline">
          Return to Explore
        </button>
      </div>
    );
  }

  const stats = ratingStats(eatery.id);
  const isSaved = watchlist.includes(eatery.id);
  const isFav = favorites.includes(eatery.id);

  return (
    <div className="p-4 space-y-4 pb-24 max-w-3xl mx-auto">
      {/* Top Details Card */}
      <div className="bg-[#FFFFFEFA] border border-[#DDE5DE] rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center gap-3.5">
          <RestaurantCover place={eatery} size={82} />

          <div className="flex-1 min-w-0">
            <h2 className="font-serif font-bold text-2xl text-[#233B3B] truncate">
              {eatery.name}
            </h2>
            <p className="text-xs text-[#627370] mt-0.5">
              {eatery.cuisine} • {eatery.category || 'Restaurant'}
            </p>
            <div className="mt-1.5">
              <BiteRatingLine place={eatery} />
            </div>
          </div>
        </div>

        {eatery.address && (
          <p className="text-xs text-[#627370] pt-1">
            {eatery.address}
          </p>
        )}

        {/* Action Buttons Row */}
        <div className="flex items-center gap-2 pt-1">
          <BitePrimaryButton 
            label="+ Log a visit"
            onClick={() => setShowReviewModal(true)}
            className="flex-1"
          />

          <button
            onClick={() => toggleFavorite(eatery.id)}
            className="w-12 h-12 rounded-xl bg-[#F3EAD5] hover:bg-[#E2F0EB] flex items-center justify-center transition-colors flex-shrink-0"
            title={isFav ? "Favorited" : "Favorite"}
          >
            <Heart className={`w-5 h-5 ${isFav ? 'fill-[#926017] text-[#926017]' : 'text-[#926017]'}`} />
          </button>

          <button
            onClick={() => toggleWatchlist(eatery.id)}
            className="w-12 h-12 rounded-xl bg-[#F3EAD5] hover:bg-[#E2F0EB] flex items-center justify-center transition-colors flex-shrink-0"
            title={isSaved ? "Saved to want to try" : "Want to try"}
          >
            <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-[#233B3B] text-[#233B3B]' : 'text-[#233B3B]'}`} />
          </button>
        </div>

        {stats.count === 0 && (
          <p className="text-xs text-[#627370]">
            Be the first to add a Tasteboxd rating.
          </p>
        )}
      </div>

      {/* Place Details At A Glance Card */}
      <PlaceDetailsCard place={eatery} />

      {/* Google Place Photo Gallery */}
      {eatery.id.startsWith('google_') && (
        <GooglePlaceGallery placeId={eatery.id} placeName={eatery.name} />
      )}

      {/* Open in Google Maps */}
      {eatery.latitude != null && eatery.longitude != null && (
        <a 
          href={`https://www.google.com/maps/search/?api=1&query=${eatery.latitude},${eatery.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#926017] hover:underline py-1"
        >
          <Map className="w-4 h-4" />
          <span>Open in Google Maps</span>
        </a>
      )}

      {/* Add to a list */}
      <div className="space-y-2 pt-1">
        <BiteSectionHeader title="Add to a list" />
        {lists.length === 0 ? (
          <p className="text-xs text-[#627370]">Create a list in Profile to organize this place.</p>
        ) : (
          <div className="space-y-1.5 bg-[#FFFFFEFA] border border-[#DDE5DE] rounded-2xl p-3">
            {lists.map(list => {
              const inList = list.eateryIds.includes(eatery.id);
              return (
                <label key={list.id} className="flex items-center gap-2.5 text-xs text-[#233B3B] cursor-pointer py-1">
                  <input 
                    type="checkbox"
                    checked={inList}
                    onChange={() => toggleListMember(list.id, eatery.id)}
                    className="w-4 h-4 rounded text-[#926017] accent-[#926017]"
                  />
                  <span className="font-semibold">{list.title}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Community Reviews Section */}
      <div className="space-y-2.5 pt-2">
        <BiteSectionHeader title={`Community reviews (${communityReviews.filter(r => r.rating > 0).length})`} />
        <p className="text-xs text-[#627370] -mt-1">
          The restaurant rating above is calculated only from ratings submitted inside Tasteboxd.
        </p>

        {reviewStatus && <p className="text-xs text-[#627370]">{reviewStatus}</p>}

        {!reviewStatus && communityReviews.length === 0 ? (
          <BiteEmptyState message="No reviews yet. Be the first to log this place." />
        ) : (
          <div className="space-y-3">
            {communityReviews.map(review => {
              const isMine = review.userId === uid;
              const profile = profiles[review.userId];
              const authorName = isMine ? 'You' : getProfileName(review.userId);
              const authorPhoto = isMine ? photoUrl : (profile?.photoUrl || review.userPhotoUrl);

              return (
                <div 
                  key={review.id}
                  className="bg-[#FFFFFEFA] border border-[#DDE5DE] rounded-2xl p-3.5 shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <ProfileAvatar photoUrl={authorPhoto} userId={review.userId} size={34} placeholderSize={16} />
                      <button 
                        onClick={() => !isMine && navigateTo(`profile:${review.userId}`)}
                        className={`font-bold text-sm text-[#233B3B] ${!isMine ? 'hover:underline' : ''}`}
                      >
                        {authorName}
                      </button>
                    </div>

                    {isMine && (
                      <button 
                        onClick={() => setConfirmDeleteId(review.id)}
                        className="text-[#627370] hover:text-red-600 p-1"
                        title="Delete review"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[#627370]">{review.visitDate || 'Recent'}</span>
                    {review.rating > 0 && (
                      <span className="font-bold text-[#926017]">
                        • {ratingText(review.rating)} {ratingNumericLabel(review.rating)}
                      </span>
                    )}
                  </div>

                  {review.review && (
                    <p className="text-sm text-[#233B3B]">
                      {review.review}
                    </p>
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

      {/* Review Dialog */}
      {showReviewModal && (
        <ReviewDialog 
          place={eatery} 
          onClose={() => setShowReviewModal(false)} 
        />
      )}

      {/* Delete Confirmation Dialog */}
      {confirmDeleteId && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setConfirmDeleteId(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-[#DDE5DE] space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-serif font-bold text-lg text-[#233B3B]">Delete this visit?</h3>
            <p className="text-xs text-[#627370]">
              This removes the review, attached photos, likes, and comments.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#DDE5DE]">
              <button 
                onClick={() => setConfirmDeleteId(null)}
                className="px-3 py-1.5 text-xs text-[#627370] hover:text-[#233B3B]"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  await deleteReview(confirmDeleteId);
                  setConfirmDeleteId(null);
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

const GooglePlaceGallery: React.FC<{ placeId: string; placeName: string }> = ({ placeId, placeName }) => {
  const [photos, setPhotos] = useState<PlacePhotoInfo[]>([]);
  const [status, setStatus] = useState<string>('Loading Google Maps photos…');

  useEffect(() => {
    let active = true;
    setStatus('Loading Google Maps photos…');
    fetchPlacePhotosGoogle(placeId, 10).then(res => {
      if (!active) return;
      setPhotos(res);
      setStatus(res.length === 0 ? 'No Google Maps photos available for this place.' : '');
    }).catch(() => {
      if (!active) return;
      setStatus('Google Maps photos are unavailable.');
    });
    return () => { active = false; };
  }, [placeId]);

  return (
    <div className="space-y-1.5 pt-2">
      <BiteSectionHeader title="Photos" />
      <p className="text-[11px] text-[#627370] -mt-1 mb-1">Photo source: Google Maps</p>
      {status && <p className="text-xs text-[#627370]">{status}</p>}

      {photos.length > 0 && (
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-2">
          {photos.map((photo, idx) => (
            <div key={idx} className="shrink-0 w-52 space-y-1">
              <img 
                src={photo.uri} 
                alt={`Photo of ${placeName}`} 
                referrerPolicy="no-referrer"
                className="w-52 h-36 object-cover rounded-xl border border-[#DDE5DE]/60 shadow-xs"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <p className="text-[10px] text-[#627370] truncate">Photo: {photo.authorName || 'Google Maps'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
