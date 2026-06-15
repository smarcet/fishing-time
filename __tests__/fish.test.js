'use strict';

const { Size, Point, EnemyWithAnimation, Fish } = require('../index.js');

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

function makeFish(startX = 0) {
  const { mockGame, mockCtx, mockImage } = makeMocks();
  return new Fish(
    mockGame, mockCtx,
    new Size(FISH_FRAME_HEIGHT, FISH_FRAME_WIDTH),
    new Point(startX, 350),
    mockImage,
    FISH_MAX_FRAME_X
  );
}

describe('Fish animation cadence (smooth - ANIM_STAGGER_SLOW = 6 ticks)', () => {
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

describe('Fish direction flip in draw()', () => {
  test('draw() calls ctx.scale(1, 1) when _direction is -1 (going left, sprite already faces left)', () => {
    const { mockGame, mockCtx, mockImage } = makeMocks();
    const fish = new Fish(
      mockGame, mockCtx,
      new Size(FISH_FRAME_HEIGHT, FISH_FRAME_WIDTH),
      new Point(0, 350), mockImage, FISH_MAX_FRAME_X
    );
    fish._direction = -1;
    fish.draw();
    expect(mockCtx.scale).toHaveBeenCalledWith(1, 1);
  });

  test('draw() calls ctx.scale(-1, 1) when _direction is 1 (going right, flip left-facing sprite)', () => {
    const { mockGame, mockCtx, mockImage } = makeMocks();
    const fish = new Fish(
      mockGame, mockCtx,
      new Size(FISH_FRAME_HEIGHT, FISH_FRAME_WIDTH),
      new Point(0, 350), mockImage, FISH_MAX_FRAME_X
    );
    fish._direction = 1;
    fish.draw();
    expect(mockCtx.scale).toHaveBeenCalledWith(-1, 1);
  });
});

describe('Fish.randomSpawnY - always in [WATER_SURFACE_Y, H - fishHeight]', () => {
  test('with rng()=0 returns exactly WATER_SURFACE_Y', () => {
    expect(Fish.randomSpawnY(800, FISH_FRAME_HEIGHT, () => 0)).toBe(WATER_SURFACE_Y);
  });

  test('with rng()≈1 returns at most H - fishHeight', () => {
    const y = Fish.randomSpawnY(800, FISH_FRAME_HEIGHT, () => 0.9999);
    expect(y).toBeLessThanOrEqual(800 - FISH_FRAME_HEIGHT);
  });

  test('natural Math.random always returns >= WATER_SURFACE_Y', () => {
    for (let i = 0; i < 30; i++) {
      expect(Fish.randomSpawnY(800, FISH_FRAME_HEIGHT)).toBeGreaterThanOrEqual(WATER_SURFACE_Y);
    }
  });
});

describe('Fish.randomSpawnX - spread across canvas width', () => {
  test('with rng()=0 returns 0', () => {
    expect(Fish.randomSpawnX(800, FISH_FRAME_WIDTH, () => 0)).toBe(0);
  });

  test('with rng()~1 returns at most canvasWidth - fishWidth', () => {
    expect(Fish.randomSpawnX(800, FISH_FRAME_WIDTH, () => 0.9999))
      .toBeLessThanOrEqual(800 - FISH_FRAME_WIDTH);
  });
});

describe('Fish.update() initial direction bootstrap', () => {
  test('fish in left half gets direction=1 and positive speedX on first update', () => {
    const { mockGame, mockCtx, mockImage } = makeMocks();
    const fish = new Fish(mockGame, mockCtx,
      new Size(FISH_FRAME_HEIGHT, FISH_FRAME_WIDTH),
      new Point(100, 400), mockImage, FISH_MAX_FRAME_X);
    expect(fish._direction).toBeNull();
    fish.update();
    expect(fish._direction).toBe(1);
    expect(fish._speedX).toBeGreaterThan(0);
  });

  test('fish in right half gets direction=-1 and negative speedX on first update', () => {
    const { mockGame, mockCtx, mockImage } = makeMocks();
    const fish = new Fish(mockGame, mockCtx,
      new Size(FISH_FRAME_HEIGHT, FISH_FRAME_WIDTH),
      new Point(500, 400), mockImage, FISH_MAX_FRAME_X);
    fish.update();
    expect(fish._direction).toBe(-1);
    expect(fish._speedX).toBeLessThan(0);
  });
});

describe('Fish inheritance', () => {
  test('Fish is an instance of EnemyWithAnimation', () => {
    expect(makeFish()).toBeInstanceOf(EnemyWithAnimation);
  });
});
