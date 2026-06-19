# PWA Installable Desktop Shortcut Implementation Plan

Created: 2026-06-19
Author: smarcet@gmail.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Make Fishing Time installable as a desktop/home-screen shortcut by turning it into a PWA — players get an "Install" button in the browser and the game opens in a standalone window (no browser chrome), with offline support after the first visit.

## Out of Scope

- Push notifications
- Background sync
- Score persistence across installs (all state stays in-memory)
- iOS Safari home-screen meta tags (Apple's own proprietary install flow — handled by the manifest but not specifically tuned)

## Approach

**Chosen:** Minimal-touch PWA — add `manifest.json` + `sw.js` at the repo root, link them from `index.html`, generate icons from `images/hook.svg` with ImageMagick, no build step changes.
**Why:** The game is a fully static no-build site served at `https://smarcet.github.io/fishing-time/`. Placing the SW at `/fishing-time/sw.js` gives it control of the `/fishing-time/` scope automatically. The only change to existing files is `index.html` (two `<meta>` lines + one `<link>` + an inline `<script>` for SW registration). No bundler, no npm packages, no CI changes needed.

## Context for Implementer

GitHub Pages serves the repo at `https://smarcet.github.io/fishing-time/`, so the URL prefix `/fishing-time/` is the PWA scope. All manifest paths and the SW `start_url` must be relative (`./`) or absolute-with-prefix (`/fishing-time/`). The SW `scope` defaults to the directory containing `sw.js` — since `sw.js` lives at the repo root (served as `/fishing-time/sw.js`), the default scope is `/fishing-time/` automatically; no explicit `scope` override is needed in `register()`.

The game loads assets with cache-busting query strings (`?v=N`). The SW caching strategy uses **stale-while-revalidate** for all same-origin fetches: serve from cache immediately if available, simultaneously fetch fresh and update the cache. This means:
- Versioned URLs (`src/constants.js?v=21`) get cached on first request; bumping `?v=N` creates a new URL the SW fetches fresh automatically — zero SW maintenance on asset updates.
- After the first complete page load the game is fully offline-capable.

## Runtime Environment

- **Dev:** `python3 -m http.server 8081` → `http://localhost:8081/`
- **Production:** `https://smarcet.github.io/fishing-time/`
- PWA install prompt only fires on HTTPS → test installability against the GitHub Pages URL or use Chrome's `chrome://flags/#unsafely-treat-insecure-origin-as-secure` for local testing. Lighthouse PWA audit works on localhost too.

## Assumptions

- `images/hook.svg` renders correctly when rasterized to a square canvas with ImageMagick `convert` (confirmed: `convert` is available at `/usr/bin/convert`; the hook SVG is 653B, a simple path shape). Task 1 uses pure `convert` calls with no Pillow fallback.
- GitHub Pages is already configured to serve from `main` branch — no Pages setup needed beyond committing the files.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `convert` renders hook.svg with transparent background → dark icon on dark OS themes | Medium | Low | Task 1 sets `-background '#0075C4'` and `-flatten` to force ocean-blue fill behind SVG |
| SW caches stale `index.html` after deploy, players see old version | Low | Medium | SW uses `network-first` for navigation requests (`.html` / `/`); only asset requests are stale-while-revalidate |

## Goal Verification

### Truths

1. After visiting the GitHub Pages URL in Chrome, the address bar shows an install icon (⊕) or the browser menu shows "Install Fishing Time…" — confirming the browser accepted the manifest + SW as installable.
2. Lighthouse PWA audit (via Chrome DevTools or `playwright-cli lighthouse`) reports "Installable: Passed" with no blocking failures.

## E2E Test Scenarios

### TS-001: PWA Install Prompt Appears
**Priority:** Critical
**Preconditions:** Page loaded over HTTPS (GitHub Pages) or via localhost with SW-compatible origin; no prior install
**Mapped Tasks:** Task 2, Task 3, Task 4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `https://smarcet.github.io/fishing-time/` in Chrome | Page loads normally, game starts |
| 2 | Wait 3–5 seconds for SW to register | DevTools → Application → Service Workers shows SW as "activated and running" |
| 3 | Check address bar or Chrome menu (⋮) | Install icon (⊕) visible in address bar OR "Install Fishing Time" in Chrome menu |
| 4 | Click install | Install dialog appears with app name "Fishing Time", icon, and URL |
| 5 | Confirm install | Desktop shortcut / taskbar entry created; app opens in standalone window (no browser address bar) |

### TS-002: Offline Capability After First Load
**Priority:** High
**Preconditions:** Game loaded at least once (SW cached assets); DevTools Network set to "Offline"
**Mapped Tasks:** Task 3

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to game, wait for full load | Game plays normally |
| 2 | DevTools → Network → "Offline" | Network disabled |
| 3 | Reload the page (F5) | Game loads from SW cache — no "No internet" error |
| 4 | Play a round | Game runs normally (audio may fail gracefully — acceptable) |

### TS-003: Lighthouse PWA Audit
**Priority:** High
**Preconditions:** Page accessible at a public HTTPS URL
**Mapped Tasks:** Task 2, Task 3, Task 4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open Chrome DevTools → Lighthouse | Lighthouse panel visible |
| 2 | Select "Progressive Web App" category, click "Analyze page load" | Audit runs |
| 3 | Review PWA section | "Installable" passes; no blocking red items |

## Progress Tracking

- [x] Task 1: Generate PWA app icons (192×192 and 512×512 PNGs)
- [x] Task 2: Create `manifest.json`
- [x] Task 3: Create `sw.js` (service worker)
- [x] Task 4: Wire `index.html` + unit test + ADR-0038

## Implementation Tasks

### Task 1: Generate PWA App Icons

**Objective:** Produce `images/icons/icon-192.png` and `images/icons/icon-512.png` by rasterizing `images/hook.svg` on an ocean-blue (`#0075C4`) background using ImageMagick. These are the icons the browser shows in the install dialog and on the home screen/taskbar. Verified by TS-001 (install dialog shows the icon).

**Files:**

- Create: `images/icons/icon-192.png`
- Create: `images/icons/icon-512.png`
- Create: `scripts/generate_pwa_icons.py`

**Key Decisions / Notes:**

- Use `convert -background '#0075C4' -flatten -resize 512x512 images/hook.svg images/icons/icon-512.png` (ImageMagick confirmed at `/usr/bin/convert`). Repeat for 192×192. No branches, no Pillow fallback.
- The `-flatten` merges SVG transparency into the solid `#0075C4` ocean-blue background.
- `Trivial:` ≤5 lines of Python (2× subprocess calls to `convert`, 1 mkdir — no branch, no new public symbol); covered by the file-existence verify command below.

**Definition of Done:**

- [ ] `images/icons/icon-192.png` and `images/icons/icon-512.png` exist and are valid PNG files (`file images/icons/icon-*.png` reports `PNG image data`)
- [ ] Both images show the hook on a blue background when previewed
- [ ] Verify: `file images/icons/icon-192.png images/icons/icon-512.png | grep PNG`

---

### Task 2: Create Web App Manifest

**Objective:** Write `manifest.json` at the repo root declaring the app name, display mode, scope, start URL, theme colors, and icon references. This is the file the browser reads to determine PWA installability.

**Files:**

- Create: `manifest.json`

**Key Decisions / Notes:**

- `start_url`: `"./"` (relative — resolves to `/fishing-time/` on GitHub Pages and to `/` locally; portable across both)
- `scope`: `"./"` (same reasoning)
- `display`: `"standalone"` — no browser chrome, looks like a native app
- `orientation`: `"landscape"` — game is designed for landscape
- `background_color`: `"#0075C4"` — matches icon background, shown during splash screen
- `theme_color`: `"#003d7a"` — darker blue; shown in Android task switcher and Chrome's tab bar when installed
- Icons array: both sizes required by Chrome's install criteria

**Definition of Done:**

- [ ] `manifest.json` passes JSON parse with no errors
- [ ] Contains `name`, `short_name`, `start_url`, `scope`, `display`, `icons` (192 + 512), `theme_color`, `background_color`
- [ ] `display` is `"standalone"` and `orientation` is `"landscape"`
- [ ] Verify: `npx jest __tests__/pwa.test.js -q`

---

### Task 3: Create Service Worker

**Objective:** Write `sw.js` at the repo root with `install`, `activate`, and `fetch` event handlers. The `fetch` handler implements network-first for HTML navigation requests and stale-while-revalidate for all other same-origin assets — enabling offline play after the first visit.

**Files:**

- Create: `sw.js`

**Key Decisions / Notes:**

- Cache name: `'fishing-time-v1'` — bump to `'fishing-time-v2'` etc. when breaking cache is needed after major asset changes
- On `install`: pre-cache `'./'` (navigation) and `'manifest.json'` only — do NOT enumerate all `?v=N` asset URLs (maintenance burden; stale-while-revalidate handles them at runtime)
- On `activate`: delete all old caches whose name ≠ `CACHE_NAME` (prevents stale SW cache accumulation across deploys); call `clients.claim()` so the SW controls existing pages immediately
- On `fetch`: skip non-GET requests, skip cross-origin requests; for same-origin GETs:
  - Navigation requests (`.url.includes('.html')` or `request.mode === 'navigate'`): network-first, fallback to cache
  - All other same-origin assets: stale-while-revalidate (serve cached immediately, update cache in background)
- Large audio files (> 1 MB) are still cached by the stale-while-revalidate handler — this is acceptable since they get cached on first play; we do NOT skip them because skipping would make offline audio break

**Definition of Done:**

- [ ] `sw.js` has `install`, `activate`, and `fetch` event listeners
- [ ] `install` pre-caches `'./'` and `'manifest.json'` with `skipWaiting()`
- [ ] `activate` deletes stale caches and calls `clients.claim()`
- [ ] `fetch` returns cached response immediately for same-origin assets while updating cache in background (stale-while-revalidate)
- [ ] `src/AudioSystem.js` already catches audio-load failures silently (`audio.play().catch(() => {})` at line 33) — confirmed by grep; offline audio 404s will not crash the game
- [ ] Verify: `npx jest __tests__/pwa.test.js -q` (SW existence check) — full behavior verified by TS-002 (offline scenario)

---

### Task 4: Wire index.html + Unit Test + ADR

**Objective:** Add the three required lines to `index.html` (`<link rel="manifest">`, `<meta name="theme-color">`, and an inline SW-registration `<script>`), write a lightweight Jest test that validates `manifest.json` structure, and create ADR-0038 documenting the PWA architecture decisions. Verified by TS-001 and TS-003 end-to-end.

**Files:**

- Modify: `index.html`
- Modify: `.claude/rules/fishing-time-project.md` (update `main.html` → `index.html` in Directory Structure and dev-server sections)
- Modify: `README.md` (update `main.html` → `index.html` references)
- Create: `__tests__/pwa.test.js`
- Create: `docs/adr/0038-pwa-installable-desktop.md`

**Key Decisions / Notes:**

- SW registration goes in an inline `<script>` immediately after the `<meta>` and `<link>` tags, **before** the first game `<script src="src/constants.js?v=21">` tag — so it registers as early as possible on first load, maximising caching coverage
- Registration code: `if ('serviceWorker' in navigator) { navigator.serviceWorker.register('./sw.js').catch(console.error); }` — guard for non-SW environments (e.g. Jest / Node)
- `__tests__/pwa.test.js` uses `fs.readFileSync`/`fs.existsSync` (no browser API): validates manifest required fields + each icon `src` path exists on disk + `sw.js` file exists; 1 test class, ≤10 assertions
- `.claude/rules/fishing-time-project.md` and `README.md` still contain `main.html` references from before commit `ba9e604` (which renamed `main.html` → `index.html`). Update all 5 occurrences as part of this task — documentation-sync rule requires same-change doc updates.
- No changes to `<script>` load order for game files — SW registration is independent

**Definition of Done:**

- [ ] `index.html` `<head>` contains `<link rel="manifest" href="manifest.json">` and `<meta name="theme-color" content="#003d7a">`
- [ ] `index.html` contains SW registration script before `src/constants.js` and guarded by `'serviceWorker' in navigator`
- [ ] `.claude/rules/fishing-time-project.md` and `README.md` no longer mention `main.html` (all occurrences replaced with `index.html`)
- [ ] `npx jest __tests__/pwa.test.js -q` passes: (a) manifest has all required fields, (b) each icon `src` path resolves to an existing file (`fs.existsSync`), (c) `sw.js` exists at repo root
- [ ] Full test suite still passes: `npm test`
- [ ] ADR-0038 exists at `docs/adr/0038-pwa-installable-desktop.md` and includes cache-versioning convention
- [ ] Verify: `npm test`
