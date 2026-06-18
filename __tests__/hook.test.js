'use strict';

const { Size, Point, Hook, CatchableFish, InertObject } = require('../index.js');
const { EnemyFactory } = require('../src/EnemyFactory');
const {
  FISH_DEFINITIONS,
  EVENT_CAST_REQUESTED,
  EVENT_REEL_TAP,
} = require('../src/constants');

const PLAYER_X   = 100;
const PLAYER_Y   = 0;
const PLAYER_H   = 315;
const PLAYER_W   = 404;
const HOOK_W     = 25;
const HOOK_H     = 25;

const HOOK_PIVOT_X_OFFSET      = 45;
const HOOK_PIVOT_Y_FACTOR      = 0.6;
const HOOK_CAST_PIVOT_X_OFFSET = 12;
const HOOK_CAST_PIVOT_Y_FACTOR = 0.65;
const HOOK_REST_LENGTH         = 60;
const HOOK_MAX_SWING_ANGLE     = 0.5236;
const HOOK_SWING_SPEED         = 0.04;
const HOOK_CAST_SPEED          = 5;
const HOOK_REEL_SPEED          = 5;
const HOOK_STRUGGLE_MAX_ESCAPE = 100;
const HOOK_STRUGGLE_REEL_POWER = 20;
const HOOK_REEL_DISTANCE_PER_PRESS = 15;

function makeMockGame(spaceHeld = false) {
  return {
    getSize: () => new Size(2000, 800),
    isDebug: () => false,
    hasKey: (k) => (k === ' ' ? spaceHeld : false),
    releaseEnemy: jest.fn(),
  };
}

function makeMockCtx() {
  return {
    drawImage: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    fillRect: () => {},
    fillText: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    scale: () => {},
    arc: () => {},
    fill: () => {},
    setLineDash: () => {},
  };
}

function makeHook(spaceHeld = false) {
  const game = makeMockGame(spaceHeld);
  const mockPlayer = {
    getPosition: () => new Point(PLAYER_X, PLAYER_Y),
    getSize:     () => new Size(PLAYER_H, PLAYER_W),
    _game: game,
    _state: PLAYER_STATE_IDLE,
  };
  const ctx = makeMockCtx();
  return new Hook(mockPlayer, ctx, new Size(HOOK_H, HOOK_W), new Point(PLAYER_X, PLAYER_Y));
}

function makeMockEntityCtx() {
  return {
    game: { getSize: () => new Size(600, 800), isDebug: () => false, hasKey: () => false },
    ctx: {
      drawImage: () => {}, beginPath: () => {}, stroke: () => {}, fillRect: () => {},
      fillText: () => {}, save: () => {}, restore: () => {}, translate: () => {},
      rotate: () => {}, scale: jest.fn(), setLineDash: () => {},
    },
  };
}

function makeMockInertEntity() {
  const { game, ctx } = makeMockEntityCtx();
  const obj = new InertObject(game, ctx, new Size(80, 100), new Point(200, 400), null, 3, 1, 0, 1);
  obj.captured = jest.fn();
  obj.updateCaptured = jest.fn();
  obj.escaped = jest.fn();
  return obj;
}

function makeMockFishEntity(strength = 10, escapeRate = 2.0) {
  const { game, ctx } = makeMockEntityCtx();
  const fish = new CatchableFish(game, ctx, new Size(80, 100), new Point(200, 400), null, 3, 1, 0, 1);
  fish._strength = strength;
  fish._escapeRate = escapeRate;
  fish.captured = jest.fn();
  fish.updateCaptured = jest.fn();
  fish.escaped = jest.fn();
  return fish;
}

const pivotX = PLAYER_X + HOOK_PIVOT_X_OFFSET;
const pivotY = PLAYER_Y + PLAYER_H * HOOK_PIVOT_Y_FACTOR;

// Helper: put hook into CAST state via the input event path
function castHook(hook) {
  hook._handleCastRequested();
  hook.update(16);  // IDLE -> CAST
}

function reelTap(hook) {
  hook._handleReelTap();
}

function makeCustomEvent(type, init = {}) {
  this.type = type;
  this.detail = init.detail;
}

function makeDocumentEventBus() {
  const listeners = {};
  return {
    addEventListener: jest.fn((type, fn) => {
      listeners[type] = listeners[type] || [];
      listeners[type].push(fn);
    }),
    removeEventListener: jest.fn((type, fn) => {
      listeners[type] = (listeners[type] || []).filter(listener => listener !== fn);
    }),
    dispatchEvent: jest.fn(event => {
      (listeners[event.type] || []).forEach(listener => listener(event));
    }),
    getElementById: jest.fn(() => null),
    listenerCount: (type) => (listeners[type] || []).length,
  };
}

