# Barracuda Catchable Fish Implementation Plan

Created: 2026-06-19
Author: smarcet@gmail.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Context

The game has 17 species defined entirely through `FISH_DEFINITIONS` in `src/constants.js`
(single source of truth) plus a per-species class and registration points. The user wants
a new catchable fish, **Barracuda**, that behaves as a "trap": it puts up a strong fight but
**subtracts** points if landed. This is a novel combination — a `CatchableFish` (fightable)
with a *negative* score. Verified that the existing score pipeline already supports this:

- `Hook._finishCaptureLaunch()` (src/Hook.js:287) dispatches `EVENT_ENEMY_CAPTURED` with
  `enemyType = launchEntity.constructor.name` → `"Barracuda"`.
- `ScoreSystem._handleCapture` (src/ScoreSystem.js:38) does `this._score += pts;` — applies
  -100 directly; the HUD already renders negative totals in red (ScoreSystem.js:128).
- `ScoreSystem._handleEscape`/`_handleEvade` are guarded by `pts > 0`, so a Barracuda that
  escapes or evades produces **no** score change — correct (no perverse reward for losing it).
- `FISH_SCORE_MAP` (src/constants.js:661) is keyed by `className`, so `FISH_SCORE_MAP['Barracuda'] = -100`.

**Outcome:** a deep-lane predator that is satisfying to fight (escapeRate 2, strength 55) but
penalizes a successful catch by 100 points.

## Confirmed Design Parameters

| Parameter | Value | Source |
|-----------|-------|--------|
| `ENEMY_TYPE_BARRACUDA` | `'barracuda'` | new |
| `FISH_CLASS_BARRACUDA` | `'Barracuda'` | new |
| `BARRACUDA_DRIFT_SPEED` | `5.5` px/tick | fast predator (SwordFish 4.5, Angler 5.6) |
| `domId` | `'barracuda_sprite'` | |
| `displayH` / `displayW` | `90` / `360` | user choice (medium, 4:1) |
| `frameH` / `frameW` | `128` / `512` | sprite is 2048×256 → 4 cols × 2 rows |
| `maxFrameX` / `maxFrameY` | `4` / `1` | swim row 0 (4 frames) |
| `dieFrameX` / `dieFrameY` | `0` / `1` | die/captured pose = row 1 (project convention) |
| `rarity` | `FISH_RARITY_RARE` | user choice |
| `lanes` | `[FISH_LANE_DEEP]` | user requirement |
| `score` | `-100` | user requirement |
| `strength` | `55` | user choice ("bastante fuerte") |
| `escapeRate` | `2` | user requirement ("release date del 2") |
| `speedMin` / `speedMax` | `3.5` / `BARRACUDA_DRIFT_SPEED` | mirrors SwordFish |
| `spawnWeight` / `spawnFrequency` | `2` / `390` | mirrors SwordFish (Rare) |
| `captureRotation` | `-15` | user requirement ("similar al sword fish") |
| `captureOffsetX/Y` | `0` / `0` | like SwordFish |
| `struggleSpeed` / `RotationAmplitude` / `OffsetAmplitude` | `0.08` / `14` / `6` | like SwordFish |

**Key implementation gotcha — sprite orientation:** SwordFish's sprite faces **LEFT**, so its
`draw()` uses `flipX = direction === 1 ? -1 : 1`. The Barracuda sprite faces **RIGHT**, so the
flip must be **inverted**: `flipX = direction === 1 ? 1 : -1` (no flip swimming right, flip when
swimming left). This matches the AnglerFish/PremiumCatchableFish right-facing convention.

**Doc note:** `.claude/rules/fishing-time-species.md` references `main.html`, but the repo only
has `index.html` (single entry point). All HTML registration goes in `index.html`.

## Implementation Tasks

