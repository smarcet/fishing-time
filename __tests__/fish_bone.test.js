'use strict';

const { Size, Point, InertObject } = require('../index.js');
const { FishBone } = require('../src/FishBone.js');
global.FishBone = FishBone;

const FRAME_W = 386;  // naturalWidth / maxFrameX = 772 / 2

function makeImage(naturalWidth = 772, naturalHeight = 155) {
  return { naturalWidth, naturalHeight };
}

function makeFishBone(startX = 0, image = makeImage()) {
  const mockGame = {
    getSize: () => new Size(600, 800),
    isDebug: () => false,
    hasKey: () => false,
  };
  const drawImageCalls = [];
  const mockCtx = {
    drawImage: (...args) => drawImageCalls.push(args),
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    fillRect: () => {},
    fillText: () => {},
  };
  const fb = new FishBone(mockGame, mockCtx, new Size(40, 100), new Point(startX, 300), image, 2);
  fb._drawImageCalls = drawImageCalls;
  return fb;
}

describe('FishBone class hierarchy', () => {
  test('instanceof InertObject', () => {
    expect(makeFishBone() instanceof InertObject).toBe(true);
  });

  test('getFightSpec() returns null (inert - no struggle)', () => {
    expect(makeFishBone().getFightSpec()).toBeNull();
  });

  test('constructor.name is FishBone (SCORE_MAP key)', () => {
    expect(makeFishBone().constructor.name).toBe('FishBone');
  });
});

describe('FishBone bob animation', () => {
  test('_bobOffset is 0 before any update', () => {
    expect(makeFishBone()._bobOffset).toBe(0);
  });

  test('getPosition().getY() reflects bob offset after one update', () => {
    const fb = makeFishBone(0);
    fb.update();
    const expected = 300 + 12 * Math.sin(0.08);
    expect(fb.getPosition().getY()).toBeCloseTo(expected, 5);
  });
});

describe('FishBone slow drift', () => {
  test('drifts at 0.6 px/tick', () => {
    const fb = makeFishBone(0);
    fb.update();
    expect(fb.getPosition().getX()).toBeCloseTo(0.6, 5);
  });
});

describe('FishBone frame-based drawImage', () => {
  test('_maxFrameX is 2', () => {
    expect(makeFishBone()._maxFrameX).toBe(2);
  });

  test('draw() uses frameX * frameW as source x when _frameX=1', () => {
    const fb = makeFishBone();
    fb._frameX = 1;
    fb._drawImageCalls.length = 0;
    fb.draw();
    const call = fb._drawImageCalls[0];
    // drawImage(image, srcX, srcY, srcW, srcH, dstX, dstY, dstW, dstH)
    expect(call[1]).toBe(FRAME_W);         // srcX = 386
    expect(call[3]).toBe(FRAME_W);         // srcW = 386
  });

  test('draw() uses srcX=0 when _frameX=0', () => {
    const fb = makeFishBone();
    fb._frameX = 0;
    fb._drawImageCalls.length = 0;
    fb.draw();
    const call = fb._drawImageCalls[0];
    expect(call[1]).toBe(0);
    expect(call[3]).toBe(FRAME_W);
  });

  test('_drawCapturedSprite() uses frameX * frameW as source x when _frameX=1', () => {
    const fb = makeFishBone();
    fb._frameX = 1;
    fb._drawImageCalls.length = 0;
    fb._drawCapturedSprite(0, 0, 100, 40);
    const call = fb._drawImageCalls[0];
    expect(call[1]).toBe(FRAME_W);         // srcX = 386
    expect(call[3]).toBe(FRAME_W);         // srcW = 386
  });

  test('_drawCapturedSprite() uses srcX=0 when _frameX=0', () => {
    const fb = makeFishBone();
    fb._frameX = 0;
    fb._drawImageCalls.length = 0;
    fb._drawCapturedSprite(0, 0, 100, 40);
    const call = fb._drawImageCalls[0];
    expect(call[1]).toBe(0);
    expect(call[3]).toBe(FRAME_W);
  });
});

describe('FishBone factory integration', () => {
  test('EnemyFactory creates a FishBone instance', () => {
    const { EnemyFactory } = require('../src/EnemyFactory');
    const ENEMY_TYPE_FISH_BONE = 'fish_bone';
    const mockGame = {
      getSize: () => new Size(600, 800),
      isDebug: () => false,
    };
    const mockCtx = {};
    const factory = new EnemyFactory();
    const fb = factory.createEnemy(ENEMY_TYPE_FISH_BONE, mockGame, mockCtx);
    expect(fb instanceof FishBone).toBe(true);
  });
});
