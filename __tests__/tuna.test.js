'use strict';

const { Size, Point, CatchableFish, Tuna } = require('../index.js');

const TUNA_FRAME_WIDTH  = 512;
const TUNA_FRAME_HEIGHT = 300;
const WATER_SURFACE_Y   = 300;
const CANVAS_W = 800;
const CANVAS_H = 1200;

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
  return new Tuna(
    mockGame, mockCtx,
    new Size(225, 384),
    new Point(startX, 400),
    mockImage,
    8, 1, 0, 1,
    new Size(TUNA_FRAME_HEIGHT, TUNA_FRAME_WIDTH)
  );
}

describe('Tuna class hierarchy', () => {
  test('instanceof CatchableFish', () => {
    expect(makeFish() instanceof CatchableFish).toBe(true);
  });

  test('getFightSpec() returns non-null with strength and escapeRate', () => {
    const spec = makeFish().getFightSpec();
    expect(spec).not.toBeNull();
    expect(spec).toHaveProperty('strength');
    expect(spec).toHaveProperty('escapeRate');
  });
});

describe('Tuna animation cadence (ANIM_STAGGER_SLOW = 6 ticks)', () => {
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

describe('Tuna direction flip in draw()', () => {
  test('draw() calls ctx.scale(1, 1) when _direction is -1 (going left, sprite faces left naturally)', () => {
    const fish = makeFish();
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

describe('Tuna spawn bounds', () => {
  test('randomSpawnY returns value in [WATER_SURFACE_Y+100, canvasHeight - fishHeight]', () => {
    const fishH = 225;
    const y = Tuna.randomSpawnY(CANVAS_H, fishH, Math.random);
    expect(y).toBeGreaterThanOrEqual(WATER_SURFACE_Y + 100);
    expect(y).toBeLessThanOrEqual(CANVAS_H - fishH);
  });

  test('randomSpawnY is deterministic with a fixed rng', () => {
    const fishH = 225;
    const minY = WATER_SURFACE_Y + 100;
    const maxY = CANVAS_H - fishH;
    const expected = minY + 0.5 * (maxY - minY);
    expect(Tuna.randomSpawnY(CANVAS_H, fishH, () => 0.5)).toBeCloseTo(expected, 5);
  });

  test('randomSpawnX (inherited from CatchableFish) returns value in [0, canvasWidth - fishWidth]', () => {
    const fishW = 384;
    const x = Tuna.randomSpawnX(CANVAS_W, fishW, () => 0.5);
    expect(x).toBeCloseTo(0.5 * (CANVAS_W - fishW), 5);
  });
});
