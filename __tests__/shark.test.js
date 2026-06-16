'use strict';

const { Size, Point, CatchableFish, Shark } = require('../index.js');

const SHARK_FRAME_WIDTH  = 1060;
const SHARK_FRAME_HEIGHT = 512;
const WATER_SURFACE_Y    = 300;
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

function makeShark(startX = 0) {
  const { mockGame, mockCtx, mockImage } = makeMocks();
  return new Shark(
    mockGame, mockCtx,
    new Size(256, 530),
    new Point(startX, 400),
    mockImage,
    10, 1, 0, 1,
    new Size(SHARK_FRAME_HEIGHT, SHARK_FRAME_WIDTH)
  );
}

describe('Shark class hierarchy', () => {
  test('instanceof CatchableFish', () => {
    expect(makeShark() instanceof CatchableFish).toBe(true);
  });

  test('getFightSpec() returns { strength: 60, escapeRate: 2.0 }', () => {
    expect(makeShark().getFightSpec()).toEqual({ strength: 60, escapeRate: 2.0 });
  });
});

describe('Shark size sanity', () => {
  test('getWidth() returns 530', () => {
    expect(makeShark().getSize().getWidth()).toBe(530);
  });

  test('getHeight() returns 256', () => {
    expect(makeShark().getSize().getHeight()).toBe(256);
  });
});

describe('Shark animation cadence (ANIM_STAGGER_SLOW = 6 ticks)', () => {
  test('_frameX stays 0 for the first 5 updates', () => {
    const fish = makeShark();
    for (let i = 0; i < 5; i++) {
      fish.update();
      expect(fish._frameX).toBe(0);
    }
  });

  test('_frameX becomes 1 on the 6th update', () => {
    const fish = makeShark();
    for (let i = 0; i < 6; i++) fish.update();
    expect(fish._frameX).toBe(1);
  });
});

describe('Shark direction flip in draw()', () => {
  test('draw() calls ctx.scale(1, 1) when _direction is -1 (going left, sprite faces left naturally)', () => {
    const fish = makeShark();
    fish._direction = -1;
    fish.draw();
    expect(fish._ctx.scale).toHaveBeenCalledWith(1, 1);
  });

  test('draw() calls ctx.scale(-1, 1) when _direction is 1 (going right, flip needed)', () => {
    const fish = makeShark();
    fish._direction = 1;
    fish.draw();
    expect(fish._ctx.scale).toHaveBeenCalledWith(-1, 1);
  });
});

describe('Shark spawn bounds', () => {
  test('randomSpawnY returns value in [WATER_SURFACE_Y+200, canvasHeight - fishHeight]', () => {
    const fishH = 256;
    const y = Shark.randomSpawnY(CANVAS_H, fishH, Math.random);
    expect(y).toBeGreaterThanOrEqual(WATER_SURFACE_Y + 200);
    expect(y).toBeLessThanOrEqual(CANVAS_H - fishH);
  });

  test('randomSpawnY is deterministic with a fixed rng', () => {
    const fishH = 256;
    const minY = WATER_SURFACE_Y + 200;
    const maxY = CANVAS_H - fishH;
    const expected = minY + 0.5 * (maxY - minY);
    expect(Shark.randomSpawnY(CANVAS_H, fishH, () => 0.5)).toBeCloseTo(expected, 5);
  });

  test('randomSpawnX (inherited from CatchableFish) returns value in [0, canvasWidth - fishWidth]', () => {
    const x = Shark.randomSpawnX(CANVAS_W, 530, () => 0.5);
    expect(x).toBeCloseTo(0.5 * (CANVAS_W - 530), 5);
  });
});
