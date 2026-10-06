export interface MapsPresence {
  reviewCount?: number;
  permanentlyClosed?: boolean;
  hasPhoto?: boolean;
  hasHours?: boolean;
  hasWebsite?: boolean;
  hasPhone?: boolean;
  rating?: number;
  userRatingsTotal?: number;
}

export interface Eatery {
  id: string; // e.g. "google_..." or "custom_..."
  name: string;
  cuisine: string;
  address: string;
  category: string;
  latitude?: number | null;
  longitude?: number | null;
  distanceKm?: number | null;
  secondaryCuisines?: string[];
  priceTier?: number | null;
  estimatedCostPerPersonMin?: number | null;
  estimatedCostPerPersonMax?: number | null;
  currencyCode?: string | null;
  dietaryCompliance?: Record<string, string>; // "yes" | "no" | "unknown"
  vibeTags?: string[];
  noiseLevel?: string;
  seatingTags?: string[];
  signatureDishKeywords?: string[];
  flavorTags?: string[];
  spicinessLevel?: number | null;
  sweetSavoryBalance?: string;
  cuisineStyle?: string;
  enrichmentConfidence?: number;
  mapsPresence?: MapsPresence | null;
  coverImage?: string;
}

export interface Visit {
  id: string;
  eateryId: string;
  rating: number; // 0..10 half-stars
  review: string;
  date: string;
  tags: string[];
  liked: boolean;
  createdAt: number;
  photoPaths: string[];
  userId?: string;
}

export interface FoodList {
  id: string;
  title: string;
  description: string;
  eateryIds: string[];
  createdAt?: any;
}

export interface Match {
  eatery: Eatery;
  score: number;
  explanation: string;
  ai?: boolean;
}

export interface RestaurantRating {
  average: number;
  count: number;
}

export interface PublicProfile {
  uid: string;
  name: string;
  username: string;
  bio: string;
  photoUrl: string;
}

export interface TasteProfile {
  cuisineScores: Record<string, number>;
  categoryScores: Record<string, number>;
  topCuisines: string[];
  avoidCuisines: string[];
  topTags: string[];
  aiSummary: string;
  aiPositive: string[];
  aiNegative: string[];
  confidence: number;
  reviewCount: number;
  favoriteCount: number;
  likedReviewCount: number;
  commentCount: number;
  onboardingComplete: boolean;
  dietaryRestrictions: string[];
  favoriteCuisines: string[];
  budgetMin: number;
  budgetMax: number;
  budgetHardFilter: boolean;
  budgetCurrency: string;
  shareWithFollowers: boolean;
  analyzeTextWithAi: boolean;
  inputHash?: string;
  aiInputHash?: string;
  lastAiMillis?: number;
}

export interface LibraryVisibility {
  showLists: boolean;
  showFavorites: boolean;
  showWantToTry: boolean;
}

export interface ReviewComment {
  id: string;
  userId: string;
  text: string;
  photoPath: string;
  createdAtMillis: number;
  userDisplayName?: string;
  userPhotoUrl?: string;
}

export interface SocialReview {
  id: string;
  userId: string;
  restaurantId: string;
  rating: number;
  review: string;
  visitDate: string;
  createdAtMillis: number;
  photoPaths: string[];
  userDisplayName?: string;
  userPhotoUrl?: string;
  userUsername?: string;
}

export const onboardingDietaryOptions: Record<string, string> = {
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  halal: "Halal",
  gluten_free: "Gluten-free",
  dairy_free: "Dairy-free",
  nut_free: "Nut allergy"
};

export const onboardingCuisineOptions: string[] = [
  "South Indian", "North Indian", "Biryani", "Chinese",
  "Italian", "Fast Food", "Cafe", "Desserts"
];

export const CUISINE_IDEAS: string[] = [
  "South Indian", "North Indian", "Biryani", "Chinese", "Italian",
  "Japanese", "Mexican", "Cafe", "Desserts", "Bakery", "Fast Food", "Other"
];

export const TAG_IDEAS: string[] = [
  "Spicy", "Comfort food", "Vegetarian", "Vegan", "Dessert", 
  "Coffee", "Brunch", "Budget", "Fine dining", "Quick bite", 
  "Outdoor seating", "Date spot"
];

export function ratingText(halfStars: number): string {
  if (!halfStars || halfStars <= 0) return 'No rating';
  const full = Math.floor(halfStars / 2);
  const half = halfStars % 2 === 1;
  return '★'.repeat(full) + (half ? '½' : '');
}

export function ratingNumericLabel(halfStars: number): string {
  if (!halfStars || halfStars <= 0) return '0.0';
  return (halfStars / 2).toFixed(1);
}

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export interface CuisineDetail {
  label: string;
  score: number;
  strength: string;
  evidence: string;
}

