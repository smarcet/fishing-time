'use strict';

const { Size, Point, ClownFish, DiscardedBottle } = require('../index.js');
const { ENEMY_STATUS_CAPTURED } = require('../src/constants');

const CLOWN_FISH_CAPTURE_ROTATION = 80; // captureRotation for ClownFish in FISH_DEFINITIONS

function makeMocks() {
  const mockGame = {
    getSize: () => new Size(900, 800),
    isDebug: () => false,
    hasKey: () => false,
  };
  const mockCtx = {
    drawImage: jest.fn(),
    beginPath: jest.fn(),
    stroke: jest.fn(),
    fillRect: jest.fn(),
    fillText: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    scale: jest.fn(),
    setLineDash: jest.fn(),
    set shadowColor(_) {},
    set shadowBlur(_) {},
    set globalAlpha(_) {},
  };
  return { mockGame, mockCtx };
}

function makeHookStub({ isHooked = true, isCatchableFishHooked = true, escapeProgress = 0 } = {}) {
  return {
    getEndpoint: () => new Point(200, 300),
    isHooked: () => isHooked,
    isCatchableFishHooked: () => isCatchableFishHooked,
    _escapeProgress: escapeProgress,
  };
}

function makeStruggleFish({ isHooked = true, isCatchableFishHooked = true, escapeProgress = 0 } = {}) {
  const { mockGame, mockCtx } = makeMocks();
  const fish = new ClownFish(
    mockGame, mockCtx,
    new Size(114, 107),
    new Point(100, 400),
    {},        // image stub
    10, 1, 0, 1,
    new Size(321, 342)
  );
  // Wire up all properties drawCaptured() needs
  fish._status          = ENEMY_STATUS_CAPTURED;
  fish._captureTick     = 60;   // sin(60*0.15) ≈ 0.412 — definitely non-zero
  fish._captureRotation = CLOWN_FISH_CAPTURE_ROTATION;
  fish._captureOffsetX  = 0;
  fish._captureOffsetY  = 0;
  fish._struggleSpeed             = 0.15;
  fish._struggleRotationAmplitude = 8;
  fish._struggleOffsetAmplitude   = 3;
  fish._hook = makeHookStub({ isHooked, isCatchableFishHooked, escapeProgress });
  return { fish, ctx: mockCtx };
}

describe('EnemyWithAnimation.drawCaptured() - struggle animation', () => {
  test('Test A: struggle active - ctx.rotate called with angle != base captureRotation', () => {
    const { fish, ctx } = makeStruggleFish();
    fish.drawCaptured();
    expect(ctx.rotate).toHaveBeenCalledTimes(1);
    const actualAngle = ctx.rotate.mock.calls[0][0];
    const baseAngle = CLOWN_FISH_CAPTURE_ROTATION * Math.PI / 180;
    expect(actualAngle).not.toBeCloseTo(baseAngle, 5);
  });

  test('Test B: InertObject (trash) with hook hooked - ctx.rotate called with exactly base captureRotation (getFightSpec null)', () => {
    const { mockGame, mockCtx } = makeMocks();
    const bottle = new DiscardedBottle(
      mockGame, mockCtx,
      new Size(92, 76),
      new Point(100, 400),
      {},
      10
    );
    bottle._status          = ENEMY_STATUS_CAPTURED;
    bottle._captureTick     = 60;
    bottle._captureRotation = 0;
    bottle._captureOffsetX  = 0;
    bottle._captureOffsetY  = 0;
    bottle._hook = makeHookStub({ isHooked: true, isCatchableFishHooked: false });
    bottle.drawCaptured();
    expect(mockCtx.rotate).toHaveBeenCalledTimes(1);
    const actualAngle = mockCtx.rotate.mock.calls[0][0];
    expect(actualAngle).toBeCloseTo(0, 10);
  });

  test('Test C: hook.isHooked() = false -> ctx.rotate called with exactly base captureRotation', () => {
    const { fish, ctx } = makeStruggleFish({ isHooked: false });
    fish.drawCaptured();
    expect(ctx.rotate).toHaveBeenCalledTimes(1);
    const actualAngle = ctx.rotate.mock.calls[0][0];
    const baseAngle = CLOWN_FISH_CAPTURE_ROTATION * Math.PI / 180;
    expect(actualAngle).toBeCloseTo(baseAngle, 10);
  });
});
