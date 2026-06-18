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

  test('setScale draws a compact mobile clock', () => {
    const ctx = makeCtxMock();
    const ts = new TimerSystem(ctx, makeSize(844, 390), 60);

    ts.setScale(0.42);
    ts.draw();

    const radii = ctx.arc.mock.calls.map(call => call[2]);
    expect(radii.some(radius => Math.abs(radius - 66 * 0.42) < 0.001)).toBe(true);
    expect(ctx.fillText).toHaveBeenCalledWith(
      '60',
      422,
      expect.closeTo((100 + 66 + 10) * 0.42, 5)
    );
  });
});

// ---------------------------------------------------------------------------
describe('TimerSystem time bonus event handling', () => {
  function makeTs(seconds = 120) {
    return new TimerSystem(makeCtxMock(), makeSize(800, 600), seconds);
  }

  function dispatchCapture(enemyType, x = 0, y = 0) {
    global.document.dispatchEvent(new CustomEvent('enemyCaptured', { detail: { enemyType, x, y } }));
  }

  test('Clock capture adds 10s to _timeMs', () => {
    const ts = makeTs(120);
    ts._timeMs = 60000;
    dispatchCapture('Clock');
    expect(ts._timeMs).toBe(70000);
  });

  test('Clock capture clamps _timeMs to _initialMs (no overshoot)', () => {
    const ts = makeTs(120);
    ts._timeMs = 115000;
    dispatchCapture('Clock');
    expect(ts._timeMs).toBe(120000);
  });

  test('non-Clock capture does NOT change _timeMs', () => {
    const ts = makeTs(120);
    ts._timeMs = 60000;
    dispatchCapture('Tuna');
    expect(ts._timeMs).toBe(60000);
  });

  test('Clock capture dispatches EVENT_TIME_BONUS with seconds=10', () => {
    const ts = makeTs(120);
    ts._timeMs = 60000;
    const handler = jest.fn();
    global.document.addEventListener('timeBonus', handler);
    dispatchCapture('Clock', 50, 100);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toMatchObject({ seconds: 10, x: 50, y: 100 });
  });

  test('non-Clock capture does NOT dispatch EVENT_TIME_BONUS', () => {
    const ts = makeTs(120);
    ts._timeMs = 60000;
    const handler = jest.fn();
    global.document.addEventListener('timeBonus', handler);
    dispatchCapture('Shark');
    expect(handler).not.toHaveBeenCalled();
  });

  test('_fired reset: timer re-activates after Clock captured at time=0', () => {
    const ts = makeTs(120);
    ts._timeMs = 0;
    ts._fired = true;
    dispatchCapture('Clock');
    expect(ts._fired).toBe(false);
    expect(ts._timeMs).toBe(10000);
    ts.update(500);
    expect(ts._timeMs).toBe(9500);
  });

  test('destroy() removes EVENT_ENEMY_CAPTURED listener', () => {
    const ts = makeTs(120);
    ts._timeMs = 60000;
    ts.destroy();
    dispatchCapture('Clock');
    expect(ts._timeMs).toBe(60000);
  });
});
