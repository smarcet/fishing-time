'use strict';

const { Size, Point, Hook } = require('../index.js');

// Player position/size used across all tests
const PLAYER_X   = 100;
const PLAYER_Y   = 0;
const PLAYER_H   = 315;
const PLAYER_W   = 404;
const HOOK_W     = 25;
const HOOK_H     = 25;

// Mirror plan constants for assertion computation
const HOOK_PIVOT_X_OFFSET  = 45;
const HOOK_PIVOT_Y_FACTOR  = 0.6;
const HOOK_REST_LENGTH     = 60;
const HOOK_MAX_SWING_ANGLE = 0.5236;
const HOOK_SWING_SPEED     = 0.04;
const HOOK_CAST_SPEED      = 5;
const HOOK_REEL_SPEED      = 5;

function makeMockGame(spaceHeld = false) {
  return {
    getSize: () => new Size(2000, 800), // very tall - depth bound won't fire in tests
    isDebug: () => false,
    hasKey: (k) => (k === ' ' ? spaceHeld : false),
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
  };
  const ctx = makeMockCtx();
  // Hook constructor: (player, ctx, size, position) — position is legacy, now computed from player
  return new Hook(mockPlayer, ctx, new Size(HOOK_H, HOOK_W), new Point(PLAYER_X, PLAYER_Y));
}

// Pivot coordinates (used to compute expected getPosition())
const pivotX = PLAYER_X + HOOK_PIVOT_X_OFFSET;    // 145
const pivotY = PLAYER_Y + PLAYER_H * HOOK_PIVOT_Y_FACTOR; // 189

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
    const hook = makeHook(false); // Space not held
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
    expect(hook._status).toBe('IDLE');
  });
});

describe('Hook getPosition() projection', () => {
  test('at angle=0, ropeLength=REST, getPosition returns pivot+(0, L) offset by -w/2', () => {
    const hook = makeHook(false);
    // angle is 0 and ropeLength = HOOK_REST_LENGTH after construction
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

describe('Hook cast — freeze at fire-time', () => {
  test('pressing Space while IDLE captures _castAngle === _angle at that tick', () => {
    // Advance a few idle ticks so angle is non-zero
    const hookIdle = makeHook(false);
    for (let i = 0; i < 5; i++) hookIdle.update();
    const angleAtPress = hookIdle._angle;

    // Now make a new hook at the same phase and fire
    const hookCast = makeHook(true); // Space held
    // Manually advance to same phase without Space
    const tempGame = makeMockGame(false);
    hookCast._player._game = tempGame;
    for (let i = 0; i < 5; i++) hookCast.update();
    // Switch Space on
    hookCast._player._game = makeMockGame(true);
    hookCast.update(); // IDLE → CAST, captures _castAngle

    expect(hookCast._status).toBe('CAST');
    expect(hookCast._castAngle).toBeCloseTo(angleAtPress, 5);
  });

  test('_castAngle is unchanged across subsequent CAST updates', () => {
    const hook = makeHook(false);
    for (let i = 0; i < 3; i++) hook.update(); // build up angle
    const frozenAngle = hook._angle;
    hook._player._game = makeMockGame(true); // Space on
    hook.update(); // → CAST
    expect(hook._castAngle).toBeCloseTo(frozenAngle, 5);
    const castAngleAfterTransition = hook._castAngle;
    // Keep updating in CAST — castAngle must not change
    for (let i = 0; i < 5; i++) hook.update();
    expect(hook._castAngle).toBeCloseTo(castAngleAfterTransition, 5);
  });

  test('_ropeLength increases by HOOK_CAST_SPEED each CAST update', () => {
    const hook = makeHook(false);
    hook._player._game = makeMockGame(true); // Space on immediately
    hook.update(); // → CAST (first cast tick)
    const lengthAfterFirst = hook._ropeLength;
    hook.update();
    expect(hook._ropeLength).toBeCloseTo(lengthAfterFirst + HOOK_CAST_SPEED, 4);
  });

  test('angled cast: getPosition().getX() is offset from straight-down by ropeLength*sin(castAngle)', () => {
    const hook = makeHook(false);
    // Advance to a non-trivial angle
    for (let i = 0; i < 10; i++) hook.update();
    const nonZeroAngle = hook._angle;

    hook._player._game = makeMockGame(true); // cast
    hook.update(); // IDLE → CAST, ropeLength grows by CAST_SPEED

    const L = hook._ropeLength;
    const expectedX = pivotX + L * Math.sin(nonZeroAngle) - HOOK_W / 2;
    expect(hook.getPosition().getX()).toBeCloseTo(expectedX, 3);
    expect(Math.abs(nonZeroAngle)).toBeGreaterThan(0.001); // confirm angle was actually non-zero
  });
});

describe('Hook reel — return to IDLE', () => {
  test('when Space released during CAST, _ropeLength shrinks by HOOK_REEL_SPEED each tick', () => {
    const hook = makeHook(false);
    hook._player._game = makeMockGame(true);
    // Cast a few ticks to extend the rope
    for (let i = 0; i < 5; i++) hook.update();
    const extendedLength = hook._ropeLength;
    // Release Space
    hook._player._game = makeMockGame(false);
    hook.update();
    expect(hook._ropeLength).toBeCloseTo(extendedLength - HOOK_REEL_SPEED, 4);
  });

  test('when rope reels back to REST length, status returns to IDLE', () => {
    const hook = makeHook(false);
    hook._player._game = makeMockGame(true);
    // Extend just a little
    hook.update(); // IDLE → CAST (rope = REST+CAST_SPEED)
    // Release immediately
    hook._player._game = makeMockGame(false);
    // Reel until rest
    for (let i = 0; i < 20; i++) {
      hook.update();
      if (hook._status === 'IDLE') break;
    }
    expect(hook._status).toBe('IDLE');
    expect(hook._ropeLength).toBeCloseTo(HOOK_REST_LENGTH, 4);
  });
});

describe('Hook isCasting() - catch guard', () => {
  test('isCasting() is false before any update (IDLE)', () => {
    const hook = makeHook();
    expect(hook.isCasting()).toBe(false);
  });

  test('isCasting() is true immediately after Space pressed (CAST)', () => {
    const hook = makeHook(false);
    hook._player._game = makeMockGame(true);
    hook.update(); // IDLE -> CAST
    expect(hook.isCasting()).toBe(true);
  });

  test('isCasting() returns false once rope reels back to IDLE', () => {
    const hook = makeHook(false);
    hook._player._game = makeMockGame(true);
    hook.update(); // -> CAST
    hook._player._game = makeMockGame(false);
    for (let i = 0; i < 20; i++) {
      hook.update();
      if (hook._status === 'IDLE') break;
    }
    expect(hook.isCasting()).toBe(false);
  });
});
