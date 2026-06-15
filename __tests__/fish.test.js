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

const CAPTURE_BLINK_INTERVAL  = 6;
const CAPTURE_THROW_THRESHOLD = 0.78;

function makeMockHookAt(phase, raw) {
  return {
    getEndpoint: () => new Point(100, 100),
    getLandingTarget: () => new Point(300, 0),
    getCaptureRawProgress: () => raw,
  };
}

function makeFishWithCapture(captureTick, phase = 'RISING', raw = 0) {
  const { mockGame, mockCtx, mockImage } = makeMocks();
  let lastAlpha = 1;
  let lastScale = null;
  Object.defineProperty(mockCtx, 'globalAlpha', {
    get: () => lastAlpha,
    set: (v) => { lastAlpha = v; },
    configurable: true,
  });
  mockCtx.scale = jest.fn((sx) => { lastScale = sx; });
  const fish = new Fish(mockGame, mockCtx,
    new Size(FISH_FRAME_HEIGHT, FISH_FRAME_WIDTH),
    new Point(0, 350), mockImage, FISH_MAX_FRAME_X);
  fish._direction = 1;
  fish.captured(makeMockHookAt(phase, raw));
  fish._captureTick = captureTick;
  return { fish, mockCtx, getLastAlpha: () => lastAlpha, getLastScale: () => lastScale };
}

describe('EnemyWithAnimation drawCaptured() blink and throw arc', () => {
  test('globalAlpha is 1.0 when _captureTick=0 (blink ON)', () => {
    const { fish, getLastAlpha } = makeFishWithCapture(0);
    fish.drawCaptured();
    expect(getLastAlpha()).toBeCloseTo(1.0, 5);
  });

  test('globalAlpha is 0.2 when _captureTick=CAPTURE_BLINK_INTERVAL (blink OFF)', () => {
    const { fish, getLastAlpha } = makeFishWithCapture(CAPTURE_BLINK_INTERVAL);
    fish.drawCaptured();
    expect(getLastAlpha()).toBeCloseTo(0.2, 5);
  });

  test('globalAlpha returns to 1.0 when _captureTick=CAPTURE_BLINK_INTERVAL*2 (blink ON again)', () => {
    const { fish, getLastAlpha } = makeFishWithCapture(CAPTURE_BLINK_INTERVAL * 2);
    fish.drawCaptured();
    expect(getLastAlpha()).toBeCloseTo(1.0, 5);
  });

  test('ctx.scale receives value < 1 during THROWING phase', () => {
    const raw = CAPTURE_THROW_THRESHOLD + 0.1;
    const { fish, getLastScale } = makeFishWithCapture(0, 'THROWING', raw);
    fish.drawCaptured();
    expect(getLastScale()).toBeLessThan(1.0);
  });
});

describe('Fish.draw() routes to drawCaptured() when captured (Task 4 integration)', () => {
  test('fish.draw() sets globalAlpha (routes through drawCaptured) when CAPTURED', () => {
    const { fish, getLastAlpha } = makeFishWithCapture(CAPTURE_BLINK_INTERVAL);
    // Before Task 4: Fish.draw() has its own CAPTURED block that doesn't change globalAlpha
    // After Task 4: Fish.draw() calls this.drawCaptured() which sets globalAlpha=0.2
    fish.draw();
    expect(getLastAlpha()).toBeCloseTo(0.2, 5);
  });
});

describe('Enemy captured() and updateCaptured()', () => {
  function makeMockHook() {
    return { getPosition: () => new Point(100, 50), getCaptureRawProgress: () => 0, _player: { getPosition: () => new Point(200, 0) } };
  }

  test('_captureTick is 0 immediately after captured()', () => {
    const fish = makeFish();
    fish.captured(makeMockHook());
    expect(fish._captureTick).toBe(0);
  });

  test('_captureTick increments on each updateCaptured() call', () => {
    const fish = makeFish();
    fish.captured(makeMockHook());
    for (let i = 0; i < 6; i++) fish.updateCaptured();
    expect(fish._captureTick).toBe(6);
  });

  test('_frameX advances after staggerFrame updateCaptured() calls', () => {
    const fish = makeFish();
    fish.captured(makeMockHook());
    const initialFrame = fish._frameX;
    // Fish uses ANIM_STAGGER_SLOW=6 staggerFrame; advance 6 ticks to get one frame step
    for (let i = 0; i < 6; i++) fish.updateCaptured();
    expect(fish._frameX).toBe(initialFrame + 1);
  });
});
