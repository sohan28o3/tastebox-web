import { Eatery, MapsPresence, calculateDistanceKm } from '../types';

export const PLACES_API_KEY = "AIzaSyC9hvtbJrDioBG2E6bGzmmyQR-v3XPZF-E";

export interface PlacePhotoInfo {
  uri: string;
  attributionHtml?: string;
  authorName?: string;
}

const foodPlaceGroups = [
  ["restaurant", "meal_takeaway", "meal_delivery", "food_court", "diner", "cafeteria", "steak_house", "deli"],
  ["cafe", "coffee_shop", "tea_house", "juice_shop"],
  ["bakery", "dessert_shop", "ice_cream_shop", "sandwich_shop"],
  ["bar", "pub", "wine_bar", "brewpub", "beer_garden", "cocktail_bar"]
];

function transformGooglePlace(p: any, userLat?: number, userLon?: number): Eatery | null {
  if (!p || !p.id) return null;
  const id = p.id;
  const pos = p.location;
  const lat = pos?.latitude ?? null;
  const lon = pos?.longitude ?? null;
  const dist = (lat != null && lon != null && userLat != null && userLon != null)
    ? calculateDistanceKm(userLat, userLon, lat, lon)
    : null;

  const type = p.primaryType || "";
  const category = (type.includes("cafe") || type.includes("coffee"))
    ? "Cafe"
    : (type.includes("bar") || type.includes("pub"))
      ? "Bar"
      : "Restaurant";

  let cuisine = p.primaryTypeDisplayName?.text || "";
  cuisine = cuisine.replace(/\s+(restaurant|cafe|coffee shop)$/i, "").trim();
  if (!cuisine || cuisine.toLowerCase() === "restaurant" || cuisine.toLowerCase() === "cafe") {
    cuisine = category === "Cafe" ? "Coffee" : category === "Bar" ? "Bar" : "Other";
  }

  // Cover image from first photo if present
  let coverImage: string | undefined = undefined;
  if (Array.isArray(p.photos) && p.photos.length > 0 && p.photos[0].name) {
    coverImage = `https://places.googleapis.com/v1/${p.photos[0].name}/media?key=${PLACES_API_KEY}&maxWidthPx=600`;
  }

  const mapsPresence: MapsPresence = {
    reviewCount: p.userRatingCount || 0,
    permanentlyClosed: p.businessStatus === "CLOSED_PERMANENTLY",
    hasPhoto: Array.isArray(p.photos) && p.photos.length > 0,
    hasHours: Boolean(p.regularOpeningHours?.weekdayDescriptions?.length),
    hasWebsite: Boolean(p.websiteUri),
    hasPhone: Boolean(p.nationalPhoneNumber)
  };

  return {
    id: `google_${id}`,
    name: p.displayName?.text || "Unnamed place",
    cuisine,
    address: p.formattedAddress || "",
    category,
    latitude: lat,
    longitude: lon,
    distanceKm: dist,
    mapsPresence,
    coverImage
  };
}

export async function searchNearbyGoogle(
  latitude: number, 
  longitude: number, 
  radiusKm: number = 4
): Promise<Eatery[]> {
  const url = 'https://places.googleapis.com/v1/places:searchNearby';
  const radiusMeters = Math.min(50, Math.max(1, radiusKm)) * 1000;
  const foundMap = new Map<string, Eatery>();

  const fieldMask = [
    'places.id',
    'places.displayName',
    'places.formattedAddress',
    'places.location',
    'places.primaryType',
    'places.primaryTypeDisplayName',
    'places.userRatingCount',
    'places.photos',
    'places.businessStatus',
    'places.regularOpeningHours',
    'places.websiteUri',
    'places.nationalPhoneNumber'
  ].join(',');

  // Query each food type group to get a diverse shortlist matching Android logic
  for (const group of foodPlaceGroups) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': PLACES_API_KEY,
          'X-Goog-FieldMask': fieldMask
        },
        body: JSON.stringify({
          includedTypes: group,
          maxResultCount: 20,
          locationRestriction: {
            circle: {
              center: { latitude, longitude },
              radius: radiusMeters
            }
          }
        })
      });

      if (!response.ok) continue;
      const data = await response.json();
      if (Array.isArray(data.places)) {
        for (const p of data.places) {
          const eatery = transformGooglePlace(p, latitude, longitude);
          if (eatery && !foundMap.has(eatery.id)) {
            foundMap.set(eatery.id, eatery);
          }
        }
      }
    } catch (e) {
      console.warn("Failed group query in searchNearbyGoogle:", e);
    }
  }

  return Array.from(foundMap.values());
}

