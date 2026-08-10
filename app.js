import {
  initFirebaseSync,
  isEnabled as firebaseEnabled,
  fetchRemoteOwned,
  pushRemoteOwned,
} from "./firebase-sync.js";

const LOCAL_KEY = "hgss_owned_v1";
const CODE_KEY = "hgss_sync_code";

/** @type {Array<Object>} */
let allRows = [];
/** @type {Record<string, boolean>} */
let ownedMap = {};
let activeTypes = new Set();
/** @type {string} empty string = not syncing, local-only */
let syncCode = "";

const el = (id) => document.getElementById(id);

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
async function boot() {
  ownedMap = loadLocalOwned();
  syncCode = localStorage.getItem(CODE_KEY) || "";
  el("syncCodeInput").value = syncCode;

  const res = await fetch("app_data.json");
  allRows = await res.json();

  buildRarityOptions();
  buildTypeChips();
  wireControls();
  render();

  await initFirebaseSync();
  updateSyncStatusUI();

  if (syncCode) await syncFromRemote(syncCode);
}

function loadLocalOwned() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalOwned() {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(ownedMap));
}

// ---------------------------------------------------------------------------
// Code-based Firebase sync (no accounts, no sign-in — see firebase-sync.js)
// ---------------------------------------------------------------------------
async function syncFromRemote(code) {
  const remote = await fetchRemoteOwned(code);
  if (remote) {
    // Remote is treated as the source of truth once a code is set on a
    // device — simplest model. If this device has local data you want to
    // keep instead, use Export first, set the code, then Import.
    ownedMap = remote;
    saveLocalOwned();
    render();
  } else {
    // Nobody has ever synced under this code yet — push whatever is local
    // so the code has something in it from now on.
    await pushRemoteOwned(code, ownedMap);
  }
}

function setSyncCode(code) {
  syncCode = code.trim();
  if (syncCode) {
    localStorage.setItem(CODE_KEY, syncCode);
  } else {
    localStorage.removeItem(CODE_KEY);
  }
  updateSyncStatusUI();
  if (syncCode) syncFromRemote(syncCode);
}

function updateSyncStatusUI() {
  const status = el("syncStatus");

  if (!firebaseEnabled()) {
    status.textContent = "Cloud sync not configured — saving to this device only";
    return;
  }
  if (syncCode) {
    status.textContent = `Syncing under code "${syncCode}"`;
  } else {
    status.textContent = "No sync code set — saving to this device only";
  }
}

// ---------------------------------------------------------------------------
// Derived fields / helpers
// ---------------------------------------------------------------------------
function groupType(row) {
  if (row.supertype === "Pokémon" && row.types && row.types.length) {
    return row.types[0];
  }
  return row.supertype || "Other";
}

function cardNumSortKey(row) {
  const n = Number(row.card_number);
  return Number.isFinite(n) ? n : 9999; // secret rare sorts last
}

function isOwned(row) {
  return !!ownedMap[String(row.binder_number)];
}

function setOwned(row, value) {
  ownedMap[String(row.binder_number)] = value;
  saveLocalOwned();
  if (syncCode) pushRemoteOwned(syncCode, ownedMap);
}

// ---------------------------------------------------------------------------
// Filter option population
// ---------------------------------------------------------------------------
function buildRarityOptions() {
  const rarities = [...new Set(allRows.map((r) => r.rarity))].sort();
  const sel = el("rarityFilter");
  for (const r of rarities) {
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = r;
    sel.appendChild(opt);
  }
}

function buildTypeChips() {
  const types = [...new Set(allRows.map(groupType))].sort();
  const bar = el("typeChipBar");
  bar.innerHTML = "";
  for (const t of types) {
    const chip = document.createElement("button");
    chip.className = "type-chip";
    chip.textContent = t;
    chip.dataset.type = t;
    chip.addEventListener("click", () => {
      if (activeTypes.has(t)) activeTypes.delete(t);
      else activeTypes.add(t);
      chip.classList.toggle("active");
      render();
    });
    bar.appendChild(chip);
  }
}