### Task 1 — Constants & FISH_DEFINITIONS entry (`src/constants.js`)
- Add `BARRACUDA_DRIFT_SPEED = 5.5;` near the other drift-speed constants (~line 59).
- Add `ENEMY_TYPE_BARRACUDA = 'barracuda';` near line 118 (keep grouping).
- Add `FISH_CLASS_BARRACUDA = 'Barracuda';` near line 151.
- Add the `FISH_DEFINITIONS` entry (full table above) — model on the SwordFish entry (lines 566-589).
  Enumerate ALL three struggle fields explicitly (an implementer must not emit only `struggleSpeed`):
  `struggleSpeed: 0.08, struggleRotationAmplitude: 14, struggleOffsetAmplitude: 6`. EnemyFactory uses
  `?? 0` fallbacks, so a missing field is a silent capture-animation defect, not a crash.
- Add `ENEMY_TYPE_BARRACUDA`, `FISH_CLASS_BARRACUDA`, `BARRACUDA_DRIFT_SPEED` to the
  `module.exports` block (lines ~771/779/783).
- **DoD:** `node -e "const c=require('./src/constants'); console.log(c.FISH_SCORE_MAP['Barracuda'])"` prints `-100`.

### Task 2 — Barracuda class (`src/Barracuda.js`)
- Model on `src/SwordFish.js`: `extends CatchableFish`, constructor signature
  `(game, ctx, size, position, image, maxFrameX, maxFrameY, dieFrameX, dieFrameY, spriteFrameSize)`,
  sets `_spriteFrameSize`, `_sw`, `_sh`, `_staggerFrame = ANIM_STAGGER_SLOW`, `_driftSpeed = BARRACUDA_DRIFT_SPEED`.
- `static create(game, ctx, spec)`, `static randomSpawnY` (deep zone, `WATER_SURFACE_Y + 100` like SwordFish),
  `update()` (sets `_direction` from spawn-X half), `captured(hook)` (mirror SwordFish), `_drawCapturedSprite()`.
- `draw()` mirrors SwordFish **but inverts the flip**: `const flipX = this._direction === 1 ? 1 : -1;`
  (Barracuda sprite faces right). Source rect uses `_sw`/`_sh` (frame 512×128 ≠ display 360×90).
- End with the `module.exports = { Barracuda }` dual-module guard.
- **DoD:** file parses; `static create` present.

### Task 3 — Registration / wiring
- `index.js`: add `const { Barracuda } = require('./src/Barracuda'); global.Barracuda = Barracuda;`
  (next to SwordFish, line 33) and add `Barracuda` to the `module.exports` list (line 50).
- `src/EnemyFactory.js`: add `[ENEMY_TYPE_BARRACUDA]: Barracuda,` to `_registry` (near line 17).
- `index.html`: add `<script src="src/Barracuda.js?v=1"></script>` **before** `EnemyFactory.js`
  (near line 45) and `<img src="images/fishes/barracuda_sprite.png" id="barracuda_sprite"/>`
  in the fish `<img>` block (near line 94).
- `main.css`: line 77 is ONE long comma-separated selector ending in `#angler_fish_sprite`.
  **Append** `, #barracuda_sprite` to that existing comma list (do NOT create a new rule). The
  appended id must exactly match the `domId` `barracuda_sprite` — a mismatch leaves the raw
  spritesheet visible on the page. Fulfils "no olvides ocultar el sprite en main.css".
- **DoD:** `EnemyFactory.createEnemy('barracuda', game, ctx)` returns a `Barracuda` instance with
  `_strength === 55`, `_escapeRate === 2`, `_captureRotation === -15`.

### Task 4 — Tests (`__tests__/barracuda.test.js`)
Model on `__tests__/swordfish.test.js` (one test class for the species). Behaviour-focused cases:
- `instanceof CatchableFish`; `getFightSpec()` returns `{strength: 55, escapeRate: 2}`.
- Species definition: `score === -100`, `lanes === [FISH_LANE_DEEP]`, `captureRotation === -15`,
  `className === 'Barracuda'`; and `FISH_SCORE_MAP['Barracuda'] === -100`.