export async function searchByTextGoogle(
  queryText: string,
  latitude?: number,
  longitude?: number,
  radiusKm: number = 10
): Promise<Eatery[]> {
  const url = 'https://places.googleapis.com/v1/places:searchText';
  const fieldMask = [
    'places.id',
    'places.displayName',
    'places.formattedAddress',
    'places.location',
    'places.primaryType',
    'places.primaryTypeDisplayName',
    'places.userRatingCount',
    'places.photos',
    'places.businessStatus',
    'places.regularOpeningHours',
    'places.websiteUri',
    'places.nationalPhoneNumber'
  ].join(',');

  const reqBody: any = {
    textQuery: queryText,
    maxResultCount: 20
  };

  if (latitude != null && longitude != null) {
    reqBody.locationBias = {
      circle: {
        center: { latitude, longitude },
        radius: Math.min(50, Math.max(1, radiusKm)) * 1000
      }
    };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': PLACES_API_KEY,
        'X-Goog-FieldMask': fieldMask
      },
      body: JSON.stringify(reqBody)
    });

    if (!response.ok) return [];
    const data = await response.json();
    if (!Array.isArray(data.places)) return [];

    return data.places.map((p: any) => transformGooglePlace(p, latitude, longitude)).filter(Boolean) as Eatery[];
  } catch (err) {
    console.warn("searchByTextGoogle error:", err);
    return [];
  }
}

export const coverPhotoCache = new Map<string, string>();

export async function fetchCoverPhotoGoogle(placeId: string, placeName?: string): Promise<string | null> {
  const cacheKey = placeId || placeName || '';
  if (!cacheKey) return null;
  if (coverPhotoCache.has(cacheKey)) {
    return coverPhotoCache.get(cacheKey)!;
  }

  // 1. If it has a google placeId, fetch the place photo directly
  if (placeId && placeId.startsWith('google_')) {
    const cleanId = placeId.replace(/^google_/, '');
    try {
      const url = `https://places.googleapis.com/v1/places/${cleanId}`;
      const response = await fetch(url, {
        headers: {
          'X-Goog-Api-Key': PLACES_API_KEY,
          'X-Goog-FieldMask': 'photos'
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.photos) && data.photos.length > 0) {
          const photoName = data.photos[0].name;
          const mediaUrl = `https://places.googleapis.com/v1/${photoName}/media?key=${PLACES_API_KEY}&maxWidthPx=600&skipHttpRedirect=true`;
          const mRes = await fetch(mediaUrl);
          if (mRes.ok) {
            const mData = await mRes.json();
            if (mData.photoUri) {
              coverPhotoCache.set(cacheKey, mData.photoUri);
              return mData.photoUri;
            }
          }
        }
      }
    } catch (e) {
      console.warn("fetchCoverPhotoGoogle by id failed:", e);
    }
  }

  // 2. If no google ID or no photo found, try finding place by name
  if (placeName && placeName.trim()) {
    try {
      const url = 'https://places.googleapis.com/v1/places:searchText';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': PLACES_API_KEY,
          'X-Goog-FieldMask': 'places.id,places.photos'
        },
        body: JSON.stringify({
          textQuery: placeName,
          maxResultCount: 1
        })
      });
      if (response.ok) {
        const data = await response.json();
        const p = data.places?.[0];
        if (p?.photos?.[0]?.name) {
          const photoName = p.photos[0].name;
          const mediaUrl = `https://places.googleapis.com/v1/${photoName}/media?key=${PLACES_API_KEY}&maxWidthPx=600&skipHttpRedirect=true`;
          const mRes = await fetch(mediaUrl);
          if (mRes.ok) {
            const mData = await mRes.json();
            if (mData.photoUri) {
              coverPhotoCache.set(cacheKey, mData.photoUri);
              return mData.photoUri;
            }
          }
        }
      }
    } catch (e) {
      console.warn("fetchCoverPhotoGoogle by name failed:", e);
    }
  }

  return null;
}

export async function fetchPlacePhotosGoogle(placeId: string, maxPhotos: number = 10): Promise<PlacePhotoInfo[]> {
  const cleanId = placeId.replace(/^google_/, '');
  const url = `https://places.googleapis.com/v1/places/${cleanId}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': PLACES_API_KEY,
        'X-Goog-FieldMask': 'photos'
      }
    });

    if (!response.ok) return [];
    const data = await response.json();
    if (!Array.isArray(data.photos)) return [];

    const photosToFetch = data.photos.slice(0, maxPhotos);
    const resolvedList = await Promise.all(
      photosToFetch.map(async (photo: any) => {
        const attrHtml = photo.authorAttributions?.[0]?.displayName || 'Google Maps';
        const author = photo.authorAttributions?.[0]?.displayName || 'Google Maps';

        // Try direct CDN URI first
        try {
          const mediaUrl = `https://places.googleapis.com/v1/${photo.name}/media?key=${PLACES_API_KEY}&maxWidthPx=1000&skipHttpRedirect=true`;
          const mRes = await fetch(mediaUrl);
          if (mRes.ok) {
            const mData = await mRes.json();
            if (mData.photoUri) {
              return {
                uri: mData.photoUri,
                attributionHtml: attrHtml,
                authorName: author
              };
            }
          }
        } catch {}

        // Fallback to media endpoint
        return {
          uri: `https://places.googleapis.com/v1/${photo.name}/media?key=${PLACES_API_KEY}&maxWidthPx=1000`,
          attributionHtml: attrHtml,
          authorName: author
        };
      })
    );

    return resolvedList.filter(Boolean) as PlacePhotoInfo[];
  } catch (err) {
    console.warn("fetchPlacePhotosGoogle error:", err);
    return [];
  }
}
