# ADR 0034: Premium Fish Rim Glint + Sparkle Visual Effect

**Date:** 2026-06-18
**Status:** Accepted
**Supersedes:** Visual treatment from the PremiumCatchableFish plan (2026-06-18-premium-catchable-fish.md)

## Context

The prior PremiumCatchableFish implementation used a **dual-layer `shadowBlur` glow**:
an outer lime-green halo (blur 28-60 px) and an inner warm-yellow layer, both rendered by
drawing scaled-up copies of the sprite with `shadowBlur` set. The effect was rejected at
the spec-verify code review gate because it reads as a "neon glow / magical aura /
blurred halo" -- an enchanted creature rather than a valuable arcade target.

Reference: a Pirate Hook screenshot provided by the user showed the target style -- a
bright, crisp circular gradient behind the fish with the fish clearly visible on top,
no blur, no halo.

## Decision

Replace the `shadowBlur` dual-glow with two lightweight, purely-geometric effects:

### 1. Rim Glint (behind the fish)

A radial gradient drawn once, centered on the fish, that fades from a warm gold/amber
core to fully transparent at the edge:

- `createRadialGradient(cx, cy, 0, cx, cy, radius)` where `radius = max(w,h) * 0.62`
  (factor < 1 keeps it tight against the sprite; never an oversized halo)
- Core color: `rgba(255, 200, 90, 1)` -- opaque gold/amber
- Edge color: `rgba(255, 200, 90, 0)` -- fully transparent
- `globalAlpha` pulses between 0.30 and 0.65 at ~1.0 s/cycle (`PREMIUM_PULSE_SPEED = 0.105` rad/frame)

### 2. Sparkles (on top of the fish)

Three 4-pointed stars (8-vertex paths: alternating outer `r` and inner `r * 0.38` radii)
that twinkle independently via deterministic phase offsets:

- Color: `rgba(255, 246, 208, 1)` (`#FFF6D0` white-gold)
- Peak outer radius: `max(w,h) * 0.14`
- Phase cycle: 96 frames (~1.6 s at 60 fps), duty cycle 0.32
- Anchors (relative offsets from fish center): `(+0.42, -0.34)`, `(-0.40, +0.30)`, `(+0.18, +0.40)`
  with phase offsets 0, 32, 64 respectively
- Phase spacing (32) > `ceil(96 * 0.32) = 31` -- guarantees at least one frame per cycle
  where no sparkle is visible, preserving the "blinking in/out" twinkle feel

### Render order inside `draw()`

1. `_drawPremiumGlint` -- radial gradient (own save/restore, no sprite interaction)
2. `ctx.save()` -> `_drawTrafficSprite` -> `ctx.restore()` -- fish drawn once, unmodified;
   the explicit wrapper save/restore prevents the sprite's `translate`+`scale` transforms
   from leaking into the sparkle layer
3. `_drawPremiumSparkles` -- per-sparkle save/restore via `_drawSparkleStar`

## Consequences

**What changes:**

- No `shadowBlur` is set anywhere in `PremiumCatchableFish`
- The fish sprite is drawn exactly once per frame (no scaled duplicate copies)
- The effect uses pure canvas geometry (radial gradient + star paths) -- no image operations
- All premium species that extend `PremiumCatchableFish` (currently `Crab`) inherit the
  new effect with zero per-species code

**What stays the same:**

- Class hierarchy unchanged (`CatchableFish -> PremiumCatchableFish -> Crab`)
- `_drawDebug` no-op hook preserved for `Crab` to override
- Captured-state bypass unchanged -- `drawCaptured()` still routes without any glint/sparkle
- `_pulseTick` (renamed from `_glowTick`) is still a monotonic counter incremented in `update()`

**Trade-offs:**

- The glint circle is visible but not overwhelming -- alpha max 0.65 is bright enough to
  attract attention without obscuring the sprite
- Sparkles are infrequent enough (duty 0.32 of a 1.6 s cycle) to read as "rare" rather
  than "busy"
- The geometry is fully deterministic, making the effect straightforward to unit-test
  without mocking or controlling `Math.random()`