// ---------------------------------------------------------------------------
// Filtering + sorting
// ---------------------------------------------------------------------------
function getFiltered() {
  const search = el("searchInput").value.trim().toLowerCase();
  const status = el("statusFilter").value;
  const variant = el("variantFilter").value;
  const rarity = el("rarityFilter").value;
  const alpha = el("alphaFilter").value;

  return allRows.filter((row) => {
    if (search) {
      const hay = `${row.name} ${row.card_number}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    if (status === "have" && !isOwned(row)) return false;
    if (status === "need" && isOwned(row)) return false;
    if (variant !== "all" && row.variant !== variant) return false;
    if (rarity !== "all" && row.rarity !== rarity) return false;
    if (activeTypes.size > 0 && !activeTypes.has(groupType(row))) return false;
    if (alpha !== "all") {
      const first = (row.name[0] || "").toUpperCase();
      if (alpha === "AM" && !(first >= "A" && first <= "M")) return false;
      if (alpha === "NZ" && !(first >= "N" && first <= "Z")) return false;
    }
    return true;
  });
}

function getSorted(rows) {
  const sortMode = el("sortSelect").value;
  const copy = [...rows];
  switch (sortMode) {
    case "type-alpha":
      copy.sort((a, b) => {
        const ta = groupType(a), tb = groupType(b);
        if (ta !== tb) return ta.localeCompare(tb);
        if (a.name !== b.name) return a.name.localeCompare(b.name);
        return a.binder_number - b.binder_number;
      });
      break;
    case "alpha":
      copy.sort((a, b) => {
        if (a.name !== b.name) return a.name.localeCompare(b.name);
        return a.binder_number - b.binder_number;
      });
      break;
    case "cardnum":
      copy.sort((a, b) => {
        const diff = cardNumSortKey(a) - cardNumSortKey(b);
        return diff !== 0 ? diff : a.binder_number - b.binder_number;
      });
      break;
    default: // binder
      copy.sort((a, b) => a.binder_number - b.binder_number);
  }
  return copy;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
function render() {
  const filtered = getSorted(getFiltered());
  const grid = el("cardGrid");
  grid.innerHTML = "";

  el("emptyState").classList.toggle("hidden", filtered.length !== 0);
  el("resultsMeta").textContent = `Showing ${filtered.length} of ${allRows.length} variant slots`;

  const frag = document.createDocumentFragment();
  for (const row of filtered) {
    frag.appendChild(renderCard(row));
  }
  grid.appendChild(frag);

  renderProgress();
}

function renderCard(row) {
  const owned = isOwned(row);

  const tile = document.createElement("div");
  tile.className = "card-tile" + (owned ? " owned" : "");

  const thumbWrap = document.createElement("div");
  thumbWrap.className = "card-thumb-wrap";

  const img = document.createElement("img");
  img.loading = "lazy";
  img.src = row.image_small || "";
  img.alt = `${row.name} (${row.variant})`;
  img.addEventListener("error", () => {
    img.classList.add("img-error");
    img.alt = "";
    img.removeAttribute("src");
  }, { once: true });
  thumbWrap.appendChild(img);

  if (!row.image_small) thumbWrap.classList.add("no-image");

  const binderBadge = document.createElement("span");
  binderBadge.className = "binder-badge";
  binderBadge.textContent = `#${row.binder_number}`;
  thumbWrap.appendChild(binderBadge);

  const variantBadge = document.createElement("span");
  variantBadge.className = "variant-badge";
  variantBadge.textContent = row.variant;
  thumbWrap.appendChild(variantBadge);

  thumbWrap.addEventListener("click", () => openLightbox(row));

  const info = document.createElement("div");
  info.className = "card-info";

  const name = document.createElement("div");
  name.className = "card-name";
  name.textContent = row.name;

  const meta = document.createElement("div");
  meta.className = "card-meta";
  meta.textContent = `Card #${row.card_number} · ${row.rarity} · ${groupType(row)}`;

  info.appendChild(name);
  info.appendChild(meta);

  const toggle = document.createElement("button");
  toggle.className = "owned-toggle" + (owned ? " is-owned" : "");
  toggle.textContent = owned ? "✓ Have it" : "Need it";
  toggle.addEventListener("click", () => {
    const next = !isOwned(row);
    setOwned(row, next);
    tile.classList.toggle("owned", next);
    toggle.classList.toggle("is-owned", next);
    toggle.textContent = next ? "✓ Have it" : "Need it";
    renderProgress();
  });

  tile.appendChild(thumbWrap);
  tile.appendChild(info);
  tile.appendChild(toggle);
  return tile;
}

function renderProgress() {
  const owned = allRows.filter(isOwned).length;
  const pct = allRows.length ? Math.round((owned / allRows.length) * 100) : 0;
  el("progressFill").style.width = `${pct}%`;
  el("progressText").textContent = `${owned} / ${allRows.length} collected`;
}

// ---------------------------------------------------------------------------
// Lightbox
// ---------------------------------------------------------------------------
function openLightbox(row) {
  el("lightboxImg").src = row.image_large || row.image_small || "";
  el("lightboxImg").alt = row.name;
  el("lightbox").classList.remove("hidden");
}
function closeLightbox() {
  el("lightbox").classList.add("hidden");
  el("lightboxImg").src = "";
}

// ---------------------------------------------------------------------------
// Export / Import
// ---------------------------------------------------------------------------
function exportBackup() {
  const payload = {
    exportedAt: new Date().toISOString(),
    schema: "hgss-tracker-v1",
    owned: ownedMap,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hgss-collection-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const incoming = parsed.owned || parsed; // accept either wrapped or raw map
      ownedMap = { ...ownedMap, ...incoming };
      saveLocalOwned();
      if (syncCode) pushRemoteOwned(syncCode, ownedMap);
      render();
      alert("Backup imported.");
    } catch (e) {
      alert("That file didn't look like a valid backup: " + e.message);
    }
  };
  reader.readAsText(file);
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------
function wireControls() {
  [
    "searchInput", "statusFilter", "variantFilter",
    "rarityFilter", "alphaFilter", "sortSelect",
  ].forEach((id) => {
    const node = el(id);
    node.addEventListener(id === "searchInput" ? "input" : "change", render);
  });

  el("clearFiltersBtn").addEventListener("click", () => {
    el("searchInput").value = "";
    el("statusFilter").value = "all";
    el("variantFilter").value = "all";
    el("rarityFilter").value = "all";
    el("alphaFilter").value = "all";
    el("sortSelect").value = "binder";
    activeTypes.clear();
    document.querySelectorAll(".type-chip.active").forEach((c) => c.classList.remove("active"));
    render();
  });

  el("syncCodeBtn").addEventListener("click", () => {
    setSyncCode(el("syncCodeInput").value);
  });
  el("syncCodeInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") setSyncCode(el("syncCodeInput").value);
  });

  el("exportBtn").addEventListener("click", exportBackup);
  el("importInput").addEventListener("change", (e) => {
    if (e.target.files[0]) importBackup(e.target.files[0]);
    e.target.value = "";
  });

  el("lightboxClose").addEventListener("click", closeLightbox);
  el("lightbox").addEventListener("click", (e) => {
    if (e.target.id === "lightbox") closeLightbox();
  });
}

boot();
