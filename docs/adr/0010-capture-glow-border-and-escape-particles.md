# ADR 0010 — Capture Glow Border and Escape Particle Explosion

**Date:** 2026-06-15
**Status:** Accepted

## Context

Captured entities (fish, octopus, crab, bottles) previously communicated their state via an on/off alpha blink: `globalAlpha` alternated between `1.0` and `0.2` every `CAPTURE_BLINK_INTERVAL` frames. The strobe effect was visually distracting and provided no information about escape danger.

Two additional behaviors were needed:

- A visual indication — escalating in urgency — when a hooked fish is close to breaking free.
- A satisfying impact moment when the fish actually escapes.

Design constraints:

- All four entity types delegate `drawCaptured()` to `EnemyWithAnimation.drawCaptured()`, so a single method change covers the whole game.
- The canvas 2D API allows `ctx.shadowColor` + `ctx.shadowBlur` to paint a glow halo around any drawn image; both must be set inside `ctx.save()`/`ctx.restore()` to avoid bleed onto other elements.
- `Hook._escapeProgress` and `Hook._isFishHook` are accessible from `EnemyWithAnimation.drawCaptured()` via `this._hook`.
- Particles must persist after the hook clears its catch (on escape the hook resets `_catch = null` and `_status = IDLE`) so the burst is visible after the fish swims away.

## Decisions

### 1. Replace alpha blink with `ctx.shadowBlur` golden glow

`CAPTURE_BLINK_INTERVAL` and the `showCatch` toggle in `Hook.draw()` are removed. Instead `drawCaptured()` sets `ctx.shadowColor` and `ctx.shadowBlur` around the existing `ctx.save()` block:

```js
ctx.shadowColor = shadowColor;
ctx.shadowBlur  = glowSize;
```

The fish is always fully opaque (`globalAlpha = 1.0`) during the RISING phase. The existing alpha fade during the THROWING phase (`alpha = 1.0 - t`) is preserved.

### 2. Sin-driven pulse with `CAPTURE_GLOW_SPEED`

Glow size pulses via a sine wave on `_captureTick`:

```js
const baseGlow = Math.max(5, 15 + 25 * Math.sin(this._captureTick * pulseSpeed));
```

Range: 5..40 px blur. The `Math.max(5, ...)` floor keeps a faint halo even at the trough so the glow is never invisible. `CAPTURE_GLOW_SPEED = 0.12` rad/tick gives a period of ~52 ticks (~0.87 s at 60 fps).

### 3. Escape danger drives color, speed, and intensity

`escapeDanger` is derived from `hook._escapeProgress / HOOK_STRUGGLE_MAX_ESCAPE`, clamped to [0, 1]:

| Property | Formula | Range |
|----------|---------|-------|
| Glow color | `rgba(255, round(215*(1-danger)), 0, ...)` | Gold → red |
| Pulse speed | `CAPTURE_GLOW_SPEED * (1 + danger * 3)` | 1x → 4x |
| Glow size multiplier | `1 + danger * 0.6` | 1.0x → 1.6x |

At 0% danger the halo is steady gold. As the fish nears escape, the pulse accelerates and the color shifts orange then deep red, providing an escalating urgency signal without any extra UI elements.

For non-fish entities (bottles, trash — `_isFishHook = false`) `escapeDanger` is always 0, so they always show the steady gold glow.

### 4. Particle burst on escape lives in `Hook.js`

When `_escapeProgress >= HOOK_STRUGGLE_MAX_ESCAPE`, before resetting catch state, 20 particles are pushed into `this._escapeParticles`:

```js
const angle = (Math.PI * 2 * i) / CAPTURE_ESCAPE_PARTICLES;
const speed = 3 + Math.random() * 4;
this._escapeParticles.push({
  x: escapePos.getX(), y: escapePos.getY(),
  vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2,
  life: 40, maxLife: 40,
  size: 4 + Math.random() * 4
});
```

The `-2` bias on `vy` gives an upward drift to the burst. `Hook.draw()` iterates `_escapeParticles` every frame, applying gravity (`vy += 0.2`), decrementing `life`, and removing dead particles. Each particle renders as a filled arc with `shadowBlur = 12` and a red-to-dark-red color (`rgba(255, round(t*80), 0, 1)`) fading with opacity `t = life / maxLife`.

Particles are stored on the hook (not on the escaping entity) so they survive the hook's catch-state reset and remain on screen for ~0.67 s after escape.

### 5. Two new constants; one removed

| Change | Constant | Value |
|--------|----------|-------|
| Added | `CAPTURE_GLOW_SPEED` | `0.12` rad/tick |
| Added | `CAPTURE_ESCAPE_PARTICLES` | `20` |
| Removed | `CAPTURE_BLINK_INTERVAL` | (was `6` frames) |

## Consequences

- The blink anti-pattern is gone; the glow border communicates both capture state (gold shimmer) and escape urgency (red pulse, accelerating) in a single readable signal.
- `EnemyWithAnimation.drawCaptured()` reads `hook._escapeProgress` and `hook._isFishHook` directly; these are internal fields but are stable — they reset to `0` / `false` on every new catch.
- Particle state accumulates on `Hook._escapeParticles`; at most one escape can happen at a time, so the array is bounded (max 20 live particles).
- `CAPTURE_GLOW_SPEED` and `CAPTURE_ESCAPE_PARTICLES` are tunable from `src/constants.js`; pulse feel and burst density can be adjusted without touching draw code.
- 108 Jest unit tests unchanged (canvas draw methods are not unit-tested; behavior is verified visually).
