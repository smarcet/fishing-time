# ADR 0026 - Mobile Input and Responsive Gameplay Architecture

**Date:** 2026-06-17
**Status:** Accepted

## Context

The game was originally tuned for desktop canvas play. Keyboard state was read through `Game.hasKey()`, the hook used Space directly for cast/reel behavior, and the visible population used desktop-sized sprites and desktop density.

That worked on larger screens, but phone landscape play exposed several issues: too many entities at once, oversized sprites, a boat/HUD that consumed too much vertical space, no touch navigation, and portrait orientation allowing interactions in an unreadable layout.

## Problem Statement

Mobile needs to feel like a first-class game mode without regressing desktop play. The implementation must support landscape-first orientation, touch casting/reeling, touch boat navigation, lower mobile clutter, responsive sprite/HUD scaling, and deterministic browser verification.

The solution also must avoid placing mobile-specific conditionals directly throughout `Game`. Gameplay systems should react to a neutral input/event contract rather than knowing whether input came from keyboard, touch, or a future controller.

## Decision

The game adopts a landscape-first mobile experience with responsive scaling, reduced entity density, touch-based gameplay controls, `MobileSystem`, and an `InputSystem` abstraction.

`InputSystem` is the common contract. `KeyboardInputSystem` preserves desktop keyboard behavior and emits cast/reel events for Space. `TouchInputSystem` maps water taps to cast/reel events and exposes virtual left/right arrow state from large on-screen navigation controls.

`MobileSystem` owns mobile orchestration: device/profile detection, portrait blocking, rotate overlay visibility, responsive canvas sizing, mobile profile application, touch control visibility, pause state, input enablement, and listener teardown.

Gameplay remains event-driven:

- `EVENT_CAST_REQUESTED`
- `EVENT_REEL_TAP`
- `EVENT_REEL_START`
- `EVENT_REEL_STOP`

`Hook` subscribes to these events and owns the fish fight tension model. `Game` only consumes the active input system through `hasKey()` for horizontal movement and exposes neutral resize/profile/stat methods for mobile orchestration and E2E verification.

Mobile uses a dedicated gameplay profile that scales fish, boat, HUD, bubbles, and spawn pressure. Large fish remain capped, while small and medium fish can appear with higher cadence. Sprite source frame dimensions are preserved separately from display sizes so scaling does not crop or stretch animations.

## Alternatives Considered

### Keep keyboard-only input

Rejected. It would preserve desktop behavior but leave phones dependent on hardware keyboards or browser-specific hacks.

### Put mobile conditionals directly in `Game`

Rejected. `Game` already coordinates update, draw, collision, scoring, timer, player, and traffic. Adding orientation, overlay, touch controls, and mobile density there would make it a mobile god object and make future input methods harder to add.

### Rely on browser orientation lock

Rejected as the primary mechanism. Orientation lock support varies by browser and often requires a user gesture. The implementation may attempt lock as progressive enhancement, but the real behavior is responsive detection plus a blocking portrait overlay.

### Implement all mobile gameplay directly inside `MobileSystem`

Rejected. `MobileSystem` should orchestrate environment and profile changes, not own casting, reeling, scoring, spawning, or fight rules. Those remain in gameplay systems behind events and profile inputs.

### Reduce mobile density by deleting species

Rejected. Removing species would reduce variety and progression. The chosen profile keeps the roster, scales display sizes, reduces spawn pressure, caps large fish, and tunes specific cadence such as crab cooldown.

## Consequences

- Desktop keyboard play remains isolated behind `KeyboardInputSystem`.
- Mobile touch play works without keyboard input, including cast, reel tapping, and boat navigation.
- Portrait mobile pauses gameplay, blocks input, and shows `Rotate your phone to play`.
- Sprite scaling now requires preserving source frame sizes separately from display sizes for every spritesheet-backed enemy.
- Mobile profile constants will need tuning with real device feedback.
- Browser E2E has deterministic helpers behind `?e2e=1`, including forced hooked fish, runtime stats, and frame sampling.
- Future input methods can implement `InputSystem` and emit the same custom events without changing hook/fight gameplay.