export const DiningOccasions = {
  DATE: { key: 'DATE', label: 'Date night', tags: new Set(['romantic', 'date_night', 'cozy']) },
  FRIENDS: { key: 'FRIENDS', label: 'Friends', tags: new Set(['group_friendly', 'casual_lively', 'sports_bar']) },
  FAMILY: { key: 'FAMILY', label: 'Family', tags: new Set(['family_friendly', 'group_friendly']) },
  SOLO: { key: 'SOLO', label: 'Solo bite', tags: new Set(['quick_casual', 'cozy']) }
} as const;

export type DiningOccasionKey = keyof typeof DiningOccasions;

export function isEstablished(presence?: MapsPresence | null): boolean {
  if (!presence) return false;
  if (presence.permanentlyClosed) return false;
  const count = presence.reviewCount ?? 0;
  return count >= 5 && (Boolean(presence.hasPhoto) || Boolean(presence.hasHours) || Boolean(presence.hasWebsite) || Boolean(presence.hasPhone));
}

export function showDiscoveredPlace(place: Eatery, establishedOnly: boolean): boolean {
  if (place.mapsPresence?.permanentlyClosed) return false;
  if (!establishedOnly) return true;
  return isEstablished(place.mapsPresence);
}

export function fitsTasteFilter(place: Eatery, profile: TasteProfile, filter: string): boolean {
  if (filter === 'Within budget') {
    const min = place.estimatedCostPerPersonMin;
    const max = place.estimatedCostPerPersonMax;
    if (min != null && max != null && place.currencyCode === profile.budgetCurrency) {
      const avg = (min + max) / 2.0;
      return avg >= profile.budgetMin && avg <= profile.budgetMax;
    }
    return false;
  }
  if (filter.startsWith('cuisine:')) {
    const target = filter.replace('cuisine:', '').toLowerCase();
    const cuisines = [place.cuisine, ...(place.secondaryCuisines || [])];
    return cuisines.some(c => c && (c.toLowerCase().includes(target) || target.includes(c.toLowerCase())));
  }
  return true;
}

export function occasionMatch(place: Eatery, taste: number, occasionKey: DiningOccasionKey): [number, string] {
  const occasion = DiningOccasions[occasionKey] || DiningOccasions.FRIENDS;
  const positives: string[] = (place.vibeTags || []).filter(t => occasion.tags.has(t));
  if (occasionKey === 'SOLO' && (place.seatingTags || []).includes('counter')) positives.push('counter seating');
  if (occasionKey === 'DATE' && place.noiseLevel === 'quiet') positives.push('quiet atmosphere');
  if (occasionKey === 'FRIENDS' && place.noiseLevel === 'lively') positives.push('lively atmosphere');
  const loudMismatch = (occasionKey === 'DATE' || occasionKey === 'FAMILY') && place.noiseLevel === 'lively';
  const confidence = Math.min(100, Math.max(0, place.enrichmentConfidence ?? 0)) / 100.0;
  const rawAdj = positives.length * 5 - (loudMismatch ? 5 : 0);
  const clampedAdj = Math.min(10, Math.max(-10, rawAdj));
  const adjustment = Math.round(clampedAdj * confidence);
  const reason = confidence === 0.0 || (positives.length === 0 && !loudMismatch)
    ? 'Occasion details unavailable; taste score unchanged.'
    : positives.length > 0
      ? `${occasion.label}: ${positives.map(p => p.replace(/_/g, ' ')).join(', ')}.`
      : `Lively atmosphere may be less suited to ${occasion.label.toLowerCase()}.`;

  return [Math.min(100, Math.max(0, taste + adjustment)), reason];
}

export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  const distance = 6371.0088 * 2 * Math.asin(Math.sqrt(Math.min(1.0, Math.max(0.0, a))));
  return Math.round(distance * 10) / 10;
}

