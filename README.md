# Fishing Time!!!

A vanilla-JS browser fishing arcade game. Steer your boat, cast the hook, and reel in enough fish to hit **500 points** before the 2-minute timer runs out.

## Gameplay

- **Move:** Arrow Left / Arrow Right (keyboard) or tap the on-screen left/right zones (mobile)
- **Cast / Reel:** Space bar (keyboard) or the reel button (mobile)
- **Win:** reach 500 points before time expires
- **Lose:** timer hits zero below 500 points

### Scoring

| Species | Points |
|---------|--------|
| Butterfly Fish | +10 |
| Clown Fish | +5 |
| Puffer Fish | +25 |
| Lion Fish | +15 |
| Tuna | +250 |
| Octopus | +100 |
| Swordfish | +150 |
| Shark | +500 |
| Crab | +1000 |
| Hammerhead Shark | +700 |
| Jellyfish | -25 |
| Bottle / Apple / Wheel / Shoe / Fish Bone | -5 |

Fish that get hooked will struggle — tap Space (or reel button) rapidly to fight them in before they escape.

## Math and Design Principles

Fishing Time uses arcade-style math rather than strict physical simulation. The goal is predictable game feel, readable code, and tunable difficulty.

### Hook Pendulum and Casting

The hook is modeled as a simplified pendulum hanging from the rod tip. Its endpoint is computed from a pivot point, rope length, and angle:

```js
endpointX = pivotX + ropeLength * Math.sin(angle)
endpointY = pivotY + ropeLength * Math.cos(angle)
```

The angle is measured from straight down. Because canvas Y coordinates increase downward, `Math.cos(0)` places the hook directly below the pivot.

While idle, the hook swings with a sine wave:

```js
angle = HOOK_MAX_SWING_ANGLE * Math.sin(swingPhase)
```

This is a harmonic approximation, not a gravity-accurate pendulum. On cast, the current angle is frozen into `_castAngle`, then the rope length grows along that fixed line until the hook reaches the depth limit (`95%` of canvas height) or catches something. This makes casting a timing mechanic: the player must fire when the pendulum points toward the intended target.

### Collision Model

Collisions use axis-aligned bounding boxes (AABB). The hook and each enemy are treated as rectangles, and a catch happens when those rectangles overlap while the hook is in the casting state. This is less precise than pixel-perfect collision, but it is fast, deterministic, and good enough for an arcade fishing game.

### Fish Struggle Model

Catchable fish have a fight specification derived from `FISH_DEFINITIONS`: `strength` and `escapeRate`. During a fight, the hook tracks escape pressure:

```js
escapeProgress += strength * escapeRate * deltaSeconds
```

If `escapeProgress` reaches `HOOK_STRUGGLE_MAX_ESCAPE` (`100`), the fish breaks free. Each reel tap lowers escape progress and shortens the rope:

```js
escapeProgress -= HOOK_STRUGGLE_REEL_POWER
ropeLength -= HOOK_REEL_DISTANCE_PER_PRESS
```

The reel power bar displays a normalized value:

```js
power = 1 - escapeProgress / HOOK_STRUGGLE_MAX_ESCAPE
```

`power = 1` means the fish is safely under control; `power = 0` means it is about to escape.

### Capture Animation

Capture progress is normalized from the rope length:

```js
progress = (catchStartRopeLength - ropeLength) /
           (catchStartRopeLength - HOOK_REST_LENGTH)
```

The animation has two phases:

- **Rising:** the caught enemy rides the hook upward.
- **Throwing:** after `78%` progress, the enemy arcs into the boat, shrinks, and fades.

The throw arc is a linear interpolation toward the boat plus a sine bump:

```js
x = hookX + (targetX - hookX) * t
y = hookY + (targetY - hookY) * t - Math.sin(t * Math.PI) * arcHeight
```

`Math.sin(t * Math.PI)` is `0` at both endpoints and `1` halfway through, which creates a smooth arcade-style arc without extra special cases.

### Fish Traffic and Probability

Fish do not patrol forever. They spawn offscreen, cross the playfield, leave the visible area, and despawn. `FishSpawner` controls this traffic model with:

