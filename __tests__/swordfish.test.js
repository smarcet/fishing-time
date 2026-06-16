'use strict';

const { Size, Point, CatchableFish, SwordFish } = require('../index.js');

const SWORDFISH_FRAME_WIDTH  = 1033;
const SWORDFISH_FRAME_HEIGHT = 416;
const WATER_SURFACE_Y        = 300;
const CANVAS_W = 800;
const CANVAS_H = 1200;  // 1200 - 250 = 950 > WATER_SURFACE_Y + 100 = 400 ✓

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

function makeFish(startX = 0) {
  const { mockGame, mockCtx, mockImage } = makeMocks();
  return new SwordFish(
    mockGame, mockCtx,
    new Size(125 * 1.5, 310 * 1.5),
    new Point(startX, 400),
    mockImage,
    16, 1, 0, 1,
    new Size(SWORDFISH_FRAME_HEIGHT, SWORDFISH_FRAME_WIDTH)
  );
}

describe('SwordFish class hierarchy', () => {
  test('instanceof CatchableFish', () => {
    expect(makeFish() instanceof CatchableFish).toBe(true);
  });

  test('getFightSpec() returns { strength: 50, escapeRate: 2.0 }', () => {
    expect(makeFish().getFightSpec()).toEqual({ strength: 50, escapeRate: 2.0 });
  });
});

describe('SwordFish animation cadence (ANIM_STAGGER_SLOW = 6 ticks)', () => {
  test('_frameX stays 0 for the first 5 updates', () => {
    const fish = makeFish();
    for (let i = 0; i < 5; i++) {
      fish.update();
      expect(fish._frameX).toBe(0);
    }
  });

  test('_frameX becomes 1 on the 6th update', () => {
    const fish = makeFish();
    for (let i = 0; i < 6; i++) fish.update();
    expect(fish._frameX).toBe(1);
  });
});

describe('SwordFish direction flip in draw()', () => {
  test('draw() calls ctx.scale(1, 1) when _direction is -1 (going left, sprite faces left naturally)', () => {
    const fish = makeFish();
    // default status is not ENEMY_STATUS_CAPTURED, so draw() reaches the scale() call
    fish._direction = -1;
    fish.draw();
    expect(fish._ctx.scale).toHaveBeenCalledWith(1, 1);
  });

  test('draw() calls ctx.scale(-1, 1) when _direction is 1 (going right, flip needed)', () => {
    const fish = makeFish();
    fish._direction = 1;
    fish.draw();
    expect(fish._ctx.scale).toHaveBeenCalledWith(-1, 1);
  });
});

describe('SwordFish spawn bounds', () => {
  test('randomSpawnY returns value in [WATER_SURFACE_Y+100, canvasHeight - fishHeight]', () => {
    const fishH = 125 * 1.5;
    const y = SwordFish.randomSpawnY(CANVAS_H, fishH, Math.random);
    expect(y).toBeGreaterThanOrEqual(WATER_SURFACE_Y + 100);
    expect(y).toBeLessThanOrEqual(CANVAS_H - fishH);
  });

  test('randomSpawnY is deterministic with a fixed rng', () => {
    const fishH = 125 * 1.5;
    const minY = WATER_SURFACE_Y + 100;
    const maxY = CANVAS_H - fishH;
    const expected = minY + 0.5 * (maxY - minY);
    expect(SwordFish.randomSpawnY(CANVAS_H, fishH, () => 0.5)).toBeCloseTo(expected, 5);
  });

  test('randomSpawnX (inherited from CatchableFish) returns value in [0, canvasWidth - fishWidth]', () => {
    const fishW = 310 * 1.5;
    const x = SwordFish.randomSpawnX(CANVAS_W, fishW, () => 0.5);
    expect(x).toBeCloseTo(0.5 * (CANVAS_W - fishW), 5);
  });
});
