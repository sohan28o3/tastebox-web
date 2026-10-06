import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  auth,
  db,
  doc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  signInWithPopup,
  googleProvider,
  fbSignOut,
  checkIsAdmin,
  collectionGroup,
  User
} from './firebase';
import {
  Eatery,
  Visit,
  FoodList,
  PublicProfile,
  SocialReview,
  TasteProfile,
  LibraryVisibility,
  RestaurantRating,
  ReviewComment,
  normalizeUsername,
  calculateDistanceKm
} from '../types';
import { tasteMatchScore, tasteRank } from './tasteMatching';
import { checkOnboardingComplete } from './onboardingService';

interface StoreContextType {
  // Auth & Profile
  currentUser: User | null;
  authLoading: boolean;
  onboardingDone: boolean;
  setOnboardingDone: (val: boolean) => void;
  uid: string;
  displayName: string;
  username: string;
  bio: string;
  photoUrl: string;
  isAdmin: boolean;

  // Realtime Data
  eateries: Eatery[];
  visits: Visit[];
  lists: FoodList[];
  favorites: string[];
  watchlist: string[];
  following: string[];
  followers: string[];
  socialFeed: SocialReview[];
  appReviews: SocialReview[];
  tasteProfile: TasteProfile | null;
  libraryVisibility: LibraryVisibility;
  error: string | null;
  profiles: Record<string, PublicProfile>;
  getProfileName: (targetUid: string) => string;
  getProfile: (targetUid: string) => PublicProfile | undefined;
  userLocation: { latitude: number; longitude: number } | null;
  requestUserLocation: () => Promise<{ latitude: number; longitude: number }>;

  // Navigation
  currentRoute: string;
  routeHistory: string[];
  navigateTo: (route: string) => void;
  navigateBack: () => void;

  // Actions
  loginWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  place: (id: string) => Eatery | undefined;
  ratingStats: (id: string) => RestaurantRating;
  tasteMatch: (place: Eatery) => number;
  toggleFavorite: (id: string) => Promise<void>;
  toggleWatchlist: (id: string) => Promise<void>;
  addReview: (data: {
    eateryId: string;
    rating: number;
    review: string;
    visitDate: string;
    tags: string[];
    liked: boolean;
    photoBase64s?: string[];
  }) => Promise<void>;
  deleteReview: (reviewId: string) => Promise<void>;
  createCustomEatery: (data: {
    name: string;
    cuisine: string;
    address: string;
    category?: string;
  }) => Promise<Eatery>;
  createList: (title: string, description: string) => Promise<void>;
  deleteList: (listId: string) => Promise<void>;
  toggleListMember: (listId: string, eateryId: string) => Promise<void>;
  saveProfile: (name: string, bio: string) => Promise<void>;
  uploadProfilePhotoBase64: (base64Data: string) => Promise<void>;
  updateTastePreferences: (data: Partial<TasteProfile>) => Promise<void>;
  updateLibraryVisibility: (val: LibraryVisibility) => Promise<void>;
  setTasteSharing: (val: boolean) => Promise<void>;
  toggleFollow: (otherUid: string) => Promise<void>;
  likeReview: (reviewId: string, liked: boolean) => Promise<void>;
  addComment: (reviewId: string, text: string, photoBase64?: string) => Promise<void>;
  deleteComment: (reviewId: string, commentId: string, photoPath?: string, commentAuthorId?: string) => Promise<void>;
  searchPlaces: (q: string, cuisine?: string) => Eatery[];
  cacheEateries: (newEateries: Eatery[]) => void;
  clearError: () => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [onboardingDone, setOnboardingDone] = useState<boolean>(false);

