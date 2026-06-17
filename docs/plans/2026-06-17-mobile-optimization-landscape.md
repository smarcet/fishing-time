# Mobile Optimization Landscape Implementation Plan

Created: 2026-06-17
Author: smarcet@gmail.com
Agent: Codex
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Redesign the fishing game so phones use a landscape-first, touch-playable, lower-density experience while the current desktop keyboard experience remains unchanged.

## Out of Scope

- Mandatory browser orientation lock is not required; it may be attempted only as a best-effort enhancement because browsers differ on support and gesture requirements.
- New art assets are not part of this change; existing sprites must be scaled proportionally.
- Desktop fish balance should not be changed except where shared abstractions are introduced and verified to preserve current behavior.

## Approach

**Chosen:** Add `MobileSystem` as the mobile orchestrator, with `InputSystem` implementations and neutral `Game` resize/profile APIs.
**Why:** `src/Game.js:46` currently owns `InputHandler`, while `src/Hook.js:122` reads Space directly through `Game.hasKey()`. A `MobileSystem` keeps mobile-only concerns together (orientation, overlay, responsive canvas, mobile profile, touch gating, and teardown) without turning `Game` into a mobile-specific class; `Game`, `Hook`, and `FishSpawner` consume events, dimensions, and profile values.

## Context for Implementer

`MobileSystem` should be an orchestrator, not a gameplay god class. It owns mobile detection, portrait blocking, responsive canvas sizing, profile selection, `TouchInputSystem` lifecycle, resize/orientation listeners, and cleanup. It must not own casting, capture thresholds, fish spawning rules, or score logic. `FishSpawner._laneY()` already calculates lane positions from `game.getSize()` at spawn time (`src/FishSpawner.js:121`), so responsive resize should update game dimensions and profile settings rather than duplicate lane math.

## Runtime Environment

- **Package manager:** Yarn (`yarn.lock` exists).
- **Start command:** `yarn dev`
- **Port:** `8081`
- **Health check:** `http://127.0.0.1:8081/main.html`
- **Restart procedure:** stop the foreground server with Ctrl-C, then run `yarn dev` again.

## File Structure

- `src/InputSystem.js` (create) - base input abstraction with enable/disable and custom-event dispatch helpers.
- `src/KeyboardInputSystem.js` (create) - desktop implementation that tracks arrow keys and maps Space presses to cast/reel events.
- `src/TouchInputSystem.js` (create) - mobile implementation that maps water taps to cast/reel events and ignores input while disabled.
- `src/MobileSystem.js` (create) - mobile detection, orientation overlay, canvas sizing, gameplay profile, touch system lifecycle, resize handling, performance stats, and teardown.
- `src/E2ETestHarness.js` (create) - query-param-gated deterministic browser test hook for forcing a hooked fish during E2E.
- `src/InputHandler.js` (modify) - compatibility wrapper around `KeyboardInputSystem`.
- `src/constants.js` (modify) - input event names, mobile tuning constants, and E2E event names.
- `src/main.js` (modify) - bootstraps `MobileSystem`, input, resize/orientation handling, and the game loop.
- `src/Game.js` (modify) - accepts input/profile dependencies, exposes resize/pause/profile/stats methods, and delegates key state to input.
- `src/Hook.js` (modify) - subscribes to cast/reel events and updates fight tension continuously.
- `src/Player.js` (modify) - keeps desktop horizontal movement through `Game.hasKey()` while Hook handles cast/reel events.
- `src/FishSpawner.js` (modify) - applies responsive density, preseed, spawn interval, and large-fish capacity settings.
- `src/EnemyFactory.js` (modify) - scales display sizes through the active gameplay profile without changing sprite frame dimensions.
- `src/ReelPowerBar.js` (modify) - renders the continuous tension bar in the upper-left corner.
- `src/TimerSystem.js` (modify) - updates HUD size on game resize.
- `main.html` (modify) - loads new scripts and adds the rotate overlay element.
- `main.css` (modify) - responsive canvas/overlay/touch CSS.
- `index.js` (modify) - exports new systems for Jest.
- `__tests__/input-system.test.js` (create) - keyboard and touch input behavior through emitted events.
- `__tests__/mobile-system.test.js` (create) - mobile detection, orientation blocking, canvas sizing, and teardown.
- `__tests__/e2e-test-harness.test.js` (create) - deterministic force-hook test harness behavior.
- `__tests__/hook.test.js` (modify) - cast/reel event behavior and fight tension thresholds.
- `__tests__/fish-spawner.test.js` (modify) - mobile density and large-fish caps.
- `__tests__/enemy-factory.test.js` (modify) - mobile display scaling without source-frame distortion.
- `__tests__/reel-power-bar.test.js` (modify) - continuous bar colors and compact layout.
- `__tests__/css.test.js` (modify) - overlay and canvas overflow safeguards.
- `docs/adr/0026-mobile-input-responsive-gameplay.md` (create) - ADR for the mobile input and responsive gameplay architecture.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Desktop controls regress while replacing `InputHandler` | Medium | High | Keep `Game.hasKey()` as a delegate to `KeyboardInputSystem`, add keyboard tests, and run the desktop E2E scenario. |
| Resize/orientation changes leave stale active entities | Medium | High | `Game.resize()` flushes non-hooked traffic and bubbles on mobile profile/orientation changes, reclamps the player, and preserves only the current hooked catch. |
| Mobile density changes remove progression variety | Medium | Medium | Reduce spawn pressure with profile multipliers while preserving `FISH_DEFINITIONS`; cap large fish separately instead of deleting species. |
| Touch reeling becomes either trivial or impossible | Medium | High | Drive capture from continuous tension with explicit capture/release thresholds and tests for rapid taps, slow taps, and no taps. |
| Global listeners duplicate across reloads/tests | Medium | Medium | Add `destroy()` to input, mobile, Hook, and game-owned listener systems; test repeated initialization does not duplicate cast/reel or pause behavior. |
| Performance remains anecdotal | Medium | Medium | Add profile caps plus a browser rAF frame-sampling check in mobile landscape E2E. |

