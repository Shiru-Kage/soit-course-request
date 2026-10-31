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
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBUIMVm-X3tHDGHRcMNUzMx6eRsiT_D9bQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "soit-course-request.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "soit-course-request",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "soit-course-request.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "196546918268",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:196546918268:web:46f29b819165c9539856f9"
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
