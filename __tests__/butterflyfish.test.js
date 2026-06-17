'use strict';

const { Size, Point, CatchableFish, ButterflyFish } = require('../index.js');

const WATER_SURFACE_Y   = 300;
const FISH_FRAME_WIDTH  = 100;
const FISH_FRAME_HEIGHT = 82;
const FISH_MAX_FRAME_X  = 10;

function makeMocks() {
  const mockGame = {
    getSize: () => new Size(600, 800),
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
  };
  return { mockGame, mockCtx, mockImage: {} };
}

function makeButterflyFish(startX = 0) {
  const { mockGame, mockCtx, mockImage } = makeMocks();
  return new ButterflyFish(
    mockGame, mockCtx,
    new Size(FISH_FRAME_HEIGHT, FISH_FRAME_WIDTH),
    new Point(startX, 350),
    mockImage,
    FISH_MAX_FRAME_X
  );
}

function makeScaledButterflyFish() {
  const { mockGame, mockCtx } = makeMocks();
  mockCtx.drawImage = jest.fn();
  return new ButterflyFish(
    mockGame, mockCtx,
    new Size(FISH_FRAME_HEIGHT * 0.48, FISH_FRAME_WIDTH * 0.48),
    new Point(0, 350),
    {},
    FISH_MAX_FRAME_X,
    1,
    0,
    0,
    new Size(FISH_FRAME_HEIGHT, FISH_FRAME_WIDTH)
  );
}

describe('ButterflyFish animation cadence (smooth - ANIM_STAGGER_SLOW = 6 ticks)', () => {
  test('_frameX stays 0 for the first 5 updates', () => {
    const fish = makeButterflyFish();
    for (let i = 0; i < 5; i++) {
      fish.update();
      expect(fish._frameX).toBe(0);
    }
  });

  test('_frameX becomes 1 on the 6th update', () => {
    const fish = makeButterflyFish();
    for (let i = 0; i < 6; i++) fish.update();
    expect(fish._frameX).toBe(1);
  });
});

describe('ButterflyFish direction flip in draw()', () => {
  test('draw() calls ctx.scale(1, 1) when _direction is -1 (going left, sprite already faces left)', () => {
    const fish = makeButterflyFish();
    fish._direction = -1;
    fish.draw();
    expect(fish._ctx.scale).toHaveBeenCalledWith(1, 1);
  });

  test('draw() calls ctx.scale(-1, 1) when _direction is 1 (going right, sprite needs flip)', () => {
    const fish = makeButterflyFish();
    fish._direction = 1;
    fish.draw();
    expect(fish._ctx.scale).toHaveBeenCalledWith(-1, 1);
  });

  test('draw() preserves source frame dimensions when display size is scaled', () => {
    const fish = makeScaledButterflyFish();
    fish._direction = -1;

    fish.draw();

    const drawCall = fish._ctx.drawImage.mock.calls[0];
    expect(drawCall[3]).toBe(FISH_FRAME_WIDTH);
    expect(drawCall[4]).toBe(FISH_FRAME_HEIGHT);
    expect(drawCall[7]).toBeCloseTo(FISH_FRAME_WIDTH * 0.48, 5);
    expect(drawCall[8]).toBeCloseTo(FISH_FRAME_HEIGHT * 0.48, 5);
  });
});

describe('ButterflyFish randomSpawnY', () => {
  test('returns value within [WATER_SURFACE_Y, canvasHeight - fishHeight]', () => {
    const canvasH = 800;
    const fishH = FISH_FRAME_HEIGHT;
    const y = ButterflyFish.randomSpawnY(canvasH, fishH, Math.random);
    expect(y).toBeGreaterThanOrEqual(WATER_SURFACE_Y);
    expect(y).toBeLessThanOrEqual(canvasH - fishH);
  });

  test('randomSpawnY is deterministic with a fixed rng', () => {
    expect(ButterflyFish.randomSpawnY(800, 82, () => 0.5)).toBeCloseTo(300 + 0.5 * (800 - 82 - 300), 5);
  });

  test('randomSpawnX returns value in [0, canvasWidth - fishWidth]', () => {
    const x = ButterflyFish.randomSpawnX(800, 100, () => 0.5);
    expect(x).toBeCloseTo(0.5 * (800 - 100), 5);
  });
});

describe('ButterflyFish horizontal drift bootstrap', () => {
  test('fish at left half drifts right (direction=1) on first update', () => {
    const fish = makeButterflyFish(100); // x=100 < 800/2
    fish.update();
    expect(fish._direction).toBe(1);
    expect(fish._speedX).toBeGreaterThan(0);
  });

  test('fish at right half drifts left (direction=-1) on first update', () => {
    const fish = makeButterflyFish(500); // x=500 > 800/2
    fish.update();
    expect(fish._direction).toBe(-1);
    expect(fish._speedX).toBeLessThan(0);
  });
});

describe('ButterflyFish class hierarchy', () => {
  test('instanceof CatchableFish', () => {
    const fish = makeButterflyFish();
    expect(fish instanceof CatchableFish).toBe(true);
  });

  test('getFightSpec() returns non-null with strength and escapeRate', () => {
    const fish = makeButterflyFish();
    const spec = fish.getFightSpec();
    expect(spec).not.toBeNull();
    expect(spec.strength).toBeGreaterThan(0);
    expect(spec.escapeRate).toBeGreaterThan(0);
  });
});
