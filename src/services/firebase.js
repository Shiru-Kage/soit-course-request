// Firebase Firestore Cloud Integration - Silent Background Configuration
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs, 
  getDoc,
  writeBatch
} from 'firebase/firestore';

// Configuration loaded securely from environment variables (or Mapua project defaults)
export const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCkZSiWHLb8qrzUAiocgrijAaQ5dujYJWo",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mapua-schedpoint.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mapua-schedpoint",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mapua-schedpoint.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "670467479029",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:670467479029:web:5a91bb3e3cd85ca51bbcbc"
};

export function getFirebaseDb() {
  if (!FIREBASE_CONFIG || !FIREBASE_CONFIG.apiKey || !FIREBASE_CONFIG.projectId) {
    return null;
  }

  try {
    const app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApp();
    return getFirestore(app);
  } catch (err) {
    console.error('Failed to initialize Firebase:', err);
    return null;
  }
}

export {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDoc,
  writeBatch
};
