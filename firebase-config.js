// ---------------------------------------------------------------------------
// Firebase Web Config
// ---------------------------------------------------------------------------
// This object is NOT secret — Firebase's own docs confirm the web config is
// safe to expose publicly and commit to a public repo. Security is enforced
// by Firestore security rules (see firestore.rules), not by hiding this file.
//
// Get these values from: Firebase Console → Project settings → General →
// "Your apps" → Web app → SDK setup and configuration → Config.
//
// Until you fill these in, the app still works fully using local
// browser storage only — you just won't get cross-device sync.
// See README.md for the full setup walkthrough.
// ---------------------------------------------------------------------------

export const firebaseConfig = {
  apiKey: "AIzaSyD59sZELzNM_Fc8O7S4mH1rj76hz2s8WMs",
  authDomain: "hgss-collection.firebaseapp.com",
  projectId: "hgss-collection",
  storageBucket: "hgss-collection.firebasestorage.app",
  messagingSenderId: "723676194",
  appId: "1:723676194:web:f43e0e9a5fb5956006ee7b",
};

export const FIREBASE_ENABLED = true;
