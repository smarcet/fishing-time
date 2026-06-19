# ADR-0038: PWA Installable Desktop Shortcut

**Date:** 2026-06-19
**Status:** Accepted

## Context

Fishing Time is a vanilla-JS canvas game served as a static site on GitHub Pages at
`https://smarcet.github.io/fishing-time/`. Players requested the ability to install it
as a desktop shortcut so it launches in a standalone window (no browser chrome) and is
playable offline after the first visit.

## Decision

Add PWA infrastructure with a minimal footprint — no build step, no npm dependencies,
no CI changes:

1. **`manifest.json`** at repo root — declares `display: standalone`, `orientation: landscape`,
   relative `start_url: "./"` and `scope: "./"` (portable across GitHub Pages and localhost).
2. **`sw.js`** at repo root — controls scope `/fishing-time/` by default (SW scope = directory
   of the SW script). Uses two caching strategies:
   - *Network-first* for HTML navigation requests: always try the network so deploys pick up
     immediately; fall back to cached copy when offline.
   - *Stale-while-revalidate* for all other same-origin GET requests: serve from cache
     instantly, update cache in background. Handles `?v=N` cache-busting automatically —
     bumping a version string creates a new URL, which the SW fetches fresh on next request
     with zero SW maintenance.
3. **`images/icons/icon-192.png` + `icon-512.png`** — rasterised from `images/hook.svg`
   on an ocean-blue `#0075C4` background via ImageMagick `convert`.
4. **`index.html`** wired with `<link rel="manifest">`, `<meta name="theme-color">`, and
   an inline SW registration `<script>` placed before the first game script.

## Cache versioning convention

The SW uses a named cache `'fishing-time-v1'`. The `activate` handler deletes any cache
with a different name, so old caches are cleaned up automatically on SW update.

**When to bump the version** (change `'fishing-time-v1'` → `'fishing-time-v2'`, etc.):
- A deploy needs users to evict all cached assets immediately (e.g. a breaking layout
  change or sprite renaming that would cause visual glitches if old assets are served).

**When NOT to bump**: routine asset updates that already use `?v=N` cache-busting — the
new URL is a different cache key, so the SW fetches it fresh automatically.

## Alternatives considered

**Enumerate all `?v=N` URLs in the `install` pre-cache list** — would guarantee full
offline support from the very first page load, but requires updating the SW whenever any
`?v=N` is bumped. The stale-while-revalidate approach achieves the same effect after the
first complete page load with zero maintenance burden.

**Add a separate splash / offline fallback page** — out of scope; the game is unplayable
without the canvas initialising, so a branded offline page offers no gameplay benefit.

## Consequences

- **Chrome desktop** shows an install icon (⊕) in the address bar after the SW is active.
  Installed app opens in a standalone window with no browser chrome.
- **Android Chrome** prompts "Add to Home Screen" automatically.
- **Safari / iOS**: recognised via the manifest (partial support); full standalone install
  requires the iOS-specific `apple-touch-icon` meta tags (not included — out of scope).
- **Offline**: game is fully playable after the first complete page load (all assets cached
  by stale-while-revalidate). Audio may fail gracefully if an MP3 was never fetched
  (AudioSystem catches `play()` errors silently — `src/AudioSystem.js:33`).
- **ADR-0036 note**: two ADRs share the number 0036
  (`0036-anglerflish-epic-premium-fish.md` and `0036-chest-with-jewels-treasure.md`).
  This is a pre-existing collision; 0038 is the correct next sequential number after 0037.
