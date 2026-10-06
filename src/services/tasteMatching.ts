import { TasteProfile, Eatery, Match } from '../types';

export const TasteLabels = {
  normalized(label: string): string {
    return label
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  },

  cuisineAliases: {
    "cafe": "coffee", "cafes": "coffee", "coffee shop": "coffee",
    "coffee shops": "coffee", "coffeehouse": "coffee", "coffee house": "coffee",
    "dessert": "desserts", "dessert shop": "desserts", "sweet shop": "desserts",
    "fastfood": "fast food", "quick service": "fast food",
    "south indian food": "south indian", "north indian food": "north indian",
    "biriyani": "biryani", "briyani": "biryani",
    "pizzeria": "pizza", "pizza place": "pizza",
    "bbq": "barbecue", "barbeque": "barbecue",
    "pub": "bar", "wine bar": "bar"
  } as Record<string, string>,

  categoryAliases: {
    "coffee": "cafe", "coffee shop": "cafe", "coffeehouse": "cafe",
    "coffee house": "cafe", "cafes": "cafe",
    "pub": "bar", "wine bar": "bar", "cocktail bar": "bar", "bars": "bar",
    "restaurants": "restaurant", "eatery": "restaurant", "diner": "restaurant",
    "fast food restaurant": "restaurant"
  } as Record<string, string>,

  cuisineFamilies: {
    "south indian": "indian", "north indian": "indian",
    "punjabi": "indian", "gujarati": "indian", "bengali": "indian",
    "andhra": "indian", "kerala": "indian", "tamil": "indian",
    "sichuan": "chinese", "cantonese": "chinese"
  } as Record<string, string>,

  unknown: new Set(["", "other", "unknown", "food", "restaurant", "restaurants"]),

  cuisine(label: string): string {
    const clean = this.normalized(label).replace(/\s+(restaurants?|cuisine)$/i, '').trim();
    return this.cuisineAliases[clean] || clean;
  },

  category(label: string): string {
    const clean = this.normalized(label);
    return this.categoryAliases[clean] || clean;
  },

  editDistance(a: string, b: string): number {
    const row = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 0; i < a.length; i++) {
      let prev = i + 1;
      for (let j = 0; j < b.length; j++) {
        const cur = a[i] === b[j] ? row[j] : Math.min(row[j], row[j + 1], prev) + 1;
        row[j] = prev;
        prev = cur;
      }
      row[b.length] = prev;
    }
    return row[b.length];
  },

  similarity(left: string, right: string, isCategory: boolean = false): number {
    const a = isCategory ? this.category(left) : this.cuisine(left);
    const b = isCategory ? this.category(right) : this.cuisine(right);
    if (!a || !b) return 0.0;
    if (!isCategory && (this.unknown.has(a) || this.unknown.has(b))) return 0.0;
    if (a === b) return 1.0;
    if (!isCategory && (this.cuisineFamilies[a] === b || this.cuisineFamilies[b] === a)) return 0.65;
    if (a.length >= 5 && b.length >= 5 && a.split(' ').length === b.split(' ').length && this.editDistance(a, b) === 1) {
      return 0.85;
    }
    return 0.0;
  },

  score(label: string, scores: Record<string, number>, favorites: string[] = [], isCategory: boolean = false): number {
    const entries = Object.entries(scores || {});
    const evidence = entries
      .map(([key, val]) => ({ sim: this.similarity(label, key, isCategory), val }))
      .filter(e => e.sim > 0.0);

    if (evidence.length > 0) {
      const best = Math.max(...evidence.map(e => e.sim));
      const matching = evidence.filter(e => e.sim === best);
      const preference = matching.reduce((sum, e) => sum + e.val, 0) / matching.length;
      return Math.min(100, Math.max(0, Math.round(50 + best * (preference - 50))));
    }

    const signup = favorites.length > 0 ? Math.max(...favorites.map(f => this.similarity(label, f, isCategory))) : 0.0;
    return Math.round(50 + signup * 30);
  }
};

export function passesDietaryHardFilter(place: Eatery, profile?: TasteProfile | null): boolean {
  if (!profile || !profile.dietaryRestrictions || profile.dietaryRestrictions.length === 0) return true;
  return profile.dietaryRestrictions.every(req => place.dietaryCompliance?.[req] === "yes");
}