## E2E Test Scenarios

### TS-001: Desktop Keyboard Play Still Works
**Priority:** Critical
**Preconditions:** Dev server is running at `http://127.0.0.1:8081/main.html?e2e=1` in a desktop viewport.
**Mapped Tasks:** Task 1, Task 2, Task 6

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/main.html?e2e=1` in a desktop viewport. | The game canvas fills the viewport and no rotate overlay is visible. |
| 2 | Press and release Space. | The hook casts immediately and the boat enters the cast animation. |
| 3 | Press ArrowLeft and ArrowRight. | The boat moves horizontally as before and remains visible inside the canvas. |
| 4 | Run `window.__fishingTimeE2E.forceHookedFish()` through browser automation, then press Space repeatedly. | The tension bar updates and the catch can be completed from keyboard input. |

### TS-002: Portrait Mobile Blocks Gameplay
**Priority:** Critical
**Preconditions:** Dev server is running and browser automation emulates a touch phone in portrait orientation.
**Mapped Tasks:** Task 3, Task 5, Task 6

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/main.html?e2e=1` with a portrait mobile viewport. | A centered overlay says `Rotate your phone to play`. |
| 2 | Tap the water/canvas while the overlay is visible. | The hook does not cast and gameplay timers/enemies do not advance. |
| 3 | Snapshot the page after the tap. | The overlay remains visible and no gameplay interaction occurred. |

