import React, { useMemo } from 'react';
import { Star } from 'lucide-react';
import { useStore } from '../services/storeContext';
import { 
  BiteHeading, BiteSectionHeader, BitePlaceCard, BitePillLabel, 
  RestaurantCover, ReviewImages, ReviewActions, BiteEmptyState 
} from '../components/BiteUiComponents';
import { SocialReview, cuisineDetails, friendPopularity } from '../types';

export const FeedPage: React.FC = () => {
  const { 
    uid, visits, socialFeed, eateries, place, navigateTo, 
    tasteProfile, favorites, tasteMatch, getProfileName 
  } = useStore();

  // Combine user visits and social feed activity into a unified stream (max 50)
  const activity: SocialReview[] = useMemo(() => {
    const userReviews: SocialReview[] = visits.map(v => ({
      id: v.id,
      userId: uid,
      restaurantId: v.eateryId,
      rating: v.rating,
      review: v.review,
      visitDate: v.date,
      createdAtMillis: v.createdAt,
      photoPaths: v.photoPaths || []
    }));

    const all = [...userReviews, ...socialFeed];
    const seen = new Set<string>();
    const unique: SocialReview[] = [];
    for (const item of all) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        unique.push(item);
      }
    }

    return unique.sort((a, b) => (b.createdAtMillis || 0) - (a.createdAtMillis || 0)).slice(0, 50);
  }, [visits, socialFeed, uid]);

  const details = useMemo(() => {
    return cuisineDetails(tasteProfile, visits, eateries, favorites);
  }, [tasteProfile, visits, eateries, favorites]);

  const friendsPopular = useMemo(() => {
    return friendPopularity(socialFeed, place);
  }, [socialFeed, place]);

  return (
    <div className="p-4 space-y-4 pb-24 max-w-3xl mx-auto">
      <BiteHeading 
        title="Your food feed" 
        subtitle="Reviews from you and people you follow." 
      />

      {/* Your Taste Profile Teaser Card */}
      <div className="bg-[#ECF2EC] rounded-2xl p-4 border border-[#DDE5DE]/60 space-y-1.5 shadow-xs">
        <h3 className="font-serif font-bold text-lg text-[#233B3B]">Your Taste Profile</h3>
        <p className="text-sm text-[#233B3B]">
          {details.length > 0 
            ? `${details[0].label} · ${details[0].strength}` 
            : "Your next visit helps us get to know you."}
        </p>
        {details.length > 0 && (
          <p className="text-xs text-[#627370]">{details[0].evidence}</p>
        )}
        <button 
          onClick={() => navigateTo('tab:1')}
          className="text-sm font-bold text-[#926017] hover:underline pt-1 block"
        >
          Explore your matches
        </button>
      </div>

      {/* Recent Activity Header */}
      <BiteSectionHeader 
        title="Recent Activity" 
        action="Your diary" 
        onAction={() => navigateTo('tab:3')} 
      />

      {activity.length === 0 ? (
        <BiteEmptyState 
          message="Follow people to see their reviews, or log your first visit." 
          actionText="Find people"
          onAction={() => navigateTo('tab:2')}
        />
      ) : (
        <div className="space-y-3">
          {activity.map(review => {
            const eatery = place(review.restaurantId);
            const isMe = review.userId === uid;
            const authorName = isMe ? 'You' : getProfileName(review.userId);
            const matchScore = eatery ? tasteMatch(eatery) : 0;

            return (
              <div 
                key={review.id} 
                className="bg-[#FFFFFEFA] border border-[#DDE5DE] rounded-2xl p-3 shadow-xs hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  {eatery ? (
                    <RestaurantCover place={eatery} size={48} />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-[#E2F0EB] flex items-center justify-center text-xl flex-shrink-0">
                      🍴
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h4 
                      onClick={() => eatery && navigateTo(`place:${eatery.id}`)}
                      className={`font-serif font-bold text-base text-[#233B3B] truncate ${eatery ? 'cursor-pointer hover:text-[#926017]' : ''}`}
                    >
                      {eatery?.name || 'Loading eatery…'}
                    </h4>

                    <p 
                      onClick={() => !isMe && navigateTo(`profile:${review.userId}`)}
                      className={`text-[11px] text-[#627370] ${!isMe ? 'cursor-pointer hover:underline' : ''}`}
                    >
                      {authorName} · {review.visitDate || 'Recent'}
                    </p>

                    {eatery && (
                      <div className="flex gap-1.5 mt-1 overflow-x-auto no-scrollbar">
                        <BitePillLabel text={eatery.cuisine || 'Other'} />
                        <BitePillLabel text={`${matchScore}% match`} />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-[#926017] flex-shrink-0">
                    <Star className="w-4 h-4 fill-[#926017]" />
                    <span className="font-bold text-sm">
                      {review.rating > 0 ? (review.rating / 2.0).toFixed(1) : '—'}
                    </span>
                  </div>
                </div>

                {review.review && (
                  <p className="text-sm text-[#627370] mt-2 line-clamp-2">
                    {review.review}
                  </p>
                )}

                <ReviewImages photoPaths={review.photoPaths || []} />

                <div className="border-t border-[#DDE5DE] mt-2.5 pt-1">
                  <ReviewActions reviewId={review.id} authorId={review.userId} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* You're all caught up Footer */}
      <BiteEmptyState 
        message="You're all caught up — log your next visit!" 
        actionText="Explore" 
        onAction={() => navigateTo('tab:1')} 
      />

      {/* Popular among friends */}
      {friendsPopular.length > 0 && (
        <div className="pt-2">
          <BiteSectionHeader title="Popular among friends" />
          <div className="space-y-3">
            {friendsPopular.map(({ place: friendPlace }) => (
              <BitePlaceCard 
                key={friendPlace.id} 
                place={friendPlace} 
                onOpen={() => navigateTo(`place:${friendPlace.id}`)} 
                trailingDistance={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
