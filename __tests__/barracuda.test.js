'use strict';

const { Size, Point, CatchableFish, Barracuda } = require('../index.js');
const {
  ENEMY_TYPE_BARRACUDA,
  FISH_CLASS_BARRACUDA,
  FISH_DEFINITIONS,
  FISH_LANE_DEEP,
  FISH_SCORE_MAP,
} = require('../src/constants.js');

const BARRACUDA_FRAME_WIDTH  = 512;
const BARRACUDA_FRAME_HEIGHT = 128;
const WATER_SURFACE_Y        = 300;
const CANVAS_W = 800;
const CANVAS_H = 1200;

const barracudaDefinition = FISH_DEFINITIONS.find(def => def.id === ENEMY_TYPE_BARRACUDA);

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
  return new Barracuda(
    mockGame, mockCtx,
    new Size(90, 360),
    new Point(startX, 500),
    mockImage,
    4, 1, 0, 1,
    new Size(BARRACUDA_FRAME_HEIGHT, BARRACUDA_FRAME_WIDTH)
  );
}

describe('Barracuda class hierarchy', () => {
  test('instanceof CatchableFish', () => {
    expect(makeFish() instanceof CatchableFish).toBe(true);
  });

  test('getFightSpec() returns strength 55 and escapeRate 2', () => {
    const fish = makeFish();
    fish._strength   = 55;
    fish._escapeRate = 2;
    const spec = fish.getFightSpec();
    expect(spec).not.toBeNull();
    expect(spec.strength).toBe(55);
    expect(spec.escapeRate).toBe(2);
  });
});

describe('Barracuda species definition', () => {
  test('FISH_DEFINITIONS entry exists with correct identity', () => {
    expect(barracudaDefinition).toBeDefined();
    expect(barracudaDefinition.className).toBe(FISH_CLASS_BARRACUDA);
    expect(barracudaDefinition.id).toBe(ENEMY_TYPE_BARRACUDA);
  });

  test('score is -100 (negative trap fish)', () => {
    expect(barracudaDefinition.score).toBe(-100);
  });

  test('FISH_SCORE_MAP["Barracuda"] === -100', () => {
    expect(FISH_SCORE_MAP['Barracuda']).toBe(-100);
  });

  test('lanes restricted to DEEP only', () => {
    expect(barracudaDefinition.lanes).toEqual([FISH_LANE_DEEP]);
  });

  test('captureRotation is -15 (swordfish-like)', () => {
    expect(barracudaDefinition.captureRotation).toBe(-15);
  });

  test('strength 55, escapeRate 2', () => {
    expect(barracudaDefinition.strength).toBe(55);
    expect(barracudaDefinition.escapeRate).toBe(2);
  });
});

describe('Barracuda direction flip in draw() - right-facing sprite', () => {
  test('draw() calls ctx.scale(1, 1) when _direction is 1 (going right, no flip needed)', () => {
    const fish = makeFish(100);
    fish._direction = 1;
    fish.draw();
    expect(fish._ctx.scale).toHaveBeenCalledWith(1, 1);
  });

  test('draw() calls ctx.scale(-1, 1) when _direction is -1 (going left, flip needed)', () => {
    const fish = makeFish(100);
    fish._direction = -1;
    fish.draw();
    expect(fish._ctx.scale).toHaveBeenCalledWith(-1, 1);
  });
});

describe('Barracuda spawn bounds', () => {
  test('randomSpawnY returns value in [WATER_SURFACE_Y+100, canvasHeight - fishHeight]', () => {
    const fishH = 90;
    const y = Barracuda.randomSpawnY(CANVAS_H, fishH, Math.random);
    expect(y).toBeGreaterThanOrEqual(WATER_SURFACE_Y + 100);
    expect(y).toBeLessThanOrEqual(CANVAS_H - fishH);
  });

  test('randomSpawnY is deterministic with a fixed rng', () => {
    const fishH = 90;
    const minY = WATER_SURFACE_Y + 100;
    const maxY = CANVAS_H - fishH;
    const expected = minY + 0.5 * (maxY - minY);
    expect(Barracuda.randomSpawnY(CANVAS_H, fishH, () => 0.5)).toBeCloseTo(expected, 5);
  });
});

describe('Barracuda factory integration', () => {
  test('EnemyFactory creates a Barracuda instance', () => {
    const { EnemyFactory } = require('../src/EnemyFactory');
    const mockGame = {
      getSize: () => new Size(CANVAS_H, CANVAS_W),
      isDebug: () => false,
    };
    const mockCtx = {};
    const factory = new EnemyFactory();
    const fish = factory.createEnemy('barracuda', mockGame, mockCtx);
    expect(fish instanceof Barracuda).toBe(true);
    expect(fish._strength).toBe(55);
    expect(fish._escapeRate).toBe(2);
    expect(fish._captureRotation).toBe(-15);
  });
});
