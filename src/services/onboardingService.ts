import { 
  db, 
  auth, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  collectionGroup, 
  query, 
  where, 
  getDocs, 
  runTransaction, 
  serverTimestamp 
} from './firebase';
import { normalizeUsername, onboardingDietaryOptions, onboardingCuisineOptions } from '../types';

export const USERNAME_REGEX = /^[a-z0-9._]{3,20}$/;

export interface OnboardingPreferencesInput {
  dietaryRestrictions: string[];
  favoriteCuisines: string[];
  budgetMin: number;
  budgetMax: number;
  budgetHardFilter: boolean;
  budgetCurrency?: string;
}

export async function checkOnboardingComplete(uid: string): Promise<boolean> {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (!userDoc.exists()) return false;
    const data = userDoc.data();
    return Boolean(data.onboardingComplete) && Boolean(data.username);
  } catch (err) {
    console.error("checkOnboardingComplete error:", err);
    return false;
  }
}

export async function isUsernameAvailable(raw: string, currentUid: string): Promise<boolean> {
  const username = normalizeUsername(raw);
  if (!USERNAME_REGEX.test(username)) return false;
  try {
    const userDoc = await getDoc(doc(db, "usernames", username));
    if (!userDoc.exists()) return true;
    return userDoc.data()?.uid === currentUid;
  } catch (err) {
    console.error("isUsernameAvailable error:", err);
    return false;
  }
}

export async function completeOnboarding(
  uid: string, 
  usernameInput: string, 
  preferences: OnboardingPreferencesInput
): Promise<void> {
  const username = normalizeUsername(usernameInput);
  if (!USERNAME_REGEX.test(username)) {
    throw new Error("Username must be 3–20 characters using lowercase letters, numbers, dots, or underscores.");
  }
  if (preferences.favoriteCuisines.length !== 3) {
    throw new Error("Choose exactly 3 favorite cuisines.");
  }
  if (preferences.budgetMin < 100 || preferences.budgetMax > 5000 || preferences.budgetMin > preferences.budgetMax) {
    throw new Error("Choose a valid budget range between ₹100 and ₹5,000.");
  }

  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Please sign in again to continue.");

  const userRef = doc(db, "users", uid);
  const usernameRef = doc(db, "usernames", username);
  const tasteRef = doc(db, "users", uid, "tasteProfiles", "current");
  const publicRef = doc(db, "publicProfiles", uid);

  await runTransaction(db, async (tx) => {
    const usernameDoc = await tx.get(usernameRef);
    const userDoc = await tx.get(userRef);
    const tasteDoc = await tx.get(tasteRef);

    if (usernameDoc.exists() && usernameDoc.data()?.uid !== uid) {
      throw new Error("That username is already taken.");
    }

    const userData = userDoc.data() || {};
    const displayName = (userData.displayName || currentUser.displayName || "Food explorer").trim().slice(0, 80);
    const bio = (userData.bio || "").trim().slice(0, 300);
    const photoUrl = (userData.photoUrl || currentUser.photoURL || "").slice(0, 2048);
    const createdAt = userData.createdAt || serverTimestamp();
    const email = currentUser.email || "";

    // 1. Update user account
    tx.set(userRef, {
      displayName,
      username,
      bio,
      photoUrl,
      email,
      onboardingComplete: true,
      createdAt,
      updatedAt: serverTimestamp()
    }, { merge: true });

    // 2. Reserve username
    if (!usernameDoc.exists()) {
      tx.set(usernameRef, {
        uid,
        createdAt: serverTimestamp()
      });
    }

    // 3. Public search profile
    tx.set(publicRef, {
      uid,
      displayName,
      searchName: displayName.toLowerCase().slice(0, 80),
      username,
      searchUsername: username,
      bio,
      photoUrl
    });

    // 4. Initial taste profile document
    const oldTaste = tasteDoc.data() || {};
    tx.set(tasteRef, {
      uid,
      version: 2,
      cuisineScores: oldTaste.cuisineScores || {},
      categoryScores: oldTaste.categoryScores || {},
      topCuisines: oldTaste.topCuisines || preferences.favoriteCuisines,
      avoidCuisines: oldTaste.avoidCuisines || [],
      topTags: oldTaste.topTags || [],
      aiSummary: oldTaste.aiSummary || "",
      aiPositive: oldTaste.aiPositive || [],
      aiNegative: oldTaste.aiNegative || [],
      confidence: oldTaste.confidence ?? 25,
      reviewCount: oldTaste.reviewCount ?? 0,
      favoriteCount: oldTaste.favoriteCount ?? 0,
      likedReviewCount: oldTaste.likedReviewCount ?? 0,
      commentCount: oldTaste.commentCount ?? 0,
      shareWithFollowers: oldTaste.shareWithFollowers ?? false,
      analyzeTextWithAi: oldTaste.analyzeTextWithAi ?? false,
      inputHash: "0".repeat(64),
      aiInputHash: "",
      lastAiMillis: oldTaste.lastAiMillis ?? 0,
      onboardingComplete: true,
      dietaryRestrictions: preferences.dietaryRestrictions,
      favoriteCuisines: preferences.favoriteCuisines,
      budgetMin: preferences.budgetMin,
      budgetMax: preferences.budgetMax,
      budgetHardFilter: preferences.budgetHardFilter,
      budgetCurrency: preferences.budgetCurrency || "INR",
      updatedAt: serverTimestamp()
    });
  });
}