function makeInputEventHook() {
  const savedDoc = global.document;
  const savedCustomEvent = global.CustomEvent;
  global.document = makeDocumentEventBus();
  global.CustomEvent = makeCustomEvent;
  const hook = makeHook(false);
  return {
    hook,
    document: global.document,
    restore: () => {
      global.document = savedDoc;
      global.CustomEvent = savedCustomEvent;
    },
  };
}

// ---------------------------------------------------------------------------
describe('Hook pendulum swing (idle)', () => {
  test('_angle is 0 before any update', () => {
    const hook = makeHook();
    expect(hook._angle).toBe(0);
  });

  test('_swingPhase is 0 before any update', () => {
    const hook = makeHook();
    expect(hook._swingPhase).toBe(0);
  });

  test('_angle ≈ HOOK_MAX_SWING_ANGLE * sin(HOOK_SWING_SPEED) after one idle update', () => {
    const hook = makeHook(false);
    hook.update();
    expect(hook._angle).toBeCloseTo(HOOK_MAX_SWING_ANGLE * Math.sin(HOOK_SWING_SPEED), 5);
  });

  test('_angle follows MAX*sin(SPEED*n) across multiple idle updates', () => {
    const hook = makeHook(false);
    for (let i = 0; i < 7; i++) hook.update();
    expect(hook._angle).toBeCloseTo(HOOK_MAX_SWING_ANGLE * Math.sin(HOOK_SWING_SPEED * 7), 5);
  });

  test('_status is IDLE before any update', () => {
    const hook = makeHook();
    expect(hook._status).toBe(HOOK_STATUS_IDLE);
  });
});

// ---------------------------------------------------------------------------
describe('Hook getPosition() projection', () => {
  test('at angle=0, ropeLength=REST, getPosition returns pivot+(0, L) offset by -w/2', () => {
    const hook = makeHook(false);
    const pos = hook.getPosition();
    const expectedX = pivotX + HOOK_REST_LENGTH * Math.sin(0) - HOOK_W / 2;
    const expectedY = pivotY + HOOK_REST_LENGTH * Math.cos(0);
    expect(pos.getX()).toBeCloseTo(expectedX, 4);
    expect(pos.getY()).toBeCloseTo(expectedY, 4);
  });

  test('after one idle update, getPosition() X is offset by ropeLength*sin(angle)', () => {
    const hook = makeHook(false);
    hook.update();
    const a = HOOK_MAX_SWING_ANGLE * Math.sin(HOOK_SWING_SPEED);
    const expectedX = pivotX + HOOK_REST_LENGTH * Math.sin(a) - HOOK_W / 2;
    const expectedY = pivotY + HOOK_REST_LENGTH * Math.cos(a);
    expect(hook.getPosition().getX()).toBeCloseTo(expectedX, 4);
    expect(hook.getPosition().getY()).toBeCloseTo(expectedY, 4);
  });
});

// ---------------------------------------------------------------------------
describe('Hook single cast request', () => {
  test('cast request on the first update fires IDLE -> CAST', () => {
    const hook = makeHook(false);
    hook._handleCastRequested();
    hook.update(16);
    expect(hook._status).toBe(HOOK_STATUS_CAST);
  });

  test('second update without another cast request does NOT re-fire', () => {
    const hook = makeHook(false);
    hook._handleCastRequested();
    hook.update(16);  // -> CAST
    hook.update(16);
    expect(hook._status).toBe(HOOK_STATUS_CAST);
  });

  test('no Space held -> stays IDLE', () => {
    const hook = makeHook(false);
    hook.update(16);
    expect(hook._status).toBe(HOOK_STATUS_IDLE);
  });

  test('cast request captures _castAngle === _angle at that tick', () => {
    const hookIdle = makeHook(false);
    for (let i = 0; i < 5; i++) hookIdle.update();
    const angleAtPress = hookIdle._angle;

    const hookCast = makeHook(false);
    for (let i = 0; i < 5; i++) hookCast.update();
    hookCast._handleCastRequested();
    hookCast.update(16);

    expect(hookCast._status).toBe(HOOK_STATUS_CAST);
    expect(hookCast._castAngle).toBeCloseTo(angleAtPress, 5);
  });

  test('_castAngle is frozen across subsequent CAST updates', () => {
    const hook = makeHook(false);
    for (let i = 0; i < 3; i++) hook.update();
    hook._handleCastRequested();
    hook.update(16); // -> CAST
    const frozen = hook._castAngle;
    for (let i = 0; i < 5; i++) hook.update(16);
    expect(hook._castAngle).toBeCloseTo(frozen, 5);
  });
});

