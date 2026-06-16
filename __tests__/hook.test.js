'use strict';

const { Size, Point, Hook, CatchableFish, InertObject } = require('../index.js');

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

// Helper: put hook into CAST state via rising-edge press
function castHook(hook) {
  hook._player._game = makeMockGame(false);
  hook._prevSpaceHeld = false;
  hook._player._game = makeMockGame(true);
  hook.update(16);  // IDLE -> CAST
}

function makeHookWithCatch(extraRope = 100) {
  const hook = makeHook(false);
  hook._ropeLength = HOOK_REST_LENGTH + extraRope;
  hook.setCatch(makeMockInertEntity());
  return hook;
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
describe('Hook single-press cast (rising-edge)', () => {
  test('holding Space on the first update (prevSpaceHeld=false) fires IDLE -> CAST', () => {
    const hook = makeHook(false);
    hook._player._game = makeMockGame(true);
    hook._prevSpaceHeld = false;
    hook.update(16);
    expect(hook._status).toBe(HOOK_STATUS_CAST);
  });

  test('second update with Space still held does NOT re-fire (prevSpaceHeld=true)', () => {
    const hook = makeHook(false);
    hook._player._game = makeMockGame(true);
    hook._prevSpaceHeld = false;
    hook.update(16);  // -> CAST
    // Still in CAST; space still held -> spacePressed = false, no second transition
    hook.update(16);
    expect(hook._status).toBe(HOOK_STATUS_CAST);
  });

  test('no Space held -> stays IDLE', () => {
    const hook = makeHook(false);
    hook.update(16);
    expect(hook._status).toBe(HOOK_STATUS_IDLE);
  });

  test('pressing Space captures _castAngle === _angle at that tick', () => {
    const hookIdle = makeHook(false);
    for (let i = 0; i < 5; i++) hookIdle.update();
    const angleAtPress = hookIdle._angle;

    const hookCast = makeHook(false);
    for (let i = 0; i < 5; i++) hookCast.update();
    hookCast._player._game = makeMockGame(true);
    hookCast.update(16);

    expect(hookCast._status).toBe(HOOK_STATUS_CAST);
    expect(hookCast._castAngle).toBeCloseTo(angleAtPress, 5);
  });

  test('_castAngle is frozen across subsequent CAST updates', () => {
    const hook = makeHook(false);
    for (let i = 0; i < 3; i++) hook.update();
    hook._player._game = makeMockGame(true);
    hook.update(16); // -> CAST
    const frozen = hook._castAngle;
    for (let i = 0; i < 5; i++) hook.update(16);
    expect(hook._castAngle).toBeCloseTo(frozen, 5);
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
    hook._player._game = makeMockGame(true);
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

  test('isCasting() is true immediately after rising-edge press (CAST)', () => {
    const hook = makeHook(false);
    hook._prevSpaceHeld = false;
    hook._player._game = makeMockGame(true);
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

  test('Space press reduces _escapeProgress by HOOK_STRUGGLE_REEL_POWER', () => {
    const hook = makeHook(false);
    hook._ropeLength = HOOK_REST_LENGTH + 200;
    hook.setCatch(makeMockFishEntity(1, 0.0));  // no passive progress
    hook._escapeProgress = 50;
    hook._prevSpaceHeld = false;
    hook._player._game = makeMockGame(true);
    hook.update(0);  // dt=0 so no passive progress, but space pressed
    expect(hook._escapeProgress).toBeCloseTo(50 - HOOK_STRUGGLE_REEL_POWER, 3);
  });

  test('Space press reduces _ropeLength by HOOK_REEL_DISTANCE_PER_PRESS', () => {
    const hook = makeHook(false);
    hook._ropeLength = HOOK_REST_LENGTH + 200;
    hook.setCatch(makeMockFishEntity(1, 0.0));
    hook._prevSpaceHeld = false;
    hook._player._game = makeMockGame(true);
    const before = hook._ropeLength;
    hook.update(0);
    expect(hook._ropeLength).toBeCloseTo(before - HOOK_REEL_DISTANCE_PER_PRESS, 3);
  });

  test('_escapeProgress floored at 0 (cannot go negative)', () => {
    const hook = makeHook(false);
    hook._ropeLength = HOOK_REST_LENGTH + 200;
    hook.setCatch(makeMockFishEntity(1, 0.0));
    hook._escapeProgress = 5;  // less than REEL_POWER
    hook._prevSpaceHeld = false;
    hook._player._game = makeMockGame(true);
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

    expect(dispatchMock).toHaveBeenCalledTimes(1);
    const evt = dispatchMock.mock.calls[0][0];
    expect(evt.type).toBe('enemyEscaped');
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
  test('rope reaching REST while HOOKED dispatches enemyCaptured and returns to IDLE', () => {
    const hook = makeHook(false);
    hook._ropeLength = HOOK_REST_LENGTH + HOOK_REEL_DISTANCE_PER_PRESS;
    const fish = makeMockFishEntity(1, 0.0);
    hook.setCatch(fish);
    hook._escapeProgress = 0;

    // Press Space to reel
    hook._prevSpaceHeld = false;
    hook._player._game = makeMockGame(true);

    const dispatchMock = jest.fn();
    const savedDoc = global.document;
    global.document = { dispatchEvent: dispatchMock };

    hook.update(0);

    global.document = savedDoc;

    const types = dispatchMock.mock.calls.map(c => c[0].type);
    expect(types).toContain('enemyCaptured');
    expect(hook._status).toBe(HOOK_STATUS_IDLE);
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
describe('Hook getCapturePhase()', () => {
  test('returns CAPTURE_PHASE_RISING immediately after setCatch', () => {
    const hook = makeHookWithCatch();
    expect(hook.getCapturePhase()).toBe(CAPTURE_PHASE_RISING);
  });

  test('returns CAPTURE_PHASE_THROWING when rope reeled past threshold', () => {
    const extraRope = 100;
    const hook = makeHookWithCatch(extraRope);
    const retractNeeded = Math.ceil(CAPTURE_THROW_THRESHOLD * extraRope) + 1;
    hook._ropeLength = HOOK_REST_LENGTH + extraRope - retractNeeded;
    expect(hook.getCapturePhase()).toBe(CAPTURE_PHASE_THROWING);
  });

  test('getCaptureRawProgress returns 1 (no NaN) when rope equals REST at catch time', () => {
    const hook = makeHook(false);
    hook.setCatch(makeMockInertEntity());
    const raw = hook.getCaptureRawProgress();
    expect(raw).toBe(1);
    expect(isNaN(raw)).toBe(false);
    expect(hook.getCapturePhase()).toBe(CAPTURE_PHASE_THROWING);
  });
});

// ---------------------------------------------------------------------------
describe('Hook clearCaptured() dispatches enemyCaptured event', () => {
  test('dispatchEvent called with enemyCaptured and correct detail', () => {
    const hook = makeHookWithCatch();
    const dispatchMock = jest.fn();
    const savedDoc = global.document;
    global.document = { dispatchEvent: dispatchMock };

    hook.clearCaptured();

    global.document = savedDoc;

    expect(dispatchMock).toHaveBeenCalledTimes(1);
    const evt = dispatchMock.mock.calls[0][0];
    expect(evt.type).toBe('enemyCaptured');
    expect(evt.detail).toHaveProperty('enemyType');
  });

  test('dispatchEvent not called when no catch is active', () => {
    const hook = makeHook(false);
    const dispatchMock = jest.fn();
    const savedDoc = global.document;
    global.document = { dispatchEvent: dispatchMock };
    hook.clearCaptured();
    global.document = savedDoc;
    expect(dispatchMock).not.toHaveBeenCalled();
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

  test('pivot y uses HOOK_PIVOT_Y_FACTOR during IDLE', () => {
    const hook = makeHookWithBob(0, PLAYER_STATE_IDLE);
    const pivot = hook._pivot();
    const expectedY = PLAYER_Y + PLAYER_H * HOOK_PIVOT_Y_FACTOR;
    expect(pivot.getY()).toBeCloseTo(expectedY, 4);
  });
});
