'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { Size, Point, PremiumCatchableFish, Lobster } = require('../index.js');
const {
  ENEMY_TYPE_LOBSTER,
  FISH_DEFINITIONS,
  FISH_TRAFFIC_DIRECTION_RIGHT,
  FISH_TRAFFIC_DIRECTION_LEFT,
} = require('../src/constants');

const LOBSTER_FRAME_WIDTH   = 303;
const LOBSTER_FRAME_HEIGHT  = 80;
const LOBSTER_MAX_FRAME_X   = 4;
const LOBSTER_MAX_FRAME_Y   = 1;
const LOBSTER_DIE_FRAME_X   = 0;
const LOBSTER_DIE_FRAME_Y   = 0;
const LOBSTER_DISPLAY_W     = 225;
const LOBSTER_DISPLAY_H     = 60;

const lobsterDefinition = FISH_DEFINITIONS.find(def => def.id === ENEMY_TYPE_LOBSTER);

function makeMocks() {
  const shadowBlurHistory = [];
  const globalAlphaHistory = [];
  const operations = [];
  const drawImageCalls = [];
  const scaleCalls = [];
  const mockCtx = {
    drawImage: jest.fn((...args) => { operations.push('drawImage'); drawImageCalls.push(args); }),
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
    scale: jest.fn((...args) => { operations.push('scale'); scaleCalls.push(args); }),
    setLineDash: () => {},
    createRadialGradient: jest.fn(() => { operations.push('createRadialGradient'); return { addColorStop() {} }; }),
    set fillStyle(v) { this._fillStyle = v; operations.push('fillStyle'); },
    get fillStyle() { return this._fillStyle; },
    set strokeStyle(v) { this._strokeStyle = v; },
    get strokeStyle() { return this._strokeStyle; },
    set lineWidth(v) { this._lineWidth = v; },
    get lineWidth() { return this._lineWidth; },
    set shadowColor(v) { this._shadowColor = v; },
    get shadowColor() { return this._shadowColor; },
    set shadowBlur(v) { this._shadowBlur = v; shadowBlurHistory.push(v); operations.push('shadowBlur'); },
    get shadowBlur() { return this._shadowBlur; },
    set globalAlpha(v) { this._globalAlpha = v; globalAlphaHistory.push(v); operations.push('globalAlpha'); },
    get globalAlpha() { return this._globalAlpha; },
    shadowBlurHistory,
    globalAlphaHistory,
    operations,
    drawImageCalls,
    scaleCalls,
  };
  const mockGame = {
    getSize: () => new Size(600, 800),
    isDebug: () => false,
    hasKey: () => false,
  };
  return { mockGame, mockCtx, mockImage: {} };
}

function makeLobster(startX = 0, startY = 500, direction = FISH_TRAFFIC_DIRECTION_RIGHT) {
  const { mockGame, mockCtx, mockImage } = makeMocks();
  const lobster = new Lobster(
    mockGame, mockCtx,
    new Size(LOBSTER_DISPLAY_H, LOBSTER_DISPLAY_W),
    new Point(startX, startY),
    mockImage,
    LOBSTER_MAX_FRAME_X, LOBSTER_MAX_FRAME_Y,
    LOBSTER_DIE_FRAME_X, LOBSTER_DIE_FRAME_Y,
    new Size(LOBSTER_FRAME_HEIGHT, LOBSTER_FRAME_WIDTH)
  );
  lobster._direction = direction;
  lobster._speedX = 7.0;
  return { lobster, mockCtx, mockGame };
}

describe('Lobster inheritance', () => {
  test('is an instance of PremiumCatchableFish', () => {
    const { lobster } = makeLobster();
    expect(lobster).toBeInstanceOf(PremiumCatchableFish);
  });
});

describe('Lobster species definition', () => {
  test('renders 25 percent smaller than the original 300x80 size', () => {
    expect(lobsterDefinition.displayW).toBe(LOBSTER_DISPLAY_W);
    expect(lobsterDefinition.displayH).toBe(LOBSTER_DISPLAY_H);
  });
});

