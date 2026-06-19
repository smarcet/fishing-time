# ChestWithJewels Inert Object Implementation Plan

Created: 2026-06-19
Author: smarcet@gmail.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Context

The game has catchable fish (struggle/fight when hooked) and inert objects
(instant grab, no fight). Inert objects are usually trash with a *negative*
score, but the `Clock` species proves a positive-score inert object works
(score +50). This change adds `ChestWithJewels` — a high-value treasure
(+10000) that the player grabs by hooking it. It is an InertObject (no fight),
spawns in the bottom lane, is epic rarity, moves very fast (tied with the
current fastest entity, Lobster, at 7.0 px/tick), and is guaranteed to appear
once every 30 seconds via the profile-level `guaranteedSpeciesIntervals`
mechanism (the same one Lobster uses for its 60s guarantee).

Score wiring is automatic: `ScoreSystem` reads `FISH_SCORE_MAP[className]`, and
the capture event carries `enemyType = constructor.name`. Adding the
`FISH_DEFINITIONS` entry with `score: 10000` registers the score with no
`ScoreSystem` edit.

**User-confirmed parameters (this session):**
- Drift speed: **7.0** px/tick (speedMin 5.0, speedMax 7.0) — ties Lobster, the fastest entity.
- Display size: **150×100** (3:2, matching the sprite's 1536×1024 aspect).

**Asset note:** the on-disk file is `images/items/chest._with_jewels.png` (an
erroneous dot). The user asked to rename it to `chest_with_jewels.png`. The
file is git-tracked, so the rename uses `git mv` to preserve history.

---

## Summary

**Goal:** Add `ChestWithJewels` (InertObject, +10000 score, epic rarity, bottom
lane, 7.0 px/tick, guaranteed every 30s, sprite hidden in `main.css`) following
the 5-place species-addition pattern in `.claude/rules/fishing-time-species.md`,
plus an ADR.

## Reference Model

`Lobster` (ADR-0035) is the near-exact precedent: epic, bottom lane, very fast,
guaranteed via `guaranteedSpeciesIntervals` + `guaranteedSpeciesInitialOffsets`.
`Clock` / `Wheel` are the canonical **InertObject** class template (constructor
signature `(game, ctx, size, position, image, maxFrames)`, `static create`,
bob `update()`). The chest mirrors `Clock`'s structure but with fast drift.

## Files & Changes

### Task 1 — `src/constants.js` (constants + FISH_DEFINITIONS + profiles + exports)

Add three constants (keep alphabetical within their groups):
```js
const ENEMY_TYPE_CHEST_WITH_JEWELS  = 'chest_with_jewels';
const FISH_CLASS_CHEST_WITH_JEWELS  = 'ChestWithJewels';
const CHEST_WITH_JEWELS_DRIFT_SPEED = 7.0;   // px/tick — ties Lobster (fastest)
```

Add an **InertObject** `FISH_DEFINITIONS` entry (use `maxFrames`, NOT
`frameH/W/maxFrameX/Y/dieFrameX/Y` — mirror the `Clock`/`Wheel`/`RedApple`
entries):
```js
{
  id:        ENEMY_TYPE_CHEST_WITH_JEWELS,
  className: FISH_CLASS_CHEST_WITH_JEWELS,
  domId:     'chest_with_jewels_sprite',
  displayH:  100,  displayW: 150,
  maxFrames: 1,
  rarity:         FISH_RARITY_EPIC,
  lanes:          [FISH_LANE_BOTTOM],
  score:          10000,
  strength:       0,
  escapeRate:     0,
  speedMin:       5.0,
  speedMax:       CHEST_WITH_JEWELS_DRIFT_SPEED,   // 7.0
  spawnWeight:    1,
  spawnFrequency: 1800,                            // 30s @ 60fps (cooldown floor)
  maxActive:      FISH_TRAFFIC_MAX_ACTIVE_ONE,
  captureRotation: 0,   // inert objects are not forcibly rotated
  captureOffsetX:  0,
  captureOffsetY:  0,
},
```

Add the guaranteed-spawn cadence to **BOTH** profiles. Use the complete
replacement literals (the `Object.freeze({…})` is replaced wholesale):

**GAMEPLAY_PROFILE_DESKTOP** (currently only has Lobster, add chest):
```js
guaranteedSpeciesIntervals: Object.freeze({ [ENEMY_TYPE_LOBSTER]: 3600, [ENEMY_TYPE_CHEST_WITH_JEWELS]: 1800 }),
guaranteedSpeciesInitialOffsets: Object.freeze({ [ENEMY_TYPE_LOBSTER]: 1800, [ENEMY_TYPE_CHEST_WITH_JEWELS]: 900 }),
```

**GAMEPLAY_PROFILE_MOBILE** (currently has Crab/HammerheadShark/Shark/Lobster, add chest):
```js
guaranteedSpeciesIntervals: Object.freeze({
  [ENEMY_TYPE_CRAB]: 600,
  [ENEMY_TYPE_HAMMERHEAD_SHARK]: 1200,
  [ENEMY_TYPE_SHARK]: 1200,
  [ENEMY_TYPE_LOBSTER]: 3600,
  [ENEMY_TYPE_CHEST_WITH_JEWELS]: 1800,
}),
guaranteedSpeciesInitialOffsets: Object.freeze({
  [ENEMY_TYPE_CRAB]: 600,
  [ENEMY_TYPE_HAMMERHEAD_SHARK]: 300,
  [ENEMY_TYPE_SHARK]: 900,
  [ENEMY_TYPE_LOBSTER]: 1800,
  [ENEMY_TYPE_CHEST_WITH_JEWELS]: 900,
}),
```

**Note on dual-1800:** `spawnFrequency: 1800` is a per-species cooldown floor
(the weighted spawner won't spawn the chest more often than every 30s). The
`guaranteedSpeciesIntervals: 1800` is a *separate* profile-level forcing function
that guarantees at least one spawn every 30s regardless of random weighting. At
`spawnWeight: 1` among many species, the random spawner alone would rarely
schedule the chest; the guaranteed path is the practical delivery mechanism.

Add the three new constants to the `module.exports` block at the bottom of the file.

### Task 2 — `src/ChestWithJewels.js` (new class) + registration

New class extending `InertObject`, mirroring `src/Clock.js` (bob `update()`,
`getPosition()`, `draw()`/`_drawCapturedSprite` as in Clock), but with fast
drift. Constructor sets `_staggerFrame = ANIM_STAGGER_SLOW`,
`_driftSpeed = CHEST_WITH_JEWELS_DRIFT_SPEED`, `_speedX = this._driftSpeed`.
(The spawner overrides `_driftSpeed`/`_speedX` from speedMin/speedMax at spawn;
the constructor value is the fallback for direct/test instantiation.)

```js
class ChestWithJewels extends InertObject {
  constructor(game, ctx, size, position, image, maxFrames) {
    super(game, ctx, size, position, image, maxFrames);
    this._staggerFrame = ANIM_STAGGER_SLOW;
    this._driftSpeed   = CHEST_WITH_JEWELS_DRIFT_SPEED;
    this._speedX       = this._driftSpeed;
    // bob fields as in Clock
  }
  static create(game, ctx, spec) {
    // WATER_SURFACE_Y is a test-only fallback — FishSpawner overrides Y from
    // the lane range at runtime, so the chest appears at the bottom lane in
    // production. This mirrors the pattern used by Clock/Wheel; all InertObjects
    // share the same create() Y fallback.
    return new ChestWithJewels(
      game, ctx, spec.size,
      new Point(Enemy.randomSpawnX(game.getSize().getWidth(), spec.size.getWidth()), WATER_SURFACE_Y),
      spec.image, spec.maxFrames
    );
  }
  // update()/getPosition()/draw() mirror Clock.js
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ChestWithJewels };
}
```

Register in two places:
- `index.js`: `const { ChestWithJewels } = require('./src/ChestWithJewels'); global.ChestWithJewels = ChestWithJewels;` + add to the `module.exports` object.
- `src/EnemyFactory.js`: add `ChestWithJewels` to the `_registry` map (key `ENEMY_TYPE_CHEST_WITH_JEWELS` / class `ChestWithJewels`, mirror the Clock/Wheel/Lobster entries).

### Task 3 — Asset rename + HTML wiring + CSS hide

- **Rename sprite (git-tracked):** `git mv images/items/chest._with_jewels.png images/items/chest_with_jewels.png`. This is a git write command and requires permission. Implementation will request it; if denied, the user should run it manually before the browser step so the `<img src>` resolves. The HTML tag and CSS hide rule use the post-rename name `chest_with_jewels.png` / `chest_with_jewels_sprite` regardless.
- **`index.html`** (the real entry point — `main.html` does not exist):
  - Add `<img src="images/items/chest_with_jewels.png" id="chest_with_jewels_sprite" class="sprite-image" alt=""/>` next to the other item img tags (lines ~76-80).
  - Add `<script src="src/ChestWithJewels.js"></script>` **before** `src/EnemyFactory.js` (script tag ~line 52), next to the other InertObject subclass scripts (~lines 29-33).
- **`main.css`** ("esconder el sprite"): add `#chest_with_jewels_sprite` to the existing big ID-list selector (~lines 75-77) that ends `{ display: none; }`. There is no `.sprite-image` rule, so the ID-list is the hide mechanism the project already uses.

### Task 4 — Test + ADR

- **`__tests__/chestWithJewels.test.js`** — mirror `__tests__/clock.test.js` via a `makeChest()` factory. Required cases:
  - `getFightSpec() === null` (it's an InertObject — instant grab, no fight).
  - `instanceof InertObject`.
  - `update()` advances x-position by the drift each tick (constructor fallback 7.0; assert direction + magnitude as Clock's test does with `toBeCloseTo`).
  - `EnemyFactory.createEnemy('chest_with_jewels', ...)` returns a `ChestWithJewels` instance (verifies registry entry — a missing registry key causes `createEnemy` to silently return `null`).
  - `FISH_SCORE_MAP['ChestWithJewels'] === 10000` — verifies the automatic score wiring chain: FISH_DEFINITIONS className → FISH_SCORE_MAP key → capture event `constructor.name`. A className typo silently produces score 0 with no error.
  - `isOffScreen()` true when fully outside canvas bounds.
- **`docs/adr/0036-chest-with-jewels-treasure.md`** — document: InertObject (no fight) vs CatchableFish choice; score 10000; epic rarity; bottom lane; speed 7.0 (ties Lobster, "muy muy rápida"); 30s guaranteed interval in both profiles with 900-tick initial offset; sprite hidden in `main.css`; asset rename. Follow the ADR-0035 section format (Date, Status, Context, Decisions, Alternatives Considered). Confirm 0036 is the next free number before writing.

## Out of Scope

- No `ScoreSystem` changes — score wiring is automatic via `FISH_SCORE_MAP[className]`.
- No new visual effects (no premium glow). The chest is a plain InertObject; if a glow is wanted later, that's a separate change.
- No changes to the fight/struggle system (InertObjects have none).

## Verification

1. **Unit tests:** `npx jest __tests__/chestWithJewels.test.js` then full `npm test` (0 failures — fix any regression, per zero-tolerance rule).
2. **Registry grep:** `grep -n 'chest_with_jewels' src/EnemyFactory.js` must return a line inside `_registry`. A missing registry entry causes `createEnemy` to return `null` silently; this grep is the zero-cost sanity check before running tests.
3. **Module load smoke:** `node -e "require('./index.js'); console.log(typeof ChestWithJewels)"` → `function` (proves index.js registration + every source file's CommonJS export).
4. **Factory smoke:** confirm `EnemyFactory.createEnemy('chest_with_jewels', …)` returns a non-null `ChestWithJewels` (covered by the test; also exercise via node REPL if needed).
5. **Browser E2E** (mandatory for UI per project rules): `python3 -m http.server 8081` → open `http://localhost:8081/index.html`, play until a chest spawns in the bottom lane (guaranteed ≤30s, first ~15s), hook it, and confirm score jumps by +10000. Verify the standalone `#chest_with_jewels_sprite` `<img>` is hidden (CSS rule), while the in-canvas chest renders. Use a browser-automation tier (Chrome MCP / DevTools MCP / playwright-cli) for the snapshot→interact→re-snapshot evidence.
6. **Asset check:** confirm `images/items/chest_with_jewels.png` exists post-rename and the old dotted name is gone; the `<img src>` resolves (no 404 in the network panel).

## Progress Tracking

Total: 4 | Done: 4 | Left: 0

- [x] Task 1 — constants.js: constants + InertObject FISH_DEFINITIONS entry + guaranteed cadence in both profiles + exports
- [x] Task 2 — ChestWithJewels.js class + index.js + EnemyFactory._registry registration
- [x] Task 3 — git mv sprite rename + index.html img/script + main.css hide rule
- [x] Task 4 — chestWithJewels.test.js + ADR 0036