- `draw()` flip (right-facing): `ctx.scale(1, 1)` when `_direction === 1`; `ctx.scale(-1, 1)` when `_direction === -1`.
- `randomSpawnY` within `[WATER_SURFACE_Y+100, canvasHeight - fishHeight]`.
- `EnemyFactory` creates a `Barracuda` instance.
- **DoD:** `npx jest __tests__/barracuda.test.js` green; full suite stays green.

### Task 5 — ADR (`docs/adr/0039-barracuda-deep-lane-trap-fish.md`)
- Next number is **0039** (highest existing is 0038). Document: the trap concept (negative-score
  catchable fish), score -100, escapeRate 2, strength 55, RARE, deep-lane-only, captureRotation -15,
  and the right-facing-sprite flip decision.
- Add a **"Requirement interpretation" section**: `releaseDate` field does not exist → interpreted
  `"release date del 2"` as `escapeRate 2`; `"bastante fuerte"` → `strength 55` (above SwordFish 50);
  `"rotacion similar al sword fish"` → `captureRotation -15` (copied exactly from SwordFish at
  constants.js:583).

## Files Touched

| File | Change |
|------|--------|
| `src/constants.js` | 3 constants + FISH_DEFINITIONS entry + 3 exports |
| `src/Barracuda.js` | new class (modeled on SwordFish, inverted flip) |
| `index.js` | require + global + export |
| `src/EnemyFactory.js` | `_registry` entry |
| `index.html` | `<script>` + `<img>` |
| `main.css` | `#barracuda_sprite` added to hide selector |
| `__tests__/barracuda.test.js` | new test file |
| `docs/adr/0039-barracuda-deep-lane-trap-fish.md` | new ADR |

## Verification

1. **Unit:** `npm test -- --silent` — full suite (43 → 44 files) green, 0 failures.
2. **Sanity:** `node -e "const f=new (require('./index.js').EnemyFactory)(); ..."` is covered by the
   factory test; also confirm `FISH_SCORE_MAP['Barracuda'] === -100`.
3. **Browser E2E (mandatory for UI):** dev server `python3 -m http.server 8081`, open
   `http://localhost:8081/index.html?e2e=1` with Chrome DevTools MCP. Use
   `window.__fishingTimeE2E.forceHookedFish('barracuda')` to hook one, then:
   - Confirm the sprite renders (not blank → img tag + domId correct).
   - Confirm the sprite `<img>` is hidden (`getComputedStyle(document.getElementById('barracuda_sprite')).display === 'none'`).
   - Confirm all 4 swim frames cycle without a blank frame (barracuda_sprite is 2048×256 → 512×128 per frame; verify with `node -e` before browser: `const b=require('fs').readFileSync('images/fishes/barracuda_sprite.png'); console.log(b.readUInt32BE(16), b.readUInt32BE(20))`).
   - Confirm swim direction flips correctly (faces movement direction, not mirrored).
   - Confirm the capture animation rotates ~-15° (swordfish-like) and the struggle oscillates.
   - Land it and confirm: (a) HUD score **decreases by 100**, (b) the floating capture text shows `-100` in **red** (not green), (c) HUD total goes negative in red.
   - Confirm it only appears in the deep lane over a sampling window.

## Autonomous Decisions
- `BARRACUDA_DRIFT_SPEED = 5.5`, `speedMin = 3.5`, `spawnWeight = 2`, `spawnFrequency = 390`,
  and struggle params mirror the SwordFish/RARE deep-lane profile (no user value given).
- Extends plain `CatchableFish` (not `PremiumCatchableFish`) — premium adds rim-glint sparkle
  (ADR-0034) intended for high-value reward fish, inappropriate for a negative-score trap.

## Out of Scope
- No new lane, rarity tier, event type, or scoring rule — reuses existing infrastructure.
- No change to spawn-balance of other species.
