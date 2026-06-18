'use strict';

const { ScoreSystem, SCORE_MAP } = require('../index.js');
const { FISH_DEFINITIONS, FISH_SCORE_MAP, FISH_SPECS } = require('../src/constants');

describe('SCORE_MAP values', () => {
  test('Tuna is worth 250 points', () => {
    expect(SCORE_MAP.Tuna).toBe(250);
  });

  test('DiscardedBottle is worth -5 points', () => {
    expect(SCORE_MAP.DiscardedBottle).toBe(-5);
  });

  test('RedApple is worth -5 points', () => {
    expect(SCORE_MAP.RedApple).toBe(-5);
  });

  test('Wheel is worth -5 points', () => {
    expect(SCORE_MAP.Wheel).toBe(-5);
  });

  test('Shark is worth 500 points', () => {
    expect(SCORE_MAP.Shark).toBe(500);
  });

  test('all configured class names exist in SCORE_MAP', () => {
    const keys = FISH_DEFINITIONS.map(def => def.className);
    expect(keys).toHaveLength(17);
    keys.forEach(k => expect(SCORE_MAP).toHaveProperty(k));
  });

  test('SCORE_MAP is derived from FISH_SCORE_MAP', () => {
    expect(SCORE_MAP).toEqual(FISH_SCORE_MAP);
  });

  test('FISH_SPECS is derived for CatchableFish definitions', () => {
    const catchableDefs = FISH_DEFINITIONS.filter(def => 'frameH' in def);
    catchableDefs.forEach(def => {
      expect(FISH_SPECS[def.id]).toEqual({
        strength: def.strength,
        escape_rate: def.escapeRate,
      });
    });
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
    expect(ss.getScore()).toBe(250);
  });
});

describe('ScoreSystem capture handling', () => {
  test('capture increments score by SCORE_MAP value', () => {
    const ss = new ScoreSystem();
    ss._handleCapture({ detail: { enemyType: 'Tuna' } });
    expect(ss._score).toBe(250);
  });

  test('negative-value capture (DiscardedBottle) decrements score', () => {
    const ss = new ScoreSystem();
    ss._handleCapture({ detail: { enemyType: 'DiscardedBottle' } });
    expect(ss._score).toBe(-5);
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
    expect(ss._score).toBe(-10);
  });
});