export function enrichmentDetails(place: Eatery): Array<[string, string]> {
  const result: Array<[string, string]> = [];
  const known = (val?: string | null) => !!val && !['unknown', 'other', 'n/a', 'none', 'null', 'unspecified'].includes(val.trim().toLowerCase());
  const readable = (val: string) => {
    const s = val.trim().replace(/_/g, ' ');
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  const detail = (label: string, values: (string | undefined | null)[]) => {
    const text = values.filter(known).map(v => readable(v!)).filter((v, i, a) => a.indexOf(v) === i).join(' · ');
    if (text) result.push([label, text]);
  };

  detail('Cuisine', [place.cuisine, ...(place.secondaryCuisines || [])]);
  const min = place.estimatedCostPerPersonMin && place.estimatedCostPerPersonMin > 0 ? place.estimatedCostPerPersonMin : null;
  const max = place.estimatedCostPerPersonMax && place.estimatedCostPerPersonMax > 0 ? place.estimatedCostPerPersonMax : null;
  if (known(place.currencyCode) && (min != null || max != null)) {
    let amount: string | null = null;
    if (min != null && max != null && max >= min) amount = min === max ? `${min}` : `${min}–${max}`;
    else if (min != null) amount = `From ${min}`;
    else if (max != null) amount = `Up to ${max}`;
    if (amount) result.push(['Estimated / person', `${place.currencyCode} ${amount}`]);
  } else if (place.priceTier && place.priceTier >= 1 && place.priceTier <= 4) {
    const tierLabels = ['Budget', 'Moderate', 'Premium', 'High-end'];
    result.push(['Price', tierLabels[place.priceTier - 1]]);
  }

  detail('Atmosphere', place.vibeTags || []);
  detail('Noise', [place.noiseLevel]);
  detail('Seating', place.seatingTags || []);
  detail('Dishes', place.signatureDishKeywords || []);
  detail('Flavors', place.flavorTags || []);
  if (place.spicinessLevel != null && place.spicinessLevel >= 0 && place.spicinessLevel <= 5) {
    result.push(['Spice', `${place.spicinessLevel} / 5`]);
  }
  detail('Balance', [place.sweetSavoryBalance]);
  detail('Style', [place.cuisineStyle]);

  if (place.dietaryCompliance) {
    const dietary = Object.entries(place.dietaryCompliance).map(([k, v]) => {
      const vl = (v || '').toLowerCase();
      if (vl === 'yes') return readable(k);
      if (vl === 'no') return `Not ${k.replace(/_/g, ' ')}`;
      return null;
    }).filter(Boolean) as string[];
    detail('Dietary info (estimated)', dietary);
  }

  return result;
}

export function cuisineDetails(
  profile: TasteProfile | null,
  visits: Visit[],
  places: Eatery[],
  favorites: string[]
): CuisineDetail[] {
  if (!profile) return [];
  const byId = new Map(places.map(p => [p.id, p]));
  const candidateKeys = Array.from(new Set([...Object.keys(profile.cuisineScores || {}), ...(profile.favoriteCuisines || [])]))
    .filter(k => k && !['', 'other', 'unknown', 'restaurant'].includes(k.toLowerCase()));

  const details: CuisineDetail[] = candidateKeys.map(label => {
    const baseScore = profile.cuisineScores?.[label] ?? 50;
    const isFavorite = (profile.favoriteCuisines || []).includes(label);
    const score = isFavorite ? Math.max(baseScore, 65) : baseScore;

    const matches = (id: string) => {
      const eatery = byId.get(id);
      return eatery ? eatery.cuisine.toLowerCase() === label.toLowerCase() : false;
    };

    const rated = visits.filter(v => v.rating > 0 && matches(v.eateryId));
    const loved = new Set([...favorites, ...visits.filter(v => v.liked).map(v => v.eateryId)]).size > 0
      ? Array.from(new Set([...favorites, ...visits.filter(v => v.liked).map(v => v.eateryId)])).filter(matches).length
      : 0;

    const evidenceParts: string[] = [];
    if (rated.length > 0) {
      const avg = (rated.reduce((sum, v) => sum + v.rating, 0) / rated.length).toFixed(1);
      evidenceParts.push(`${rated.length} rated ${rated.length === 1 ? 'visit' : 'visits'} · average ${avg}/10`);
    }
    if (loved > 0) {
      evidenceParts.push(`${loved} ${loved === 1 ? 'favorite' : 'favorites'}`);
    }
    if (evidenceParts.length === 0) {
      evidenceParts.push(isFavorite ? 'One of your chosen favorites' : 'Based on your activity');
    }

    const strength = (rated.length === 0 && loved === 0)
      ? 'Still exploring'
      : score >= 70
        ? 'Strong preference'
        : score >= 57
          ? 'Showing interest'
          : score <= 43
            ? 'Less preferred'
            : 'Still exploring';

    return {
      label,
      score,
      strength,
      evidence: evidenceParts.join(' · ')
    };
  });

  return details.sort((a, b) => b.score - a.score).slice(0, 3);
}

export function friendPopularity(
  feed: SocialReview[],
  placeGetter: (id: string) => Eatery | undefined
): Array<{ place: Eatery; friendCount: number; label: string }> {
  const rated = feed.filter(f => f.rating > 0);
  const groups: Record<string, SocialReview[]> = {};
  for (const review of rated) {
    if (!groups[review.restaurantId]) groups[review.restaurantId] = [];
    groups[review.restaurantId].push(review);
  }

  const scored: Array<{ item: { place: Eatery; friendCount: number; label: string }; score: number }> = [];
  for (const [id, reviews] of Object.entries(groups)) {
    const place = placeGetter(id);
    if (!place) continue;
    const people = Array.from(new Set(reviews.map(r => r.userId)));
    const avg = reviews.reduce((sum, r) => sum + (r.rating / 2.0), 0) / reviews.length;
    const score = avg + Math.log(1.0 + people.length) * 0.45;
    scored.push({
      item: {
        place,
        friendCount: people.length,
        label: people.length === 1 ? 'Loved by someone you follow' : `Popular with ${people.length} people you follow`
      },
      score
    });
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, 3).map(s => s.item);
}

