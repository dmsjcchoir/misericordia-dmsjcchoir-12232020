const APP_VERSION = "v1.0.1"; // Update this to match your CACHE_NUMBER / sw.js version

const LANGUAGE_CATEGORIES = [
  "English",
  "Tagalog",
  "Cebuano",
  "Latin",
  "Multilingual"
];

const MASS_CATEGORIES = [
  "Entrance",
  "Kyrie",
  "Gloria",
  "Gospel Acclamation",
  "Offertory",
  "Sanctus",
  "Mysterium Fidei",
  "Pater Noster",
  "Agnus Dei",
  "Communion",
  "Recessional"
];

const SEASON_CATEGORIES = [
  "Advent",
  "Christmas",
  "Lent",
  "Easter",
  "Specials"
];

const STORAGE_KEYS = {
  darkMode: "misericordia_dark_mode",
  fontSize: "misericordia_font_size",
  favorites: "misericordia_favorites"
};

const songCatalog = Array.isArray(window.songs)
  ? window.songs
  : typeof songs !== "undefined"
    ? songs
    : [];

let activeGroup = "all"; // "all" | "mass" | "season" | "favorites"
let appliedFilterGroup = null; // null | "all" | "mass" | "season" | "favorites"
let appliedSubCategory = null;
let searchQuery = "";
let favoriteTitles = loadFavorites();
let confirmClearFavorites = false;
let confirmClearTimeoutId = null;

function loadFavorites() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.favorites);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((title) => typeof title === "string") : [];
  } catch (_) {
    return [];
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(favoriteTitles));
  } catch (_) {
    // Ignore storage errors in restricted browsing modes
  }
}

function resetClearFavoritesConfirmation() {
  confirmClearFavorites = false;
  if (confirmClearTimeoutId) {
    clearTimeout(confirmClearTimeoutId);
    confirmClearTimeoutId = null;
  }
}

function isFavoriteSong(songTitle) {
  return favoriteTitles.includes(songTitle);
}

function toggleFavoriteSong(songTitle) {
  if (isFavoriteSong(songTitle)) {
    favoriteTitles = favoriteTitles.filter((title) => title !== songTitle);
  } else {
    favoriteTitles.push(songTitle);
  }
  resetClearFavoritesConfirmation();
  saveFavorites();
}

function clearAllFavorites() {
  favoriteTitles = [];
  resetClearFavoritesConfirmation();
  saveFavorites();
}

const searchInput = document.getElementById("search-input");
const songListEl = document.getElementById("song-list");

// Search wrapper & clear button setup
let searchWrapperEl = searchInput?.closest(".search-wrapper") || null;
let clearSearchBtnEl = document.getElementById("clear-search-btn");

if (searchInput && !searchWrapperEl) {
  searchWrapperEl = document.createElement("div");
  searchWrapperEl.className = "search-wrapper";
  searchInput.insertAdjacentElement("beforebegin", searchWrapperEl);
  searchWrapperEl.appendChild(searchInput);
}

if (searchInput && searchWrapperEl && !clearSearchBtnEl) {
  clearSearchBtnEl = document.createElement("button");
  clearSearchBtnEl.type = "button";
  clearSearchBtnEl.id = "clear-search-btn";
  clearSearchBtnEl.className = "clear-search-btn";
  clearSearchBtnEl.setAttribute("aria-label", "Clear search");
  clearSearchBtnEl.hidden = true;
  clearSearchBtnEl.innerHTML = "&times;";
  searchWrapperEl.appendChild(clearSearchBtnEl);
}

function updateClearSearchButton() {
  if (!clearSearchBtnEl || !searchInput) return;
  clearSearchBtnEl.hidden = searchInput.value.length === 0;
}

// Drawer & settings elements
const menuBtn = document.getElementById("menu-btn");
const closeDrawerBtn = document.getElementById("close-drawer-btn");
const sideDrawerEl = document.getElementById("side-drawer");
const drawerBackdropEl = document.getElementById("drawer-backdrop");
const darkModeToggleEl = document.getElementById("dark-mode-toggle");
const fontSizeSelectEl = document.getElementById("font-size-select");
const refreshCacheBtnEl = document.getElementById("refresh-cache-btn");

