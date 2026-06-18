'use strict';

const { Size, Point, CatchableFish, PufferFish } = require('../index.js');

const PUFFER_FISH_FRAME_WIDTH  = 358;
const PUFFER_FISH_FRAME_HEIGHT = 305;
const PUFFER_FISH_MAX_FRAME_X  = 10;
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

function makePufferFish(startX = 0) {
  const { mockGame, mockCtx, mockImage } = makeMocks();
  return new PufferFish(
    mockGame, mockCtx,
    new Size(152, 179),
    new Point(startX, 400),
    mockImage,
    PUFFER_FISH_MAX_FRAME_X, 1, 0, 1,
    new Size(PUFFER_FISH_FRAME_HEIGHT, PUFFER_FISH_FRAME_WIDTH)
  );
}

describe('PufferFish class hierarchy', () => {
  test('instanceof CatchableFish', () => {
    const fish = makePufferFish();
    expect(fish instanceof CatchableFish).toBe(true);
  });

  test('getFightSpec() returns non-null with strength and escapeRate', () => {
    const fish = makePufferFish();
    const spec = fish.getFightSpec();
    expect(spec).not.toBeNull();
    expect(spec).toHaveProperty('strength');
    expect(spec).toHaveProperty('escapeRate');
  });
});

describe('PufferFish animation cadence (ANIM_STAGGER_SLOW = 6 ticks)', () => {
  test('_frameX stays 0 for the first 5 updates', () => {
    const fish = makePufferFish();
    for (let i = 0; i < 5; i++) {
      fish.update();
      expect(fish._frameX).toBe(0);
    }
  });

  test('_frameX becomes 1 on the 6th update', () => {
    const fish = makePufferFish();
    for (let i = 0; i < 6; i++) fish.update();
    expect(fish._frameX).toBe(1);
  });
});

describe('PufferFish direction flip in draw()', () => {
  test('draw() calls ctx.scale(1, 1) when _direction is -1 (going left)', () => {
    const fish = makePufferFish();
    fish._direction = -1;
    fish.draw();
    expect(fish._ctx.scale).toHaveBeenCalledWith(1, 1);
  });

  test('draw() calls ctx.scale(-1, 1) when _direction is 1 (going right)', () => {
    const fish = makePufferFish();
    fish._direction = 1;
    fish.draw();
    expect(fish._ctx.scale).toHaveBeenCalledWith(-1, 1);
  });
});

describe('PufferFish spawn bounds', () => {
  test('randomSpawnY returns value in [WATER_SURFACE_Y, canvasHeight - fishHeight]', () => {
    const fishH = 152;
    const y = PufferFish.randomSpawnY(CANVAS_H, fishH, Math.random);
    expect(y).toBeGreaterThanOrEqual(WATER_SURFACE_Y);
    expect(y).toBeLessThanOrEqual(CANVAS_H - fishH);
  });

  test('randomSpawnY is deterministic with a fixed rng', () => {
    const fishH = 152;
    const maxY = CANVAS_H - fishH;
    const expected = WATER_SURFACE_Y + 0.5 * (maxY - WATER_SURFACE_Y);
    expect(PufferFish.randomSpawnY(CANVAS_H, fishH, () => 0.5)).toBeCloseTo(expected, 5);
  });

  test('randomSpawnX (inherited from Enemy) returns value in [0, canvasWidth - fishWidth]', () => {
    const x = PufferFish.randomSpawnX(CANVAS_W, 179, () => 0.5);
    expect(x).toBeCloseTo(0.5 * (CANVAS_W - 179), 5);
  });
});
