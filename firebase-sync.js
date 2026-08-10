// ---------------------------------------------------------------------------
// Firebase sync layer — no accounts, no sign-in.
//
// Instead of authentication, each collection is identified by a short code
// the person picks themselves (e.g. "adam" or "adam-hgss"). Whoever enters
// that same code on any device reads/writes the same Firestore document.
// There is NO real security here — anyone who knows or guesses a code can
// read or edit that collection. That's an intentional simplicity trade-off
// for a personal hobby tracker, not an oversight. If you want real
// per-person security later, that's a bigger change (real auth) — ask if
// you get there.
//
// Everything in here is optional — if FIREBASE_ENABLED is false (the
// default until you set up your own project, see README.md), this module
// never loads the Firebase SDK and the app runs on localStorage alone.
//
// Data model: one Firestore document per collection code, at
//   collections/{code}
// with a single field:
//   owned: { "1": true, "2": false, ... }   // key = binder_number as string
// ---------------------------------------------------------------------------

import { firebaseConfig, FIREBASE_ENABLED } from "./firebase-config.js";

const SDK_VERSION = "10.12.2";

let db = null;
let firestoreFns = null;

export function isEnabled() {
  return FIREBASE_ENABLED;
}

export async function initFirebaseSync() {
  if (!FIREBASE_ENABLED) return;

  const { initializeApp } = await import(
    `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app.js`
  );
  firestoreFns = await import(
    `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-firestore.js`
  );

  const app = initializeApp(firebaseConfig);
  db = firestoreFns.getFirestore(app);
}

// Fetch the saved owned-map for a given collection code.
// Returns null if not enabled, no code given, or the doc doesn't exist yet.
export async function fetchRemoteOwned(code) {
  if (!FIREBASE_ENABLED || !code) return null;
  const ref = firestoreFns.doc(db, "collections", code);
  const snap = await firestoreFns.getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data().owned || null;
}

// Persist the full owned-map under a given collection code.
// No-ops silently if sync isn't enabled/no code set — callers don't need to
// branch on that, localStorage is always the fallback source of truth.
export async function pushRemoteOwned(code, ownedMap) {
  if (!FIREBASE_ENABLED || !code) return;
  const ref = firestoreFns.doc(db, "collections", code);
  await firestoreFns.setDoc(ref, { owned: ownedMap, updatedAt: Date.now() }, { merge: true });
}
