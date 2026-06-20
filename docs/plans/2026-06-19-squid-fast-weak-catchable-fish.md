# Squid — Fast, Weak Catchable Fish Implementation Plan

Created: 2026-06-19
Author: smarcet@gmail.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Add a new catchable fish, the Squid, worth 250 points — fast (ties the current top swim speed of 5.6 px/tick) but with almost no fight strength, so it is hard to hook yet trivial to land once caught. Its spritesheet is hidden in `main.css` like every other sprite, and the design is documented in a new ADR.

## Approach

**Chosen:** New `Squid extends CatchableFish` modeled on `SwordFish` (left-facing draw), with a deep-lane, RARE `FISH_DEFINITIONS` entry; all wiring follows the established 21-species data-driven pattern (`EnemyFactory` + `FishSpawner` derive everything from `FISH_DEFINITIONS`).
**Why:** The squid sprite faces left exactly like `SwordFish.js`, so copying that class (changing only name + drift constant) reuses a proven draw/flip/spawn implementation at the cost of a near-duplicate file — consistent with how every other species is already structured. No factory or spawner code changes are needed; the registry + data entry drive it.

## Context for Implementer

- **The HTML entry file is `index.html`, not `main.html`.** The project rule `fishing-time-species.md` says `main.html`, but that file does not exist — `index.html` holds the `<img>` and `<script>` tags. Use `index.html`.
- **Sprite geometry is the one non-obvious detail.** `images/fishes/squid_sprite.png` is 2731×445 px laid out as **3 columns × 2 rows** (6 frames; verified by viewing the sprite). Row 0 = swim, Row 1 = die. Canonical cell: `frameW = 910`, `frameH = 222` (floor of 2731/3 and 445/2 — flooring avoids sampling past the image edge). `maxFrameX: 3`, `maxFrameY: 1` (swim animation walks row 0 only), `dieFrameX: 0`, `dieFrameY: 1`.
- **The squid faces LEFT** → reuse `SwordFish.draw()`'s flip rule exactly (`flipX = direction === 1 ? -1 : 1`). Do NOT copy Barracuda's flip (it faces right).
- **`strength` only affects how fast the catch escapes** (`Hook.js:159`: `escapeProgress += strength * escapeRate * dtSec`). A low strength means an essentially un-escapable, easy-to-land fish — exactly "casi sin fuerza." The difficulty comes from the high swim speed making it hard to hook in the first place.
- **The spawner places fish vertically by lane** (`FISH_LANES` yMin/yMax in `constants.js:194`); the class `randomSpawnY` is only an initial fallback. `lanes: [FISH_LANE_DEEP]` puts it in the deep band.

## Assumptions

- Squid is a plain `CatchableFish` (not `PremiumCatchableFish`) — no rim-glint sparkle. Matches SwordFish/Barracuda. (Tasks 2, 4)

## Progress Tracking

- [x] Task 1: Add Squid constants + `FISH_DEFINITIONS` entry + exports in `src/constants.js`
- [x] Task 2: Create `src/Squid.js` class (left-facing, modeled on SwordFish)
- [x] Task 3: Wire Squid into `index.js`, `src/EnemyFactory.js`, and `index.html`
- [x] Task 4: Hide `#squid_sprite` in `main.css`
- [x] Task 5: Add `__tests__/squid.test.js` and fix species-count assertion in `score-system.test.js`
- [x] Task 6: Write ADR `docs/adr/0040-squid-fast-weak-catchable-fish.md`

## Implementation Tasks

### Task 1: Squid constants and FISH_DEFINITIONS entry

**Objective:** Add the Squid's identity constants, drift speed, single-source-of-truth `FISH_DEFINITIONS` entry, and module exports to `src/constants.js`. This is the data that `EnemyFactory` and `FishSpawner` both read automatically.

**Files:**

- Modify: `src/constants.js`

**Key Decisions / Notes:**

