'use strict';

const { ScoreSystem, SCORE_MAP } = require('../index.js');

describe('SCORE_MAP values', () => {
  test('Tuna is worth 100 points', () => {
    expect(SCORE_MAP.Tuna).toBe(100);
  });

  test('DiscardedBottle is worth -10 points', () => {
    expect(SCORE_MAP.DiscardedBottle).toBe(-10);
  });

  test('all nine expected keys exist', () => {
    const keys = ['ClownFish', 'ButterflyFish', 'LionFish', 'Octopus', 'Crab', 'HammerHeadShark', 'SwordFish', 'Tuna', 'DiscardedBottle'];
    keys.forEach(k => expect(SCORE_MAP).toHaveProperty(k));
  });
});

describe('ScoreSystem initial state', () => {
  test('score starts at 0', () => {
    const ss = new ScoreSystem();
    expect(ss._score).toBe(0);
  });

  test('getScore() returns 0 initially', () => {
    const ss = new ScoreSystem();
    expect(ss.getScore()).toBe(0);
  });

  test('getScore() reflects captured score', () => {
    const ss = new ScoreSystem();
    ss._handleCapture({ detail: { enemyType: 'Tuna', x: 0, y: 0 } });
    expect(ss.getScore()).toBe(100);
  });
});

describe('ScoreSystem capture handling', () => {
  test('capture increments score by SCORE_MAP value', () => {
    const ss = new ScoreSystem();
    ss._handleCapture({ detail: { enemyType: 'Tuna' } });
    expect(ss._score).toBe(100);
  });

  test('negative-value capture (DiscardedBottle) decrements score', () => {
    const ss = new ScoreSystem();
    ss._handleCapture({ detail: { enemyType: 'DiscardedBottle' } });
    expect(ss._score).toBe(-10);
  });

  test('unknown enemyType is silently ignored', () => {
    const ss = new ScoreSystem();
    ss._handleCapture({ detail: { enemyType: 'UnknownFish' } });
    expect(ss._score).toBe(0);
  });

  test('score can go negative', () => {
    const ss = new ScoreSystem();
    ss._handleCapture({ detail: { enemyType: 'DiscardedBottle' } });
    ss._handleCapture({ detail: { enemyType: 'DiscardedBottle' } });
    expect(ss._score).toBe(-20);
  });
});

describe('ScoreSystem escape handling', () => {
  test('escape deducts Math.floor(pts/2) from score', () => {
    const ss = new ScoreSystem();
    ss._handleCapture({ detail: { enemyType: 'Tuna' } }); // +100
    ss._handleEscape({ detail: { enemyType: 'Tuna' } });  // -50
    expect(ss._score).toBe(50);
  });

  test('escape of negative-value enemy (DiscardedBottle) adds to score (subtracts -5)', () => {
    const ss = new ScoreSystem();
    ss._handleEscape({ detail: { enemyType: 'DiscardedBottle' } }); // -Math.floor(-10/2) = -(-5) = +5
    expect(ss._score).toBe(5);
  });

  test('escape of unknown enemyType is silently ignored', () => {
    const ss = new ScoreSystem();
    ss._handleEscape({ detail: { enemyType: 'UnknownFish' } });
    expect(ss._score).toBe(0);
  });

  test('escape of DiscardedBottle does not inflate _highScore', () => {
    const ss = new ScoreSystem();
    ss._handleEscape({ detail: { enemyType: 'DiscardedBottle' } }); // score becomes +5
    expect(ss._highScore).toBe(0);
  });
});

describe('ScoreSystem localStorage persistence', () => {
  let mockStorage;

  beforeEach(() => {
    mockStorage = { _data: {} };
    mockStorage.getItem = jest.fn(k => mockStorage._data[k] != null ? mockStorage._data[k] : null);
    mockStorage.setItem = jest.fn((k, v) => { mockStorage._data[k] = String(v); });
    global.localStorage = mockStorage;
  });

  afterEach(() => {
    delete global.localStorage;
  });

  test('score always starts at 0 regardless of localStorage', () => {
    mockStorage._data['fishingTime_score'] = '150';
    const ss = new ScoreSystem();
    expect(ss._score).toBe(0);
  });

  test('constructor reads _highScore from localStorage', () => {
    mockStorage._data['fishingTime_highScore'] = '500';
    const ss = new ScoreSystem();
    expect(ss._highScore).toBe(500);
  });

  test('_highScore updates when score exceeds previous best', () => {
    const ss = new ScoreSystem();
    ss._handleCapture({ detail: { enemyType: 'Tuna', x: 100, y: 200 } }); // score = 100
    expect(ss._highScore).toBe(100);
  });

  test('_highScore does not decrease when score drops below it', () => {
    mockStorage._data['fishingTime_highScore'] = '200';
    const ss = new ScoreSystem();
    ss._handleCapture({ detail: { enemyType: 'Tuna', x: 100, y: 200 } }); // score = 100
    expect(ss._highScore).toBe(200);
  });

  test('_highScore is persisted to localStorage when updated', () => {
    const ss = new ScoreSystem();
    ss._handleCapture({ detail: { enemyType: 'Tuna', x: 100, y: 200 } }); // score = 100, new best
    expect(mockStorage.setItem).toHaveBeenCalledWith('fishingTime_highScore', '100');
  });
});