### TS-003: Landscape Mobile Touch Casting And Reeling
**Priority:** Critical
**Preconditions:** Dev server is running and browser automation emulates a touch phone in landscape orientation.
**Mapped Tasks:** Task 2, Task 3, Task 4, Task 5, Task 6

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/main.html?e2e=1` with a landscape mobile viewport. | The rotate overlay is hidden and the full game is visible. |
| 2 | Tap anywhere in the water. | The hook casts once; a second immediate tap does not start a second cast while the hook is deployed. |
| 3 | Run `window.__fishingTimeE2E.forceHookedFish()` through browser automation, then tap repeatedly. | Each tap adds reel force, the tension bar moves toward capture, and the catch can complete without keyboard input. |
| 4 | Run `window.__fishingTimeE2E.forceHookedFish()` again, then stop tapping during the fight. | The fish recovers, tension moves toward release, and the bar color shifts toward red. |

### TS-004: Rotation Recalculates The Game
**Priority:** High
**Preconditions:** Dev server is running and browser automation can change viewport dimensions.
**Mapped Tasks:** Task 3, Task 4, Task 6

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Start in landscape mobile and cast the hook. | The game is playable and the hook uses the landscape canvas bounds. |
| 2 | Change the viewport to portrait. | Gameplay pauses, touch input is blocked, and the rotate overlay appears. |
| 3 | Change the viewport back to landscape. | The overlay hides, gameplay resumes, the canvas fills the available screen, and the boat/HUD remain visible. |
| 4 | Read `window.__fishingTimeE2E.getRuntimeStats()`. | Active non-hooked traffic and bubbles were flushed or reclamped into current bounds after rotation. |

### TS-005: Mobile Density Is Readable
**Priority:** High
**Preconditions:** Dev server is running in landscape mobile.
**Mapped Tasks:** Task 4, Task 6

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Let the game run for at least 20 seconds. | Fewer active entities are visible than desktop, large fish are capped, and sprites do not dominate the water. |
| 2 | Snapshot the page during active traffic. | The hook has a visually clear path through the water and rare fish remain visually distinct. |
| 3 | Read `window.__fishingTimeE2E.getRuntimeStats()`. | Active traffic and bubble counts are at or below the mobile profile caps. |

### TS-006: Mobile Frame Sampling Stays Smooth
**Priority:** High
**Preconditions:** Dev server is running in landscape mobile with normal traffic active.
**Mapped Tasks:** Task 4, Task 6

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Collect 5 seconds of `requestAnimationFrame` deltas through browser automation. | Average frame interval is at or below 25 ms and the 95th percentile is at or below 50 ms in local browser automation. |
| 2 | Snapshot after the sample. | The game remains interactive and the rotate overlay is not visible. |

## Progress Tracking

- [x] Task 1: Introduce input event contract and desktop input abstraction
- [x] Task 2: Move cast/reel gameplay onto input events and continuous fight tension
- [x] Task 3: Add `MobileSystem` orientation, overlay, pause, resize, and teardown lifecycle
- [x] Task 4: Add mobile density, spawn, and sprite scaling profile
- [x] Task 5: Add touch controls and mobile interaction safeguards
- [x] Task 6: Wire browser assets, E2E harness, responsive CSS, HUD, and browser verification paths
- [x] Task 7: Document the architecture in ADR 0026

## Implementation Tasks

### Task 1: Introduce Input Events And KeyboardInputSystem

**Objective:** Create the common input abstraction and preserve the desktop keyboard path behind it. Keyboard input should still track arrow keys for boat movement, while Space emits high-level cast/reel custom events instead of being read directly by Hook.

**Files:**

- Create: `src/InputSystem.js`
- Create: `src/KeyboardInputSystem.js`
- Modify: `src/InputHandler.js`
- Modify: `src/constants.js`
- Modify: `index.js`
- Create: `__tests__/input-system.test.js`

**Key Decisions / Notes:**

- Add event constants near `src/constants.js:120`: `EVENT_CAST_REQUESTED`, `EVENT_REEL_TAP`, `EVENT_REEL_START`, and `EVENT_REEL_STOP`; export them with the existing game events at `src/constants.js:530`.
- `InputSystem` should expose `attach()`, `destroy()`, `setEnabled(enabled)`, `isEnabled()`, `hasKey(key)`, and a protected-style `_dispatch(type, detail)` helper guarded by `typeof document !== 'undefined'`.
- `KeyboardInputSystem` replaces the current direct `InputHandler` behavior at `src/InputHandler.js:5`: keydown/keyup update internal key state, Arrow keys remain queryable through `hasKey()`, Space keydown emits `EVENT_CAST_REQUESTED`, `EVENT_REEL_START`, and `EVENT_REEL_TAP`, and Space keyup emits `EVENT_REEL_STOP`.
- Ignore repeated `keydown` events for Space when `event.repeat` is true so holding Space does not spam reel taps; desktop repeated effort remains repeated physical presses.
- Keep `InputHandler` as a compatibility alias or thin subclass of `KeyboardInputSystem` so existing CommonJS imports do not break during the transition.

**Definition of Done:**

- [ ] Keyboard arrow state is available through `KeyboardInputSystem.hasKey()`.
- [ ] Space keydown emits cast/reel events without calling `Game.addKey()`.
- [ ] Space keyup emits `EVENT_REEL_STOP`.
- [ ] Disabled input systems ignore key events and report no pressed keys.
- [ ] Verify: `yarn test --runInBand __tests__/input-system.test.js`

### Task 2: Move Hook Fight Gameplay Onto Input Events

**Objective:** Refactor capture and reeling so `Hook` subscribes to cast/reel events and maintains continuous fight tension. This keeps desktop behavior intact through `KeyboardInputSystem` while making touch taps first-class gameplay input.

**Files:**

- Modify: `src/Game.js`
- Modify: `src/Hook.js`
- Modify: `src/Player.js`
- Modify: `__tests__/hook.test.js`
- Modify: `__tests__/player.test.js`

**Key Decisions / Notes:**

- Replace the Space read in `src/Hook.js:122` with event-fed fields such as `_castRequested`, `_reelTapCount`, `_reelForce`, and `_isReeling`.
- `EVENT_CAST_REQUESTED` should only transition `HOOK_STATUS_IDLE` into `HOOK_STATUS_CAST`; extra cast requests while casting, hooked, or retrieving are ignored by `Hook`.
- Each `EVENT_REEL_TAP` during `HOOK_STATUS_HOOKED` adds reel force and shortens rope by the existing `HOOK_REEL_DISTANCE_PER_PRESS` path; reel force then decays every update using `dt`.
- Use a continuous tension model: rapid taps move tension toward capture, slow/no taps allow fish strength and escape rate to move tension toward release. Preserve the existing release event path at `src/Hook.js:167` and capture event path through `clearCaptured()`.
- Keep `Game.hasKey(key)` as a delegate to the active input system so `src/Player.js:36` and `src/Player.js:40` preserve desktop horizontal movement without knowing the concrete input implementation.
- `Hook.destroy()` or an equivalent cleanup path must remove event listeners; call it from `Game.destroy()` along with the existing timer cleanup.

**Definition of Done:**

- [ ] `Hook` no longer reads `KEY_SPACE` through `Game.hasKey()`.
- [ ] Keyboard Space still casts from idle and reels during a fish fight through custom events.
- [ ] Extra cast requests are ignored while the hook is not idle.
- [ ] Rapid reel taps can reach the capture threshold; no taps can reach the release threshold.
- [ ] Existing inert-object auto-reel behavior remains unchanged.
- [ ] Verify: `yarn test --runInBand __tests__/hook.test.js __tests__/player.test.js`

### Task 3: Add MobileSystem Orientation And Resize Lifecycle

**Objective:** Introduce `MobileSystem` to detect mobile profile, detect portrait/landscape, control the rotate overlay, resize the canvas/game, pause gameplay, block touch input, and clean up global listeners. Portrait mobile must pause gameplay and block input; landscape mobile must resume and recalculate dimensions.

**Files:**

- Create: `src/MobileSystem.js`
- Modify: `src/main.js`
- Modify: `src/Game.js`
- Modify: `src/TimerSystem.js`
- Create: `__tests__/mobile-system.test.js`
- Modify: `__tests__/game-traffic.test.js`

**Key Decisions / Notes:**

- Mobile detection should combine coarse pointer/touch capability with viewport size, for example `navigator.maxTouchPoints > 0`, `matchMedia('(pointer: coarse)')`, and a short-edge threshold constant in `src/constants.js`.
- `MobileSystem.getSnapshot()` should return a plain object with width, height, `isMobile`, `isPortrait`, `isLandscape`, canvas scale, and the current gameplay profile.
- `MobileSystem.attach(game, inputSystem)` should register `resize`, `orientationchange`, and `screen.orientation.change` when available. Each change applies canvas dimensions, calls `game.resize(new Size(height, width), profile, { resetTraffic })`, toggles `game.setPaused(true|false)`, and toggles `inputSystem.setEnabled(false|true)`.
- Add `Game.resize(size, profile, options)` as neutral infrastructure: update `this._size`, layer width/height (`src/Layer.js:2`), timer size, spawner profile, enemy factory profile, player bounds, and HUD dimensions that depend on canvas width.
- On mobile profile/orientation changes, flush non-hooked active traffic and bubbles rather than trying to preserve absolute positions from the old canvas. Preserve the currently hooked catch so a rotation does not corrupt Hook state.
- Add `Game.setPaused(paused)` so `Game.update()` skips timer, spawner, player, enemy, collision, and bubble advancement while the rotate overlay is active; `draw()` can still render the latest frame.
- `MobileSystem.destroy()` must unregister window/screen listeners and destroy its owned `TouchInputSystem` if it created one.

**Definition of Done:**

- [ ] Portrait mobile snapshot reports blocked gameplay and displays the rotate overlay.
- [ ] Landscape mobile snapshot hides the overlay and enables gameplay.
- [ ] Resizing updates canvas dimensions, `Game._size`, layer dimensions, timer position calculations, spawner profile, enemy factory profile, and player bounds.
- [ ] Mobile profile/orientation changes flush non-hooked traffic and bubbles into the new viewport policy.
- [ ] Repeated `MobileSystem.attach()`/`destroy()` does not duplicate resize, pause, or input behavior.
- [ ] Verify: `yarn test --runInBand __tests__/mobile-system.test.js __tests__/game-traffic.test.js`

### Task 4: Add Mobile Density And Sprite Scaling Profile

**Objective:** Reduce clutter on smaller screens by applying a mobile gameplay profile to fish traffic, large-fish capacity, sprite display sizes, and bubble count. Desktop must use the existing profile so current density and sizes remain unchanged.

**Files:**

- Modify: `src/constants.js`
- Modify: `src/FishSpawner.js`
- Modify: `src/EnemyFactory.js`
- Modify: `src/Game.js`
- Modify: `__tests__/fish-spawner.test.js`
- Modify: `__tests__/enemy-factory.test.js`

**Key Decisions / Notes:**

- Add desktop/mobile profile constants in `src/constants.js`: desktop values should be equivalent to today, mobile should target about 40% fewer active fish through `preseedPerLane: 1`, `spawnIntervalMultiplier: 1.5`, `densityMultiplier: 0.6`, `maxActiveTraffic`, `maxActiveLargeFish: 1`, and a reduced bubble batch cap.
- `FishSpawner` should accept a profile in its constructor and expose `setProfile(profile)`. `_nextLaneDelay()` should multiply lane intervals by the profile spawn interval multiplier without changing `FISH_LANES`.
- Limit large fish on mobile by profile-aware active-cap logic in `_hasActiveCapacity()`: species with large display width/height or rare tiers should be capped to one active large fish unless their existing `maxActive` is stricter.
- `EnemyFactory` should scale display `Size` values through the active profile while preserving sprite frame sizes. Do not scale source frame dimensions such as `HAMMERHEAD_SHARK_FRAME_WIDTH`.
- Bubble batches should be profile-aware so mobile reduces background particles without changing desktop `BUBBLE_BATCH_SIZE`.
- Add `Game.getRuntimeStats()` with active traffic, large fish, bubbles, canvas size, profile name, paused state, and mobile blocked state for E2E assertions and performance checks.

**Definition of Done:**

- [ ] Desktop profile preserves existing preseed, spawn interval, active cap, sprite size, and bubble behavior.
- [ ] Mobile profile reduces active traffic by roughly 30%-50% under deterministic tests.
- [ ] Mobile profile limits simultaneous large fish to one visible large-fish traffic entity.
- [ ] Sprite display sizes scale proportionally and source sprite frame sizes remain unchanged.
- [ ] Runtime stats expose active entity counts and profile caps for browser verification.
- [ ] Verify: `yarn test --runInBand __tests__/fish-spawner.test.js __tests__/enemy-factory.test.js`

### Task 5: Add TouchInputSystem And Mobile Interaction Safeguards

**Objective:** Implement touch controls for mobile so a tap on the water casts and repeated taps during a fight reel the fish. Touch input must be broad, responsive, one-handed friendly, and blocked while portrait mode is active.

**Files:**

- Create: `src/TouchInputSystem.js`
- Modify: `src/MobileSystem.js`
- Modify: `src/constants.js`
- Modify: `__tests__/input-system.test.js`

**Key Decisions / Notes:**

- `TouchInputSystem` should attach to the canvas, listen to `pointerdown` when available, and fall back to `touchstart`; use `event.preventDefault()` to avoid scroll/zoom gestures on the game surface.
- A single tap emits `EVENT_CAST_REQUESTED`, `EVENT_REEL_START`, `EVENT_REEL_TAP`, and a short delayed `EVENT_REEL_STOP` so Hook can interpret taps both as cast attempts and reel effort. Hook owns whether a tap is useful in the current state.
- Debounce accidental duplicate pointer/touch events with a short timestamp guard, but keep the window short enough that rapid tapping during a fight still registers.
- `MobileSystem` owns touch enablement: portrait mode calls `setEnabled(false)`, landscape mode calls `setEnabled(true)`, and teardown calls `destroy()`.
- Attempt `screen.orientation.lock('landscape')` only after a user gesture when the API exists; catch and ignore failures without blocking gameplay.

**Definition of Done:**

- [ ] Tapping the canvas emits one cast request when input is enabled.
- [ ] Rapid taps emit distinct `EVENT_REEL_TAP` events suitable for fight tension.
- [ ] Taps are ignored when input is disabled.
- [ ] The implementation avoids precise touch targets by treating the whole canvas/water surface as tappable.
- [ ] Verify: `yarn test --runInBand __tests__/input-system.test.js __tests__/mobile-system.test.js`

### Task 6: Wire Browser Assets, E2E Harness, CSS, HUD, And Performance Checks

**Objective:** Load the new systems in the browser, add the deterministic E2E catch hook, style the rotate overlay, keep the canvas fitting the screen without stretching sprites, update the capture bar into a compact continuous tension bar, and define measurable browser verification.

**Files:**

- Create: `src/E2ETestHarness.js`
- Modify: `main.html`
- Modify: `main.css`
- Modify: `src/ReelPowerBar.js`
- Modify: `src/main.js`
- Create: `__tests__/e2e-test-harness.test.js`
- Modify: `__tests__/reel-power-bar.test.js`
- Modify: `__tests__/css.test.js`

**Key Decisions / Notes:**

- Load new scripts in dependency order: constants, input systems, `MobileSystem`, `E2ETestHarness`, game dependencies, `Game.js`, then `main.js`.
- Add a DOM overlay element near the canvas with exact text `Rotate your phone to play`; CSS centers it, gives it a high stacking context, and hides it unless `MobileSystem` marks portrait mobile active.
- Canvas CSS should use the actual canvas aspect ratio and viewport constraints (`max-width`, `max-height`, `touch-action: none`) rather than stretching. Keep `overflow: hidden` from `main.css:7`.
- Update `ReelPowerBar` from segmented power to continuous tension while keeping the upper-left placement from `src/ReelPowerBar.js:3`; color should be red near release, yellow at neutral, and green near capture.
- `E2ETestHarness` is enabled only when the URL has `?e2e=1`. It should expose `window.__fishingTimeE2E.forceHookedFish()` and `window.__fishingTimeE2E.getRuntimeStats()` for browser automation. Normal gameplay must not expose these helpers.
- Add a browser frame-sampling helper for TS-006 using `requestAnimationFrame` deltas over 5 seconds; report average and 95th percentile frame interval.
- Browser verification must use a tier 1-4 browser tool. In Codex for this repo, use `playwright-cli` if Chrome MCP tools are unavailable.

**Definition of Done:**

- [ ] `main.html` loads all new runtime files in dependency order.
- [ ] Portrait overlay is centered, readable, and blocks canvas interaction.
- [ ] Canvas fills available landscape screen space without sprite distortion.
- [ ] `ReelPowerBar` renders as a compact horizontal continuous tension bar in the upper-left corner.
- [ ] `?e2e=1` exposes deterministic force-hook and runtime stats helpers; normal URL does not.
- [ ] Mobile performance E2E records average frame interval at or below 25 ms and 95th percentile at or below 50 ms in local browser automation.
- [ ] Verify: `yarn test --runInBand __tests__/e2e-test-harness.test.js __tests__/reel-power-bar.test.js __tests__/css.test.js`
- [ ] Verify E2E: execute TS-001 through TS-006 with browser automation against `http://127.0.0.1:8081/main.html?e2e=1`.