// Create containers dynamically if they aren't in index.html yet
let mainFiltersEl = document.getElementById("main-filters");
let subFiltersEl = document.getElementById("sub-filters");
let favoritesActionsEl = document.getElementById("favorites-actions");
let songViewerEl = document.getElementById("song-viewer");

if (!mainFiltersEl) {
  mainFiltersEl = document.createElement("div");
  mainFiltersEl.id = "main-filters";
  (searchWrapperEl || searchInput).insertAdjacentElement("afterend", mainFiltersEl);
}

if (!subFiltersEl) {
  subFiltersEl = document.createElement("div");
  subFiltersEl.id = "sub-filters";
  mainFiltersEl.insertAdjacentElement("afterend", subFiltersEl);
}

if (!favoritesActionsEl) {
  favoritesActionsEl = document.createElement("div");
  favoritesActionsEl.id = "favorites-actions";
  favoritesActionsEl.className = "favorites-actions";
  favoritesActionsEl.style.display = "none";
  subFiltersEl.insertAdjacentElement("afterend", favoritesActionsEl);
}

if (!songViewerEl) {
  songViewerEl = document.createElement("section");
  songViewerEl.id = "song-viewer";
  songViewerEl.style.display = "none";
  songListEl.insertAdjacentElement("afterend", songViewerEl);
}

// Group library elements into #library-view so we can switch between library and song page
let libraryViewEl = document.getElementById("library-view");
if (!libraryViewEl) {
  libraryViewEl = document.createElement("div");
  libraryViewEl.id = "library-view";

  const titleRowEl = document.querySelector(".title-row");
  if (titleRowEl) {
    titleRowEl.parentNode.insertBefore(libraryViewEl, titleRowEl);
    libraryViewEl.appendChild(titleRowEl);
  }
  if (searchWrapperEl) {
    libraryViewEl.appendChild(searchWrapperEl);
  } else if (searchInput) {
    libraryViewEl.appendChild(searchInput);
  }
  libraryViewEl.appendChild(mainFiltersEl);
  libraryViewEl.appendChild(subFiltersEl);
  libraryViewEl.appendChild(favoritesActionsEl);
  libraryViewEl.appendChild(songListEl);
}
libraryViewEl.style.display = "block";

// Wrap header, search, and filters in #sticky-header so they stay pinned while scrolling
let stickyHeaderEl = document.getElementById("sticky-header");
if (!stickyHeaderEl) {
  stickyHeaderEl = document.createElement("div");
  stickyHeaderEl.id = "sticky-header";

  const titleRowEl = libraryViewEl.querySelector(".title-row");
  if (titleRowEl) {
    stickyHeaderEl.appendChild(titleRowEl);
  }
  if (searchWrapperEl) {
    stickyHeaderEl.appendChild(searchWrapperEl);
  } else if (searchInput) {
    stickyHeaderEl.appendChild(searchInput);
  }
  stickyHeaderEl.appendChild(mainFiltersEl);
  stickyHeaderEl.appendChild(subFiltersEl);
  stickyHeaderEl.appendChild(favoritesActionsEl);

  libraryViewEl.insertBefore(stickyHeaderEl, songListEl);
}

/* --- Horizontal Drag-to-Scroll for Main & Sub-Filter Strips --- */
function enableHorizontalDragScroll(rowEl) {
  if (!rowEl || rowEl.dataset.dragScrollBound === "true") return;
  rowEl.dataset.dragScrollBound = "true";

  let isDown = false;
  let startX = 0;
  let startScrollLeft = 0;
  let hasDragged = false;

  rowEl.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    isDown = true;
    hasDragged = false;
    startX = e.pageX - rowEl.offsetLeft;
    startScrollLeft = rowEl.scrollLeft;
    rowEl.classList.add("is-dragging");
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    const x = e.pageX - rowEl.offsetLeft;
    const walk = x - startX;
    if (Math.abs(walk) > 5) {
      hasDragged = true;
    }
    if (hasDragged) {
      e.preventDefault();
      rowEl.scrollLeft = startScrollLeft - walk * 1.2;
    }
  });

  window.addEventListener("mouseup", () => {
    if (!isDown) return;
    isDown = false;
    rowEl.classList.remove("is-dragging");
    setTimeout(() => {
      hasDragged = false;
    }, 0);
  });

  rowEl.addEventListener(
    "click",
    (e) => {
      if (hasDragged) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true
  );
}