// ---------------------------------------------------------------------------
describe('Hook input custom events', () => {
  test('EVENT_CAST_REQUESTED starts a cast from IDLE without Space key state', () => {
    const { hook, document, restore } = makeInputEventHook();

    document.dispatchEvent(new CustomEvent(EVENT_CAST_REQUESTED));
    hook.update(16);

    restore();
    expect(hook._status).toBe(HOOK_STATUS_CAST);
  });

  test('EVENT_REEL_TAP during a fish fight reduces escape progress and rope length', () => {
    const { hook, document, restore } = makeInputEventHook();
    hook._ropeLength = HOOK_REST_LENGTH + 200;
    hook.setCatch(makeMockFishEntity(1, 0.0));
    hook._escapeProgress = 50;
    const beforeRope = hook._ropeLength;

    document.dispatchEvent(new CustomEvent(EVENT_REEL_TAP));
    hook.update(0);

    restore();
    expect(hook._escapeProgress).toBeLessThan(50);
    expect(hook._ropeLength).toBeLessThan(beforeRope);
  });

  test('destroy removes input event listeners', () => {
    const { hook, document, restore } = makeInputEventHook();

    expect(document.listenerCount(EVENT_CAST_REQUESTED)).toBe(1);
    expect(document.listenerCount(EVENT_REEL_TAP)).toBe(1);
    hook.destroy();

    expect(document.listenerCount(EVENT_CAST_REQUESTED)).toBe(0);
    expect(document.listenerCount(EVENT_REEL_TAP)).toBe(0);
    restore();
  });
});

// ---------------------------------------------------------------------------
describe('Hook CAST - auto-extend without key input', () => {
  test('_ropeLength increases by HOOK_CAST_SPEED each CAST update (no Space held)', () => {
    const hook = makeHook(false);
    castHook(hook);  // now in CAST
    hook._player._game = makeMockGame(false);  // release Space
    const before = hook._ropeLength;
    hook.update(16);
    expect(hook._ropeLength).toBeCloseTo(before + HOOK_CAST_SPEED, 4);
  });

  test('rope extends in CAST even when Space is still held (auto-extend)', () => {
    const hook = makeHook(false);
    castHook(hook);
    const before = hook._ropeLength;
    hook._player._game = makeMockGame(true);
    hook.update(16);
    expect(hook._ropeLength).toBeCloseTo(before + HOOK_CAST_SPEED, 4);
  });

  test('angled cast: getPosition().getX() offset from straight-down by ropeLength*sin(castAngle)', () => {
    const hook = makeHook(false);
    for (let i = 0; i < 10; i++) hook.update();
    const nonZeroAngle = hook._angle;
    hook._handleCastRequested();
    hook._player._state = PLAYER_STATE_CAST;
    hook.update(16);  // -> CAST, ropeLength grows

    const L = hook._ropeLength;
    const castPivotX = PLAYER_X + HOOK_CAST_PIVOT_X_OFFSET;
    const expectedX = castPivotX + L * Math.sin(nonZeroAngle) - HOOK_W / 2;
    expect(hook.getPosition().getX()).toBeCloseTo(expectedX, 3);
    expect(Math.abs(nonZeroAngle)).toBeGreaterThan(0.001);
  });
});

// ---------------------------------------------------------------------------
describe('Hook CAST -> RETRIEVING_EMPTY transitions', () => {
  test('reaches seabed -> transitions to RETRIEVING_EMPTY', () => {
    const hook = makeHook(false);
    hook._player._game = {
      getSize: () => new Size(100, 800),
      isDebug: () => false,
      hasKey: () => false,
    };
    hook._status = HOOK_STATUS_CAST;
    hook._ropeLength = 200;  // endpoint Y ~ 200+200 >> 100*0.95=95
    hook.update(16);
    expect(hook._status).toBe(HOOK_STATUS_RETRIEVING_EMPTY);
  });


});