- Add three constants alongside the existing groups (keep ordering consistent with Barracuda, the most recent entry):
  - `const ENEMY_TYPE_SQUID = 'squid';` (after `ENEMY_TYPE_BARRACUDA`, line ~136)
  - `const FISH_CLASS_SQUID = 'Squid';` (after `FISH_CLASS_BARRACUDA`, line ~170)
  - `const SQUID_DRIFT_SPEED = 5.6;  // px/tick - ties AnglerFlish for fastest swim speed` (in the drift-speed group, line ~60-64)
- Append a `FISH_DEFINITIONS` entry (before the closing `];` at line ~685), modeled on the SwordFish/Barracuda entries:
  ```js
  {
    id: ENEMY_TYPE_SQUID,
    className: FISH_CLASS_SQUID,
    domId: 'squid_sprite',
    displayH: 58,   displayW: 240,   // ~4.1:1, matches 910:222 frame aspect
    frameH: 222,    frameW: 910,     // 2731x445 sheet, 3 cols x 2 rows (floored)
    maxFrameX: 3,   maxFrameY: 1,
    dieFrameX: 0,   dieFrameY: 1,
    rarity: FISH_RARITY_RARE,
    lanes: [FISH_LANE_DEEP],
    score: 250,
    strength: 2,            // "casi sin fuerza" - near un-escapable, easy to land
    escapeRate: 1.0,
    speedMin: 5.0,
    speedMax: SQUID_DRIFT_SPEED,
    spawnWeight: 2,
    spawnFrequency: 390,
    captureRotation: -15,   // elongated body, hangs like SwordFish/Barracuda
    captureOffsetX: 0,
    captureOffsetY: 0,
    struggleSpeed: 0.06,
    struggleRotationAmplitude: 8,
    struggleOffsetAmplitude: 3,
  },
  ```
- The three `struggle*` keys are confirmed real on existing entries (SwordFish `constants.js:589-591`, Barracuda `613-615`) — gentler values (0.06/8/3) chosen to match the "casi sin fuerza" feel (Barracuda uses 0.08/14/6). Keep them exactly as named.
- Add `ENEMY_TYPE_SQUID`, `FISH_CLASS_SQUID`, and `SQUID_DRIFT_SPEED` to the `module.exports` block (lines ~798, ~806, ~813 — next to the matching Barracuda exports).

**Definition of Done:**

- [ ] `FISH_DEFINITIONS` contains an entry whose `id === 'squid'`, `score === 250`, `strength === 2`, `speedMax === 5.6`, `lanes === [FISH_LANE_DEEP]`, `rarity === 'rare'`.
- [ ] `require('./src/constants.js')` exposes `ENEMY_TYPE_SQUID`, `FISH_CLASS_SQUID`, `SQUID_DRIFT_SPEED`, and `FISH_SCORE_MAP.Squid === 250`.
- [ ] Verify: `node -e "const c=require('./src/constants.js'); const d=c.FISH_DEFINITIONS.find(x=>x.id===c.ENEMY_TYPE_SQUID); console.log(d.score, d.strength, d.speedMax, c.FISH_SCORE_MAP.Squid)"` prints `250 2 5.6 250`.

### Task 2: Squid class file

**Objective:** Create `src/Squid.js` as a left-facing `CatchableFish` modeled on `SwordFish.js`, with `static create(game, ctx, spec)`, a deep-zone `randomSpawnY`, direction-aware flipped `draw()`, and the CommonJS export footer.

**Files:**

- Create: `src/Squid.js`

**Key Decisions / Notes:**

- Copy `src/SwordFish.js` verbatim and change only: class name `SwordFish` → `Squid`, and `this._driftSpeed = SWORDFISH_DRIFT_SPEED` → `this._driftSpeed = SQUID_DRIFT_SPEED`. Everything else (left-facing flip in `draw()`, `_drawCapturedSprite`, `randomSpawnY` with `minY = WATER_SURFACE_Y + 100`, `static create`, `update`, `captured`) applies unchanged — the squid faces left and lives in the deep lane, identical to SwordFish.
- Keep `this._staggerFrame = ANIM_STAGGER_SLOW;` (standard animation cadence; this controls sprite-frame timing, not movement speed).
- `_strength` / `_escapeRate` are set by `EnemyFactory.createEnemy()` from `FISH_DEFINITIONS` — do NOT set them in the constructor.
- End the file with the standard footer: `if (typeof module !== 'undefined' && module.exports) { module.exports = { Squid }; }`.

