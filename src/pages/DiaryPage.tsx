import React, { useMemo, useState } from 'react';
import { BookOpen, ArrowUpDown, MoreHorizontal, Share2 } from 'lucide-react';
import { useStore } from '../services/storeContext';
import { 
  BitePillLabel, RestaurantCover, ReviewImages, 
  ReviewActions, BiteEmptyState 
} from '../components/BiteUiComponents';
import { Visit, ratingText, ratingNumericLabel } from '../types';

export const DiaryPage: React.FC = () => {
  const { visits, place, navigateTo, tasteMatch } = useStore();
  const [sortAscending, setSortAscending] = useState(false);

  const sortedVisits = useMemo(() => {
    return [...visits].sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      if (cmp !== 0) return sortAscending ? cmp : -cmp;
      return sortAscending ? a.createdAt - b.createdAt : b.createdAt - a.createdAt;
    });
  }, [visits, sortAscending]);

  // Group visits by date
  const groupedVisits = useMemo(() => {
    const map = new Map<string, Visit[]>();
    for (const v of sortedVisits) {
      const d = v.date || 'Undated';
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(v);
    }
    return Array.from(map.entries());
  }, [sortedVisits]);

  const handleShare = (visit: Visit, eateryName: string) => {
    const text = `${eateryName} • ${visit.rating > 0 ? `${(visit.rating / 2.0).toFixed(1)} / 5` : 'No rating'}\n${visit.review || ''}`;
    if (navigator.share) {
      navigator.share({ title: 'Tasteboxd Visit', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      alert('Copied review to clipboard!');
    }
  };

  return (
    <div className="p-4 space-y-4 pb-24 max-w-3xl mx-auto">
      {/* Top summary card */}
      <div className="bg-[#FFFFFEFA] border border-[#DDE5DE] rounded-2xl p-4 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#ECF2EC] flex items-center justify-center text-[#627370]">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="font-bold text-base text-[#233B3B]">{visits.length} visits</span>
            <span className="text-[#627370] text-sm"> logged this year</span>
          </div>
        </div>

        <button 
          onClick={() => setSortAscending(!sortAscending)}
          className="flex items-center gap-1 text-sm font-bold text-[#926017] hover:underline"
        >
          <span>Sort</span>
          <ArrowUpDown className="w-4 h-4" />
        </button>
      </div>

      {visits.length === 0 ? (
        <BiteEmptyState 
          message="You're all caught up — log your next visit!" 
          actionText="Explore" 
          onAction={() => navigateTo('tab:1')} 
        />
      ) : (
        <div className="space-y-4">
          {groupedVisits.map(([date, dayVisits]) => (
            <div key={date} className="space-y-2.5">
              {/* Date Header with Divider */}
              <div className="flex items-center gap-3 py-1">
                <span className="text-xs font-extrabold tracking-wider text-[#627370] uppercase">
                  {date}
                </span>
                <div className="flex-1 h-[1px] bg-[#DDE5DE]" />
              </div>

              {/* Day visits cards */}
              {dayVisits.map(visit => {
                const eatery = place(visit.eateryId);
                if (!eatery) return null;
                const matchScore = tasteMatch(eatery);

                return (
                  <div 
                    key={visit.id}
                    className="bg-[#FFFFFEFA] border border-[#DDE5DE] rounded-2xl p-3 shadow-xs hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3.5">
                      <RestaurantCover place={eatery} size={70} />

                      <div className="flex-1 min-w-0">
                        <h4 
                          onClick={() => navigateTo(`place:${eatery.id}`)}
                          className="font-serif font-bold text-lg text-[#233B3B] truncate cursor-pointer hover:text-[#926017]"
                        >
                          {eatery.name}
                        </h4>

                        {visit.rating > 0 ? (
                          <div className="flex items-center gap-1.5 text-[#926017] font-bold text-sm">
                            <span>{ratingText(visit.rating)}</span>
                            <span>{ratingNumericLabel(visit.rating)}</span>
                          </div>
                        ) : (
                          <p className="text-xs text-[#627370]">No rating</p>
                        )}

                        <div className="flex gap-1.5 mt-1 overflow-x-auto no-scrollbar">
                          <BitePillLabel text={eatery.cuisine || 'Other'} />
                          <BitePillLabel text={`${matchScore}% match`} />
                        </div>
                      </div>

                      <button
                        onClick={() => navigateTo(`place:${eatery.id}`)}
                        className="text-[#627370] hover:text-[#233B3B] p-1.5"
                        title="View details"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </div>

                    {visit.review && (
                      <p className="text-sm text-[#627370] mt-2 italic">
                        “{visit.review}”
                      </p>
                    )}

                    <ReviewImages photoPaths={visit.photoPaths || []} />

                    <div className="border-t border-[#DDE5DE] mt-2.5 pt-1.5 flex items-center justify-between">
                      <div className="flex-1">
                        <ReviewActions reviewId={visit.id} authorId={visit.userId} />
                      </div>
                      <button 
                        onClick={() => handleShare(visit, eatery.name)}
                        className="text-[#627370] hover:text-[#926017] p-1 transition-colors ml-2"
                        title="Share visit"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          <BiteEmptyState 
            message="You're all caught up — log your next visit!" 
            actionText="Explore" 
            onAction={() => navigateTo('tab:1')} 
          />
        </div>
      )}
    </div>
  );
};