enableHorizontalDragScroll(mainFiltersEl);
enableHorizontalDragScroll(subFiltersEl);

function renderVersionBadge() {
  const titleRowEl = document.querySelector(".title-row");
  if (!titleRowEl) return;

  const h1El = titleRowEl.querySelector("h1");
  let titleGroupEl = titleRowEl.querySelector(".title-group");

  if (!titleGroupEl) {
    titleGroupEl = document.createElement("div");
    titleGroupEl.className = "title-group";
    if (h1El) {
      h1El.replaceWith(titleGroupEl);
      titleGroupEl.appendChild(h1El);
    } else {
      titleRowEl.appendChild(titleGroupEl);
    }
  }

  let badgeEl = document.getElementById("app-version");
  if (!badgeEl) {
    badgeEl = document.createElement("span");
    badgeEl.id = "app-version";
    badgeEl.className = "version-badge";
    titleGroupEl.appendChild(badgeEl);
  }
  badgeEl.textContent = APP_VERSION;

  const drawerMetaEl = sideDrawerEl?.querySelector(".drawer-meta");
  if (drawerMetaEl) {
    drawerMetaEl.textContent = `Offline Choir Library • ${APP_VERSION}`;
  }
}

function syncHeaderHeight() {
  if (stickyHeaderEl) {
    const h = Math.ceil(stickyHeaderEl.getBoundingClientRect().height);
    document.documentElement.style.setProperty("--header-h", `${h}px`);
  }
}

if (typeof ResizeObserver !== "undefined" && stickyHeaderEl) {
  const headerObserver = new ResizeObserver(syncHeaderHeight);
  headerObserver.observe(stickyHeaderEl);
}
window.addEventListener("resize", syncHeaderHeight);

/* --- Side Drawer & Settings --- */
let backdropHideTimer = null;

function setDrawerOpen(isOpen) {
  if (!sideDrawerEl || !drawerBackdropEl) return;

  if (backdropHideTimer) {
    clearTimeout(backdropHideTimer);
    backdropHideTimer = null;
  }

  if (isOpen) {
    drawerBackdropEl.hidden = false;
    requestAnimationFrame(() => {
      drawerBackdropEl.classList.add("is-open");
      sideDrawerEl.classList.add("is-open");
    });
    sideDrawerEl.setAttribute("aria-hidden", "false");
    menuBtn?.setAttribute("aria-expanded", "true");
    closeDrawerBtn?.focus();
  } else {
    sideDrawerEl.classList.remove("is-open");
    drawerBackdropEl.classList.remove("is-open");
    sideDrawerEl.setAttribute("aria-hidden", "true");
    menuBtn?.setAttribute("aria-expanded", "false");
    backdropHideTimer = setTimeout(() => {
      drawerBackdropEl.hidden = true;
    }, 250);
    menuBtn?.focus();
  }
}

function applyDarkMode(enabled) {
  document.body.classList.toggle("dark-mode", Boolean(enabled));
  if (darkModeToggleEl) {
    darkModeToggleEl.checked = Boolean(enabled);
  }
  try {
    localStorage.setItem(STORAGE_KEYS.darkMode, enabled ? "1" : "0");
  } catch (_) {
    // Ignore storage errors in restricted browsing modes
  }
}

function applyFontSize(size) {
  const validSizes = ["normal", "large", "xlarge"];
  const normalized = validSizes.includes(size) ? size : "normal";

  document.body.classList.remove("font-large", "font-xlarge");
  if (normalized === "large") {
    document.body.classList.add("font-large");
  } else if (normalized === "xlarge") {
    document.body.classList.add("font-xlarge");
  }

  if (fontSizeSelectEl) {
    fontSizeSelectEl.value = normalized;
  }

  try {
    localStorage.setItem(STORAGE_KEYS.fontSize, normalized);
  } catch (_) {
    // Ignore storage errors in restricted browsing modes
  }
}