### Task 7: Document ADR 0026

**Objective:** Create the requested ADR describing why the game now uses a landscape-first mobile experience, responsive gameplay profiles, touch controls, `MobileSystem`, and input abstraction. The ADR should make the separation between mobile orchestration, input systems, and gameplay systems explicit for future input methods.

**Files:**

- Create: `docs/adr/0026-mobile-input-responsive-gameplay.md`

**Key Decisions / Notes:**

- Title the ADR `ADR 0026 - Mobile Input and Responsive Gameplay Architecture`.
- Include sections: Context, Problem Statement, Decision, Alternatives Considered, and Consequences.
- Decision text must state that the game adopts a landscape-first mobile experience with responsive scaling, reduced entity density, touch-based gameplay controls, `MobileSystem`, and an `InputSystem` abstraction.
- Alternatives should cover keeping keyboard-only input, putting mobile conditionals directly in `Game`, relying on browser orientation lock, implementing all mobile gameplay directly inside `MobileSystem`, and reducing density by deleting species.
- Consequences should include the new event contract, extra tests/E2E responsibility, future input extensibility, and the need to tune mobile profile constants with real-device feedback.

**Definition of Done:**

- [ ] `docs/adr/0026-mobile-input-responsive-gameplay.md` exists with the required sections.
- [ ] ADR documents the chosen decision and alternatives listed above.
- [ ] Verify: `test -f docs/adr/0026-mobile-input-responsive-gameplay.md`