**Definition of Done:**

- [ ] `Squid` extends `CatchableFish` and exposes `static create`, `static randomSpawnX`/`randomSpawnY`, `update`, `draw`.
- [ ] `update()` advances the x-position (positive when spawned in the left half, negative in the right half).
- [ ] `draw()` calls `ctx.scale(-1, 1)` when `_direction === 1` (going right → flip left-facing sprite) and `ctx.scale(1, 1)` when `_direction === -1` (going left → no flip). Source: `SwordFish.js:70` — `flipX = _direction === 1 ? -1 : 1`.
- [ ] Verify: covered by `__tests__/squid.test.js` in Task 5 (`npx jest __tests__/squid.test.js`).

### Task 3: Register Squid in index.js, EnemyFactory, and index.html

**Objective:** Wire the new class into the three registration surfaces so it is available as a browser global, resolvable by the factory, and loaded by the page.

**Files:**

- Modify: `index.js`
- Modify: `src/EnemyFactory.js`
- Modify: `index.html`

**Key Decisions / Notes:**

- `index.js`: add `const { Squid } = require('./src/Squid'); global.Squid = Squid;` next to the Barracuda line (~34), and add `Squid` to the `module.exports` object (line ~51).
- `src/EnemyFactory.js`: add `[ENEMY_TYPE_SQUID]: Squid,` to the `_registry` map (after the Barracuda entry, line ~18). No other factory changes — the construction loop is fully generic.
- `index.html`:
  - Add `<script src="src/Squid.js?v=1"></script>` **before** `EnemyFactory.js` (place next to `Barracuda.js`, line ~46).
  - Add `<img src="images/fishes/squid_sprite.png" id="squid_sprite"/>` next to the other fish `<img>` tags (after `barracuda_sprite`, line ~96).
  - Bump cache-busting query versions on the two edited script files so browsers reload them: `constants.js?v=24` → `?v=25`, `EnemyFactory.js?v=6` → `?v=7`.

**Definition of Done:**

- [ ] `require('./index.js').Squid` is defined.
- [ ] `new EnemyFactory().createEnemy('squid', game, ctx)` returns a `Squid` instance with `_strength === 2`, `_escapeRate === 1.0`, `_captureRotation === -15`.
- [ ] `index.html` contains both `id="squid_sprite"` and a `Squid.js` `<script>` tag ordered before `EnemyFactory.js`.
- [ ] Verify: `node -e "require('./index.js'); const {EnemyFactory}=require('./src/EnemyFactory'); const {Size}=require('./index.js'); const g={getSize:()=>new Size(1200,800),isDebug:()=>false}; const s=new EnemyFactory().createEnemy('squid',g,{}); console.log(s.constructor.name, s._strength, s._escapeRate, s._captureRotation)"` prints `Squid 2 1 -15`.

### Task 4: Hide the squid sprite in main.css

**Objective:** Add `#squid_sprite` to the `display: none;` sprite-hiding selector in `main.css` so the source `<img>` (used only as a canvas draw source) is not visible in the page body.

**Files:**

- Modify: `main.css`

**Key Decisions / Notes:**

- Append `#squid_sprite` to the comma-separated id selector at `main.css:77` (the block that already lists `#swordfish_sprite`, `#barracuda_sprite`, etc., ending in `display: none;` at line 78). The `<img>` must remain in the DOM so `EnemyFactory` can resolve it via `document.getElementById('squid_sprite')`.

**Definition of Done:**

- [ ] `main.css` lists `#squid_sprite` within the selector that resolves to `display: none;`.
- [ ] Verify (browser, Task in Verification): the squid sprite image does not render in the page body; the squid animates correctly on the canvas.

### Task 5: Tests for Squid + species-count fix

**Objective:** Add `__tests__/squid.test.js` (mirroring `__tests__/barracuda.test.js`) covering hierarchy, the `FISH_DEFINITIONS` identity/values, the left-facing draw flip, spawn bounds, and factory integration; and update the species-count assertion in `score-system.test.js` from 21 to 22.

