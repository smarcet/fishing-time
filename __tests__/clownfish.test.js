'use strict';

const { Size, Point, CatchableFish, ClownFish } = require('../index.js');

const CLOWN_FISH_FRAME_WIDTH  = 342;
const CLOWN_FISH_FRAME_HEIGHT = 321;
const CLOWN_FISH_MAX_FRAME_X  = 10;
const WATER_SURFACE_Y         = 300;
const CANVAS_W = 800;
const CANVAS_H = 900;

function makeMocks() {
  const mockGame = {
    getSize: () => new Size(CANVAS_H, CANVAS_W),
    isDebug: () => false,
    hasKey: () => false,
  };
  const mockCtx = {
    drawImage: () => {},
    beginPath: () => {},
    stroke: () => {},
    fillRect: () => {},
    fillText: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    scale: jest.fn(),
    setLineDash: () => {},
    set shadowColor(_) {},
    set shadowBlur(_) {},
    set globalAlpha(_) {},
  };
  return { mockGame, mockCtx, mockImage: {} };
}

function makeClownFish(startX = 0) {
  const { mockGame, mockCtx, mockImage } = makeMocks();
  return new ClownFish(
    mockGame, mockCtx,
    new Size(114, 107),
    new Point(startX, 400),
    mockImage,
    CLOWN_FISH_MAX_FRAME_X, 1, 0, 1,
    new Size(CLOWN_FISH_FRAME_HEIGHT, CLOWN_FISH_FRAME_WIDTH)
  );
}

describe('ClownFish class hierarchy', () => {
  test('instanceof CatchableFish', () => {
    const fish = makeClownFish();
    expect(fish instanceof CatchableFish).toBe(true);
  });

  test('getFightSpec() returns non-null with strength and escapeRate', () => {
    const fish = makeClownFish();
    const spec = fish.getFightSpec();
    expect(spec).not.toBeNull();
    expect(spec).toHaveProperty('strength');
    expect(spec).toHaveProperty('escapeRate');
  });
});

describe('ClownFish animation cadence (ANIM_STAGGER_SLOW = 6 ticks)', () => {
  test('_frameX stays 0 for the first 5 updates', () => {
    const fish = makeClownFish();
    for (let i = 0; i < 5; i++) {
      fish.update();
      expect(fish._frameX).toBe(0);
    }
  });

  test('_frameX becomes 1 on the 6th update', () => {
    const fish = makeClownFish();
    for (let i = 0; i < 6; i++) fish.update();
    expect(fish._frameX).toBe(1);
  });
});

describe('ClownFish direction flip in draw()', () => {
  test('draw() calls ctx.scale(1, 1) when _direction is -1 (going left)', () => {
    const fish = makeClownFish();
    fish._direction = -1;
    fish.draw();
    expect(fish._ctx.scale).toHaveBeenCalledWith(1, 1);
  });

  test('draw() calls ctx.scale(-1, 1) when _direction is 1 (going right, flip needed)', () => {
    const fish = makeClownFish();
    fish._direction = 1;
    fish.draw();
    expect(fish._ctx.scale).toHaveBeenCalledWith(-1, 1);
  });
});

describe('ClownFish spawn bounds', () => {
  test('randomSpawnY returns value in [WATER_SURFACE_Y, canvasHeight - fishHeight]', () => {
    const fishH = 107;
    const y = ClownFish.randomSpawnY(CANVAS_H, fishH, Math.random);
    expect(y).toBeGreaterThanOrEqual(WATER_SURFACE_Y);
    expect(y).toBeLessThanOrEqual(CANVAS_H - fishH);
  });

  test('randomSpawnY is deterministic with a fixed rng', () => {
    const fishH = 107;
    const maxY = CANVAS_H - fishH;
    const expected = WATER_SURFACE_Y + 0.5 * (maxY - WATER_SURFACE_Y);
    expect(ClownFish.randomSpawnY(CANVAS_H, fishH, () => 0.5)).toBeCloseTo(expected, 5);
  });

  test('randomSpawnX (inherited from CatchableFish) returns value in [0, canvasWidth - fishWidth]', () => {
    const x = ClownFish.randomSpawnX(CANVAS_W, 114, () => 0.5);
    expect(x).toBeCloseTo(0.5 * (CANVAS_W - 114), 5);
  });
});