function initPreferences() {
  let savedDark = false;
  let savedFont = "normal";

  try {
    savedDark = localStorage.getItem(STORAGE_KEYS.darkMode) === "1";
    savedFont = localStorage.getItem(STORAGE_KEYS.fontSize) || "normal";
  } catch (_) {
    // Fallback to defaults if storage is unavailable
  }

  applyDarkMode(savedDark);
  applyFontSize(savedFont);
}

async function forceRefreshCache() {
  if (refreshCacheBtnEl) {
    refreshCacheBtnEl.disabled = true;
    refreshCacheBtnEl.textContent = "Refreshing...";
  }

  try {
    if ("caches" in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    }

    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
    }
  } catch (_) {
    // Still attempt a clean reload even if cache/SW cleanup encounters an error
  }

  window.location.reload();
}

menuBtn?.addEventListener("click", () => setDrawerOpen(true));
closeDrawerBtn?.addEventListener("click", () => setDrawerOpen(false));
drawerBackdropEl?.addEventListener("click", () => setDrawerOpen(false));

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && sideDrawerEl?.classList.contains("is-open")) {
    setDrawerOpen(false);
  }
});

darkModeToggleEl?.addEventListener("change", (e) => {
  applyDarkMode(e.target.checked);
});

fontSizeSelectEl?.addEventListener("change", (e) => {
  applyFontSize(e.target.value);
});

refreshCacheBtnEl?.addEventListener("click", forceRefreshCache);

/* --- Library & Reader Logic --- */
function renderMainFilters() {
  const prevScrollLeft = mainFiltersEl.scrollLeft;
  mainFiltersEl.innerHTML = "";

  const topButtons = [
    { label: "All", group: "all" },
    { label: "Order of the Mass", group: "mass" },
    { label: "Liturgical Seasons", group: "season" },
    { label: "Favorites", group: "favorites" }
  ];

  topButtons.forEach((btnInfo) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = btnInfo.label;
    if (activeGroup === btnInfo.group || appliedFilterGroup === btnInfo.group) {
      btn.classList.add("active");
    }

    btn.addEventListener("click", () => {
      const groupChanged = activeGroup !== btnInfo.group;
      activeGroup = btnInfo.group;
      resetClearFavoritesConfirmation();

      if (btnInfo.group === "all") {
        appliedFilterGroup = null;
        appliedSubCategory = null;
        renderMainFilters();
        renderSubFilters({ resetScroll: groupChanged });
        renderFavoritesActions();
        renderSongs();
        syncHeaderHeight();
        return;
      }

      if (btnInfo.group === "favorites") {
        appliedFilterGroup = "favorites";
        appliedSubCategory = null;
        renderMainFilters();
        renderSubFilters({ resetScroll: groupChanged });
        renderFavoritesActions();
        renderSongs();
        syncHeaderHeight();
        return;
      }

      if (appliedFilterGroup === "favorites") {
        appliedFilterGroup = null;
      }

      renderMainFilters();
      renderSubFilters({ resetScroll: groupChanged });
      renderFavoritesActions();
      renderSongs();
      syncHeaderHeight();
    });

    mainFiltersEl.appendChild(btn);
  });

  mainFiltersEl.scrollLeft = prevScrollLeft;
}

function renderSubFilters(options = {}) {
  const { resetScroll = false } = options;
  const prevScrollLeft = resetScroll ? 0 : subFiltersEl.scrollLeft;

  if (activeGroup === "favorites") {
    subFiltersEl.innerHTML = "";
    subFiltersEl.style.display = "none";
    subFiltersEl.scrollLeft = 0;
    return;
  }

  subFiltersEl.style.display = "flex";
  subFiltersEl.innerHTML = "";

  let items = LANGUAGE_CATEGORIES;
  if (activeGroup === "mass") {
    items = MASS_CATEGORIES;
  } else if (activeGroup === "season") {
    items = SEASON_CATEGORIES;
  }

  items.forEach((categoryName) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = categoryName;

    if (appliedFilterGroup === activeGroup && appliedSubCategory === categoryName) {
      btn.classList.add("active");
    }

    btn.addEventListener("click", () => {
      resetClearFavoritesConfirmation();
      if (appliedFilterGroup === activeGroup && appliedSubCategory === categoryName) {
        appliedSubCategory = null;
        if (activeGroup === "all") {
          appliedFilterGroup = null;
        }
      } else {
        appliedFilterGroup = activeGroup;
        appliedSubCategory = categoryName;
      }

      renderSubFilters({ resetScroll: false });
      renderFavoritesActions();
      renderSongs();
      syncHeaderHeight();
    });

    subFiltersEl.appendChild(btn);
  });

  if (!resetScroll) {
    subFiltersEl.scrollLeft = prevScrollLeft;
    requestAnimationFrame(() => {
      subFiltersEl.scrollLeft = prevScrollLeft;
    });
  } else {
    subFiltersEl.scrollLeft = 0;
  }
}

