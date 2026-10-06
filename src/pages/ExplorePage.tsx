import React, { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, MapPin } from 'lucide-react';
import { useStore } from '../services/storeContext';
import { 
  BiteSectionHeader, BitePlaceCard, BiteEmptyState, AddEateryDialog 
} from '../components/BiteUiComponents';
import { 
  Eatery, Match, DiningOccasions, DiningOccasionKey, 
  showDiscoveredPlace, fitsTasteFilter, occasionMatch, isEstablished 
} from '../types';
import { searchNearbyGoogle, searchByTextGoogle } from '../services/placesService';

export const ExplorePage: React.FC = () => {
  const { 
    eateries, visits, favorites, watchlist, tasteProfile, 
    tasteMatch, navigateTo, userLocation, requestUserLocation, cacheEateries 
  } = useStore();

  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'Saved' | 'Search' | 'Nearby'>('Saved');
  const [resultIds, setResultIds] = useState<string[]>([]);
  const [tasteFilter, setTasteFilter] = useState('All matches');
  const [libraryFilter, setLibraryFilter] = useState('All');
  const [nearbyEstablishedOnly, setNearbyEstablishedOnly] = useState(true);
  const [searchEstablishedOnly, setSearchEstablishedOnly] = useState(false);
  const [radiusKm, setRadiusKm] = useState(4);
  const [distanceDraft, setDistanceDraft] = useState(4);
  const [appliedRadius, setAppliedRadius] = useState(4);
  const [appliedQuery, setAppliedQuery] = useState('');
  const [occasionKey, setOccasionKey] = useState<DiningOccasionKey>('FRIENDS');
  const [appliedOccasionKey, setAppliedOccasionKey] = useState<DiningOccasionKey>('FRIENDS');
  const [busy, setBusy] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');
  const [discoveredEateries, setDiscoveredEateries] = useState<Eatery[]>([]);
  
  // Dialogs
  const [nearbyModalOpen, setNearbyModalOpen] = useState(false);
  const [filtersModalOpen, setFiltersModalOpen] = useState(false);
  const [addEateryModalOpen, setAddEateryModalOpen] = useState(false);

  const allEateries = useMemo(() => {
    const map = new Map<string, Eatery>();
    eateries.forEach(e => map.set(e.id, e));
    discoveredEateries.forEach(e => map.set(e.id, e));
    return Array.from(map.values());
  }, [eateries, discoveredEateries]);

  const cuisineFilters = useMemo(() => {
    if (!tasteProfile) return [];
    const list = [...(tasteProfile.topCuisines || []), ...(tasteProfile.favoriteCuisines || [])];
    return Array.from(new Set(list)).slice(0, 4);
  }, [tasteProfile]);

  const handleStartSearch = async (isNearby: boolean) => {
    if (isNearby) {
      setNearbyModalOpen(true);
      return;
    }
    const q = query.trim();
    if (!q) return;

    setAppliedQuery(q);
    setAppliedRadius(radiusKm);
    setMode('Search');
    setLocationMessage('');
    setBusy(true);

    try {
      // 1. Fetch live Google Places matching text and user location bias if available
      const liveGoogle = await searchByTextGoogle(
        q, 
        userLocation?.latitude, 
        userLocation?.longitude, 
        radiusKm
      );
      if (liveGoogle.length > 0) {
        setDiscoveredEateries(prev => [...prev, ...liveGoogle]);
        cacheEateries(liveGoogle);
        setResultIds(liveGoogle.map(g => g.id));
      } else {
        // Fallback to locally cached eateries
        const cleanQ = q.toLowerCase();
        const matching = allEateries.filter(e => 
          e.name.toLowerCase().includes(cleanQ) || 
          e.cuisine.toLowerCase().includes(cleanQ) || 
          (e.address && e.address.toLowerCase().includes(cleanQ))
        );
        setResultIds(matching.map(m => m.id));
      }
    } catch {
      // Local fallback on error
      const cleanQ = q.toLowerCase();
      const matching = allEateries.filter(e => 
        e.name.toLowerCase().includes(cleanQ) || 
        e.cuisine.toLowerCase().includes(cleanQ) || 
        (e.address && e.address.toLowerCase().includes(cleanQ))
      );
      setResultIds(matching.map(m => m.id));
    } finally {
      setBusy(false);
    }
  };

  const handleExecuteNearby = async () => {
    setBusy(true);
    setLocationMessage("Finding your location…");
    setAppliedOccasionKey(occasionKey);
    setAppliedRadius(radiusKm);
    setMode('Nearby');
    setNearbyModalOpen(false);

    let coords = userLocation;
    try {
      coords = await requestUserLocation();
      setLocationMessage('');
    } catch {
      setLocationMessage(`Location is needed to search within ${radiusKm} km. Allow location access and try again.`);
    }

    if (coords) {
      setLocationMessage("Searching food and drink venues…");
      try {
        const liveNearby = await searchNearbyGoogle(coords.latitude, coords.longitude, radiusKm);
        if (liveNearby.length > 0) {
          setDiscoveredEateries(prev => [...prev, ...liveNearby]);
          cacheEateries(liveNearby);
          setResultIds(liveNearby.map(n => n.id));
          setLocationMessage(`Searching food and drink venues… ${liveNearby.length} found`);
          setTimeout(() => setLocationMessage(''), 2500);
        } else {
          // Local fallback
          const nearbyPlaces = allEateries.filter(e => {
            if (e.distanceKm != null) return e.distanceKm <= radiusKm;
            return true;
          });
          setResultIds(nearbyPlaces.map(n => n.id));
          setLocationMessage('');
        }
      } catch (err: any) {
        console.warn("Live nearby search failed:", err);
        const nearbyPlaces = allEateries.filter(e => {
          if (e.distanceKm != null) return e.distanceKm <= radiusKm;
          return true;
        });
        setResultIds(nearbyPlaces.map(n => n.id));
      }
    } else {
      // No coords allowed, use local places
      const nearbyPlaces = allEateries.filter(e => {
        if (e.distanceKm != null) return e.distanceKm <= radiusKm;
        return true;
      });
      setResultIds(nearbyPlaces.map(n => n.id));
    }

    setBusy(false);
  };

  // Candidates filtering
  const candidates: Eatery[] = useMemo(() => {
    return allEateries.filter(place => {
      if (mode !== 'Saved') {
        const inResults = resultIds.includes(place.id);
        const established = showDiscoveredPlace(
          place, 
          mode === 'Nearby' ? nearbyEstablishedOnly : searchEstablishedOnly
        );
        return inResults && established;
      } else {
        const isSaved = watchlist.includes(place.id) || favorites.includes(place.id) || visits.some(v => v.eateryId === place.id);
        const matchesQuery = !query.trim() || [place.name, place.cuisine, place.address].some(s => s?.toLowerCase().includes(query.trim().toLowerCase()));
        
        let matchesLib = true;
        if (libraryFilter === 'Favorites') matchesLib = favorites.includes(place.id);
        else if (libraryFilter === 'Want to try') matchesLib = watchlist.includes(place.id);
        else if (libraryFilter === 'Reviewed') matchesLib = visits.some(v => v.eateryId === place.id);

        return isSaved && matchesQuery && matchesLib;
      }
    });
  }, [
    allEateries, mode, resultIds, nearbyEstablishedOnly, searchEstablishedOnly, 
    watchlist, favorites, visits, query, libraryFilter
  ]);

  // Taste scoring & occasion matching
  const displayedMatches: Match[] = useMemo(() => {
    return candidates
      .filter(c => fitsTasteFilter(c, tasteProfile || { budgetMin: 0, budgetMax: 5000, budgetCurrency: 'INR' } as any, tasteFilter))
      .map(place => {
        const baseScore = tasteMatch(place);
        if (mode === 'Nearby') {
          const [score, reason] = occasionMatch(place, baseScore, appliedOccasionKey);
          return { eatery: place, score, explanation: reason };
        }
        return { eatery: place, score: baseScore, explanation: '' };
      })
      .sort((a, b) => {
        if (mode === 'Search') {
          return resultIds.indexOf(a.eatery.id) - resultIds.indexOf(b.eatery.id);
        }
        if (b.score !== a.score) return b.score - a.score;
        const distA = a.eatery.distanceKm ?? 999;
        const distB = b.eatery.distanceKm ?? 999;
        return distA - distB;
      });
  }, [candidates, tasteProfile, tasteFilter, mode, appliedOccasionKey, tasteMatch, resultIds]);

  return (
    <div className="p-4 space-y-3 pb-24 max-w-3xl mx-auto">
      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-3.5 top-3 text-[#627370]" />
        <input 
          type="text" 
          placeholder="Restaurant, café or cuisine"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleStartSearch(false);
          }}
          className="w-full bg-[#FFFFFEFA] border border-[#DDE5DE] rounded-xl pl-11 pr-4 py-2.5 text-sm text-[#233B3B] shadow-xs focus:outline-none focus:border-[#235D5B] focus:ring-1 focus:ring-[#235D5B]"
        />
      </div>

      {/* Search / Nearby Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => handleStartSearch(false)}
          disabled={!query.trim()}
          className="flex-1 bg-[#926017] hover:bg-[#7c5213] text-white font-bold text-sm py-2 px-4 rounded-xl transition-colors disabled:opacity-50"
        >
          Search
        </button>
        <button
          onClick={() => setNearbyModalOpen(true)}
          className="flex-1 border border-[#926017] text-[#926017] hover:bg-[#FAF8F1] font-bold text-sm py-2 px-4 rounded-xl transition-colors"
        >
          Nearby
        </button>
      </div>

      {/* Selected for your taste feature card (BiteMint) */}
      <div className="bg-[#E2F0EB] rounded-xl p-3 border border-[#DDE5DE]/50 space-y-1">
        <h4 className="font-semibold text-sm text-[#233B3B]">Selected for your taste</h4>
        <p className="text-xs text-[#627370]">
          {mode === 'Search' 
            ? "Search finds nearby names and themes. Taste scores help you compare." 
            : "Your cuisines, dietary preferences and budget shape recommendations."}
        </p>
        <button 
          onClick={() => navigateTo('settings:preferences')}
          className="text-xs font-bold text-[#926017] hover:underline pt-0.5 block"
        >
          Edit preferences
        </button>
      </div>

      {/* Filter Row & Subheader */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setDistanceDraft(radiusKm);
              setFiltersModalOpen(true);
            }}
            className="text-xs font-bold text-[#235D5B] hover:underline flex items-center gap-1"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters · {radiusKm} km
          </button>
          <span className="text-[#DDE5DE]">|</span>
          <button
            onClick={() => setMode('Saved')}
            className={`text-xs font-bold ${mode === 'Saved' ? 'text-[#926017]' : 'text-[#627370] hover:underline'}`}
          >
            Saved places
          </button>
        </div>

        <p className="text-[11px] text-[#627370]">
          {mode === 'Search' 
            ? `Most relevant first · within ${appliedRadius} km` 
            : "Highest match first · distance breaks ties"}
        </p>

        <button 
          onClick={() => setAddEateryModalOpen(true)}
          className="text-xs font-bold text-[#926017] hover:underline block pt-0.5"
        >
          + Add a custom eatery
        </button>
      </div>

      {/* Results Header */}
      <div>
        <BiteSectionHeader 
          title={
            mode === 'Nearby' 
              ? `${DiningOccasions[appliedOccasionKey].label} · within ${appliedRadius} km` 
              : mode === 'Search' 
                ? `Results for ${appliedQuery} · ${appliedRadius} km` 
                : "Your saved eateries"
          } 
        />
        <p className="text-xs text-[#627370] -mt-2 mb-2">
          {displayedMatches.length} matching places
        </p>

        {busy && (
          <div className="w-full bg-[#E2F0EB] h-1.5 rounded-full overflow-hidden mb-3">
            <div className="bg-[#235D5B] h-full w-2/5 animate-pulse rounded-full" />
          </div>
        )}

        {locationMessage && (
          <div className={`text-xs px-3 py-2 rounded-xl mb-3 flex items-center justify-between gap-2 ${
            busy ? 'bg-[#E2F0EB] text-[#235D5B]' : 'bg-[#FBE8E8] text-[#C23B38] border border-[#F5C2C0]'
          }`}>
            <span>{locationMessage}</span>
            {!busy && (
              <button
                onClick={handleExecuteNearby}
                className="text-xs font-bold underline hover:opacity-80 shrink-0"
              >
                Retry
              </button>
            )}
          </div>
        )}
      </div>

      {/* Matches List */}
      <div className="space-y-3">
        {displayedMatches.length === 0 ? (
          <BiteEmptyState message="No places match yet. Try Nearby, search, or adjust your filters." />
        ) : (
          displayedMatches.map(match => (
            <div key={match.eatery.id} className="space-y-1">
              <BitePlaceCard 
                place={match.eatery} 
                onOpen={() => navigateTo(`place:${match.eatery.id}`)}
                matchScore={match.score}
              />
              {mode !== 'Saved' && !isEstablished(match.eatery.mapsPresence) && (
                <p className="text-[11px] text-[#627370] px-2">Limited Maps information</p>
              )}
              {match.explanation && (
                <p className="text-[11px] text-[#627370] px-2 italic">{match.explanation}</p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Nearby Dialog */}
      {nearbyModalOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setNearbyModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-[#DDE5DE] space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-serif font-bold text-lg text-[#233B3B]">Find your nearby match</h3>
            <div>
              <p className="text-xs font-semibold text-[#627370] mb-2">What's the occasion?</p>
              <div className="space-y-1.5">
                {(Object.keys(DiningOccasions) as DiningOccasionKey[]).map(key => {
                  const occ = DiningOccasions[key];
                  const selected = occasionKey === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setOccasionKey(key)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        selected 
                          ? 'border-[#926017] bg-[#F3EAD5] text-[#233B3B]' 
                          : 'border-[#DDE5DE] text-[#627370] hover:bg-[#FAF8F1]'
                      }`}
                    >
                      {occ.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="text-[11px] text-[#627370]">Within {radiusKm} km · change distance in Filters</p>
            <p className="text-[11px] text-[#627370]">Occasion adjusts your taste match using available atmosphere details.</p>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#DDE5DE]">
              <button 
                onClick={() => setNearbyModalOpen(false)}
                className="px-3 py-1.5 text-xs text-[#627370] hover:text-[#233B3B]"
              >
                Cancel
              </button>
              <button 
                onClick={handleExecuteNearby}
                className="bg-[#926017] hover:bg-[#7c5213] text-white font-bold text-xs px-4 py-1.5 rounded-full"
              >
                Find places
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Places Dialog */}
      {filtersModalOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setFiltersModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-[#DDE5DE] max-h-[85vh] overflow-y-auto space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-serif font-bold text-lg text-[#233B3B]">Filter places</h3>
            
            {/* Distance Slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-[#233B3B]">Distance · {distanceDraft} km</span>
              </div>
              <input 
                type="range"
                min="1"
                max="50"
                step="1"
                value={distanceDraft}
                onChange={e => setDistanceDraft(parseInt(e.target.value, 10))}
                className="w-full accent-[#926017] cursor-pointer"
              />
              <p className="text-[11px] text-[#627370] mt-1">Applies to Search and Nearby around your location.</p>
            </div>

            {/* Established Switch */}
            <div className="flex items-center justify-between py-2 border-y border-[#DDE5DE]">
              <div>
                <p className="text-xs font-semibold text-[#233B3B]">Established places only</p>
                <p className="text-[11px] text-[#627370]">
                  {mode === 'Search' ? "For name searches" : "For Nearby recommendations"}
                </p>
              </div>
              <input 
                type="checkbox"
                checked={mode === 'Search' ? searchEstablishedOnly : nearbyEstablishedOnly}
                onChange={e => {
                  if (mode === 'Search') setSearchEstablishedOnly(e.target.checked);
                  else setNearbyEstablishedOnly(e.target.checked);
                }}
                className="w-4 h-4 text-[#926017] rounded accent-[#926017]"
              />
            </div>

            {/* Taste Filters */}
            <div>
              <p className="text-xs font-semibold text-[#233B3B] mb-1.5">Taste</p>
              <div className="flex flex-wrap gap-1.5">
                {['All matches', 'Within budget', ...cuisineFilters.map(c => `cuisine:${c}`)].map(filter => (
                  <button
                    key={filter}
                    onClick={() => setTasteFilter(filter)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                      tasteFilter === filter 
                        ? 'bg-[#926017] text-white' 
                        : 'bg-[#F3EAD5] text-[#233B3B] hover:bg-[#E2F0EB]'
                    }`}
                  >
                    {filter.replace('cuisine:', '')}
                  </button>
                ))}
              </div>
            </div>

            {/* Saved Library Filters */}
            {mode === 'Saved' && (
              <div>
                <p className="text-xs font-semibold text-[#233B3B] mb-1.5">Saved library</p>
                <div className="flex flex-wrap gap-1.5">
                  {['All', 'Want to try', 'Favorites', 'Reviewed'].map(filter => (
                    <button
                      key={filter}
                      onClick={() => setLibraryFilter(filter)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                        libraryFilter === filter 
                          ? 'bg-[#926017] text-white' 
                          : 'bg-[#F3EAD5] text-[#233B3B] hover:bg-[#E2F0EB]'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-[#DDE5DE]">
              <button 
                onClick={() => {
                  setTasteFilter('All matches');
                  setLibraryFilter('All');
                }}
                className="px-3 py-1.5 text-xs text-[#627370] hover:text-[#233B3B]"
              >
                Reset
              </button>
              <button 
                onClick={() => {
                  setRadiusKm(distanceDraft);
                  setFiltersModalOpen(false);
                }}
                className="bg-[#926017] hover:bg-[#7c5213] text-white font-bold text-xs px-4 py-1.5 rounded-full"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Eatery Dialog */}
      {addEateryModalOpen && (
        <AddEateryDialog 
          onClose={() => setAddEateryModalOpen(false)}
          onAdded={(id) => navigateTo(`place:${id}`)}
        />
      )}
    </div>
  );
};
