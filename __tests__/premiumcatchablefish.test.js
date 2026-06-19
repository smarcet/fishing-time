'use strict';

const { Size, Point, PremiumCatchableFish } = require('../index.js');
const {
  PREMIUM_GLINT_ALPHA_MIN,
  PREMIUM_GLINT_ALPHA_MAX,
  PREMIUM_SPARKLE_COLOR,
  PREMIUM_SPARKLE_PERIOD,
  PREMIUM_SPARKLE_ANCHORS,
  PREMIUM_SPARKLE_DUTY,
  ENEMY_STATUS_CAPTURED,
} = require('../src/constants');

function makeMocks(debugMode = false) {
  const shadowBlurHistory = [];
  const globalAlphaHistory = [];
  const fillStyleHistory = [];
  const gradientHistory = [];
  const operations = [];
  let saveCount = 0;
  let restoreCount = 0;

  const mockCtx = {
    drawImage: jest.fn(() => { operations.push('drawImage'); }),
    translate: jest.fn(() => { operations.push('translate'); }),
    scale: jest.fn(() => { operations.push('scale'); }),
    save: jest.fn(() => { saveCount++; operations.push('save'); }),
    restore: jest.fn(() => { restoreCount++; operations.push('restore'); }),
    beginPath: jest.fn(() => { operations.push('beginPath'); }),
    moveTo: jest.fn(() => { operations.push('moveTo'); }),
    lineTo: jest.fn(() => { operations.push('lineTo'); }),
    closePath: jest.fn(() => { operations.push('closePath'); }),
    arc: jest.fn(() => { operations.push('arc'); }),
    fill: jest.fn(() => { operations.push('fill'); }),
    stroke: () => {},
    fillRect: jest.fn(() => { operations.push('fillRect'); }),
    fillText: () => {},
    rotate: () => {},
    setLineDash: () => {},
    strokeRect: jest.fn(() => { operations.push('strokeRect'); }),
    createRadialGradient: jest.fn((...args) => {
      gradientHistory.push(args);
      operations.push('createRadialGradient');
      return { addColorStop() {} };
    }),
    set shadowColor(v) { this._shadowColor = v; operations.push(`shadowColor:${v}`); },
    get shadowColor() { return this._shadowColor; },
    set shadowBlur(v) { this._shadowBlur = v; shadowBlurHistory.push(v); operations.push('shadowBlur'); },
    get shadowBlur() { return this._shadowBlur; },
    set globalAlpha(v) { this._globalAlpha = v; globalAlphaHistory.push(v); operations.push('globalAlpha'); },
    get globalAlpha() { return this._globalAlpha; },
    set fillStyle(v) { this._fillStyle = v; fillStyleHistory.push(v); operations.push(`fillStyle:${v}`); },
    get fillStyle() { return this._fillStyle; },
    set strokeStyle(v) { this._strokeStyle = v; },
    get strokeStyle() { return this._strokeStyle; },
    set lineWidth(v) { this._lineWidth = v; },
    get lineWidth() { return this._lineWidth; },
    get saveCount() { return saveCount; },
    get restoreCount() { return restoreCount; },
    shadowBlurHistory,
    globalAlphaHistory,
    fillStyleHistory,
    gradientHistory,
    operations,
  };

  const mockGame = {
    getSize: () => new Size(600, 800),
    isDebug: () => debugMode,
    hasKey: () => false,
  };

  return { mockCtx, mockGame, mockImage: {} };
}

class StubPremiumFish extends PremiumCatchableFish {
  constructor(game, ctx, size, position, image) {
    super(game, ctx, size, position, image, 4, 1, 0, 0);
    this._sw = 100;
    this._sh = 50;
  }

  _drawTrafficSprite(dx, dy, w, h, sw, sh, flipX) {
    this._ctx.translate(dx + w / 2, dy + h / 2);
    this._ctx.scale(flipX, 1);
    this._ctx.drawImage(this._image, 0, 0, sw, sh, -w / 2, -h / 2, w, h);
  }

  _drawCapturedSprite(dx, dy, w, h) {
    this._ctx.drawImage(this._image, 0, 0, w, h, dx, dy, w, h);
  }

  drawCaptured() {
    // No-op in tests -- avoids needing a full hook mock
  }
}

function makeStub(debugMode = false) {
  const { mockCtx, mockGame, mockImage } = makeMocks(debugMode);
  const fish = new StubPremiumFish(
    mockGame, mockCtx,
    new Size(80, 120),
    new Point(100, 200),
    mockImage,
  );
  fish._direction = 1;
  return { fish, mockCtx };
}

function hasSubsequence(ops, pattern) {
  let pi = 0;
  for (const op of ops) {
    if (op === pattern[pi]) pi++;
    if (pi === pattern.length) return true;
  }
  return false;
}