describe('ScoreSystem escape handling', () => {
  test('escape deducts Math.floor(pts/2) from score', () => {
    const ss = new ScoreSystem();
    ss._handleCapture({ detail: { enemyType: 'Tuna' } }); // +250
    ss._handleEscape({ detail: { enemyType: 'Tuna' } });  // -125
    expect(ss._score).toBe(125);
  });

  test('escape of negative-value enemy (DiscardedBottle) has no effect on score', () => {
    const ss = new ScoreSystem();
    ss._handleEscape({ detail: { enemyType: 'DiscardedBottle' } });
    expect(ss._score).toBe(0);
  });

  test('escape of unknown enemyType is silently ignored', () => {
    const ss = new ScoreSystem();
    ss._handleEscape({ detail: { enemyType: 'UnknownFish' } });
    expect(ss._score).toBe(0);
  });

  test('escape of DiscardedBottle does not inflate _highScore', () => {
    const ss = new ScoreSystem();
    ss._handleEscape({ detail: { enemyType: 'DiscardedBottle' } }); // score becomes +3
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
    ss._handleCapture({ detail: { enemyType: 'Tuna', x: 100, y: 200 } }); // score = 250
    expect(ss._highScore).toBe(250);
  });

  test('_highScore does not decrease when score drops below it', () => {
    mockStorage._data['fishingTime_highScore'] = '500';
    const ss = new ScoreSystem();
    ss._handleCapture({ detail: { enemyType: 'Tuna', x: 100, y: 200 } }); // score = 250 < 500
    expect(ss._highScore).toBe(500);
  });

  test('_highScore is persisted to localStorage when updated', () => {
    const ss = new ScoreSystem();
    ss._handleCapture({ detail: { enemyType: 'Tuna', x: 100, y: 200 } }); // score = 250, new best
    expect(mockStorage.setItem).toHaveBeenCalledWith('fishingTime_highScore', '250');
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

  test('setScale draws compact mobile HUD text', () => {
    const ss = new ScoreSystem();
    const fonts = [];
    const mockCtx = {
      save: jest.fn(),
      restore: jest.fn(),
      fillText: jest.fn(),
      strokeText: jest.fn(),
      set font(v) { fonts.push(v); },
      set textAlign(_) {},
      set fillStyle(_) {},
      set strokeStyle(_) {},
      set lineWidth(_) {},
    };

    ss.setScale(0.42);
    ss.draw(mockCtx, 844);

    expect(fonts).toContain('bold 14px monospace');
    expect(mockCtx.fillText).toHaveBeenCalledWith('Score: 0', 835.6, 16.8);
    expect(mockCtx.fillText).toHaveBeenCalledWith('Best: 0', 835.6, 35.699999999999996);
  });
});

describe('ScoreSystem evaded handling', () => {
  test('_handleEvade deducts Math.floor(pts/4) for positive-value enemy', () => {
    const ss = new ScoreSystem();
    ss._handleCapture({ detail: { enemyType: 'Tuna', x: 0, y: 0 } }); // +250
    ss._handleEvade({ detail: { enemyType: 'ButterflyFish' } }); // -Math.floor(10/4) = -2
    expect(ss._score).toBe(248);
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

  test('animation text is "+250" for positive-value Tuna', () => {
    const ss = new ScoreSystem();
    ss._handleCapture({ detail: { enemyType: 'Tuna', x: 0, y: 0 } });
    expect(ss._animations[0].text).toBe('+250');
  });

  test('animation text is "-5" for negative-value DiscardedBottle', () => {
    const ss = new ScoreSystem();
    ss._handleCapture({ detail: { enemyType: 'DiscardedBottle', x: 0, y: 0 } });
    expect(ss._animations[0].text).toBe('-5');
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
    ss._animations = [{ text: '+100', x: 100, y: 200, alpha: 0.001, vy: -2 }];
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

describe('ScoreSystem Clock time-bonus double-popup', () => {
  test('Clock capture produces +50 score animation (green)', () => {
    const ss = new ScoreSystem();
    ss._handleCapture({ detail: { enemyType: 'Clock', x: 100, y: 200 } });
    const scoreAnim = ss._animations.find(a => a.text === '+50');
    expect(scoreAnim).toBeDefined();
    expect(scoreAnim.color).toBe('#00dd55');
  });

  test('EVENT_TIME_BONUS produces +10s animation (gold)', () => {
    const ss = new ScoreSystem();
    ss._handleTimeBonus({ detail: { seconds: 10, x: 100, y: 200 } });
    expect(ss._animations.length).toBe(1);
    expect(ss._animations[0].text).toBe('+10s');
    expect(ss._animations[0].color).toBe('#ffd700');
    expect(ss._animations[0].x).toBe(100);
    expect(ss._animations[0].y).toBe(200);
  });

  test('double-popup: both +50 and +10s animations appear when Clock captured and time bonus fires', () => {
    const ss = new ScoreSystem();
    ss._handleCapture({ detail: { enemyType: 'Clock', x: 50, y: 100 } });
    ss._handleTimeBonus({ detail: { seconds: 10, x: 50, y: 100 } });
    expect(ss._animations).toHaveLength(2);
    const scoreAnim = ss._animations.find(a => a.text === '+50');
    const timeAnim  = ss._animations.find(a => a.text === '+10s');
    expect(scoreAnim).toBeDefined();
    expect(scoreAnim.color).toBe('#00dd55');
    expect(timeAnim).toBeDefined();
    expect(timeAnim.color).toBe('#ffd700');
  });

  test('destroy() removes EVENT_TIME_BONUS listener from document', () => {
    const docListeners = {};
    const mockDoc = {
      addEventListener:    (evt, fn) => { docListeners[evt] = docListeners[evt] || []; docListeners[evt].push(fn); },
      removeEventListener: (evt, fn) => { if (docListeners[evt]) docListeners[evt] = docListeners[evt].filter(f => f !== fn); },
      dispatchEvent:       (e)       => { (docListeners[e.type] || []).forEach(fn => fn(e)); },
    };
    const savedDoc = global.document;
    global.document = mockDoc;
    const ss = new ScoreSystem();
    ss.destroy();
    global.document.dispatchEvent(new CustomEvent('timeBonus', { detail: { seconds: 10, x: 0, y: 0 } }));
    expect(ss._animations).toHaveLength(0);
    global.document = savedDoc;
  });
});