function renderFavoritesActions() {
  if (!favoritesActionsEl) return;
  favoritesActionsEl.innerHTML = "";

  if (appliedFilterGroup !== "favorites" || favoriteTitles.length === 0) {
    resetClearFavoritesConfirmation();
    favoritesActionsEl.style.display = "none";
    return;
  }

  favoritesActionsEl.style.display = "flex";

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = confirmClearFavorites
    ? "clear-favorites-btn is-confirming"
    : "clear-favorites-btn";
  clearBtn.textContent = confirmClearFavorites
    ? "Tap again to clear all favorites"
    : "Clear All Favorites";

  clearBtn.addEventListener("click", () => {
    if (!confirmClearFavorites) {
      confirmClearFavorites = true;
      if (confirmClearTimeoutId) {
        clearTimeout(confirmClearTimeoutId);
      }
      confirmClearTimeoutId = setTimeout(() => {
        confirmClearFavorites = false;
        confirmClearTimeoutId = null;
        renderFavoritesActions();
        syncHeaderHeight();
      }, 4000);
      renderFavoritesActions();
      syncHeaderHeight();
      return;
    }

    clearAllFavorites();
    renderFavoritesActions();
    renderSongs();
    syncHeaderHeight();
  });

  favoritesActionsEl.appendChild(clearBtn);
}

function matchesFilter(song) {
  if (appliedFilterGroup === "favorites") {
    if (!isFavoriteSong(song.title)) {
      return false;
    }
  } else if (appliedFilterGroup === "all" && appliedSubCategory) {
    const langs = Array.isArray(song.language)
      ? song.language
      : song.language
        ? [song.language]
        : [];
    if (!langs.includes(appliedSubCategory)) {
      return false;
    }
  } else if (appliedFilterGroup === "mass" && appliedSubCategory) {
    if (!song.massPart || !song.massPart.includes(appliedSubCategory)) {
      return false;
    }
  } else if (appliedFilterGroup === "season" && appliedSubCategory) {
    if (!song.seasons || !song.seasons.includes(appliedSubCategory)) {
      return false;
    }
  }

  if (searchQuery.trim() !== "") {
    const q = searchQuery.trim().toLowerCase();
    const inTitle = song.title.trim().toLowerCase().startsWith(q);
    if (!inTitle) return false;
  }

  return true;
}

function compareSongTitlesNaturally(a, b) {
  return a.title.trim().localeCompare(b.title.trim(), undefined, {
    sensitivity: "base",
    numeric: true
  });
}

function renderSongs() {
  songListEl.innerHTML = "";
  const filtered = songCatalog.filter(matchesFilter);

  filtered.sort(compareSongTitlesNaturally);

  if (filtered.length === 0) {
    const emptyMessage =
      appliedFilterGroup === "favorites" && searchQuery.trim() === ""
        ? "No favorite songs yet. Open a song and tap ★ to save it to your lineup."
        : "No matching songs found.";
    songListEl.innerHTML = `<li class="song-card">${emptyMessage}</li>`;
    return;
  }

  filtered.forEach((song) => {
    const li = document.createElement("li");
    li.className = "song-card";

    const titleEl = document.createElement("strong");
    titleEl.textContent = song.title;

    li.appendChild(titleEl);

    li.addEventListener("click", () => openSong(song));
    songListEl.appendChild(li);
  });
}

