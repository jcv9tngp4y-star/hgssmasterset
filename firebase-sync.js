// ---------------------------------------------------------------------------
// Firebase sync layer.
//
// Everything in here is optional — if FIREBASE_ENABLED is false (the default
// until you set up your own project, see README.md), this module never loads
// the Firebase SDK and the app runs on localStorage alone.
//
// Data model: one Firestore document per signed-in user, at
//   users/{uid}
// with a single field:
//   owned: { "1": true, "2": false, ... }   // key = binder_number as string
// ---------------------------------------------------------------------------

import { firebaseConfig, FIREBASE_ENABLED } from "./firebase-config.js";

const SDK_VERSION = "10.12.2";

let auth = null;
let db = null;
let currentUser = null;
let firestoreFns = null;
let authFns = null;

export function isEnabled() {
  return FIREBASE_ENABLED;
}

export async function initFirebaseSync({ onAuthChange }) {
  if (!FIREBASE_ENABLED) return;

  const { initializeApp } = await import(
    `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app.js`
  );
  authFns = await import(
    `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-auth.js`
  );
  firestoreFns = await import(
    `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-firestore.js`
  );

  const app = initializeApp(firebaseConfig);
  auth = authFns.getAuth(app);
  db = firestoreFns.getFirestore(app);

  authFns.onAuthStateChanged(auth, (user) => {
    currentUser = user;
    onAuthChange(user);
  });
}

export async function signIn() {
  if (!FIREBASE_ENABLED) {
    alert(
      "Cloud sync isn't set up yet for this copy of the app.\n\n" +
      "It still works fine on this device using local storage.\n" +
      "See README.md if you want to enable sign-in + cross-device sync."
    );
    return;
  }
  const provider = new authFns.GoogleAuthProvider();
  await authFns.signInWithPopup(auth, provider);
}

export async function signOutUser() {
  if (!FIREBASE_ENABLED || !auth) return;
  await authFns.signOut(auth);
}

export function getCurrentUser() {
  return currentUser;
}

// Fetch the signed-in user's saved owned-map from Firestore.
// Returns null if not signed in, not enabled, or the doc doesn't exist yet.
export async function fetchRemoteOwned() {
  if (!FIREBASE_ENABLED || !currentUser) return null;
  const ref = firestoreFns.doc(db, "users", currentUser.uid);
  const snap = await firestoreFns.getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data().owned || null;
}

// Persist the full owned-map for the signed-in user.
// No-ops silently if sync isn't enabled/signed in — callers don't need to
// branch on that, localStorage is always the fallback source of truth.
export async function pushRemoteOwned(ownedMap) {
  if (!FIREBASE_ENABLED || !currentUser) return;
  const ref = firestoreFns.doc(db, "users", currentUser.uid);
  await firestoreFns.setDoc(ref, { owned: ownedMap, updatedAt: Date.now() }, { merge: true });
}