describe('ScoreSystem draw() with high-score', () => {
  test('draw() renders "Best: N" at y=85', () => {
    const ss = new ScoreSystem();
    ss._highScore = 200;
    const mockCtx = {
      save: jest.fn(), restore: jest.fn(),
      fillText: jest.fn(), strokeText: jest.fn(),
      set font(_) {}, set textAlign(_) {}, set fillStyle(_) {},
      set strokeStyle(_) {}, set lineWidth(_) {},
    };
    ss.draw(mockCtx, 800);
    expect(mockCtx.fillText).toHaveBeenCalledWith('Best: 200', 780, 85);
  });
});

describe('ScoreSystem draw()', () => {
  test('draw() calls fillText with "Score: 0" initially', () => {
    const ss = new ScoreSystem();
    const mockCtx = {
      save: jest.fn(),
      restore: jest.fn(),
      fillText: jest.fn(),
      strokeText: jest.fn(),
      set font(_) {},
      set textAlign(_) {},
      set fillStyle(_) {},
      set strokeStyle(_) {},
      set lineWidth(_) {},
    };
    ss.draw(mockCtx, 800);
    expect(mockCtx.fillText).toHaveBeenCalledWith('Score: 0', 780, 40);
  });

  test('draw() calls fillText with updated score after capture', () => {
    const ss = new ScoreSystem();
    ss._handleCapture({ detail: { enemyType: 'Crab' } }); // +1000
    const mockCtx = {
      save: jest.fn(),
      restore: jest.fn(),
      fillText: jest.fn(),
      strokeText: jest.fn(),
      set font(_) {},
      set textAlign(_) {},
      set fillStyle(_) {},
      set strokeStyle(_) {},
      set lineWidth(_) {},
    };
    ss.draw(mockCtx, 800);
    expect(mockCtx.fillText).toHaveBeenCalledWith('Score: 1000', 780, 40);
  });

  test('draw() wraps in save()/restore()', () => {
    const ss = new ScoreSystem();
    const mockCtx = {
      save: jest.fn(),
      restore: jest.fn(),
      fillText: jest.fn(),
      strokeText: jest.fn(),
      set font(_) {},
      set textAlign(_) {},
      set fillStyle(_) {},
      set strokeStyle(_) {},
      set lineWidth(_) {},
    };
    ss.draw(mockCtx, 800);
    expect(mockCtx.save).toHaveBeenCalledTimes(1);
    expect(mockCtx.restore).toHaveBeenCalledTimes(1);
  });
});

describe('ScoreSystem evaded handling', () => {
  test('_handleEvade deducts Math.floor(pts/4) for positive-value enemy', () => {
    const ss = new ScoreSystem();
    ss._handleCapture({ detail: { enemyType: 'Tuna', x: 0, y: 0 } }); // +100
    ss._handleEvade({ detail: { enemyType: 'ButterflyFish' } }); // -Math.floor(10/4) = -2
    expect(ss._score).toBe(98);
  });

  test('_handleEvade does not change score for negative-value enemy', () => {
    const ss = new ScoreSystem();
    ss._handleEvade({ detail: { enemyType: 'DiscardedBottle' } });
    expect(ss._score).toBe(0);
  });

  test('_handleEvade ignores unknown enemyType', () => {
    const ss = new ScoreSystem();
    ss._handleEvade({ detail: { enemyType: 'UnknownFish' } });
    expect(ss._score).toBe(0);
  });
});

describe('ScoreSystem score animations', () => {
  test('_handleCapture spawns animation at capture coordinates', () => {
    const ss = new ScoreSystem();
    ss._handleCapture({ detail: { enemyType: 'Tuna', x: 300, y: 400 } });
    expect(ss._animations.length).toBe(1);
    expect(ss._animations[0].x).toBe(300);
    expect(ss._animations[0].y).toBe(400);
  });

  test('animation text is "+100" for positive-value Tuna', () => {
    const ss = new ScoreSystem();
    ss._handleCapture({ detail: { enemyType: 'Tuna', x: 0, y: 0 } });
    expect(ss._animations[0].text).toBe('+100');
  });

  test('animation text is "-10" for negative-value DiscardedBottle', () => {
    const ss = new ScoreSystem();
    ss._handleCapture({ detail: { enemyType: 'DiscardedBottle', x: 0, y: 0 } });
    expect(ss._animations[0].text).toBe('-10');
  });

  test('update() advances animation y by vy and reduces alpha', () => {
    const ss = new ScoreSystem();
    ss._animations = [{ text: '+100', x: 100, y: 200, alpha: 1.0, vy: -2 }];
    ss.update();
    expect(ss._animations[0].y).toBe(198);
    expect(ss._animations[0].alpha).toBeCloseTo(1 - 1 / 90);
  });

  test('update() removes animations when alpha drops to 0 or below', () => {
    const ss = new ScoreSystem();
    ss._animations = [{ text: '+100', x: 100, y: 200, alpha: 0.01, vy: -2 }];
    ss.update();
    expect(ss._animations.length).toBe(0);
  });

  test('draw() renders animation text with correct globalAlpha', () => {
    const ss = new ScoreSystem();
    ss._animations = [{ text: '+50', x: 200, y: 150, alpha: 0.8, vy: -2 }];
    let capturedAlpha;
    const mockCtx = {
      save: jest.fn(), restore: jest.fn(),
      fillText: jest.fn(), strokeText: jest.fn(),
      set font(_) {}, set textAlign(_) {}, set fillStyle(_) {},
      set strokeStyle(_) {}, set lineWidth(_) {},
      set globalAlpha(v) { capturedAlpha = v; },
    };
    ss.draw(mockCtx, 800);
    expect(mockCtx.fillText).toHaveBeenCalledWith('+50', 200, 150);
    expect(capturedAlpha).toBe(0.8);
  });
});