async function loadAssetContent(filePath, targetEl, isHtml = false) {
  if (!filePath) {
    targetEl.textContent = "Not available for this song yet.";
    return;
  }

  targetEl.textContent = "Loading...";

  try {
    const response = await fetch(filePath);
    if (!response.ok) throw new Error("File not found");
    const content = await response.text();

    if (isHtml || filePath.endsWith(".html")) {
      targetEl.innerHTML = content;
    } else {
      targetEl.innerHTML = `<pre style="white-space: pre-wrap; font-family: inherit;">${escapeHtml(content)}</pre>`;
    }
  } catch (err) {
    targetEl.textContent =
      `File not found or is currently unavailable yet.`;
  }
}

function escapeHtml(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function showLibraryView() {
  songViewerEl.style.display = "none";
  songViewerEl.innerHTML = "";
  document.body.style.overflow = "hidden";
  libraryViewEl.style.display = "block";
  renderFavoritesActions();
  renderSongs();
  songListEl.scrollTop = 0;
  syncHeaderHeight();
}

function openSong(song) {
  resetClearFavoritesConfirmation();
  libraryViewEl.style.display = "none";
  songViewerEl.style.display = "block";
  document.body.style.overflow = "auto";
  window.scrollTo({ top: 0, behavior: "instant" });

  const initialFav = isFavoriteSong(song.title);

  songViewerEl.innerHTML = `
    <div class="song-page">
      <div class="song-page-top-bar">
        <button type="button" id="close-song-btn" class="return-btn">← Back to List</button>
        <button
          type="button"
          id="favorite-song-btn"
          class="favorite-toggle-btn ${initialFav ? "is-favorite" : ""}"
          aria-pressed="${initialFav ? "true" : "false"}"
          aria-label="${initialFav ? "Remove from Favorites" : "Add to Favorites"}"
        >${initialFav ? "★" : "☆"}</button>
      </div>
      <h2 class="song-page-title">${escapeHtml(song.title)}</h2>

      <div class="song-tabs">
        <button type="button" id="tab-lyrics-btn" class="active">Lyrics</button>
        <button type="button" id="tab-sheet-btn">Sheet Music</button>
      </div>

      <div id="song-content-panel" class="song-content-panel"></div>
    </div>
  `;

  const contentPanel = document.getElementById("song-content-panel");
  const lyricsBtn = document.getElementById("tab-lyrics-btn");
  const sheetBtn = document.getElementById("tab-sheet-btn");
  const closeBtn = document.getElementById("close-song-btn");
  const favBtn = document.getElementById("favorite-song-btn");

  const syncFavoriteButton = () => {
    const favored = isFavoriteSong(song.title);
    favBtn.textContent = favored ? "★" : "☆";
    favBtn.classList.toggle("is-favorite", favored);
    favBtn.setAttribute("aria-pressed", favored ? "true" : "false");
    favBtn.setAttribute("aria-label", favored ? "Remove from Favorites" : "Add to Favorites");
  };

  favBtn.addEventListener("click", () => {
    toggleFavoriteSong(song.title);
    syncFavoriteButton();
  });

  const showLyrics = () => {
    lyricsBtn.classList.add("active");
    sheetBtn.classList.remove("active");
    loadAssetContent(song.lyricsFile, contentPanel, true);
  };

  const showSheetMusic = () => {
    sheetBtn.classList.add("active");
    lyricsBtn.classList.remove("active");
    loadAssetContent(song.sheetMusicFile, contentPanel, true);
  };

  lyricsBtn.addEventListener("click", showLyrics);
  sheetBtn.addEventListener("click", showSheetMusic);
  closeBtn.addEventListener("click", showLibraryView);

  showLyrics();
}

searchInput?.addEventListener("input", (e) => {
  searchQuery = e.target.value;
  updateClearSearchButton();
  renderSongs();
});

clearSearchBtnEl?.addEventListener("click", () => {
  if (!searchInput) return;
  searchInput.value = "";
  searchQuery = "";
  updateClearSearchButton();
  renderSongs();
  searchInput.focus();
});

// Initial render
initPreferences();
renderVersionBadge();
updateClearSearchButton();
renderMainFilters();
renderSubFilters({ resetScroll: true });
renderFavoritesActions();
renderSongs();
syncHeaderHeight();