  // Profile fields
  const [displayName, setDisplayName] = useState<string>("Food explorer");
  const [username, setUsername] = useState<string>("");
  const [bio, setBio] = useState<string>("");
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Firestore collections
  const [eateries, setEateries] = useState<Eatery[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [lists, setLists] = useState<FoodList[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [followers, setFollowers] = useState<string[]>([]);
  const [socialFeed, setSocialFeed] = useState<SocialReview[]>([]);
  const [appReviews, setAppReviews] = useState<SocialReview[]>([]);
  const [tasteProfile, setTasteProfile] = useState<TasteProfile | null>(null);
  const [libraryVisibility, setLibraryVisibility] = useState<LibraryVisibility>({
    showLists: true,
    showFavorites: true,
    showWantToTry: true
  });
  const [profiles, setProfiles] = useState<Record<string, PublicProfile>>({});
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Navigation History
  const [routeHistory, setRouteHistory] = useState<string[]>(['tab:0']);
  const currentRoute = routeHistory[routeHistory.length - 1] || 'tab:0';

  const navigateTo = (route: string) => {
    if (routeHistory[routeHistory.length - 1] === route) return;
    setRouteHistory(prev => [...prev, route].slice(-40));
  };

  const navigateBack = () => {
    if (routeHistory.length > 1) {
      setRouteHistory(prev => prev.slice(0, -1));
    }
  };

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        setDisplayName(user.displayName || "Food explorer");
        setPhotoUrl(user.photoURL || "");
        const isComplete = await checkOnboardingComplete(user.uid);
        setOnboardingDone(isComplete);
      } else {
        setOnboardingDone(false);
        setTasteProfile(null);
        setVisits([]);
        setFavorites([]);
        setWatchlist([]);
        setLists([]);
        setFollowing([]);
        setFollowers([]);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const uid = currentUser?.uid || "";
  const isAdmin = checkIsAdmin(currentUser?.email);

  // Realtime Listeners when signed in
  useEffect(() => {
    if (!currentUser || !uid) return;

    const unsubs: (() => void)[] = [];

    // 1. User doc
    const userRef = doc(db, "users", uid);
    unsubs.push(onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const d = snapshot.data();
        if (d.displayName) setDisplayName(d.displayName);
        if (d.username) setUsername(d.username);
        if (d.bio !== undefined) setBio(d.bio);
        if (d.photoUrl) setPhotoUrl(d.photoUrl);
        if (d.onboardingComplete) setOnboardingDone(true);
      }
    }, (err) => console.error("user snapshot error:", err)));

    // 2. Saved restaurants (favorites & wantToTry)
    const savedRef = collection(db, "users", uid, "savedRestaurants");
    unsubs.push(onSnapshot(savedRef, (snapshot) => {
      const favs: string[] = [];
      const watch: string[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.favorite) favs.push(docSnap.id);
        if (data.wantToTry) watch.push(docSnap.id);
      });
      setFavorites(favs);
      setWatchlist(watch);
    }, (err) => console.error("savedRestaurants error:", err)));

    // 3. User lists
    const listRef = collection(db, "users", uid, "lists");
    unsubs.push(onSnapshot(listRef, (snapshot) => {
      const allLists: FoodList[] = [];
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        allLists.push({
          id: docSnap.id,
          title: d.title || "Untitled",
          description: d.description || "",
          eateryIds: Array.isArray(d.restaurantIds) ? d.restaurantIds : []
        });
      });
      setLists(allLists);
    }, (err) => console.error("lists error:", err)));

    // 4. My visits (reviews)
    const myReviewsQuery = query(
      collection(db, "reviews"),
      where("userId", "==", uid)
    );
    unsubs.push(onSnapshot(myReviewsQuery, (snapshot) => {
      const myVisits: Visit[] = [];
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        myVisits.push({
          id: docSnap.id,
          eateryId: d.restaurantId || "",
          rating: Number(d.rating) || 0,
          review: d.review || "",
          date: d.visitDate || "",
          tags: Array.isArray(d.tags) ? d.tags : [],
          liked: Boolean(d.liked),
          createdAt: Number(d.createdAtMillis) || Date.now(),
          photoPaths: Array.isArray(d.photoPaths) ? d.photoPaths : [],
          userId: uid
        });
      });
      myVisits.sort((a, b) => b.createdAt - a.createdAt);
      setVisits(myVisits);
    }, (err) => console.error("my reviews error:", err)));

    // 5. Public profiles (for real author display names and photos across all reviews and social pages)
    const publicProfilesRef = collection(db, "publicProfiles");
    unsubs.push(onSnapshot(publicProfilesRef, (snapshot) => {
      const map: Record<string, PublicProfile> = {};
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        map[docSnap.id] = {
          uid: docSnap.id,
          name: d.displayName || "Food explorer",
          username: d.username || "",
          bio: d.bio || "",
          photoUrl: d.photoUrl || ""
        };
      });
      setProfiles(map);
    }, (err) => console.error("publicProfiles listener error:", err)));

    // 6. All app reviews (for BiteBoxd-only rating calculation)
    const allReviewsRef = collection(db, "reviews");
    unsubs.push(onSnapshot(allReviewsRef, (snapshot) => {
      const allRev: SocialReview[] = [];
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        allRev.push({
          id: docSnap.id,
          userId: d.userId || "",
          restaurantId: d.restaurantId || "",
          rating: Number(d.rating) || 0,
          review: d.review || "",
          visitDate: d.visitDate || "",
          createdAtMillis: Number(d.createdAtMillis) || 0,
          photoPaths: Array.isArray(d.photoPaths) ? d.photoPaths : []
        });
      });
      setAppReviews(allRev);
    }, (err) => console.error("all reviews error:", err)));

    // 6. Restaurants collection (cached and custom eateries)
    const eateriesRef = collection(db, "restaurants");
    unsubs.push(onSnapshot(eateriesRef, (snapshot) => {
      const items: Eatery[] = [];
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        items.push({
          id: docSnap.id,
          name: d.name || "Unnamed restaurant",
          cuisine: d.cuisine || "Other",
          address: d.address || "",
          category: d.category || "Restaurant",
          latitude: d.latitude ?? null,
          longitude: d.longitude ?? null,
          secondaryCuisines: d.secondaryCuisines || [],
          priceTier: d.priceTier ?? null,
          estimatedCostPerPersonMin: d.estimatedCostPerPersonMin ?? null,
          estimatedCostPerPersonMax: d.estimatedCostPerPersonMax ?? null,
          currencyCode: d.currencyCode || "INR",
          dietaryCompliance: d.dietaryCompliance || {},
          vibeTags: d.vibeTags || [],
          noiseLevel: d.noiseLevel || "unknown",
          seatingTags: d.seatingTags || [],
          signatureDishKeywords: d.signatureDishKeywords || [],
          flavorTags: d.flavorTags || [],
          spicinessLevel: d.spicinessLevel ?? null,
          sweetSavoryBalance: d.sweetSavoryBalance || "unknown",
          cuisineStyle: d.cuisineStyle || "unknown",
          enrichmentConfidence: d.enrichmentConfidence ?? 0,
          mapsPresence: d.mapsPresence || null,
          coverImage: d.coverImage || undefined
        });
      });
      setEateries(items);
    }, (err) => console.error("restaurants error:", err)));

    // 7. Following list
    const followingRef = collection(db, "follows", uid, "targets");
    unsubs.push(onSnapshot(followingRef, (snapshot) => {
      const ids: string[] = [];
      snapshot.forEach(docSnap => ids.push(docSnap.id));
      ids.sort();
      setFollowing(ids);
    }, (err) => console.error("following error:", err)));

    // 8. Followers list
    const followersQuery = query(
      collectionGroup(db, "targets"),
      where("followedId", "==", uid)
    );
    unsubs.push(onSnapshot(followersQuery, (snapshot) => {
      const ids: string[] = [];
      snapshot.forEach(docSnap => {
        const followerId = (docSnap.data() as Record<string, any>)?.followerId;
        if (followerId && !ids.includes(followerId)) ids.push(followerId);
      });
      ids.sort();
      setFollowers(ids);
    }, (err) => console.error("followers error:", err)));

    // 9. Taste Profile
    const tasteRef = doc(db, "users", uid, "tasteProfiles", "current");
    unsubs.push(onSnapshot(tasteRef, (snapshot) => {
      if (snapshot.exists()) {
        const d = snapshot.data();
        setTasteProfile({
          cuisineScores: d.cuisineScores || {},
          categoryScores: d.categoryScores || {},
          topCuisines: d.topCuisines || [],
          avoidCuisines: d.avoidCuisines || [],
          topTags: d.topTags || [],
          aiSummary: d.aiSummary || "",
          aiPositive: d.aiPositive || [],
          aiNegative: d.aiNegative || [],
          confidence: Number(d.confidence) || 0,
          reviewCount: Number(d.reviewCount) || 0,
          favoriteCount: Number(d.favoriteCount) || 0,
          likedReviewCount: Number(d.likedReviewCount) || 0,
          commentCount: Number(d.commentCount) || 0,
          onboardingComplete: Boolean(d.onboardingComplete),
          dietaryRestrictions: d.dietaryRestrictions || [],
          favoriteCuisines: d.favoriteCuisines || [],
          budgetMin: Number(d.budgetMin) || 100,
          budgetMax: Number(d.budgetMax) || 5000,
          budgetHardFilter: Boolean(d.budgetHardFilter),
          budgetCurrency: d.budgetCurrency || "INR",
          shareWithFollowers: Boolean(d.shareWithFollowers),
          analyzeTextWithAi: Boolean(d.analyzeTextWithAi),
          inputHash: d.inputHash || "",
          aiInputHash: d.aiInputHash || "",
          lastAiMillis: Number(d.lastAiMillis) || 0
        });
      }
    }, (err) => console.error("tasteProfile error:", err)));

    // 10. Shared library visibility
    const sharedLibRef = doc(db, "sharedLibraries", uid);
    unsubs.push(onSnapshot(sharedLibRef, (snapshot) => {
      if (snapshot.exists()) {
        const d = snapshot.data();
        setLibraryVisibility({
          showLists: Boolean(d.showLists),
          showFavorites: Boolean(d.showFavorites),
          showWantToTry: Boolean(d.showWantToTry)
        });
      }
    }, (_err) => {
      // In Android Store.kt: if error, sets sharingStatus="Sharing settings are unavailable" and returns
      console.warn("Shared library settings currently unavailable or initializing.");
    }));

    return () => unsubs.forEach(u => u());
  }, [currentUser, uid]);

  // Dynamic Social Feed from followed users + self, enriched with profile names & avatars
  useEffect(() => {
    if (!uid || appReviews.length === 0) {
      setSocialFeed([]);
      return;
    }
    const relevantUids = new Set([...following, uid]);
    const filtered = appReviews.filter(r => relevantUids.has(r.userId)).map(r => {
      const p = profiles[r.userId];
      return {
        ...r,
        userDisplayName: r.userId === uid ? displayName : (p?.name || r.userDisplayName || 'Food explorer'),
        userPhotoUrl: r.userId === uid ? photoUrl : (p?.photoUrl || r.userPhotoUrl || ''),
        userUsername: r.userId === uid ? username : (p?.username || r.userUsername || '')
      };
    });
    filtered.sort((a, b) => b.createdAtMillis - a.createdAtMillis);
    setSocialFeed(filtered);
  }, [following, appReviews, uid, profiles, displayName, photoUrl, username]);

  // Recalculate eateries proximity when userLocation updates
  useEffect(() => {
    if (!userLocation) return;
    setEateries(prev => prev.map(e => {
      if (e.latitude != null && e.longitude != null) {
        return {
          ...e,
          distanceKm: calculateDistanceKm(userLocation.latitude, userLocation.longitude, e.latitude, e.longitude)
        };
      }
      return e;
    }));
  }, [userLocation]);

  // Attempt background location initialization on app start
  useEffect(() => {
    try {
      const cached = localStorage.getItem('biteboxd_cached_location');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.latitude && parsed.longitude) {
          setUserLocation(parsed);
          return;
        }
      }
    } catch {}
    requestUserLocation().catch(() => {});
  }, []);

  const requestUserLocation = async (): Promise<{ latitude: number; longitude: number }> => {
    if (userLocation) return userLocation;

    // 1. Try browser navigator.geolocation
    const getBrowserCoords = (): Promise<{ latitude: number; longitude: number }> => {
      return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !navigator.geolocation) {
          reject(new Error("Geolocation is not supported by your browser."));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
            resolve(loc);
          },
          (err) => reject(err),
          { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
        );
      });
    };

    try {
      const loc = await getBrowserCoords();
      setUserLocation(loc);
      try { localStorage.setItem('biteboxd_cached_location', JSON.stringify(loc)); } catch {}
      return loc;
    } catch (_browserErr) {
      console.warn("Browser geolocation prompt timed out or denied, using IP geolocation fallback...");
    }

    // 2. IP Geolocation fallback
    try {
      const res = await fetch('https://ipwho.is/');
      if (res.ok) {
        const data = await res.json();
        if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          const loc = { latitude: data.latitude, longitude: data.longitude };
          setUserLocation(loc);
          try { localStorage.setItem('biteboxd_cached_location', JSON.stringify(loc)); } catch {}
          return loc;
        }
      }
    } catch (_ipErr) {
      console.warn("IP geolocation fallback failed:", _ipErr);
    }

    // 3. LocalStorage fallback
    try {
      const cached = localStorage.getItem('biteboxd_cached_location');
      if (cached) {
        const loc = JSON.parse(cached);
        if (loc.latitude && loc.longitude) {
          setUserLocation(loc);
          return loc;
        }
      }
    } catch {}

    // 4. Default fallback coordinates
    const fallback = { latitude: 12.9716, longitude: 77.5946 };
    setUserLocation(fallback);
    return fallback;
  };

  const getProfileName = (targetUid: string): string => {
    if (!targetUid) return "Food explorer";
    if (targetUid === uid) return "You";
    return profiles[targetUid]?.name || "Food explorer";
  };

  const getProfile = (targetUid: string): PublicProfile | undefined => {
    return profiles[targetUid];
  };

  // Auth Operations
  const loginWithGoogle = async () => {
    try {
      setError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("loginWithGoogle error:", err);
      setError(err?.message || "Google sign-in failed.");
      throw err;
    }
  };

  const signOut = async () => {
    await fbSignOut(auth);
    setRouteHistory(['tab:0']);
  };

  // Helper getters
  const place = (id: string): Eatery | undefined => {
    return eateries.find(e => e.id === id);
  };

  const ratingStats = (eateryId: string): RestaurantRating => {
    const rated = appReviews.filter(r => r.restaurantId === eateryId && r.rating > 0);
    if (rated.length === 0) return { average: 0, count: 0 };
    const avg = rated.reduce((sum, r) => sum + r.rating / 2.0, 0) / rated.length;
    return {
      average: Math.round(avg * 10) / 10,
      count: rated.length
    };
  };

  const tasteMatch = (p: Eatery): number => {
    return tasteMatchScore(p, tasteProfile);
  };

  // User Actions
  const toggleFavorite = async (eateryId: string) => {
    if (!uid) return;
    const isFav = favorites.includes(eateryId);
    const docRef = doc(db, "users", uid, "savedRestaurants", eateryId);
    await setDoc(docRef, {
      restaurantId: eateryId,
      favorite: !isFav,
      addedAt: serverTimestamp()
    }, { merge: true });
  };

  const toggleWatchlist = async (eateryId: string) => {
    if (!uid) return;
    const isSaved = watchlist.includes(eateryId);
    const docRef = doc(db, "users", uid, "savedRestaurants", eateryId);
    await setDoc(docRef, {
      restaurantId: eateryId,
      wantToTry: !isSaved,
      addedAt: serverTimestamp()
    }, { merge: true });
  };

  const addReview = async (data: {
    eateryId: string;
    rating: number;
    review: string;
    visitDate: string;
    tags: string[];
    liked: boolean;
    photoBase64s?: string[];
  }) => {
    if (!uid) throw new Error("Sign in to review");
    const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const batch = writeBatch(db);

    const photos = (data.photoBase64s || []).slice(0, 5).map((b64) => {
      const imgId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const path = `reviewPhotos/${reviewId}/images/${imgId}`;
      return { path, b64 };
    });

    const reviewRef = doc(db, "reviews", reviewId);
    batch.set(reviewRef, {
      userId: uid,
      restaurantId: data.eateryId,
      rating: data.rating,
      review: data.review.slice(0, 3000),
      visitDate: data.visitDate,
      tags: data.tags.slice(0, 20),
      liked: data.liked,
      createdAtMillis: Date.now(),
      createdAt: serverTimestamp(),
      photoPaths: photos.map(p => p.path)
    });

    photos.forEach(({ path, b64 }) => {
      const photoDoc = doc(db, path);
      batch.set(photoDoc, {
        ownerId: uid,
        mimeType: "image/jpeg",
        imageBase64: b64,
        createdAt: serverTimestamp()
      });
    });

    await batch.commit();
  };

  const deleteReview = async (reviewId: string) => {
    if (!uid) return;
    const reviewDoc = await doc(db, "reviews", reviewId);
    await deleteDoc(reviewDoc);
  };

  const createCustomEatery = async (data: {
    name: string;
    cuisine: string;
    address: string;
    category?: string;
  }): Promise<Eatery> => {
    if (!uid) throw new Error("Sign in required");
    const newId = `custom:${Date.now()}`;
    const eateryRef = doc(db, "restaurants", newId);
    const newEatery: Eatery = {
      id: newId,
      name: data.name.trim().slice(0, 160),
      cuisine: data.cuisine.trim().slice(0, 100),
      address: data.address.trim().slice(0, 350),
      category: (data.category || "Restaurant").slice(0, 40),
      dietaryCompliance: {},
      vibeTags: ["Custom"],
      currencyCode: "INR"
    };

    await setDoc(eateryRef, {
      provider: "custom",
      name: newEatery.name,
      cuisine: newEatery.cuisine,
      address: newEatery.address,
      category: newEatery.category,
      createdAt: serverTimestamp()
    });

    return newEatery;
  };

  const createList = async (title: string, description: string) => {
    if (!uid || !title.trim()) return;
    const listId = `list_${Date.now()}`;
    const listRef = doc(db, "users", uid, "lists", listId);
    await setDoc(listRef, {
      title: title.trim().slice(0, 100),
      description: description.trim().slice(0, 500),
      restaurantIds: [],
      createdAt: serverTimestamp()
    });
  };

  const deleteList = async (listId: string) => {
    if (!uid) return;
    await deleteDoc(doc(db, "users", uid, "lists", listId));
  };

  const toggleListMember = async (listId: string, eateryId: string) => {
    if (!uid) return;
    const existing = lists.find(l => l.id === listId);
    if (!existing) return;
    const updatedIds = existing.eateryIds.includes(eateryId)
      ? existing.eateryIds.filter(id => id !== eateryId)
      : [...existing.eateryIds, eateryId];
    await updateDoc(doc(db, "users", uid, "lists", listId), {
      restaurantIds: updatedIds
    });
  };

  const saveProfile = async (newName: string, newBio: string) => {
    if (!uid) return;
    const cleanName = newName.trim().slice(0, 80) || "Food explorer";
    const cleanBio = newBio.trim().slice(0, 300);
    const batch = writeBatch(db);

    batch.update(doc(db, "users", uid), {
      displayName: cleanName,
      bio: cleanBio,
      updatedAt: serverTimestamp()
    });

    batch.update(doc(db, "publicProfiles", uid), {
      displayName: cleanName,
      searchName: cleanName.toLowerCase().slice(0, 80),
      bio: cleanBio
    });

    await batch.commit();
  };

  const uploadProfilePhotoBase64 = async (base64Data: string) => {
    if (!uid) return;
    const batch = writeBatch(db);
    batch.set(doc(db, "profileImages", uid), {
      ownerId: uid,
      mimeType: "image/jpeg",
      imageBase64: base64Data,
      updatedAt: serverTimestamp()
    });

    const newUrl = `firestore://profileImages/${uid}?version=${Date.now()}`;
    batch.update(doc(db, "users", uid), {
      photoUrl: newUrl,
      updatedAt: serverTimestamp()
    });
    batch.update(doc(db, "publicProfiles", uid), {
      photoUrl: newUrl
    });

    await batch.commit();
  };

  const updateTastePreferences = async (data: Partial<TasteProfile>) => {
    if (!uid) return;
    await setDoc(doc(db, "users", uid, "tasteProfiles", "current"), {
      ...data,
      updatedAt: serverTimestamp()
    }, { merge: true });
  };

  const updateLibraryVisibility = async (val: LibraryVisibility) => {
    if (!uid) return;
    await setDoc(doc(db, "sharedLibraries", uid), {
      uid,
      showLists: val.showLists,
      showFavorites: val.showFavorites,
      showWantToTry: val.showWantToTry,
      lists: val.showLists ? lists.slice(0, 100).map(l => ({
        id: l.id,
        title: l.title,
        description: l.description,
        restaurantIds: l.eateryIds.slice(0, 200)
      })) : [],
      favorites: val.showFavorites ? Array.from(new Set(favorites)).sort().slice(0, 200) : [],
      wantToTry: val.showWantToTry ? Array.from(new Set(watchlist)).sort().slice(0, 200) : []
    });
  };

  const setTasteSharing = async (val: boolean) => {
    if (!uid) return;
    await setDoc(doc(db, "users", uid, "tasteProfiles", "current"), {
      shareWithFollowers: val,
      updatedAt: serverTimestamp()
    }, { merge: true });
  };

  const toggleFollow = async (otherUid: string) => {
    if (!uid || otherUid === uid) return;
    const targetDoc = doc(db, "follows", uid, "targets", otherUid);
    if (following.includes(otherUid)) {
      await deleteDoc(targetDoc);
    } else {
      await setDoc(targetDoc, {
        followerId: uid,
        followedId: otherUid,
        createdAt: serverTimestamp()
      });
    }
  };

  const likeReview = async (reviewId: string, liked: boolean) => {
    if (!uid) return;
    const review = appReviews.find(r => r.id === reviewId);
    if (!review) return;
    const batch = writeBatch(db);
    const likeDoc = doc(db, "reviewLikes", reviewId, "users", uid);
    const mirrorDoc = doc(db, "users", uid, "likedReviews", reviewId);

    if (liked) {
      batch.set(likeDoc, { userId: uid, createdAt: serverTimestamp() });
      batch.set(mirrorDoc, { reviewId, restaurantId: review.restaurantId });
    } else {
      batch.delete(likeDoc);
      batch.delete(mirrorDoc);
    }
    await batch.commit();
  };

  const addComment = async (reviewId: string, text: string, photoBase64?: string) => {
    if (!uid || (!text.trim() && !photoBase64)) return;
    const commentId = `comm_${Date.now()}`;
    const commentDoc = doc(db, "reviewComments", reviewId, "entries", commentId);
    const photoPath = photoBase64 ? `commentPhotos/${reviewId}/images/${commentId}` : "";
    const batch = writeBatch(db);

    batch.set(commentDoc, {
      userId: uid,
      text: text.trim().slice(0, 500),
      photoPath,
      createdAtMillis: Date.now(),
      createdAt: serverTimestamp()
    });

    if (photoBase64) {
      const photoDoc = doc(db, photoPath);
      batch.set(photoDoc, {
        ownerId: uid,
        mimeType: "image/jpeg",
        imageBase64: photoBase64,
        createdAt: serverTimestamp()
      });
    }

    const review = appReviews.find(r => r.id === reviewId);
    if (review) {
      const tasteCommentDoc = doc(db, "users", uid, "tasteComments", commentId);
      batch.set(tasteCommentDoc, {
        reviewId,
        restaurantId: review.restaurantId,
        text: text.trim().slice(0, 500)
      });
    }

    await batch.commit();
  };

  const deleteComment = async (reviewId: string, commentId: string, photoPath?: string, commentAuthorId?: string) => {
    if (!uid) return;
    const author = commentAuthorId || uid;
    const batch = writeBatch(db);
    if (photoPath && photoPath === `commentPhotos/${reviewId}/images/${commentId}`) {
      batch.delete(doc(db, photoPath));
    }
    batch.delete(doc(db, "reviewComments", reviewId, "entries", commentId));
    batch.delete(doc(db, "users", author, "tasteComments", commentId));
    await batch.commit();
  };

  const searchPlaces = (q: string, cuisine?: string): Eatery[] => {
    const cleanQ = q.toLowerCase().trim();
    return eateries.filter(e => {
      const matchQ = !cleanQ || 
        e.name.toLowerCase().includes(cleanQ) || 
        e.cuisine.toLowerCase().includes(cleanQ) || 
        (e.address && e.address.toLowerCase().includes(cleanQ));
      const matchC = !cuisine || cuisine === "All" || e.cuisine.toLowerCase() === cuisine.toLowerCase();
      return matchQ && matchC;
    });
  };

  const cacheEateries = (newEateries: Eatery[]) => {
    setEateries(prev => {
      const map = new Map<string, Eatery>(prev.map(e => [e.id, e]));
      for (const ne of newEateries) {
        if (!map.has(ne.id)) {
          map.set(ne.id, ne);
        } else {
          const existing = map.get(ne.id)!;
          map.set(ne.id, {
            ...existing,
            distanceKm: ne.distanceKm ?? existing.distanceKm,
            mapsPresence: ne.mapsPresence || existing.mapsPresence,
            coverImage: ne.coverImage || existing.coverImage
          });
        }
      }
      return Array.from(map.values());
    });
  };

  const clearError = () => setError(null);

  const value: StoreContextType = {
    currentUser,
    authLoading,
    onboardingDone,
    setOnboardingDone,
    uid,
    displayName,
    username,
    bio,
    photoUrl,
    isAdmin,
    eateries,
    visits,
    lists,
    favorites,
    watchlist,
    following,
    followers,
    socialFeed,
    appReviews,
    tasteProfile,
    libraryVisibility,
    error,
    currentRoute,
    routeHistory,
    navigateTo,
    navigateBack,
    loginWithGoogle,
    signOut,
    place,
    ratingStats,
    tasteMatch,
    toggleFavorite,
    toggleWatchlist,
    addReview,
    deleteReview,
    createCustomEatery,
    createList,
    deleteList,
    toggleListMember,
    saveProfile,
    uploadProfilePhotoBase64,
    updateTastePreferences,
    updateLibraryVisibility,
    setTasteSharing,
    toggleFollow,
    likeReview,
    addComment,
    deleteComment,
    searchPlaces,
    cacheEateries,
    clearError,
    profiles,
    getProfileName,
    getProfile,
    userLocation,
    requestUserLocation
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export const useStore = (): StoreContextType => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
};
