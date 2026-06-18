# Clock Time-Bonus Inert Object Implementation Plan

Created: 2026-06-18
Author: smarcet@gmail.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Add a `Clock` inert object that, when caught, awards +50 score AND adds 10 seconds to the game timer (clamped to the timer's initial limit), communicating the time addition via a custom `timeBonus` DOM event, with a floating "+10s" animation rendered by the ScoreSystem using the same popup infrastructure as score notifications.

## Approach

**Chosen:** Event-driven time bonus via new `EVENT_TIME_BONUS` — `TimerSystem` listens to `EVENT_ENEMY_CAPTURED`, filters for class name `'Clock'`, adds time, then dispatches `EVENT_TIME_BONUS`; `ScoreSystem` listens to `EVENT_TIME_BONUS` to show the "+10s" floating animation.
**Why:** Follows the existing publish/subscribe pattern already used for `EVENT_ENEMY_CAPTURED` / `EVENT_TIMER_TIMEUP`. The `TimerSystem` is the authority on time state and dispatches the event once time is actually added. `ScoreSystem` reuses its existing animation infrastructure — no new rendering loop needed. The user confirmed this event-driven approach.

## Context for Implementer

`enemyType` in all hook events (`EVENT_ENEMY_CAPTURED`, etc.) is `this._catch.constructor.name` (the JS class name, e.g. `'Clock'`), not the `id` string from `FISH_DEFINITIONS`. `FISH_SCORE_MAP` also uses `className` as its key (from `def.className`). Therefore `FISH_CLASS_CLOCK = 'Clock'` is what filters on in `TimerSystem`.

`isTrash: true` only controls whether the entry is excluded from `FISH_SPECS` (fight parameters). A Clock with `isTrash: true` and `score: 50` will appear in `FISH_SCORE_MAP` with value 50 — positive score for an InertObject is valid and handled correctly by the existing infrastructure.

## File Structure

- `src/constants.js` (modify) — add `ENEMY_TYPE_CLOCK`, `FISH_CLASS_CLOCK`, `EVENT_TIME_BONUS`, `CLOCK_TIME_BONUS_SECONDS`, `FISH_DEFINITIONS` entry, and `module.exports` entries
- `src/Clock.js` (create) — new `InertObject` subclass, bobbing/drifting pattern identical to `Shoe`
- `src/TimerSystem.js` (modify) — subscribe to `EVENT_ENEMY_CAPTURED`, add time on Clock capture, dispatch `EVENT_TIME_BONUS`, add `destroy()`
- `src/ScoreSystem.js` (modify) — subscribe to `EVENT_TIME_BONUS`, push "+10s" animation in gold color
- `src/EnemyFactory.js` (modify) — add `[ENEMY_TYPE_CLOCK]: Clock` to `_registry`
- `index.js` (modify) — register `Clock` with `require` + `global` + export list
- `main.html` (modify) — add `<script src="src/Clock.js?v=1">` before `EnemyFactory.js`; add `<img id="clock_sprite" ...>`
- `__tests__/clock.test.js` (create) — unit tests for Clock class
- `__tests__/timer-system.test.js` (modify) — add tests for time bonus event handling
- `docs/adr/0028-clock-time-bonus-inert-object.md` (create) — ADR documenting design decisions

## Assumptions

- The `clock.png` sprite (464×360px) is a single-frame image — `maxFrames: 1`, drawn with full natural dimensions. — Tasks 1, 2 depend on this.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `TimerSystem` has no `destroy()` — leaks listener on game restart | Likely (no `destroy()` exists today) | Medium | Implement `destroy()` in Task 3 |

## Progress Tracking

- [x] Task 1: Constants — add Clock constants, `FISH_DEFINITIONS` entry, `EVENT_TIME_BONUS`
- [x] Task 2: Clock.js — create InertObject subclass with bob/drift behavior
- [x] Task 3: TimerSystem — listen to `EVENT_ENEMY_CAPTURED`, add time, dispatch `EVENT_TIME_BONUS`
- [x] Task 4: ScoreSystem — listen to `EVENT_TIME_BONUS`, push "+10s" animation
- [x] Task 5: Wiring — `EnemyFactory`, `index.js`, `main.html`
- [x] Task 6: Tests — `clock.test.js` + `timer-system.test.js` additions
- [x] Task 7: ADR — document Clock design decisions in `docs/adr/0028-clock-time-bonus-inert-object.md`

## Implementation Tasks

---

### Task 1: Constants — add Clock constants, `FISH_DEFINITIONS` entry, `EVENT_TIME_BONUS`

**Objective:** Add all new constants needed for Clock and the time-bonus event. This is the single source of truth that all other tasks consume.

**Files:**

- Modify: `src/constants.js`

**Key Decisions / Notes:**

- Add to the "Enemy type ID" block (alphabetical): `const ENEMY_TYPE_CLOCK = 'clock';`
- Add to the "Class name" block: `const FISH_CLASS_CLOCK = 'Clock';`
- Add event: `const EVENT_TIME_BONUS = 'timeBonus';`
- Add time bonus constant: `const CLOCK_TIME_BONUS_SECONDS = 10;`
- `displayW: 100, displayH: 77` targets approximately the same on-screen footprint as Shoe (84×55), preserving the near-native aspect ratio of the 464×360 source (ratio ≈ 1.29:1, 100/77 ≈ 1.30)
- FISH_DEFINITIONS entry (after `ENEMY_TYPE_SHOE`, before fish entries — keep trash objects grouped together):
  ```js
  {
    id: ENEMY_TYPE_CLOCK,
    className: FISH_CLASS_CLOCK,
    domId: 'clock_sprite',
    displayH: 77,  displayW: 100,
    maxFrames: 1,
    rarity: FISH_RARITY_UNCOMMON,
    lanes: [FISH_LANE_SURFACE, FISH_LANE_UPPER, FISH_LANE_MIDDLE],
    score: 50,
    strength: 0,
    escapeRate: 0,
    speedMin: 0.4,
    speedMax: DRIFT_SPEED_SLOW,
    spawnWeight: 3,
    spawnFrequency: 200,
    isTrash: true,
  },
  ```
- Add to `module.exports`: `ENEMY_TYPE_CLOCK, FISH_CLASS_CLOCK, EVENT_TIME_BONUS, CLOCK_TIME_BONUS_SECONDS`
- Add `EVENT_TIME_BONUS` to the event-names group in `module.exports` (near `EVENT_TIMER_TIMEUP`)

**Definition of Done:**

- [ ] `FISH_SCORE_MAP['Clock']` equals `50` when constants are loaded (verified by running `node -e "const c=require('./index.js'); console.log(c.FISH_SCORE_MAP.Clock)"`)
- [ ] `FISH_SPECS` does NOT contain a `'clock'` key (InertObjects excluded by `!def.isTrash` filter)
- [ ] Verify: `npm test -- --testPathPattern=fish-spawner --silent` passes (FISH_DEFINITIONS integrity)

---

### Task 2: Clock.js — create InertObject subclass with bob/drift behavior

**Objective:** Create `src/Clock.js` as a `InertObject` subclass using the same bobbing/drifting pattern as `Shoe` (see `src/Shoe.js`). The clock should float at the water surface and bob gently. Single-frame sprite drawn with full natural image dimensions.

**Files:**

- Create: `src/Clock.js`

**Key Decisions / Notes:**

- Constructor signature matches `Shoe`: `(game, ctx, size, position, image, maxFrames)`
- Same constants as `Shoe`: `ANIM_STAGGER_SLOW`, `DRIFT_SPEED_SLOW`, `ANIM_BOB_AMPLITUDE`, `ANIM_BOB_SPEED`, `ANIM_MAX_TILT_ANGLE`
- **Must include** `this._speedX = this._driftSpeed;` after `this._driftSpeed = DRIFT_SPEED_SLOW;` — this drives horizontal drift via `EnemyWithAnimation.update()` (Shoe.js:7 does the same; omitting it leaves the Clock stationary)
- `update()` and `getPosition()` identical to `Shoe`
- `_drawCapturedSprite(dx, dy, w, h)` draws the full image: `this._ctx.drawImage(this._image, 0, 0, this._image.naturalWidth, this._image.naturalHeight, dx, dy, w, h)` (same as Shoe)
- `draw()` identical to `Shoe`
- `static create(game, ctx, spec)` follows InertObject factory pattern (same as `Shoe.create`)
- End with the standard CommonJS export block
- `getFightSpec()` returns `null` (inherited from `InertObject` — no override needed)

**Definition of Done:**

- [ ] `new Clock(...) instanceof InertObject` is `true`
- [ ] `getFightSpec()` returns `null`
- [ ] After one `update()` call, `getPosition().getY()` reflects the bob offset
- [ ] `_driftSpeed` is `0.6` (DRIFT_SPEED_SLOW) and after one `update()` call `getPosition().getX()` has changed by approximately `0.6`
- [ ] Verify: `npx jest __tests__/clock.test.js --silent` passes

---

### Task 3: TimerSystem — listen to `EVENT_ENEMY_CAPTURED`, add time, dispatch `EVENT_TIME_BONUS`

**Objective:** `TimerSystem` subscribes to `EVENT_ENEMY_CAPTURED` in its constructor. When `detail.enemyType === FISH_CLASS_CLOCK`, it adds `CLOCK_TIME_BONUS_SECONDS * 1000` ms to `_timeMs` (clamped to `_initialMs`) and then dispatches `EVENT_TIME_BONUS` with `{seconds: CLOCK_TIME_BONUS_SECONDS, x, y}`. A `destroy()` method is added to remove the listener.

**Files:**

- Modify: `src/TimerSystem.js`

**Key Decisions / Notes:**

- Add in constructor (alongside existing init code):
  ```js
  this._handleTimeBonus = (e) => {
    if (e.detail.enemyType !== FISH_CLASS_CLOCK) return;
    this._timeMs = Math.min(this._initialMs, this._timeMs + CLOCK_TIME_BONUS_SECONDS * 1000);
    if (this._fired) this._fired = false;  // re-activate timer if it was stopped
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent(EVENT_TIME_BONUS, {
        detail: { seconds: CLOCK_TIME_BONUS_SECONDS, x: e.detail.x ?? 0, y: e.detail.y ?? 0 },
      }));
    }
  };
  if (typeof document !== 'undefined') {
    document.addEventListener(EVENT_ENEMY_CAPTURED, this._handleTimeBonus);
  }
  ```
- `destroy()` method:
  ```js
  destroy() {
    if (typeof document !== 'undefined') {
      document.removeEventListener(EVENT_ENEMY_CAPTURED, this._handleTimeBonus);
    }
  }
  ```
- Clamp: `Math.min(this._initialMs, this._timeMs + bonus)` — never exceed original limit
- Resetting `_fired = false` when time is added past 0: ensures the timer re-activates if it had already expired (edge case; allows catching a clock at exactly time=0)

**Definition of Done:**

- [ ] Adding 10s when `_timeMs` is at 60s with `_initialMs` = 120s → `_timeMs` becomes 70s
- [ ] Adding 10s when `_timeMs` is 115s with `_initialMs` = 120s → `_timeMs` is clamped to 120s (no overshoot)
- [ ] `EVENT_TIME_BONUS` is dispatched with `{seconds: 10, x, y}` when Clock is captured
- [ ] Non-Clock captures do NOT modify `_timeMs` or dispatch `EVENT_TIME_BONUS`
- [ ] `destroy()` removes the listener (no leaks)
- [ ] Verify: `npx jest __tests__/timer-system.test.js --silent` passes

---

### Task 4: ScoreSystem — listen to `EVENT_TIME_BONUS`, push "+10s" animation

**Objective:** `ScoreSystem` subscribes to `EVENT_TIME_BONUS`. When received, it pushes a floating "+10s" animation into `_animations` using the same animation object shape as score popups but with a distinct gold color and the text `+10s`. The `destroy()` method is updated to remove this listener.

**Files:**

- Modify: `src/ScoreSystem.js`

**Key Decisions / Notes:**

- **Intentional double-popup:** When a Clock is captured, the existing `ScoreSystem._handleCapture` (listening to `EVENT_ENEMY_CAPTURED`) will also push a green "+50" score animation via `FISH_SCORE_MAP`. That is correct — the player sees both "+50" (score) and "+10s" (time). No guard is needed in `_handleCapture`. Task 6 must assert both animations appear.
- Add constant at top of file: `const ANIM_COLOR_TIME_BONUS = '#ffd700';` (gold — distinct from score green `#00dd55`)
- Add in constructor:
  ```js
  this._handleTimeBonus = (e) => {
    this._animations.push({
      text: `+${e.detail.seconds}s`,
      x: e.detail.x ?? 0,
      y: e.detail.y ?? 0,
      alpha: ANIM_ALPHA_INITIAL,
      vy: ANIM_VY,
      color: ANIM_COLOR_TIME_BONUS,
      fontSize: ANIM_FONT_SIZE_START,
      fontGrowth: ANIM_FONT_GROWTH,
    });
  };
  if (typeof document !== 'undefined') {
    document.addEventListener(EVENT_TIME_BONUS, this._handleTimeBonus);
  }
  ```
- Update `destroy()` to also `removeEventListener(EVENT_TIME_BONUS, this._handleTimeBonus)`
- The existing `draw()` loop renders all `_animations` uniformly — no changes to draw logic needed

**Definition of Done:**

- [ ] After receiving `EVENT_TIME_BONUS` with `{seconds: 10, x: 100, y: 200}`, `_animations` contains one entry with `text: '+10s'`, `color: '#ffd700'`, `x: 100`, `y: 200`
- [ ] The animation fades and drifts upward on `update()` calls (same as score animations — this is inherited behavior, just verify one cycle)
- [ ] `destroy()` removes the `EVENT_TIME_BONUS` listener
- [ ] Verify: `npx jest __tests__/score-system.test.js --silent` passes

---

### Task 5: Wiring — `EnemyFactory`, `index.js`, `main.html`

**Objective:** Register `Clock` in the three required integration points: the factory registry, the CommonJS shim, and the HTML page.

**Files:**

- Modify: `src/EnemyFactory.js`
- Modify: `index.js`
- Modify: `main.html`

**Key Decisions / Notes:**

- `EnemyFactory._registry`: add `[ENEMY_TYPE_CLOCK]: Clock,` in the trash block (after `[ENEMY_TYPE_FISH_BONE]`)
- `index.js` — add two lines in alphabetical position with other inert objects (after `FishBone`):
  ```js
  const { Clock } = require('./src/Clock');  global.Clock = Clock;
  ```
  Add `Clock` to the `module.exports` object at the end
- `main.html` — add script tag before `EnemyFactory.js` (after `FishBone.js`):
  ```html
  <script src="src/Clock.js?v=1"></script>
  ```
  Add image tag in the items `<img>` section:
  ```html
  <img id="clock_sprite" src="images/items/clock.png" class="sprite-image" alt="" />
  ```

**Definition of Done:**

- [ ] `require('./index.js').Clock` is the `Clock` class
- [ ] `EnemyFactory` creates a `Clock` instance for the `'clock'` key (covered by Task 6 via the enemy-factory test addition)
- [ ] Verify: `npm test -- --testPathPattern=enemy-factory --silent` passes

---

### Task 6: Tests — `clock.test.js` + `timer-system.test.js` additions

**Objective:** Write `__tests__/clock.test.js` using the `makeShoe()`-style factory pattern (see `__tests__/shoe.test.js`). Extend `__tests__/timer-system.test.js` with time-bonus event handling tests.

**Files:**

- Create: `__tests__/clock.test.js`
- Modify: `__tests__/timer-system.test.js`

**Key Decisions / Notes:**

- `clock.test.js` structure — follow `shoe.test.js` exactly:
  - `makeClock(startX)` factory with same mock game/ctx
  - `describe('Clock class hierarchy')` — instanceof InertObject, getFightSpec() null
  - `describe('Clock bob animation')` — bobOffset 0 before update, getPosition().getY() reflects bob after one update
  - `describe('Clock slow drift')` — drifts at 0.6 px/tick
  - `describe('Clock factory integration')` — EnemyFactory creates a Clock instance for `'clock'`
- `timer-system.test.js` additions — new `describe('TimerSystem time bonus event handling')` block:
  - Dispatching `EVENT_ENEMY_CAPTURED` with `{enemyType: 'Clock', x: 0, y: 0}` adds 10s (10000ms)
  - Clamping: with 115s remaining, adding 10s stays at 120s (no overshoot past `_initialMs`)
  - Non-Clock capture does NOT change `_timeMs`
  - `EVENT_TIME_BONUS` is dispatched with `{seconds: 10}` when Clock captured
  - `_fired` reset edge case: set `ts._fired = true` and `ts._timeMs = 0`, dispatch Clock capture, assert `ts._fired === false` and `ts._timeMs === 10000`, then assert a subsequent `ts.update(500)` reduces `_timeMs` to 9500 (timer is live again)
  - Use the same `makeDocMock()` / `makeCtxMock()` helpers already in that file
  - `Trivial:` annotation does NOT apply — new event-based behavior with non-trivial branching
- `score-system.test.js` or `clock.test.js` — add assertion that Clock capture produces **two** animations in `ScoreSystem._animations`: one `text: '+50'` (green, from `EVENT_ENEMY_CAPTURED`) and one `text: '+10s'` (gold, from `EVENT_TIME_BONUS`) — verifies the intentional double-popup behavior
- `enemy-factory.test.js` — add a test case for the `'clock'` key following the existing mock pattern used for `'shoe'` in that file

**Definition of Done:**

- [ ] `npx jest __tests__/clock.test.js --silent` passes (all 4 describe blocks)
- [ ] `npx jest __tests__/timer-system.test.js --silent` passes (existing + new tests including `_fired` reset)
- [ ] `npx jest __tests__/enemy-factory.test.js --silent` passes (including new `'clock'` case)
- [ ] Double-popup test confirms both `+50` and `+10s` animations appear in ScoreSystem when Clock is captured
- [ ] Verify: `npm test --silent` full suite passes with 0 failures

---

---

### Task 7: ADR — document Clock design decisions

**Objective:** Create `docs/adr/0028-clock-time-bonus-inert-object.md` following the established ADR format used in this project, documenting the key design decisions for the Clock time-bonus item.

**Files:**

- Create: `docs/adr/0028-clock-time-bonus-inert-object.md`

**Key Decisions / Notes:**

- Use the same structure as `docs/adr/0023-shoe-inert-object.md` or `docs/adr/0024-fishbone-inert-object.md` as a reference template
- Cover: score value (+50 positive, not negative), `isTrash: true` classification for an InertObject, event-driven time bonus via `EVENT_TIME_BONUS` vs direct method call, the intentional double-popup design, spawn parameters (weight 3, frequency 200, rarity uncommon), lane assignment, 10-second bonus value and clamping to `_initialMs`

**Definition of Done:**

- [ ] `docs/adr/0028-clock-time-bonus-inert-object.md` exists and covers the decisions listed above
- [ ] Verify: `ls docs/adr/0028-*.md` returns the file
