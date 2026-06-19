'use strict';

const { Size, Point, EnemyWithAnimation, PremiumCatchableFish, Crab } = require('../index.js');
const {
  FISH_TRAFFIC_DIRECTION_RIGHT,
} = require('../src/constants');

const CRAB_FRAME_WIDTH   = 408;
const CRAB_FRAME_HEIGHT  = 197;
const CRAB_MAX_FRAME_X   = 10;
const CRAB_MAX_FRAME_Y   = 1;
const CRAB_DIE_FRAME_Y   = 1;
const CRAB_DRIFT_SPEED   = 4.0;

function makeMocks() {
  const mockGame = {
    getSize: () => new Size(600, 800),
    isDebug: () => false,
    hasKey: () => false,
  };
  const shadowBlurHistory = [];
  const globalAlphaHistory = [];
  const operations = [];
  const mockCtx = {
    drawImage: jest.fn(() => { operations.push('drawImage'); }),
    strokeRect: jest.fn(() => { operations.push('strokeRect'); }),
    beginPath: jest.fn(() => { operations.push('beginPath'); }),
    arc: jest.fn(() => { operations.push('arc'); }),
    moveTo: jest.fn(() => { operations.push('moveTo'); }),
    lineTo: jest.fn(() => { operations.push('lineTo'); }),
    closePath: jest.fn(() => { operations.push('closePath'); }),
    fill: jest.fn(() => { operations.push('fill'); }),
    stroke: () => {},
    fillRect: () => {},
    fillText: () => {},
    save: jest.fn(() => { operations.push('save'); }),
    restore: jest.fn(() => { operations.push('restore'); }),
    translate: jest.fn(() => { operations.push('translate'); }),
    rotate: () => {},
    scale: jest.fn(() => { operations.push('scale'); }),
    setLineDash: () => {},
    createRadialGradient: jest.fn(() => { operations.push('createRadialGradient'); return { addColorStop() {} }; }),
    set fillStyle(v) { this._fillStyle = v; operations.push('fillStyle'); },
    get fillStyle() { return this._fillStyle; },
    set strokeStyle(v) { this._strokeStyle = v; operations.push(`strokeStyle:${v}`); },
    get strokeStyle() { return this._strokeStyle; },
    set lineWidth(v) { this._lineWidth = v; operations.push(`lineWidth:${v}`); },
    get lineWidth() { return this._lineWidth; },
    set shadowColor(v) { this._shadowColor = v; operations.push(`shadowColor:${v}`); },
    get shadowColor() { return this._shadowColor; },
    set shadowBlur(v) { this._shadowBlur = v; shadowBlurHistory.push(v); operations.push('shadowBlur'); },
    get shadowBlur() { return this._shadowBlur; },
    set globalAlpha(v) { this._globalAlpha = v; globalAlphaHistory.push(v); operations.push('globalAlpha'); },
    get globalAlpha() { return this._globalAlpha; },
    shadowBlurHistory,
    globalAlphaHistory,
    operations,
  };
  return { mockGame, mockCtx, mockImage: {} };
}

function makeCrab(startX = 0, startY = 510) {
  const { mockGame, mockCtx, mockImage } = makeMocks();
  return new Crab(
    mockGame, mockCtx,
    new Size(98, 204),
    new Point(startX, startY),
    mockImage,
    CRAB_MAX_FRAME_X, CRAB_MAX_FRAME_Y,
    0, CRAB_DIE_FRAME_Y,
    new Size(CRAB_FRAME_HEIGHT, CRAB_FRAME_WIDTH)
  );
}

describe('Crab inheritance', () => {
  test('Crab is an instance of EnemyWithAnimation', () => {
    const crab = makeCrab();
    expect(crab).toBeInstanceOf(EnemyWithAnimation);
  });

  test('Crab is an instance of PremiumCatchableFish', () => {
    const crab = makeCrab();
    expect(crab).toBeInstanceOf(PremiumCatchableFish);
  });
});

describe('Crab traffic movement assignment', () => {
  test('constructor leaves direction unset until FishSpawner assigns traffic state', () => {
    const crab = makeCrab(0);
    expect(crab._direction).toBeNull();
    expect(crab._speedX).toBe(0);
  });

  test('moves at CRAB_DRIFT_SPEED after traffic state is assigned', () => {
    const crab = makeCrab(0);
    crab._direction = FISH_TRAFFIC_DIRECTION_RIGHT;
    crab._speedX = CRAB_DRIFT_SPEED;
    crab.update();
    expect(crab._direction).toBe(FISH_TRAFFIC_DIRECTION_RIGHT);
    expect(crab._speedX).toBe(CRAB_DRIFT_SPEED);
    expect(crab.getPosition().getX()).toBe(CRAB_DRIFT_SPEED);
  });
});

describe('Crab draw() direction flip', () => {
  test('draw() calls ctx.scale(1, 1) when direction is 1 (going right, sprite faces right)', () => {
    const { mockGame, mockCtx, mockImage } = makeMocks();
    const crab = new Crab(
      mockGame, mockCtx,
      new Size(98, 204), new Point(100, 510),
      mockImage,
      CRAB_MAX_FRAME_X, CRAB_MAX_FRAME_Y, 0, CRAB_DIE_FRAME_Y,
      new Size(CRAB_FRAME_HEIGHT, CRAB_FRAME_WIDTH)
    );
    crab._direction = 1;
    crab.draw();
    expect(mockCtx.scale).toHaveBeenCalledWith(1, 1);
  });

  test('draw() calls ctx.scale(-1, 1) when direction is -1 (going left, flip right-facing sprite)', () => {
    const { mockGame, mockCtx, mockImage } = makeMocks();
    const crab = new Crab(
      mockGame, mockCtx,
      new Size(98, 204), new Point(100, 510),
      mockImage,
      CRAB_MAX_FRAME_X, CRAB_MAX_FRAME_Y, 0, CRAB_DIE_FRAME_Y,
      new Size(CRAB_FRAME_HEIGHT, CRAB_FRAME_WIDTH)
    );
    crab._direction = -1;
    crab.draw();
    expect(mockCtx.scale).toHaveBeenCalledWith(-1, 1);
  });

  test('draw() renders rim glint + sparkles (1 drawImage; glint before sprite; sprite in own save/restore)', () => {
    const { mockGame, mockCtx, mockImage } = makeMocks();
    const crab = new Crab(
      mockGame, mockCtx,
      new Size(98, 204), new Point(100, 510),
      mockImage,
      CRAB_MAX_FRAME_X, CRAB_MAX_FRAME_Y, 0, CRAB_DIE_FRAME_Y,
      new Size(CRAB_FRAME_HEIGHT, CRAB_FRAME_WIDTH)
    );

    crab.draw();

    expect(mockCtx.drawImage).toHaveBeenCalledTimes(1);
    expect(mockCtx.createRadialGradient).toHaveBeenCalledTimes(1);
    expect(mockCtx.shadowBlurHistory).toHaveLength(0);
    expect(mockCtx.strokeRect).not.toHaveBeenCalled();
    // sub-sequence: glint fill -> glint restore -> sprite save -> translate -> scale -> drawImage -> sprite restore
    const ops = mockCtx.operations;
    const pattern = ['fill', 'restore', 'save', 'translate', 'scale', 'drawImage', 'restore'];
    let pi = 0;
    for (const op of ops) {
      if (op === pattern[pi]) pi++;
      if (pi === pattern.length) break;
    }
    expect(pi).toBe(pattern.length);
  });
});