**Files:**

- Create: `__tests__/squid.test.js`
- Modify: `__tests__/score-system.test.js`

**Key Decisions / Notes:**

- Model the new test file on `__tests__/barracuda.test.js` (canonical `makeMocks()` shape). Required cases per the species rule: `instanceof CatchableFish`; `update()` advances x in the correct direction; `isOffScreen()` true when fully off-canvas. Add the value assertions (`score === 250`, `strength === 2`, `escapeRate === 1.0`, `lanes === [FISH_LANE_DEEP]`, `FISH_SCORE_MAP.Squid === 250`) and the factory-integration case.
- **Draw-flip assertions — derive directly from `src/SwordFish.js:70`** (which the class copies verbatim): `flipX = _direction === 1 ? -1 : 1`. Therefore: `_direction === 1` → `ctx.scale(-1, 1)` (flip, sprite goes right); `_direction === -1` → `ctx.scale(1, 1)` (no flip, sprite goes left). This is the *opposite* mapping to Barracuda's (which faces right) — do NOT copy Barracuda's test expectations. Construct the fish with `new Size(222, 910)` as the spriteFrameSize and `3, 1, 0, 1` frame args.
- `score-system.test.js:29`: change `expect(keys).toHaveLength(21);` → `expect(keys).toHaveLength(22);` (FISH_DEFINITIONS grew from 21 to 22 entries).
- One unit test class is sufficient (parsimony) — no separate functional class; the factory-integration case lives in the same file as in barracuda.test.js.

**Definition of Done:**

- [ ] `__tests__/squid.test.js` asserts `instanceof CatchableFish`, the data values above, the left-facing flip, spawn bounds, and factory creation.
- [ ] `score-system.test.js` "all configured class names exist in SCORE_MAP" passes with the updated count of 22.
- [ ] Verify: `npx jest __tests__/squid.test.js __tests__/score-system.test.js` — all pass.

### Task 6: ADR for the Squid

**Objective:** Document the Squid's design decisions (score, the "almost no strength + very fast" interpretation, RARE/deep-lane placement, left-facing sprite, 3×2 frame geometry, CSS hiding) in a new ADR.

**Files:**

- Create: `docs/adr/0040-squid-fast-weak-catchable-fish.md`

**Key Decisions / Notes:**

- Number is `0040` (current highest is `0039-barracuda-deep-lane-trap-fish.md`). Follow the structure of ADR-0039: Context, Requirement Interpretation table (map the user's Spanish phrasing — "score 250", "no tener casi fuerza" → `strength: 2`, "muy rapido" → `speedMax: 5.6` ties AnglerFlish), Decision parameter table, sprite-orientation note (left-facing), and Consequences (note `FISH_DEFINITIONS` now has 22 entries and `score-system.test.js` count updated).

**Definition of Done:**

- [ ] `docs/adr/0040-squid-fast-weak-catchable-fish.md` exists with Context, Requirement Interpretation, Decision (parameter table), and Consequences sections.
- [ ] Verify: file present and parameter table matches the values shipped in `constants.js`.

## Out of Scope

- No new fight/score mechanic — the existing pipeline already handles a low-strength positive-score fish.
- No `PremiumCatchableFish` sparkle treatment.
- No mobile-profile-specific tuning beyond the automatic `spriteScale` applied to every species.

## Verification

1. **Unit/integration:** `npm test` — full suite passes (0 failures), including the new `squid.test.js` and the corrected count in `score-system.test.js`.
2. **Node smoke checks:** the Task 1 and Task 3 `node -e` one-liners print the expected values.
3. **Browser E2E** (`python3 -m http.server 8081` → http://localhost:8081/index.html):
   - The squid `<img>` is not visible in the page body (CSS hide works).
   - Enable debug/play until a squid spawns in the deep lane; confirm it swims noticeably fast, the sprite is oriented correctly (head leading its travel direction, flipping with direction), and animates through its frames without sampling artifacts.
   - Hook a squid: confirm it is easy to land (almost never escapes) and awards +250 on capture.
