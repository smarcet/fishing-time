'use strict';

const { Size, Point, CatchableFish, Squid } = require('../index.js');
const {
  ENEMY_TYPE_SQUID,
  FISH_CLASS_SQUID,
  FISH_DEFINITIONS,
  FISH_LANE_DEEP,
  FISH_SCORE_MAP,
} = require('../src/constants.js');

const SQUID_FRAME_WIDTH  = 910;
const SQUID_FRAME_HEIGHT = 222;
const WATER_SURFACE_Y    = 300;
const CANVAS_W = 800;
const CANVAS_H = 1200;

const squidDefinition = FISH_DEFINITIONS.find(def => def.id === ENEMY_TYPE_SQUID);

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
  return new Squid(
    mockGame, mockCtx,
    new Size(58, 240),
    new Point(startX, 500),
    mockImage,
    3, 1, 0, 1,
    new Size(SQUID_FRAME_HEIGHT, SQUID_FRAME_WIDTH)
  );
}

describe('Squid class hierarchy', () => {
  test('instanceof CatchableFish', () => {
    expect(makeFish() instanceof CatchableFish).toBe(true);
  });

  test('getFightSpec() returns strength 2 and escapeRate 1.0', () => {
    const fish = makeFish();
    fish._strength   = 2;
    fish._escapeRate = 1.0;
    const spec = fish.getFightSpec();
    expect(spec).not.toBeNull();
    expect(spec.strength).toBe(2);
    expect(spec.escapeRate).toBe(1.0);
  });
});

describe('Squid species definition', () => {
  test('FISH_DEFINITIONS entry exists with correct identity', () => {
    expect(squidDefinition).toBeDefined();
    expect(squidDefinition.className).toBe(FISH_CLASS_SQUID);
    expect(squidDefinition.id).toBe(ENEMY_TYPE_SQUID);
  });

  test('score is 250', () => {
    expect(squidDefinition.score).toBe(250);
  });

  test('FISH_SCORE_MAP["Squid"] === 250', () => {
    expect(FISH_SCORE_MAP['Squid']).toBe(250);
  });

  test('lanes restricted to DEEP only', () => {
    expect(squidDefinition.lanes).toEqual([FISH_LANE_DEEP]);
  });

  test('captureRotation is -15 (elongated body, like SwordFish)', () => {
    expect(squidDefinition.captureRotation).toBe(-15);
  });

  test('strength 2 (near-zero), escapeRate 1.0', () => {
    expect(squidDefinition.strength).toBe(2);
    expect(squidDefinition.escapeRate).toBe(1.0);
  });
});

describe('Squid direction flip in draw() - left-facing sprite', () => {
  test('draw() calls ctx.scale(-1, 1) when _direction is 1 (going right, flips left-facing sprite)', () => {
    const fish = makeFish(100);
    fish._direction = 1;
    fish.draw();
    expect(fish._ctx.scale).toHaveBeenCalledWith(-1, 1);
  });

  test('draw() calls ctx.scale(1, 1) when _direction is -1 (going left, no flip needed)', () => {
    const fish = makeFish(100);
    fish._direction = -1;
    fish.draw();
    expect(fish._ctx.scale).toHaveBeenCalledWith(1, 1);
  });
});

describe('Squid movement', () => {
  test('update() advances x in positive direction when spawned on left side', () => {
    const fish = makeFish(100); // startX < CANVAS_W/2 -> direction=1, speedX>0
    const beforeX = fish._position.getX();
    fish.update();
    expect(fish._position.getX()).toBeGreaterThan(beforeX);
  });

  test('update() advances x in negative direction when spawned on right side', () => {
    const fish = makeFish(700); // startX > CANVAS_W/2 -> direction=-1, speedX<0
    const beforeX = fish._position.getX();
    fish.update();
    expect(fish._position.getX()).toBeLessThan(beforeX);
  });

  test('isOffScreen() returns true when fish is past the right edge', () => {
    const fish = makeFish(CANVAS_W + 10);
    expect(fish.isOffScreen()).toBe(true);
  });

  test('isOffScreen() returns false when fish is within canvas bounds', () => {
    const fish = makeFish(400);
    expect(fish.isOffScreen()).toBe(false);
  });
});

describe('Squid spawn bounds', () => {
  test('randomSpawnY returns value in [WATER_SURFACE_Y+100, canvasHeight - fishHeight]', () => {
    const fishH = 58;
    const y = Squid.randomSpawnY(CANVAS_H, fishH, Math.random);
    expect(y).toBeGreaterThanOrEqual(WATER_SURFACE_Y + 100);
    expect(y).toBeLessThanOrEqual(CANVAS_H - fishH);
  });

  test('randomSpawnY is deterministic with a fixed rng', () => {
    const fishH = 58;
    const minY = WATER_SURFACE_Y + 100;
    const maxY = CANVAS_H - fishH;
    const expected = minY + 0.5 * (maxY - minY);
    expect(Squid.randomSpawnY(CANVAS_H, fishH, () => 0.5)).toBeCloseTo(expected, 5);
  });
});

describe('Squid factory integration', () => {
  test('EnemyFactory creates a Squid instance with correct stats', () => {
    const { EnemyFactory } = require('../src/EnemyFactory');
    const mockGame = {
      getSize: () => new Size(CANVAS_H, CANVAS_W),
      isDebug: () => false,
    };
    const mockCtx = {};
    const factory = new EnemyFactory();
    const fish = factory.createEnemy('squid', mockGame, mockCtx);
    expect(fish instanceof Squid).toBe(true);
    expect(fish._strength).toBe(2);
    expect(fish._escapeRate).toBe(1.0);
    expect(fish._captureRotation).toBe(-15);
  });
});