## E2E Results

| Scenario | Priority | Result | Fix Attempts | Notes |
|----------|----------|--------|--------------|-------|
| TS-001 | Critical | PASS | 0 | Desktop `1280x720` stayed on profile `desktop`; keyboard/touch systems remained separated; final desktop frame sample averaged `16.67ms`, p95 `16.8ms`; console had 0 errors and 0 warnings. |
| TS-002 | Critical | PASS | 0 | Portrait mobile `390x844` paused gameplay, hid touch controls, displayed `Rotate your phone to play`, and ignored cast taps. |
| TS-003 | Critical | PASS | 0 | Landscape mobile `844x390` used profile `mobile`; canvas tap cast/reel events worked; touch nav moved the boat; forced hook/reel path updated tension. |
| TS-004 | High | PASS | 0 | Mobile orientation changes recalculated canvas/profile state, toggled the portrait overlay, and resumed landscape gameplay without console errors. |
| TS-005 | High | PASS | 1 | Mobile density used `maxActiveTraffic=8`, `maxActiveLargeFish=2`, responsive lane Y, smaller sprites/HUD/bubbles, and guaranteed cadence: crab visible within 10s, hammerhead and shark visible within 20s windows. |
| TS-006 | High | PASS | 0 | Mobile final frame sample averaged `16.67ms`, p95 `16.8ms`; desktop final frame sample averaged `16.67ms`, p95 `16.8ms`. |

## Verification Report

| Check | Result | Evidence |
|-------|--------|----------|
| Live target probe | PASS | Tier 1 local server at `http://127.0.0.1:8081/main.html` returned HTTP 200. |
| Full test suite | PASS | `yarn test --runInBand`: 32 suites passed, 367 tests passed. |
| Whitespace check | PASS | `git diff --check` and `git diff --cached --check` produced no findings. |
| ADR existence | PASS | `test -f docs/adr/0026-mobile-input-responsive-gameplay.md` returned `ADR_OK`. |
| File length | PASS | Changed production files remain below 800 lines; largest changed production file is `src/constants.js` at 596 lines. |
| Browser sessions cleanup | PASS | `playwright-cli list` reported no open browsers after verification. |

## Not Verified

| Item | Reason |
|------|--------|
| Managed `changes-review` sub-agent | The available `spawn_agent` tool explicitly requires the user to ask for sub-agents/delegation. The reviewer toggle was enabled, but no sub-agent was launched without that authorization. Local self-review, tests, and browser verification were completed instead. |