- horizontal lanes with canvas-relative Y ranges;
- alternating lane directions;
- per-species speed ranges;
- weighted random selection through `spawnWeight`;
- per-species cooldowns through `spawnFrequency`;
- active-count caps for rare or large fish;
- mobile-specific density and sprite scaling through gameplay profiles.

For weighted spawning, each eligible species contributes its `spawnWeight` to the total. A species with weight `10` is roughly twice as likely as a species with weight `5`, assuming both are eligible and off cooldown.

Depth is part of the risk/reward design. Surface and upper lanes contain common fish and trash. Deep and bottom lanes contain stronger, rarer, or more valuable species such as tuna, swordfish, shark, hammerhead shark, crab, and octopus.

### Scoring and Win Condition

Scores also come from `FISH_DEFINITIONS` and are mapped by enemy class. Positive catches increase score and can update the high score. Trash and hazards apply negative score. Escaped positive fish apply a partial penalty, and previously hooked fish that later leave the screen can apply a smaller evade penalty.

The game is won by reaching `500` points before the `120` second timer expires. When time runs out, the final score determines whether the result is `YOU WIN!` or `GAME OVER`.

### Architectural Principles

- **Arcade feel over realism:** sine waves, constant speeds, rectangles, and simple normalized values keep the game responsive and easy to tune.
- **Finite state machines:** hook and player behavior are driven by explicit states such as `IDLE`, `CAST`, `HOOKED`, `RETRIEVING_EMPTY`, and `REEL`.
- **Configuration as source of truth:** every per-species value — score, rarity, strength, escape rate, lanes, speed, cooldown, spawn weight, sprite dimensions, DOM element ID, and frame layout — lives in a single `FISH_DEFINITIONS` entry. `EnemyFactory` and `FishSpawner` both read from it; no per-species code lives outside the entry and the class file.
- **Separation of responsibilities:** `Game` coordinates; `Hook` handles casting and fights; `FishSpawner` handles population; `ScoreSystem` handles scoring; `EnemyWithAnimation` owns capture rendering.
- **Event-driven decoupling:** input, scoring, audio, reel tension, timer expiration, captures, and escapes communicate through custom events instead of direct object coupling.
- **Responsive profiles:** desktop and mobile use different gameplay profiles for density, scaling, HUD size, waterline, and active traffic caps.

## Development

**Prerequisites:** Python 3, Node.js, Yarn

```bash
yarn install          # install Jest (only dev dependency)
python3 -m http.server 8081   # start dev server
# open http://localhost:8081/index.html
```

```bash
npm test              # run all 33 test suites (369 tests)
npx jest __tests__/butterflyfish.test.js   # run one file
```

## Architecture

```
src/           One JS class per file, shared as globals in browser
__tests__/     Jest unit tests (CommonJS via index.js)
images/
  fishes/      PNG spritesheets — row 0 swim, row 1 captured
  items/       Inert object spritesheets
  backgrounds/ Parallax layers (sky, cloud, ocean, seabed)
sfx/           MP3 sound effects
docs/
  adr/         Architecture Decision Records
  plans/       Feature plan files (generated by /spec)
index.js       CommonJS shim for tests — sets globals + exports
index.html      Production entry point (no build step)
```

**Class hierarchy:**
```
GameObject
  └── Enemy
        └── EnemyWithAnimation
              ├── CatchableFish   (fish with strength/escape-rate fight spec)
              └── InertObject     (trash — passive, negative score)
```

All numeric tunables and spawn configuration live in `src/constants.js`. Fish lanes, rarity tiers, and weighted spawn probabilities are declared in `FISH_DEFINITIONS` and `FISH_LANES`.

Mobile and desktop rendering are handled by two gameplay profiles (`GAMEPLAY_PROFILE_DESKTOP` / `GAMEPLAY_PROFILE_MOBILE`) — no ad-hoc branching in game classes.

## Adding a New Species

Every new species requires changes in five places: a `FISH_DEFINITIONS` entry in `src/constants.js` (with all gameplay and render geometry fields), the class file in `src/`, registration in `index.js`, an `<img>` tag in `index.html`, and a Jest test in `__tests__/`. `EnemyFactory` picks it up automatically from the entry. Finish with an ADR in `docs/adr/`.
