'use strict';

const { ReelPowerBar } = require('../index.js');

let listeners;

function makeDocMock() {
  listeners = {};
  return {
    addEventListener:    (evt, fn) => { listeners[evt] = listeners[evt] || []; listeners[evt].push(fn); },
    removeEventListener: (evt, fn) => { if (listeners[evt]) listeners[evt] = listeners[evt].filter(f => f !== fn); },
    dispatchEvent:       (e)       => { (listeners[e.type] || []).forEach(fn => fn(e)); },
  };
}

let savedDoc;

beforeEach(() => {
  savedDoc = global.document;
  global.document = makeDocMock();
  listeners = {};
});

afterEach(() => {
  global.document = savedDoc;
  listeners = {};
});

function makeReelPowerChangedEvent(power) {
  return { type: 'reelPowerChanged', detail: { power } };
}

function makeHookIdleEvent() {
  return { type: 'hookIdle' };
}

// ---------------------------------------------------------------------------
describe('ReelPowerBar initial state', () => {
  test('_visible is false on construction', () => {
    const bar = new ReelPowerBar();
    expect(bar._visible).toBe(false);
  });

  test('_power is 0 on construction', () => {
    const bar = new ReelPowerBar();
    expect(bar._power).toBe(0);
  });
});

// ---------------------------------------------------------------------------
describe('ReelPowerBar EVENT_REEL_POWER_CHANGED handling', () => {
  test('sets _visible = true when reelPowerChanged fires', () => {
    const bar = new ReelPowerBar();
    global.document.dispatchEvent(makeReelPowerChangedEvent(0.5));
    expect(bar._visible).toBe(true);
  });

  test('updates _power to detail.power value', () => {
    const bar = new ReelPowerBar();
    global.document.dispatchEvent(makeReelPowerChangedEvent(0.75));
    expect(bar._power).toBeCloseTo(0.75, 5);
  });

  test('power=1.0 is accepted (max)', () => {
    const bar = new ReelPowerBar();
    global.document.dispatchEvent(makeReelPowerChangedEvent(1.0));
    expect(bar._power).toBeCloseTo(1.0, 5);
  });

  test('power=0.0 is accepted (min)', () => {
    const bar = new ReelPowerBar();
    global.document.dispatchEvent(makeReelPowerChangedEvent(0.0));
    expect(bar._visible).toBe(true);
    expect(bar._power).toBeCloseTo(0.0, 5);
  });
});

// ---------------------------------------------------------------------------
describe('ReelPowerBar EVENT_HOOK_IDLE handling', () => {
  test('sets _visible = false when hookIdle fires', () => {
    const bar = new ReelPowerBar();
    global.document.dispatchEvent(makeReelPowerChangedEvent(0.5)); // make visible
    global.document.dispatchEvent(makeHookIdleEvent());
    expect(bar._visible).toBe(false);
  });

  test('hookIdle while already hidden keeps _visible = false', () => {
    const bar = new ReelPowerBar();
    global.document.dispatchEvent(makeHookIdleEvent());
    expect(bar._visible).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe('ReelPowerBar draw() visibility gate', () => {
  function makeMockCtx() {
    const fillStyles = [];
    return {
      save:    jest.fn(),
      restore: jest.fn(),
      fillRect:jest.fn(),
      fillText:jest.fn(),
      set fillStyle(v) { fillStyles.push(v); },
      get fillStyle()  { return fillStyles[fillStyles.length - 1]; },
      _fillStyles: fillStyles,
    };
  }

  test('draw() does NOT call fillRect when _visible is false', () => {
    const bar = new ReelPowerBar();
    const ctx = makeMockCtx();
    bar.draw(ctx);
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  test('draw() calls fillRect when _visible is true', () => {
    const bar = new ReelPowerBar();
    global.document.dispatchEvent(makeReelPowerChangedEvent(0.5));
    const ctx = makeMockCtx();
    bar.draw(ctx);
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  test('draw() wraps in save()/restore() when visible', () => {
    const bar = new ReelPowerBar();
    global.document.dispatchEvent(makeReelPowerChangedEvent(0.5));
    const ctx = makeMockCtx();
    bar.draw(ctx);
    expect(ctx.save).toHaveBeenCalledTimes(1);
    expect(ctx.restore).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
describe('ReelPowerBar draw() color interpolation', () => {
  test('draw() applies a green-dominant fillStyle when power=1.0', () => {
    const bar = new ReelPowerBar();
    global.document.dispatchEvent(makeReelPowerChangedEvent(1.0));
    const capturedFills = [];
    const ctx = {
      save:    jest.fn(),
      restore: jest.fn(),
      fillRect:jest.fn(),
      fillText:jest.fn(),
      set fillStyle(v) { capturedFills.push(v); },
    };
    bar.draw(ctx);
    const barFill = capturedFills.find(f => f && f.startsWith('rgb('));
    expect(barFill).toBeDefined();
    // power=1 -> rgb(0,255,0) - red channel=0, green channel=255
    expect(barFill).toMatch(/rgb\(0,\s*255,\s*0\)/);
  });

  test('draw() shows no filled segments (no rgb fill) when power=0.0', () => {
    const bar = new ReelPowerBar();
    global.document.dispatchEvent(makeReelPowerChangedEvent(0.0));
    const capturedFills = [];
    const ctx = {
      save:    jest.fn(),
      restore: jest.fn(),
      fillRect:jest.fn(),
      fillText:jest.fn(),
      set fillStyle(v) { capturedFills.push(v); },
    };
    bar.draw(ctx);
    // power=0.0 -> 0 segments filled, only track/bg colors used (no rgb())
    const barFill = capturedFills.find(f => f && f.startsWith('rgb('));
    expect(barFill).toBeUndefined();
  });

  test('draw() applies a red-dominant fillStyle when power=0.1 (1 segment filled)', () => {
    const bar = new ReelPowerBar();
    global.document.dispatchEvent(makeReelPowerChangedEvent(0.1));
    const capturedFills = [];
    const ctx = {
      save:    jest.fn(),
      restore: jest.fn(),
      fillRect:jest.fn(),
      fillText:jest.fn(),
      set fillStyle(v) { capturedFills.push(v); },
    };
    bar.draw(ctx);
    const barFill = capturedFills.find(f => f && f.startsWith('rgb('));
    expect(barFill).toBeDefined();
    const match = barFill.match(/rgb\((\d+),\s*(\d+),\s*0\)/);
    expect(match).toBeTruthy();
    // red channel dominates at low power
    expect(parseInt(match[1])).toBeGreaterThan(parseInt(match[2]));
  });
});

// ---------------------------------------------------------------------------
describe('ReelPowerBar destroy()', () => {
  test('after destroy(), reelPowerChanged no longer sets _visible', () => {
    const bar = new ReelPowerBar();
    bar.destroy();
    global.document.dispatchEvent(makeReelPowerChangedEvent(0.8));
    expect(bar._visible).toBe(false);
  });

  test('after destroy(), hookIdle no longer affects state', () => {
    const bar = new ReelPowerBar();
    // manually set visible to test that hookIdle has no effect post-destroy
    bar._visible = true;
    bar.destroy();
    global.document.dispatchEvent(makeHookIdleEvent());
    expect(bar._visible).toBe(true); // unchanged
  });
});
