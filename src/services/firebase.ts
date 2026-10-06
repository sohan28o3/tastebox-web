import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp, 
  writeBatch, 
  runTransaction,
  collectionGroup,
  startAt,
  endAt
} from 'firebase/firestore';

// Web Firebase config for project tasteboxdv1
export const firebaseConfig = {
  apiKey: "AIzaSyCDVqMvCHYpKr2Nfgy6PS3yNrvKgX2SNhE",
  authDomain: "tasteboxdv1.firebaseapp.com",
  projectId: "tasteboxdv1",
  storageBucket: "tasteboxdv1.firebasestorage.app",
  messagingSenderId: "528530616026",
  appId: "1:528530616026:web:650a027fe2fd326acb7fe3"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const adminEmails = ['chid36727@gmail.com', 'sohanmutra28@gmail.com'];

export function checkIsAdmin(email?: string | null): boolean {
  if (!email) return false;
  return adminEmails.includes(email.toLowerCase());
}

export {
  app,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  runTransaction,
  collectionGroup,
  startAt,
  endAt,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  fbSignOut,
  onAuthStateChanged
};
export type { User };
