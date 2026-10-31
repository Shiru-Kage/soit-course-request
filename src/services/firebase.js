// Firebase Firestore Cloud Integration
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

const STORAGE_KEY = 'soit_enrollment_firebase_config';

// Default config (matching the user's Mapua ecosystem or can be overridden via UI/Env)
export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCkZSiWHLb8qrzUAiocgrijAaQ5dujYJWo",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mapua-schedpoint.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mapua-schedpoint",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mapua-schedpoint.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "670467479029",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:670467479029:web:5a91bb3e3cd85ca51bbcbc"
};

export function getSavedFirebaseConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading Firebase config from localStorage:', e);
  }
  return DEFAULT_FIREBASE_CONFIG;
}

export function saveFirebaseConfig(config) {
  try {
    if (!config) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Error saving Firebase config:', e);
  }
}

export function getFirebaseDb() {
  const config = getSavedFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId) {
    return null;
  }

  try {
    const app = getApps().length === 0 ? initializeApp(config) : getApp();
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

