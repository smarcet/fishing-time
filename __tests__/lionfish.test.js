'use strict';

const { Size, Point, CatchableFish, LionFish } = require('../index.js');

const LION_FISH_FRAME_WIDTH  = 452;
const LION_FISH_FRAME_HEIGHT = 437;
const LION_FISH_MAX_FRAME_X  = 10;
const WATER_SURFACE_Y        = 300;
const CANVAS_W = 800;
const CANVAS_H = 900;  // must satisfy: CANVAS_H * 0.7 - fishHeight > WATER_SURFACE_Y

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

function makeLionFish(startX = 0) {
  const { mockGame, mockCtx, mockImage } = makeMocks();
  return new LionFish(
    mockGame, mockCtx,
    new Size(124, 124),
    new Point(startX, 400),
    mockImage,
    LION_FISH_MAX_FRAME_X, 1, 0, 1,
    new Size(LION_FISH_FRAME_HEIGHT, LION_FISH_FRAME_WIDTH)
  );
}

describe('LionFish class hierarchy', () => {
  test('instanceof CatchableFish', () => {
    const fish = makeLionFish();
    expect(fish instanceof CatchableFish).toBe(true);
  });

  test('getFightSpec() returns non-null with strength and escapeRate', () => {
    const fish = makeLionFish();
    const spec = fish.getFightSpec();
    expect(spec).not.toBeNull();
    expect(spec).toHaveProperty('strength');
    expect(spec).toHaveProperty('escapeRate');
  });
});

describe('LionFish animation cadence (ANIM_STAGGER_SLOW = 6 ticks)', () => {
  test('_frameX stays 0 for the first 5 updates', () => {
    const fish = makeLionFish();
    for (let i = 0; i < 5; i++) {
      fish.update();
      expect(fish._frameX).toBe(0);
    }
  });

  test('_frameX becomes 1 on the 6th update', () => {
    const fish = makeLionFish();
    for (let i = 0; i < 6; i++) fish.update();
    expect(fish._frameX).toBe(1);
  });
});

describe('LionFish direction flip in draw()', () => {
  test('draw() calls ctx.scale(1, 1) when _direction is -1 (going left, sprite faces left naturally)', () => {
    const fish = makeLionFish();
    fish._direction = -1;
    fish.draw();
    expect(fish._ctx.scale).toHaveBeenCalledWith(1, 1);
  });

  test('draw() calls ctx.scale(-1, 1) when _direction is 1 (going right, flip needed)', () => {
    const fish = makeLionFish();
    fish._direction = 1;
    fish.draw();
    expect(fish._ctx.scale).toHaveBeenCalledWith(-1, 1);
  });
});

describe('LionFish spawn bounds', () => {
  test('randomSpawnY returns value in [WATER_SURFACE_Y, canvasHeight * 0.7 - fishHeight]', () => {
    const fishH = 124;
    const y = LionFish.randomSpawnY(CANVAS_H, fishH, Math.random);
    expect(y).toBeGreaterThanOrEqual(WATER_SURFACE_Y);
    expect(y).toBeLessThanOrEqual(CANVAS_H * 0.7 - fishH);
  });

  test('randomSpawnY is deterministic with a fixed rng', () => {
    const fishH = 124;
    const maxY = CANVAS_H * 0.7 - fishH;
    const expected = WATER_SURFACE_Y + 0.5 * (maxY - WATER_SURFACE_Y);
    expect(LionFish.randomSpawnY(CANVAS_H, fishH, () => 0.5)).toBeCloseTo(expected, 5);
  });

  test('randomSpawnX (inherited from CatchableFish) returns value in [0, canvasWidth - fishWidth]', () => {
    const x = LionFish.randomSpawnX(CANVAS_W, 124, () => 0.5);
    expect(x).toBeCloseTo(0.5 * (CANVAS_W - 124), 5);
  });
});