export function passesBudgetHardFilter(place: Eatery, profile?: TasteProfile | null): boolean {
  if (!profile || !profile.budgetHardFilter) return true;
  const min = place.estimatedCostPerPersonMin;
  const max = place.estimatedCostPerPersonMax;
  if (min == null || max == null) return false;
  if (place.currencyCode && place.currencyCode !== (profile.budgetCurrency || "INR")) return false;
  const midpoint = (min + max) / 2.0;
  return midpoint >= profile.budgetMin && midpoint <= profile.budgetMax;
}

export function budgetFit(place: Eatery, profile?: TasteProfile | null): number {
  if (!profile) return 0.5;
  const min = place.estimatedCostPerPersonMin;
  const max = place.estimatedCostPerPersonMax;
  const currencyMatches = !place.currencyCode || place.currencyCode === (profile.budgetCurrency || "INR");
  if (min == null || max == null || !currencyMatches) return 0.5;
  const midpoint = (min + max) / 2.0;
  if (midpoint >= profile.budgetMin && midpoint <= profile.budgetMax) return 1.0;
  if (midpoint < profile.budgetMin) {
    return Math.min(1.0, Math.max(0.0, 1.0 - (profile.budgetMin - midpoint) / Math.max(1, profile.budgetMin)));
  }
  return Math.min(1.0, Math.max(0.0, 1.0 - (midpoint - profile.budgetMax) / Math.max(1, profile.budgetMax)));
}

export function tasteMatchScore(place: Eatery, profile?: TasteProfile | null): number {
  if (!profile) return 70;
  if (!passesDietaryHardFilter(place, profile)) return 0;
  if (!passesBudgetHardFilter(place, profile)) return 0;
  const confidence = (profile.confidence || 0) / 100.0;
  const candidates = [place.cuisine, ...(place.secondaryCuisines || [])].filter(Boolean);
  const cuisine = candidates.length > 0 
    ? Math.max(...candidates.map(c => TasteLabels.score(c, profile.cuisineScores, profile.favoriteCuisines))) 
    : 50;
  const category = TasteLabels.score(place.category || "Restaurant", profile.categoryScores, [], true);
  const fit = 50 + confidence * (cuisine - 50);
  const categoryFit = 50 + confidence * (category - 50);
  const budget = budgetFit(place, profile) * 100.0;
  return Math.min(100, Math.max(0, Math.round(0.74 * fit + 0.16 * categoryFit + 0.10 * budget)));
}

export function tasteRank(candidates: Eatery[], profile?: TasteProfile | null): Match[] {
  if (!profile) {
    return candidates.map(eatery => ({
      eatery,
      score: 70,
      explanation: "Default taste match"
    }));
  }
  const confidence = (profile.confidence || 0) / 100.0;
  const matches: Match[] = [];

  for (const place of candidates) {
    if (!passesDietaryHardFilter(place, profile) || !passesBudgetHardFilter(place, profile)) continue;
    const candidatesCuisines = [place.cuisine, ...(place.secondaryCuisines || [])].filter(Boolean);
    const matchedCuisine = candidatesCuisines.length > 0
      ? candidatesCuisines.reduce((best, cur) => 
          TasteLabels.score(cur, profile.cuisineScores, profile.favoriteCuisines) > 
          TasteLabels.score(best, profile.cuisineScores, profile.favoriteCuisines) ? cur : best, candidatesCuisines[0])
      : place.cuisine;
    const cuisineScore = TasteLabels.score(matchedCuisine, profile.cuisineScores, profile.favoriteCuisines);
    const score = tasteMatchScore(place, profile);
    
    let reason = "More rated visits will help personalize this match.";
    if (cuisineScore >= 58 && profile.favoriteCuisines?.some(f => TasteLabels.similarity(matchedCuisine, f) === 1.0)) {
      reason = `Matches one of your chosen favorites: ${matchedCuisine}.`;
    } else if (cuisineScore >= 58 && confidence >= 0.2) {
      reason = `Your activity suggests you may enjoy ${matchedCuisine}.`;
    } else if (cuisineScore <= 42 && confidence >= 0.2) {
      reason = "You have rated similar cuisine lower; explore if curious.";
    } else if (place.distanceKm) {
      reason = `${place.distanceKm} km away.`;
    }

    matches.push({
      eatery: place,
      score,
      explanation: reason,
      ai: profile.aiInputHash === profile.inputHash && Boolean(profile.aiSummary)
    });
  }

  return matches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const distA = a.eatery.distanceKm ?? Number.MAX_VALUE;
    const distB = b.eatery.distanceKm ?? Number.MAX_VALUE;
    return distA - distB;
  });
}
