'use strict';

const { Size, Point, CatchableFish, JellyFish, SCORE_MAP } = require('../index.js');

const JELLY_FISH_FRAME_WIDTH  = 221;
const JELLY_FISH_FRAME_HEIGHT = 294;
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

function makeJellyFish(startX = 0) {
  const { mockGame, mockCtx, mockImage } = makeMocks();
  return new JellyFish(
    mockGame, mockCtx,
    new Size(106, 80),
    new Point(startX, 400),
    mockImage,
    10, 1, 0, 1,
    new Size(JELLY_FISH_FRAME_HEIGHT, JELLY_FISH_FRAME_WIDTH)
  );
}

describe('JellyFish class hierarchy', () => {
  test('instanceof CatchableFish', () => {
    const fish = makeJellyFish();
    expect(fish instanceof CatchableFish).toBe(true);
  });

  test('getFightSpec() returns { strength: 5, escapeRate: 1.0 }', () => {
    const fish = makeJellyFish();
    expect(fish.getFightSpec()).toEqual({ strength: 5, escapeRate: 1.0 });
  });
});

describe('JellyFish animation cadence (ANIM_STAGGER_SLOW = 6 ticks)', () => {
  test('_frameX stays 0 for the first 5 updates', () => {
    const fish = makeJellyFish();
    for (let i = 0; i < 5; i++) {
      fish.update();
      expect(fish._frameX).toBe(0);
    }
  });

  test('_frameX becomes 1 on the 6th update', () => {
    const fish = makeJellyFish();
    for (let i = 0; i < 6; i++) fish.update();
    expect(fish._frameX).toBe(1);
  });
});

describe('JellyFish direction flip in draw()', () => {
  test('draw() calls ctx.scale(-1, 1) when _direction is 1 (going right, sprite faces left)', () => {
    const fish = makeJellyFish();
    fish._direction = 1;
    fish.draw();
    expect(fish._ctx.scale).toHaveBeenCalledWith(-1, 1);
  });

  test('draw() calls ctx.scale(1, 1) when _direction is -1 (going left)', () => {
    const fish = makeJellyFish();
    fish._direction = -1;
    fish.draw();
    expect(fish._ctx.scale).toHaveBeenCalledWith(1, 1);
  });
});

describe('JellyFish spawn bounds', () => {
  test('randomSpawnY returns value in [WATER_SURFACE_Y, canvasHeight*0.8 - fishHeight]', () => {
    const fishHeight = 106;
    const minY = WATER_SURFACE_Y;
    const maxY = CANVAS_H * 0.8 - fishHeight;
    for (let i = 0; i < 50; i++) {
      const y = JellyFish.randomSpawnY(CANVAS_H, fishHeight);
      expect(y).toBeGreaterThanOrEqual(minY);
      expect(y).toBeLessThanOrEqual(maxY);
    }
  });

  test('randomSpawnX (inherited) returns value in [0, canvasWidth - fishWidth]', () => {
    const fishWidth = 80;
    for (let i = 0; i < 50; i++) {
      const x = JellyFish.randomSpawnX(CANVAS_W, fishWidth);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(CANVAS_W - fishWidth);
    }
  });
});

describe('JellyFish score map', () => {
  test('SCORE_MAP.JellyFish === -25', () => {
    expect(SCORE_MAP.JellyFish).toBe(-25);
  });
});