describe('PremiumCatchableFish traffic draw()', () => {
  test('sprite drawn exactly once (no duplicate copies)', () => {
    const { fish, mockCtx } = makeStub();
    fish.draw();
    expect(mockCtx.drawImage).toHaveBeenCalledTimes(1);
  });

  test('no shadowBlur set -- blur halo is gone', () => {
    const { fish, mockCtx } = makeStub();
    fish.draw();
    expect(mockCtx.shadowBlurHistory).toHaveLength(0);
  });

  test('createRadialGradient called once for glint', () => {
    const { fish, mockCtx } = makeStub();
    fish.draw();
    expect(mockCtx.createRadialGradient).toHaveBeenCalledTimes(1);
  });

  test('glint radius is tight: > 0 and < max(w,h)', () => {
    const { fish, mockCtx } = makeStub();
    fish.draw();
    // createRadialGradient(cx, cy, 0, cx, cy, radius) -- radius is 6th arg (index 5)
    const args = mockCtx.gradientHistory[0];
    const radius = args[5];
    expect(radius).toBeGreaterThan(0);
    expect(radius).toBeLessThan(Math.max(80, 120)); // max(w,h) for 80x120 fish
  });

  test('correct render order: glint fill before sprite, sprite inside its own save/restore', () => {
    const { fish, mockCtx } = makeStub();
    fish.draw();
    // Sub-sequence: glint fill -> glint restore -> sprite save -> translate -> scale -> drawImage -> sprite restore
    expect(hasSubsequence(
      mockCtx.operations,
      ['fill', 'restore', 'save', 'translate', 'scale', 'drawImage', 'restore'],
    )).toBe(true);
  });

  test('glint globalAlpha is within [ALPHA_MIN, ALPHA_MAX] and visibly bright', () => {
    const { fish, mockCtx } = makeStub();
    fish.draw();
    const glintAlpha = mockCtx.globalAlphaHistory[0];
    expect(glintAlpha).toBeGreaterThanOrEqual(PREMIUM_GLINT_ALPHA_MIN);
    expect(glintAlpha).toBeLessThanOrEqual(PREMIUM_GLINT_ALPHA_MAX);
    expect(glintAlpha).toBeGreaterThan(0.1); // concrete visibility floor
  });

  test('sparkle overlap: at least 2 sparkles visible simultaneously across a period', () => {
    // 5 anchors with phase spacing 19 and active window ceil(96*0.40)=39 -> ~2-3 overlap
    const { fish, mockCtx } = makeStub();
    const sparkleKey = `fillStyle:${PREMIUM_SPARKLE_COLOR}`;
    const counts = [];
    for (let frame = 0; frame < PREMIUM_SPARKLE_PERIOD; frame++) {
      mockCtx.operations.length = 0;
      fish.draw();
      counts.push(mockCtx.operations.filter(op => op === sparkleKey).length);
      fish.update();
    }
    expect(Math.max(...counts)).toBeGreaterThanOrEqual(2);
  });

  test('sparkles twinkle: fillStyle sparkle color drawn at least once across one period', () => {
    const { fish, mockCtx } = makeStub();
    const sparkleKey = `fillStyle:${PREMIUM_SPARKLE_COLOR}`;
    const counts = [];
    for (let frame = 0; frame < PREMIUM_SPARKLE_PERIOD; frame++) {
      mockCtx.operations.length = 0;
      fish.draw();
      counts.push(mockCtx.operations.filter(op => op === sparkleKey).length);
      fish.update();
    }
    expect(Math.max(...counts)).toBeGreaterThan(0);
  });

  test('ctx.save() and ctx.restore() are balanced', () => {
    const { fish, mockCtx } = makeStub();
    fish.draw();
    expect(mockCtx.saveCount).toBeGreaterThan(0);
    expect(mockCtx.saveCount).toBe(mockCtx.restoreCount);
  });

  test('direction flip: direction=-1 causes ctx.scale(-1, 1)', () => {
    const { fish, mockCtx } = makeStub();
    fish._direction = -1;
    fish.draw();
    expect(mockCtx.scale.mock.calls.some(([x]) => x === -1)).toBe(true);
  });

  test('direction flip: direction=1 causes ctx.scale(1, 1)', () => {
    const { fish, mockCtx } = makeStub();
    fish._direction = 1;
    fish.draw();
    expect(mockCtx.scale.mock.calls.some(([x]) => x === 1)).toBe(true);
  });

  test('glint pulse advances: two draws separated by updates yield different globalAlpha', () => {
    const { fish, mockCtx } = makeStub();
    fish.draw();
    const firstAlpha = mockCtx.globalAlphaHistory[0];

    for (let i = 0; i < 30; i++) fish.update();
    mockCtx.globalAlphaHistory.length = 0;
    fish.draw();
    const secondAlpha = mockCtx.globalAlphaHistory[0];

    expect(firstAlpha).not.toBeCloseTo(secondAlpha, 5);
  });

  test('debug path does not throw when isDebug() is true', () => {
    const { fish } = makeStub(true);
    expect(() => fish.draw()).not.toThrow();
  });
});

describe('PremiumCatchableFish captured state', () => {
  test('captured status bypasses glint (createRadialGradient not called)', () => {
    const { fish, mockCtx } = makeStub();
    fish._status = ENEMY_STATUS_CAPTURED;
    fish.draw();
    expect(mockCtx.createRadialGradient).not.toHaveBeenCalled();
  });

  test('captured status routes to drawCaptured() (no drawImage calls)', () => {
    const { fish, mockCtx } = makeStub();
    fish._status = ENEMY_STATUS_CAPTURED;
    fish.draw();
    expect(mockCtx.drawImage).not.toHaveBeenCalled();
  });
});
