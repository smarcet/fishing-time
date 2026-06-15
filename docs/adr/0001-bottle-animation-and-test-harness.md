# ADR 0001: Bottle Animation Model and Test Harness

Date: 2026-06-14
Status: Accepted

## Context

`fishing-time` is a single-file (`index.js`) HTML5-canvas game with no module
system, no build step, and no tests. The floating bottle (`Trash`) animated
stiffly: it advanced sprite frames every frame (too fast), drifted at the same
speed as the fish (1.5 px/tick), and had no vertical or rotational motion. We
wanted it to feel like it is bobbing in water, and we wanted the animation math
under test - which requires running game code outside the browser for the first
time.

## Decision

**1. Animation:** Add sinusoidal vertical bob (amplitude 12 px) and an
out-of-phase rocking tilt (+/-10 deg, driven by `cos` against the bob's `sin`),
a 6-tick sprite-frame stagger, and a slower horizontal drift (0.6 vs 1.5
px/tick). The motion lives in `Trash.update()` and `Trash.draw()`.

**2. Parameterization:** Promote drift speed and frame stagger to overridable
field defaults on the base classes:

- `Enemy._driftSpeed = 1.5` - replaces hardcoded literals in `Enemy.update()`.
- `EnemyWithAnimation._staggerFrame = 1`, `._tick = 0` - gate the existing
  frame-advance logic behind `if (++this._tick % this._staggerFrame === 0)`.

No constructor signatures were changed. All existing fish and octopus call sites
rely on the defaults, so their behavior is byte-for-byte unchanged (covered by a
regression test).

**3. Test harness:** Adopt Jest. Make `index.js` dual-mode:

- Guard the `window.addEventListener('load')` bootstrap with
  `if (typeof window !== 'undefined')` so Node.js does not throw on load.
- Append `if (typeof module !== 'undefined' && module.exports) { module.exports = {...} }`
  so Jest can `require()` the classes directly.

`Trash` is the one entity unit-testable headless because it receives its sprite
image as a constructor argument rather than calling `document.getElementById`
itself.

## Consequences

- The repo gains `package.json` and `node_modules/` (dev-only). The game itself
  still needs no build step to run - open `main.html` via a local HTTP server.
- `index.js` is now loadable in both browser (`<script>`) and CommonJS (`require`)
  contexts without any code change at the call site.
- Base classes carry two new field defaults; no constructor call sites were
  modified.
- `npm test` runs the Jest suite (`__tests__/trash.test.js`, 12 tests).

## Alternatives Considered

- **`node --test` (built-in test runner):** zero dependencies and closer to the
  no-build ethos of the project, but Jest was explicitly chosen for its richer
  matchers and ecosystem familiarity.
- **Extracting classes into ES modules:** would be a cleaner long-term
  architecture but represents a much larger blast radius for a single-file game
  with no bundler. Deferred.
- **Positional constructor params for stagger/drift:** threading new positional
  params through `EnemyWithAnimation` would require `Trash` to pass `undefined`
  placeholders for the existing `maxFrameY`/`dieFrameX`/`dieFrameY` args.
  Overridable field defaults were chosen instead - same effect, zero call-site
  changes.
