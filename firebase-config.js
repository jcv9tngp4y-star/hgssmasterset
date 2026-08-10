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
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// Flip this to true only after you've pasted real values above.
export const FIREBASE_ENABLED = false;
