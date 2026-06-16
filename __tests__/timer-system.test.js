'use strict';

const { TimerSystem, Size } = require('../index.js');

let listeners;

function makeDocMock() {
  listeners = {};
  return {
    addEventListener:    (evt, fn) => { listeners[evt] = listeners[evt] || []; listeners[evt].push(fn); },
    removeEventListener: (evt, fn) => { if (listeners[evt]) listeners[evt] = listeners[evt].filter(f => f !== fn); },
    dispatchEvent:       (e)       => { (listeners[e.type] || []).forEach(fn => fn(e)); },
  };
}

function makeCtxMock() {
  return {
    save:         jest.fn(),
    restore:      jest.fn(),
    beginPath:    jest.fn(),
    closePath:    jest.fn(),
    moveTo:       jest.fn(),
    arc:          jest.fn(),
    lineTo:       jest.fn(),
    fill:         jest.fn(),
    stroke:       jest.fn(),
    fillRect:     jest.fn(),
    fillText:     jest.fn(),
    strokeText:   jest.fn(),
    fillStyle:    '',
    strokeStyle:  '',
    lineWidth:    1,
    font:         '',
    textAlign:    '',
    textBaseline: '',
  };
}

function makeSize(w, h) {
  return new Size(h, w); // Size(h, w)
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

// ---------------------------------------------------------------------------
describe('TimerSystem initial state', () => {
  test('_timeMs starts at initialSeconds * 1000', () => {
    const ctx = makeCtxMock();
    const ts = new TimerSystem(ctx, makeSize(800, 600), 60);
    expect(ts._timeMs).toBe(60000);
  });

  test('_fired is false on construction', () => {
    const ctx = makeCtxMock();
    const ts = new TimerSystem(ctx, makeSize(800, 600), 30);
    expect(ts._fired).toBe(false);
  });

  test('_initialMs equals initialSeconds * 1000', () => {
    const ctx = makeCtxMock();
    const ts = new TimerSystem(ctx, makeSize(800, 600), 45);
    expect(ts._initialMs).toBe(45000);
  });
});

// ---------------------------------------------------------------------------
describe('TimerSystem update(dt) countdown logic', () => {
  test('decrements _timeMs by dt', () => {
    const ctx = makeCtxMock();
    const ts = new TimerSystem(ctx, makeSize(800, 600), 60);
    ts.update(1000);
    expect(ts._timeMs).toBe(59000);
  });

  test('does NOT dispatch timerTimeUp when _timeMs > 0 after decrement', () => {
    const ctx = makeCtxMock();
    const ts = new TimerSystem(ctx, makeSize(800, 600), 60);
    ts.update(1000);
    expect(listeners['timerTimeUp']).toBeUndefined();
  });

  test('dispatches timerTimeUp exactly once when _timeMs reaches 0', () => {
    const ctx = makeCtxMock();
    const ts = new TimerSystem(ctx, makeSize(800, 600), 1);
    const handler = jest.fn();
    global.document.addEventListener('timerTimeUp', handler);
    ts.update(1000); // exactly 1 second = 1000ms
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('does NOT dispatch a second time after _fired = true (idempotent)', () => {
    const ctx = makeCtxMock();
    const ts = new TimerSystem(ctx, makeSize(800, 600), 1);
    const handler = jest.fn();
    global.document.addEventListener('timerTimeUp', handler);
    ts.update(1000); // fires event, _fired = true
    ts.update(0);    // second call - should not fire again
    ts.update(500);  // third call  - should not fire again
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('clamps _timeMs to 0 (does not go negative)', () => {
    const ctx = makeCtxMock();
    const ts = new TimerSystem(ctx, makeSize(800, 600), 1);
    ts.update(5000); // way more than 1 second
    expect(ts._timeMs).toBe(0);
  });
});

// ---------------------------------------------------------------------------
describe('TimerSystem draw()', () => {
  test('calls ctx.arc when _timeMs > 0 (clock face always visible)', () => {
    const ctx = makeCtxMock();
    const ts = new TimerSystem(ctx, makeSize(800, 600), 60);
    ts.draw();
    expect(ctx.arc).toHaveBeenCalled();
  });

  test('does NOT fill the pie arc color when _timeMs === 0 (ratio=0, no pie segment)', () => {
    const capturedFills = [];
    const ctx = {
      save:         jest.fn(),
      restore:      jest.fn(),
      beginPath:    jest.fn(),
      closePath:    jest.fn(),
      moveTo:       jest.fn(),
      arc:          jest.fn(),
      lineTo:       jest.fn(),
      fill:         jest.fn(),
      stroke:       jest.fn(),
      fillRect:     jest.fn(),
      fillText:     jest.fn(),
      strokeText:   jest.fn(),
      lineWidth:    1,
      font:         '',
      textAlign:    '',
      textBaseline: '',
      get fillStyle()  { return capturedFills[capturedFills.length - 1] || ''; },
      set fillStyle(v) { capturedFills.push(v); },
    };
    const ts = new TimerSystem(ctx, makeSize(800, 600), 1);
    ts.update(1000); // drain to 0
    ts.draw();
    expect(capturedFills).not.toContain('#cc00ff');
  });

  test('wraps draw in save() / restore()', () => {
    const ctx = makeCtxMock();
    const ts = new TimerSystem(ctx, makeSize(800, 600), 60);
    ts.draw();
    expect(ctx.save).toHaveBeenCalledTimes(1);
    expect(ctx.restore).toHaveBeenCalledTimes(1);
  });
});
