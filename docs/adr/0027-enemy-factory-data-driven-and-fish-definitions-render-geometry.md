# ADR 0027 - Data-Driven EnemyFactory, FISH_DEFINITIONS Render Geometry, and _tick Fix

**Date:** 2026-06-17
**Status:** Accepted

## Context

Three related issues were identified during an architectural review:

### 1. EnemyFactory was not truly data-driven

`FISH_DEFINITIONS` (ADR-0025) was the authoritative source for population data (lanes, score, strength, speed, etc.). However, `EnemyFactory` still had two separate hard-coded structures:

- A `this.specs[ENEMY_TYPE_X] = { ... }` block per species in the constructor (~120 lines for 16 species).
- A 170-line `createEnemy()` if/else-if chain with one branch per species.

Adding a new species required two manual changes to `EnemyFactory.js` in addition to the `FISH_DEFINITIONS` entry, and the constructor data was duplicated from information already in constants files.

### 2. Render geometry was scattered across three locations

Per-species render data (sprite cell dimensions, display sizes, DOM element IDs) lived in three places simultaneously:

- ~40 named constants in `src/constants.js` (`CLOWN_FISH_FRAME_WIDTH`, `SHARK_FRAME_HEIGHT`, etc.)
- ~80 lines of local constants in `EnemyFactory.js` (`CLOWN_FISH_DISPLAY_H`, `DOM_ID_SHARK`, etc.)
- The `this.specs[...]` constructor blocks that assembled them

This made it impossible to answer "what are all the parameters for species X?" from a single location.

### 3. `_tick` grew without bound in EnemyWithAnimation

The animation frame counter was a monotonically increasing integer:

```js
if (++this._tick % this._staggerFrame === 0) { ... }
```

Over a long session this would grow to an arbitrarily large number. More critically, if `_staggerFrame` changed between `update()` and `updateCaptured()` calls (e.g. when a fish is hooked mid-frame), the modulo check could skip a frame advance because the residue of the old counter against the new divisor was non-zero.

## Decisions

### 1. Replace the createEnemy if-chain with a `_registry` map

`EnemyFactory._registry` maps each `ENEMY_TYPE_*` string to the corresponding class constructor:

```js
this._registry = {
  [ENEMY_TYPE_CLOWN_FISH]: ClownFish,
  [ENEMY_TYPE_SHARK]:      Shark,
  // ... 16 entries
};
```

`createEnemy()` becomes a 4-line method:

```js
createEnemy(name, game, ctx) {
  const spec = this.specs[name];
  const Cls  = this._registry[name];
  if (!spec || !Cls) return null;
  return Cls.create(game, ctx, spec);
}
```

Any `ENEMY_TYPE_*` that has no registry entry returns `null` instead of silently falling back to a default species, which makes roster/factory drift detectable by tests.

### 2. Add `static create(game, ctx, spec)` to every species class

Each species class encapsulates its own spawn position logic. `static create()` constructs the instance from a spec object returned by `EnemyFactory.specs[id]`:

```js
// CatchableFish species (e.g. ClownFish)
static create(game, ctx, spec) {
  return new ClownFish(
    game, ctx, spec.size,
    new Point(
      ClownFish.randomSpawnX(game.getSize().getWidth(), spec.size.getWidth()),
      ClownFish.randomSpawnY(game.getSize().getHeight(), spec.size.getHeight())
    ),
    spec.image, spec.maxFrameX, spec.maxFrameY,
    spec.dieFrameX, spec.dieFrameY, spec.spriteFrameSize
  );
}

// InertObject species (e.g. DiscardedBottle)
static create(game, ctx, spec) {
  return new DiscardedBottle(
    game, ctx, spec.size,
    new Point(Enemy.randomSpawnX(game.getSize().getWidth(), spec.size.getWidth()), WATER_SURFACE_Y),
    spec.image, spec.maxFrames
  );
}
```

Special-case spawn Y positions (seabed for `Crab`, mid-deep for `Octopus`) are expressed as constants (`CRAB_SEABED_FACTOR`, `OCTOPUS_SPAWN_Y_FACTOR`) and handled inside each class's own `static create()` rather than in `EnemyFactory`.

### 3. Extend FISH_DEFINITIONS with render geometry

`FISH_DEFINITIONS` becomes the single source of truth for every per-species value. Each entry now carries render geometry in addition to population data:

```js
{
  id:        ENEMY_TYPE_CLOWN_FISH,
  className: FISH_CLASS_CLOWN_FISH,

  // render geometry (new)
  domId:     'clown_fish_sprite',
  displayH:  114,  displayW: 107,
  frameH:    321,  frameW:   342,
  maxFrameX: 10,   maxFrameY: 1,
  dieFrameX: 0,    dieFrameY: 1,

  // population data (unchanged from ADR-0025)
  rarity:         FISH_RARITY_COMMON,
  lanes:          [FISH_LANE_SURFACE, FISH_LANE_UPPER, FISH_LANE_MIDDLE],
  score:          5,
  strength:       5,
  escapeRate:     1.2,
  speedMin:       1.2,
  speedMax:       CLOWN_FISH_DRIFT_SPEED,
  spawnWeight:    10,
  spawnFrequency: 80,
}
```

`InertObject` entries carry `maxFrames` instead of the frame grid fields. `ButterflyFish` uses `dieFrameY: 0` because its spritesheet has no separate die row.

The `EnemyFactory` constructor replaces the 15 per-species `this.specs[...]` blocks with a single loop:

```js
FISH_DEFINITIONS.forEach(def => {
  const Cls = this._registry[def.id];
  const entry = {
    image: typeof document !== 'undefined' ? document.getElementById(def.domId) : null,
    size: new Size(def.displayH, def.displayW),
  };
  if (!(Cls.prototype instanceof CatchableFish)) {
    entry.maxFrames = def.maxFrames;
  } else {
    entry.spriteFrameSize = new Size(def.frameH, def.frameW);
    entry.maxFrameX = def.maxFrameX;
    entry.maxFrameY = def.maxFrameY;
    entry.dieFrameX = def.dieFrameX;
    entry.dieFrameY = def.dieFrameY;
    entry.strength   = def.strength;
    entry.escapeRate = def.escapeRate;
  }
  this.specs[def.id] = entry;
});
```

The ~40 named frame-geometry constants (`CLOWN_FISH_FRAME_WIDTH`, `SHARK_FRAME_HEIGHT`, etc.) and ~80 lines of EnemyFactory-local display-size and DOM-ID constants are removed. Per-species drift speed constants (`CLOWN_FISH_DRIFT_SPEED`, etc.) are kept because species constructors still reference them directly to initialise `_driftSpeed`.

### 4. Bound `_tick` to `[0, staggerFrame)`

The frame counter is replaced with a modulo-bounded value:

```js
this._tick = (this._tick + 1) % this._staggerFrame;
if (this._tick === 0) { /* advance frame */ }
```

This keeps the counter small regardless of session length and eliminates the residue-mismatch risk on `staggerFrame` changes.

## Alternatives Considered

### Keep the if-chain but deduplicate it with a helper

A private `_makeSpec(def)` helper could have replaced the repeated `this.specs[X] = {...}` blocks. Rejected because the if-chain in `createEnemy()` would still need manual updates for each new species; the `static create()` + `_registry` approach eliminates both per-species touch points.

### Keep per-species frame constants, reference them from FISH_DEFINITIONS

FISH_DEFINITIONS fields could have referenced the existing named constants (e.g. `frameW: CLOWN_FISH_FRAME_WIDTH`) rather than inlining numeric literals. This would keep the names but leave the three-location duplication intact. Rejected in favour of inlining; the field names in the FISH_DEFINITIONS object provide equivalent readability without the indirection.

### Separate render geometry into a second registry

A `RENDER_GEOMETRY` map keyed on `ENEMY_TYPE_*` could have housed display sizes and frame layouts apart from population data. Rejected because it would reintroduce the split-location problem; a single FISH_DEFINITIONS entry is easier to audit and maintain.

## Consequences

- **Adding a new species now requires five places, not six.** No EnemyFactory code changes are needed; the `FISH_DEFINITIONS` entry plus the class file, `index.js` registration, `<img>` tag, and test are sufficient.
- `EnemyFactory.js` shrinks from 262 lines to 70 lines.
- `src/constants.js` loses ~40 frame-geometry constants; the FISH_DEFINITIONS entries grow by ~8 fields each.
- A misconfigured entry (missing `domId`, wrong class hierarchy) now surfaces at factory construction time rather than silently producing a broken enemy.
- The `_tick` fix prevents invisible frame-skip bugs on long play sessions and on the `update()` → `updateCaptured()` state transition.