// ---------------------------------------------------------------------------
describe('Hook RETRIEVING_EMPTY', () => {
  test('rope shrinks by HOOK_REEL_SPEED each tick', () => {
    const hook = makeHook(false);
    hook._status = HOOK_STATUS_RETRIEVING_EMPTY;
    hook._ropeLength = HOOK_REST_LENGTH + 50;
    const before = hook._ropeLength;
    hook.update(16);
    expect(hook._ropeLength).toBeCloseTo(before - HOOK_REEL_SPEED, 4);
  });

  test('transitions to IDLE when rope reaches REST length', () => {
    const hook = makeHook(false);
    hook._status = HOOK_STATUS_RETRIEVING_EMPTY;
    hook._ropeLength = HOOK_REST_LENGTH + HOOK_REEL_SPEED;
    hook.update(16);
    expect(hook._status).toBe(HOOK_STATUS_IDLE);
    expect(hook._ropeLength).toBeCloseTo(HOOK_REST_LENGTH, 4);
  });

  test('isCasting() returns false in RETRIEVING_EMPTY', () => {
    const hook = makeHook(false);
    hook._status = HOOK_STATUS_RETRIEVING_EMPTY;
    expect(hook.isCasting()).toBe(false);
  });

  test('isRetrievingEmpty() returns true in RETRIEVING_EMPTY', () => {
    const hook = makeHook(false);
    hook._status = HOOK_STATUS_RETRIEVING_EMPTY;
    expect(hook.isRetrievingEmpty()).toBe(true);
  });

  test('isRetrievingEmpty() returns false when IDLE', () => {
    const hook = makeHook(false);
    expect(hook.isRetrievingEmpty()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe('Hook isCasting()', () => {
  test('isCasting() is false before any update (IDLE)', () => {
    const hook = makeHook();
    expect(hook.isCasting()).toBe(false);
  });

  test('isCasting() is true immediately after cast request (CAST)', () => {
    const hook = makeHook(false);
    hook._handleCastRequested();
    hook.update(16);
    expect(hook.isCasting()).toBe(true);
  });

  test('isCasting() returns false in RETRIEVING_EMPTY', () => {
    const hook = makeHook(false);
    hook._status = HOOK_STATUS_RETRIEVING_EMPTY;
    expect(hook.isCasting()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Regression: Hook must not require() its own copy of CatchableFish - a private
// local class would make instanceof fail against the shared global class, silently
// treating all fish as inert objects (no struggle, no escape particles).
describe('Hook isCatchableFishHooked() - instanceof identity', () => {
  test('returns true for an instance of the shared CatchableFish class (same class reference)', () => {
    const hook = makeHook(false);
    hook._ropeLength = HOOK_REST_LENGTH + 100;
    const fish = makeMockFishEntity();
    hook.setCatch(fish);
    // If Hook had its own local require('./CatchableFish'), instanceof would
    // evaluate against a DIFFERENT class object and return false even for real fish.
    expect(fish instanceof CatchableFish).toBe(true);
    expect(hook.isCatchableFishHooked()).toBe(true);
  });

  test('returns false for an InertObject regardless of getFightSpec', () => {
    const hook = makeHook(false);
    hook._ropeLength = HOOK_REST_LENGTH + 100;
    const obj = makeMockInertEntity();
    hook.setCatch(obj);
    expect(obj instanceof CatchableFish).toBe(false);
    expect(hook.isCatchableFishHooked()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe('Hook HOOKED - fish struggle mechanic', () => {
  test('setCatch with fish entity makes isCatchableFishHooked() return true', () => {
    const hook = makeHook(false);
    hook._ropeLength = HOOK_REST_LENGTH + 100;
    hook.setCatch(makeMockFishEntity());
    expect(hook.isCatchableFishHooked()).toBe(true);
  });

  test('_escapeProgress increases each update with dt (no Space pressed)', () => {
    const hook = makeHook(false);
    hook._ropeLength = HOOK_REST_LENGTH + 200;
    const fish = makeMockFishEntity(10, 2.0);  // progress += 10*2*dt_sec
    hook.setCatch(fish);
    hook.update(1000);  // 1 second
    expect(hook._escapeProgress).toBeCloseTo(10 * 2.0 * 1, 3);
  });

  test('reel tap reduces _escapeProgress by HOOK_STRUGGLE_REEL_POWER', () => {
    const hook = makeHook(false);
    hook._ropeLength = HOOK_REST_LENGTH + 200;
    hook.setCatch(makeMockFishEntity(1, 0.0));  // no passive progress
    hook._escapeProgress = 50;
    reelTap(hook);
    hook.update(0);  // dt=0 so no passive progress, but tap applied
    expect(hook._escapeProgress).toBeCloseTo(50 - HOOK_STRUGGLE_REEL_POWER, 3);
  });

  test('reel tap reduces _ropeLength by HOOK_REEL_DISTANCE_PER_PRESS', () => {
    const hook = makeHook(false);
    hook._ropeLength = HOOK_REST_LENGTH + 200;
    hook.setCatch(makeMockFishEntity(1, 0.0));
    reelTap(hook);
    const before = hook._ropeLength;
    hook.update(0);
    expect(hook._ropeLength).toBeCloseTo(before - HOOK_REEL_DISTANCE_PER_PRESS, 3);
  });

  test('_escapeProgress floored at 0 (cannot go negative)', () => {
    const hook = makeHook(false);
    hook._ropeLength = HOOK_REST_LENGTH + 200;
    hook.setCatch(makeMockFishEntity(1, 0.0));
    hook._escapeProgress = 5;  // less than REEL_POWER
    reelTap(hook);
    hook.update(0);
    expect(hook._escapeProgress).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
describe('Hook HOOKED - fish escape', () => {
  test('escape: when _escapeProgress >= max, dispatches enemyEscaped event and returns to IDLE', () => {
    const hook = makeHook(false);
    hook._ropeLength = HOOK_REST_LENGTH + 200;
    const fish = makeMockFishEntity(10, 2.0);
    hook.setCatch(fish);
    hook._escapeProgress = HOOK_STRUGGLE_MAX_ESCAPE - 1;

    const dispatchMock = jest.fn();
    const savedDoc = global.document;
    global.document = { dispatchEvent: dispatchMock };

    hook.update(1000);  // pushes over max

    global.document = savedDoc;

    const escapedCalls = dispatchMock.mock.calls.filter(c => c[0].type === 'enemyEscaped');
    expect(escapedCalls).toHaveLength(1);
    expect(hook._status).toBe(HOOK_STATUS_IDLE);
  });

  test('escape: entity.escaped() is called and releaseEnemy re-adds it to swim off screen', () => {
    const hook = makeHook(false);
    hook._ropeLength = HOOK_REST_LENGTH + 200;
    const fish = makeMockFishEntity(10, 2.0);
    hook.setCatch(fish);
    hook._escapeProgress = HOOK_STRUGGLE_MAX_ESCAPE + 10;

    const savedDoc = global.document;
    global.document = { dispatchEvent: jest.fn() };
    hook.update(0);
    global.document = savedDoc;

    expect(fish.escaped).toHaveBeenCalledTimes(1);
    expect(hook._player._game.releaseEnemy).toHaveBeenCalledWith(fish);
  });

  test('hadCatch() returns false after escape', () => {
    const hook = makeHook(false);
    hook._ropeLength = HOOK_REST_LENGTH + 200;
    hook.setCatch(makeMockFishEntity(10, 2.0));
    hook._escapeProgress = HOOK_STRUGGLE_MAX_ESCAPE + 10;

    const savedDoc = global.document;
    global.document = { dispatchEvent: jest.fn() };
    hook.update(0);
    global.document = savedDoc;

    expect(hook.hadCatch()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe('Hook HOOKED - fish capture', () => {
  test('rope reaching REST while HOOKED enters CAPTURE_LAUNCH, does NOT dispatch enemyCaptured yet', () => {
    const hook = makeHook(false);
    hook._ropeLength = HOOK_REST_LENGTH + HOOK_REEL_DISTANCE_PER_PRESS;
    const fish = makeMockFishEntity(1, 0.0);
    hook.setCatch(fish);
    hook._escapeProgress = 0;

    reelTap(hook);

    const dispatchMock = jest.fn();
    const savedDoc = global.document;
    global.document = { dispatchEvent: dispatchMock };

    hook.update(0);

    global.document = savedDoc;

    const types = dispatchMock.mock.calls.map(c => c[0].type);
    expect(types).not.toContain('enemyCaptured');
    expect(hook._status).toBe(HOOK_STATUS_CAPTURE_LAUNCH);
    expect(hook._catch).toBeNull();
    expect(hook._launchEntity).not.toBeNull();
  });

  test('after CAPTURE_LAUNCH_DURATION_MS elapses, enemyCaptured fires at landing target and status is IDLE', () => {
    const hook = makeHook(false);
    hook._ropeLength = HOOK_REST_LENGTH + HOOK_REEL_DISTANCE_PER_PRESS;
    const fish = makeMockFishEntity(1, 0.0);
    hook.setCatch(fish);
    hook._escapeProgress = 0;
    reelTap(hook);

    // Advance to rest -> enters CAPTURE_LAUNCH
    const doc1 = { dispatchEvent: jest.fn() };
    const savedDoc = global.document;
    global.document = doc1;
    hook.update(0);

    expect(hook._status).toBe(HOOK_STATUS_CAPTURE_LAUNCH);
    const landingX = hook._launchTarget.getX();
    const landingY = hook._launchTarget.getY();

    // Advance past duration -> _finishCaptureLaunch fires
    const dispatchMock = jest.fn();
    global.document = { dispatchEvent: dispatchMock };
    hook.update(CAPTURE_LAUNCH_DURATION_MS);
    global.document = savedDoc;

    const types = dispatchMock.mock.calls.map(c => c[0].type);
    expect(types).toContain('enemyCaptured');
    expect(types).toContain('hookIdle');

    const capturedCall = dispatchMock.mock.calls.find(c => c[0].type === 'enemyCaptured');
    expect(capturedCall[0].detail.x).toBeCloseTo(landingX, 1);
    expect(capturedCall[0].detail.y).toBeCloseTo(landingY, 1);

    expect(hook._status).toBe(HOOK_STATUS_IDLE);
    expect(hook._ropeLength).toBe(HOOK_REST_LENGTH);
    expect(hook._launchEntity).toBeNull();
  });
});

// ---------------------------------------------------------------------------
describe('Hook HOOKED - inert object auto-reel', () => {
  test('setCatch with inert entity makes isCatchableFishHooked() return false', () => {
    const hook = makeHook(false);
    hook._ropeLength = HOOK_REST_LENGTH + 100;
    hook.setCatch(makeMockInertEntity());
    expect(hook.isCatchableFishHooked()).toBe(false);
  });

  test('inert: updateCaptured called N times after N update() calls', () => {
    const hook = makeHook(false);
    hook._ropeLength = HOOK_REST_LENGTH + 200;
    const entity = makeMockInertEntity();
    hook.setCatch(entity);
    for (let i = 0; i < 5; i++) hook.update(16);
    expect(entity.updateCaptured).toHaveBeenCalledTimes(5);
  });

  test('inert: rope shrinks automatically without Space press', () => {
    const hook = makeHook(false);
    hook._ropeLength = HOOK_REST_LENGTH + 100;
    hook.setCatch(makeMockInertEntity());
    const before = hook._ropeLength;
    hook.update(16);
    expect(hook._ropeLength).toBeLessThan(before);
  });

  test('configured InertObject definitions have no resistance and auto-reel', () => {
    const factory = new EnemyFactory();
    const trashDefs = FISH_DEFINITIONS.filter(def => !('frameH' in def));

    trashDefs.forEach(def => {
      const hook = makeHook(false);
      const { game, ctx } = makeMockEntityCtx();
      const entity = factory.createEnemy(def.id, game, ctx);
      hook._ropeLength = HOOK_REST_LENGTH + 100;

      hook.setCatch(entity);
      const before = hook._ropeLength;
      hook.update(16);

      expect(entity instanceof InertObject).toBe(true);
      expect(entity.getFightSpec()).toBeNull();
      expect(hook.isCatchableFishHooked()).toBe(false);
      expect(hook._ropeLength).toBeLessThan(before);
    });
  });
});

// ---------------------------------------------------------------------------
describe('Hook hadCatch() and isHooked()', () => {
  test('hadCatch() is false in IDLE', () => {
    const hook = makeHook(false);
    expect(hook.hadCatch()).toBe(false);
  });

  test('hadCatch() is true in HOOKED', () => {
    const hook = makeHook(false);
    hook._ropeLength = HOOK_REST_LENGTH + 100;
    hook.setCatch(makeMockInertEntity());
    expect(hook.hadCatch()).toBe(true);
  });

  test('hadCatch() is false in RETRIEVING_EMPTY', () => {
    const hook = makeHook(false);
    hook._status = HOOK_STATUS_RETRIEVING_EMPTY;
    expect(hook.hadCatch()).toBe(false);
  });

  test('hadCatch() is true during CAPTURE_LAUNCH', () => {
    const hook = makeHook(false);
    hook._status = HOOK_STATUS_CAPTURE_LAUNCH;
    expect(hook.hadCatch()).toBe(true);
  });

  test('isHooked() returns true when HOOKED', () => {
    const hook = makeHook(false);
    hook._ropeLength = HOOK_REST_LENGTH + 100;
    hook.setCatch(makeMockInertEntity());
    expect(hook.isHooked()).toBe(true);
  });

  test('isHooked() returns false when IDLE', () => {
    const hook = makeHook(false);
    expect(hook.isHooked()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe('Hook capture trail (_captureTrail)', () => {
  function driveToLaunch(hook) {
    hook.setCatch(makeMockInertEntity());
    hook._beginCaptureLaunch();
    return hook;
  }

  test('_captureTrail accumulates particles during CAPTURE_LAUNCH update', () => {
    const hook = makeHook(false);
    driveToLaunch(hook);
    expect(hook._status).toBe(HOOK_STATUS_CAPTURE_LAUNCH);
    hook.update(16);
    expect(hook._captureTrail.length).toBeGreaterThan(0);
  });

  test('_captureTrail drains to zero after enough _drawCaptureTrail() calls', () => {
    const hook = makeHook(false);
    driveToLaunch(hook);
    hook.update(16); // spawn some sparkles
    expect(hook._captureTrail.length).toBeGreaterThan(0);

    // Drain: call _drawCaptureTrail many times (more than CAPTURE_SPARKLE_LIFE ticks)
    for (let i = 0; i < 30; i++) hook._drawCaptureTrail();
    expect(hook._captureTrail.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
describe('Hook._pivot() follows rendered rod-tip Y during CAST (bob offset)', () => {
  const BOB = 12;

  function makeHookWithBob(bobOffset, state = PLAYER_STATE_CAST) {
    const game = makeMockGame(false);
    const mockPlayer = {
      getPosition: () => new Point(PLAYER_X, PLAYER_Y + bobOffset),
      getSize:     () => new Size(PLAYER_H, PLAYER_W),
      _game: game,
      _state: state,
      _bobOffset: bobOffset,
    };
    return new Hook(mockPlayer, makeMockCtx(), new Size(HOOK_H, HOOK_W), new Point(PLAYER_X, PLAYER_Y));
  }

  test('pivot y uses HOOK_CAST_PIVOT_Y_FACTOR during CAST', () => {
    const hook = makeHookWithBob(BOB);
    hook._status = HOOK_STATUS_CAST;
    const pivot = hook._pivot();
    const expectedY = (PLAYER_Y + BOB) + PLAYER_H * HOOK_CAST_PIVOT_Y_FACTOR;
    expect(pivot.getY()).toBeCloseTo(expectedY, 4);
  });

test('pivot x uses HOOK_CAST_PIVOT_X_OFFSET during CAST', () => {
    const hook = makeHookWithBob(0);
    hook._status = HOOK_STATUS_CAST;
    const pivot = hook._pivot();
    const expectedX = PLAYER_X + HOOK_CAST_PIVOT_X_OFFSET;
    expect(pivot.getX()).toBeCloseTo(expectedX, 4);
});

test('pivot x offset scales with player display size', () => {
  const game = makeMockGame(false);
  const player = {
    getPosition: () => new Point(PLAYER_X, PLAYER_Y),
    getSize: () => new Size(PLAYER_H * 0.62, PLAYER_W * 0.62),
    getDisplayScale: () => 0.62,
    _game: game,
    _state: PLAYER_STATE_IDLE,
  };
  const hook = new Hook(player, makeMockCtx(), new Size(25, 25), new Point(0, 0));

  const pivot = hook.getPivotPoint();

  expect(pivot.getX()).toBeCloseTo(PLAYER_X + HOOK_PIVOT_X_OFFSET * 0.62, 5);
});

test('pivot y uses HOOK_PIVOT_Y_FACTOR during IDLE', () => {
    const hook = makeHookWithBob(0, PLAYER_STATE_IDLE);
    const pivot = hook._pivot();
    const expectedY = PLAYER_Y + PLAYER_H * HOOK_PIVOT_Y_FACTOR;
    expect(pivot.getY()).toBeCloseTo(expectedY, 4);
  });
});

// ---------------------------------------------------------------------------
// Helper: create a mock document that records dispatched events
function makeDocMock() {
  const dispatched = [];
  return {
    getElementById: () => null,
    dispatchEvent: jest.fn(evt => dispatched.push(evt)),
    eventsOf: (type) => dispatched.filter(e => e.type === type),
  };
}

describe('Hook event dispatching', () => {
  let savedDoc;
  let docMock;

  beforeEach(() => {
    savedDoc = global.document;
    docMock = makeDocMock();
    global.document = docMock;
  });

  afterEach(() => {
    global.document = savedDoc;
  });

  test('EVENT_ROD_CASTED fires exactly once per cast press', () => {
    const hook = makeHook(false);
    castHook(hook);
    expect(docMock.eventsOf('rodCasted')).toHaveLength(1);
  });

  test('EVENT_ROD_CASTED does not fire on subsequent updates without re-pressing', () => {
    const hook = makeHook(false);
    castHook(hook);
    hook.update(16);
    hook.update(16);
    expect(docMock.eventsOf('rodCasted')).toHaveLength(1);
  });

  test('EVENT_ENEMY_HOOKED fires once for CatchableFish and not again on subsequent ticks', () => {
    const hook = makeHook(false);
    hook._ropeLength = HOOK_REST_LENGTH + 200;
    const fish = makeMockFishEntity();
    hook.setCatch(fish);
    hook.update(16);
    hook.update(16);
    hook.update(16);
    expect(docMock.eventsOf('enemyHooked')).toHaveLength(1);
  });

  test('EVENT_ENEMY_HOOKED does not fire for non-CatchableFish (InertObject)', () => {
    const hook = makeHook(false);
    hook._ropeLength = HOOK_REST_LENGTH + 200;
    hook.setCatch(makeMockInertEntity());
    hook.update(16);
    hook.update(16);
    expect(docMock.eventsOf('enemyHooked')).toHaveLength(0);
  });

  test('EVENT_REEL_RETRIEVING fires once when setCatch is called', () => {
    const hook = makeHook(false);
    hook._ropeLength = HOOK_REST_LENGTH + 200;
    hook.setCatch(makeMockInertEntity());
    expect(docMock.eventsOf('reelRetrieving')).toHaveLength(1);
  });

  test('EVENT_REEL_RETRIEVING fires once when hook reaches max depth (CAST -> RETRIEVING_EMPTY)', () => {
    const hook = makeHook(false);
    castHook(hook);
    hook._castAngle = 0;
    hook._ropeLength = 1750; // endpoint.y = pivot.y(~189) + 1750 = 1939 > 1900 (gameH=2000 * 0.95)
    hook.update(16);
    expect(docMock.eventsOf('reelRetrieving')).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
describe('Hook EVENT_REEL_POWER_CHANGED dispatching', () => {
  let savedDoc;
  let docMock;

  beforeEach(() => {
    savedDoc = global.document;
    docMock = makeDocMock();
    global.document = docMock;
  });

  afterEach(() => {
    global.document = savedDoc;
  });

  test('reelPowerChanged fires each update when CatchableFish is hooked and not yet escaped', () => {
    const hook = makeHook(false);
    hook._ropeLength = HOOK_REST_LENGTH + 200;
    hook.setCatch(makeMockFishEntity(1, 0.0));  // zero escape rate so progress stays at 0
    hook._escapeProgress = 0;
    hook.update(16);
    hook.update(16);
    expect(docMock.eventsOf('reelPowerChanged')).toHaveLength(2);
  });

  test('reelPowerChanged power=1.0 when escapeProgress is 0', () => {
    const hook = makeHook(false);
    hook._ropeLength = HOOK_REST_LENGTH + 200;
    hook.setCatch(makeMockFishEntity(1, 0.0));
    hook._escapeProgress = 0;
    hook.update(16);
    const events = docMock.eventsOf('reelPowerChanged');
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].detail.power).toBeCloseTo(1.0, 5);
  });

  test('reelPowerChanged power=0.0 when escapeProgress equals HOOK_STRUGGLE_MAX_ESCAPE - 1', () => {
    const hook = makeHook(false);
    hook._ropeLength = HOOK_REST_LENGTH + 200;
    hook.setCatch(makeMockFishEntity(1, 0.0));
    hook._escapeProgress = HOOK_STRUGGLE_MAX_ESCAPE - 1;
    hook.update(0);  // dt=0 so no additional progress accumulates
    const events = docMock.eventsOf('reelPowerChanged');
    expect(events.length).toBeGreaterThan(0);
    // power = 1 - (99/100) = 0.01
    expect(events[0].detail.power).toBeCloseTo(0.01, 2);
  });

  test('reelPowerChanged does NOT fire on the frame the fish escapes', () => {
    const hook = makeHook(false);
    hook._ropeLength = HOOK_REST_LENGTH + 200;
    hook.setCatch(makeMockFishEntity(1, 0.0));
    hook._escapeProgress = HOOK_STRUGGLE_MAX_ESCAPE + 1;  // already over threshold
    hook.update(0);
    expect(docMock.eventsOf('reelPowerChanged')).toHaveLength(0);
  });

  test('reelPowerChanged does NOT fire for InertObject (non-CatchableFish)', () => {
    const hook = makeHook(false);
    hook._ropeLength = HOOK_REST_LENGTH + 200;
    hook.setCatch(makeMockInertEntity());
    hook.update(16);
    hook.update(16);
    expect(docMock.eventsOf('reelPowerChanged')).toHaveLength(0);
  });
});
