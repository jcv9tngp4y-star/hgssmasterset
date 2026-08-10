# HeartGold & SoulSilver Collection Tracker

A personal, single-user web app for tracking which cards you have/need from
the HeartGold & SoulSilver base set — 229 trackable variants (every
Non-Holo / Holo / Reverse Holo printing of all 123 numbered cards plus the
Alph Lithograph secret rare). Built to make it fast to filter down to
exactly what you're hunting for when you're standing in front of a shop's
bulk binders.

It's a static site: no server, no build step, three files of real code
(`index.html`, `css/style.css`, `js/*.js`) plus a data file. It runs
entirely in the browser and works immediately with local-only storage; the
Firebase pieces below are optional and only needed if you want your
have/need list to follow you between your phone and your laptop.

## Features

- Multi-filter: text search, Pokémon type (chips, multi-select), have/need
  status, variant (Non-Holo / Holo / Reverse Holo), rarity.
- **Alpha-half filter (A–M / N–Z)** — for matching a shop's binder split
  when they store one type across two binders by first letter.
- Sort by binder order, card number, alphabetical, or **type then
  alphabetical** (groups by type first, A–Z within each type).
- Card images (pulled live from the public Pokémon TCG API — nothing to
  host yourself), tap/click to zoom.
- Progress bar (X / 229 collected).
- Export/Import a JSON backup of your progress at any time — works with or
  without Firebase, and is your safety net either way.
- Optional: cross-device sync via a self-chosen "sync code" — no accounts,
  no sign-in. Type the same code on two devices and they share progress.

## 1. Put the code on GitHub

If you're comfortable with git:

```bash
cd hgss-tracker
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

If you'd rather not touch git at all: create a new **empty** repository on
github.com (don't let it auto-add a README/.gitignore), then on the repo
page use **"Add file → Upload files"** and drag in this entire folder's
contents (keeping the `css/`, `js/`, and `data/` subfolders intact).

## 2. Turn on GitHub Pages

In your repo: **Settings → Pages → Build and deployment → Source: "Deploy
from a branch" → Branch: `main`, folder `/ (root)` → Save.**

GitHub gives you a URL like `https://<your-username>.github.io/<repo-name>/`
— it usually takes a minute or two to go live the first time.

At this point the app already works — open the URL and you should see the
full set with images, filtering, and sorting. Have/need status saves to
that browser only until you do the Firebase steps below.

## 3. (Optional) Set up Firebase for cross-device sync — no accounts needed

All free, no credit card needed for this scale of use. This version
deliberately skips sign-in entirely: instead, you (and anyone else who
wants their own tracker) just pick a short code, like a nickname. Typing
the same code into the app on two devices syncs them together. **Be aware:
there is no real security here** — anyone who knows or guesses a code can
read or edit that collection. Fine for a personal hobby tool shared with
people you trust with the code; don't use this pattern for anything
sensitive.

1. Go to **[console.firebase.google.com](https://console.firebase.google.com)**
   → **Add project** → give it any name → you can decline Google Analytics,
   you don't need it.
2. Inside the project: click the **`</>`  (Web)** icon to register a web
   app. Give it a nickname, skip Firebase Hosting (you're using GitHub
   Pages). It'll show you a `firebaseConfig` object — keep this tab open,
   you'll copy values from it in step 4.
3. In the left sidebar: **Build → Firestore Database → Create database** →
   choose a region close to you → start in **production mode** (the rules
   file below locks it down appropriately regardless). Once created, go to
   the **Rules** tab, delete the default contents, and paste in everything
   from this repo's `firestore.rules` file, then **Publish**.
4. Back in the project: **Project settings (gear icon) → General → Your
   apps** → copy the `firebaseConfig` values into `js/firebase-config.js` in
   this repo (replace every `"YOUR_..."` placeholder), and change
   `FIREBASE_ENABLED` from `false` to `true` at the bottom of that file.
5. Commit and push that change (upload it the same way you did before, it'll
   overwrite the old copy). Once GitHub Pages redeploys (usually under a
   minute), reload your live site — type any code into the "Sync code" box
   in the header and click **Set code**. That code is now yours; type the
   exact same code into the app on your other device (phone, laptop,
   whatever) and it'll pick up the same have/need list.

No Authentication setup, no authorized domains, no popups — that's the
whole point of this version.

This is well within Firebase's free "Spark" tier for a single person's use
(Firestore's free tier alone is 50,000 reads and 20,000 writes *per day* —
checking off cards a few hundred times a week doesn't come close).

## 4. Data source & attribution

`data/app_data.json` was built from a checklist I verified against
Bulbapedia, Serebii, TCGCollector, and marketplace listings (see the
research notes from our conversation), then enriched with each card's
Pokémon type and image URL from the [Pokémon TCG API](https://pokemontcg.io).
Images are hotlinked from `images.pokemontcg.io` at runtime — nothing is
stored in this repo, so there's no copyright/storage concern on your end,
but it does mean the app needs a network connection to show images (the
data and filtering itself work fine offline once the page is loaded).

This is an unofficial personal project — not affiliated with, endorsed by,
or sponsored by The Pokémon Company, Nintendo, Creatures Inc., or Game
Freak.

## 5. Troubleshooting

- **Images not loading:** check your browser console — if
  `images.pokemontcg.io` requests are failing entirely, that free image
  host may be temporarily down; try again later. This doesn't affect
  filtering/tracking, only the pictures.
- **Set a code but nothing syncs / "permission denied" in console:** double
  check you pasted `firestore.rules` exactly and clicked Publish, and that
  `FIREBASE_ENABLED` is actually `true` in `js/firebase-config.js` (and that
  you uploaded that change).
- **Two devices show different data after both have a code set:** whichever
  device sets the code *second* pulls down whatever's already saved under
  that code (and overwrites its own local copy) — so set the code on your
  "main" device first, check it looks right, then set the same code on
  other devices.
- **Lost your local progress somehow:** if you ever exported a backup,
  use **Import backup** — it merges into whatever's currently loaded
  rather than replacing it outright.