describe('Lobster draw() normalized spritesheet', () => {
  test('sprite asset is normalized to four uniform transparent cells', () => {
    const png = fs.readFileSync(path.join(__dirname, '../images/fishes/lobster_sprite.png'));
    expect(png.readUInt32BE(16)).toBe(LOBSTER_FRAME_WIDTH * LOBSTER_MAX_FRAME_X);
    expect(png.readUInt32BE(20)).toBe(LOBSTER_FRAME_HEIGHT);
  });

  test('drawImage is called exactly once per draw()', () => {
    const { lobster, mockCtx } = makeLobster();
    lobster.draw();
    expect(mockCtx.drawImage).toHaveBeenCalledTimes(1);
  });

  test('drawImage sourceY is the top of the normalized spritesheet', () => {
    const { lobster, mockCtx } = makeLobster();
    lobster.draw();
    const call = mockCtx.drawImageCalls[0];
    // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
    expect(call[2]).toBe(0);
  });

  test('drawImage sourceH is the normalized frame height', () => {
    const { lobster, mockCtx } = makeLobster();
    lobster.draw();
    const call = mockCtx.drawImageCalls[0];
    expect(call[4]).toBe(LOBSTER_FRAME_HEIGHT);
  });

  test('drawImage sourceX and sourceW use uniform cells for frame 0', () => {
    const { lobster, mockCtx } = makeLobster();
    lobster._frameX = 0;
    lobster.draw();
    const call = mockCtx.drawImageCalls[0];
    expect(call[1]).toBe(0);
    expect(call[3]).toBe(LOBSTER_FRAME_WIDTH);
  });

  test('drawImage sourceX and sourceW use uniform cells for frame 1', () => {
    const { lobster, mockCtx } = makeLobster();
    lobster._frameX = 1;
    lobster.draw();
    const call = mockCtx.drawImageCalls[0];
    expect(call[1]).toBe(LOBSTER_FRAME_WIDTH);
    expect(call[3]).toBe(LOBSTER_FRAME_WIDTH);
  });

  test('no shadowBlur is set (no glow halo)', () => {
    const { lobster, mockCtx } = makeLobster();
    lobster.draw();
    expect(mockCtx.shadowBlurHistory).toHaveLength(0);
  });

  test('save and restore calls are balanced', () => {
    const { lobster, mockCtx } = makeLobster();
    lobster.draw();
    const saves    = mockCtx.operations.filter(o => o === 'save').length;
    const restores = mockCtx.operations.filter(o => o === 'restore').length;
    expect(saves).toBe(restores);
  });
});

describe('Lobster draw() direction flip', () => {
  // Sprite faces LEFT -- flipX is negated vs other fish.
  test('draw() calls ctx.scale(1, 1) when direction is -1 (going left, no flip needed)', () => {
    const { lobster, mockCtx } = makeLobster(100, 500, FISH_TRAFFIC_DIRECTION_LEFT);
    lobster.draw();
    expect(mockCtx.scaleCalls.some(c => c[0] === 1 && c[1] === 1)).toBe(true);
  });

  test('draw() calls ctx.scale(-1, 1) when direction is 1 (going right, flip to face right)', () => {
    const { lobster, mockCtx } = makeLobster(100, 500, FISH_TRAFFIC_DIRECTION_RIGHT);
    lobster.draw();
    expect(mockCtx.scaleCalls.some(c => c[0] === -1 && c[1] === 1)).toBe(true);
  });
});

describe('Lobster movement', () => {
  test('update() advances x-position to the right when direction=1', () => {
    const { lobster } = makeLobster(0, 500, FISH_TRAFFIC_DIRECTION_RIGHT);
    const before = lobster.getPosition().getX();
    lobster.update();
    expect(lobster.getPosition().getX()).toBeGreaterThan(before);
  });

  test('isOffScreen() returns true when fully past the left edge', () => {
    // displayW=300 so x < -300 => off-screen left
    const { lobster } = makeLobster(-400, 500, FISH_TRAFFIC_DIRECTION_LEFT);
    expect(lobster.isOffScreen()).toBe(true);
  });
});

describe('Lobster _drawCapturedSprite normalized spritesheet', () => {
  test('_drawCapturedSprite uses normalized sourceY', () => {
    const { lobster, mockCtx } = makeLobster();
    lobster._drawCapturedSprite(-150, -40, LOBSTER_DISPLAY_W, LOBSTER_DISPLAY_H);
    const call = mockCtx.drawImageCalls[0];
    // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
    expect(call[2]).toBe(0);
  });

  test('_drawCapturedSprite uses normalized sourceH', () => {
    const { lobster, mockCtx } = makeLobster();
    lobster._drawCapturedSprite(-150, -40, LOBSTER_DISPLAY_W, LOBSTER_DISPLAY_H);
    const call = mockCtx.drawImageCalls[0];
    expect(call[4]).toBe(LOBSTER_FRAME_HEIGHT);
  });
});
