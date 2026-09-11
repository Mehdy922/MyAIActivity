import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, onValue } from "firebase/database";
import { firebaseConfig } from "./firebaseConfig.js";

export function isConfigured(cfg = firebaseConfig) {
  const vals = Object.values(cfg || {});
  return vals.length > 0 && vals.every((v) => typeof v === "string" && v.length > 0 && !v.includes("PASTE"));
}

let cached = null;
export function getFirebase() {
  if (!cached) {
    const app = getApps()[0] || initializeApp(firebaseConfig);
    cached = { app, auth: getAuth(app), db: getDatabase(app) };
  }
  return cached;
}

// Resolves with the anonymous uid. Rejects if Anonymous sign-in is not enabled in the console.
// One in-flight promise for the whole app: React StrictMode double-runs effects in dev, and two
// concurrent signInAnonymously calls would create two users and desync uid from auth.currentUser.
let authPromise = null;
export function ensureAuth() {
  if (authPromise) return authPromise;
  const { auth } = getFirebase();
  authPromise = new Promise((resolve, reject) => {
    const off = onAuthStateChanged(
      auth,
      (user) => {
        if (user) { off(); resolve(user.uid); return; }
        signInAnonymously(auth).catch((e) => { off(); authPromise = null; reject(e); });
      },
      (e) => { off(); authPromise = null; reject(e); }
    );
  });
  return authPromise;
}

export function subscribe(path, cb, onError) {
  const { db } = getFirebase();
  return onValue(ref(db, path), (snap) => cb(snap.val()), onError);
}
