'use strict';

const {
  KEY_ARROW_LEFT,
  KEY_ARROW_RIGHT,
  KEY_SPACE,
  EVENT_CAST_REQUESTED,
  EVENT_REEL_START,
  EVENT_REEL_TAP,
  EVENT_REEL_STOP,
} = require('../src/constants');

function makeWindowMock() {
  const listeners = {};
  return {
    addEventListener: jest.fn((type, fn) => {
      listeners[type] = listeners[type] || [];
      listeners[type].push(fn);
    }),
    removeEventListener: jest.fn((type, fn) => {
      listeners[type] = (listeners[type] || []).filter(listener => listener !== fn);
    }),
    dispatch(type, event) {
      (listeners[type] || []).forEach(listener => listener(event));
    },
    listenerCount(type) {
      return (listeners[type] || []).length;
    },
  };
}

function makeTargetMock() {
  return makeWindowMock();
}

function makeControlMock(direction) {
  const target = makeTargetMock();
  target.dataset = { direction };
  return target;
}

function makeDocumentMock() {
  const events = [];
  return {
    events,
    dispatchEvent: jest.fn(event => {
      events.push(event);
    }),
  };
}

function makeCustomEvent(type, init = {}) {
  this.type = type;
  this.detail = init.detail;
}

describe('KeyboardInputSystem', () => {
  let savedDocument;
  let savedCustomEvent;

  beforeEach(() => {
    savedDocument = global.document;
    savedCustomEvent = global.CustomEvent;
    global.document = makeDocumentMock();
    global.CustomEvent = makeCustomEvent;
  });

  afterEach(() => {
    global.document = savedDocument;
    global.CustomEvent = savedCustomEvent;
  });

  test('tracks arrow key state through hasKey()', () => {
    const { KeyboardInputSystem } = require('../index.js');
    const target = makeWindowMock();
    const input = new KeyboardInputSystem(target);

    input.attach();
    target.dispatch('keydown', { key: KEY_ARROW_LEFT, repeat: false });
    expect(input.hasKey(KEY_ARROW_LEFT)).toBe(true);

    target.dispatch('keyup', { key: KEY_ARROW_LEFT });
    expect(input.hasKey(KEY_ARROW_LEFT)).toBe(false);
  });

  test('maps Space keydown and keyup to cast and reel custom events', () => {
    const { KeyboardInputSystem } = require('../index.js');
    const target = makeWindowMock();
    const input = new KeyboardInputSystem(target);
    const preventDefault = jest.fn();

    input.attach();
    target.dispatch('keydown', { key: KEY_SPACE, repeat: false, preventDefault });
    target.dispatch('keydown', { key: KEY_SPACE, repeat: true, preventDefault });
    target.dispatch('keyup', { key: KEY_SPACE, preventDefault });

    expect(global.document.events.map(event => event.type)).toEqual([
      EVENT_CAST_REQUESTED,
      EVENT_REEL_START,
      EVENT_REEL_TAP,
      EVENT_REEL_STOP,
    ]);
    expect(preventDefault).toHaveBeenCalled();
  });

  test('ignores key events while disabled and clears key state', () => {
    const { KeyboardInputSystem } = require('../index.js');
    const target = makeWindowMock();
    const input = new KeyboardInputSystem(target);

    input.attach();
    target.dispatch('keydown', { key: KEY_ARROW_LEFT, repeat: false });
    input.setEnabled(false);
    target.dispatch('keydown', { key: KEY_SPACE, repeat: false });

    expect(input.hasKey(KEY_ARROW_LEFT)).toBe(false);
    expect(global.document.dispatchEvent).not.toHaveBeenCalled();
  });

  test('destroy removes window listeners', () => {
    const { KeyboardInputSystem } = require('../index.js');
    const target = makeWindowMock();
    const input = new KeyboardInputSystem(target);

    input.attach();
    expect(target.listenerCount('keydown')).toBe(1);
    expect(target.listenerCount('keyup')).toBe(1);

    input.destroy();
    expect(target.listenerCount('keydown')).toBe(0);
    expect(target.listenerCount('keyup')).toBe(0);
  });
});

describe('InputHandler compatibility', () => {
  test('uses KeyboardInputSystem behavior', () => {
    const { InputHandler, KeyboardInputSystem } = require('../index.js');
    expect(new InputHandler(makeWindowMock())).toBeInstanceOf(KeyboardInputSystem);
  });
});

describe('TouchInputSystem', () => {
  let savedDocument;
  let savedCustomEvent;

  beforeEach(() => {
    jest.useFakeTimers();
    savedDocument = global.document;
    savedCustomEvent = global.CustomEvent;
    global.document = makeDocumentMock();
    global.CustomEvent = makeCustomEvent;
  });

  afterEach(() => {
    jest.useRealTimers();
    global.document = savedDocument;
    global.CustomEvent = savedCustomEvent;
  });

  test('pointer tap emits cast and reel tap events for the whole target', () => {
    const { TouchInputSystem } = require('../index.js');
    const target = makeTargetMock();
    const input = new TouchInputSystem(target);
    const preventDefault = jest.fn();

    input.attach();
    target.dispatch('pointerdown', { pointerType: 'touch', timeStamp: 10, preventDefault });
    jest.runOnlyPendingTimers();

    expect(global.document.events.map(event => event.type)).toEqual([
      EVENT_CAST_REQUESTED,
      EVENT_REEL_START,
      EVENT_REEL_TAP,
      EVENT_REEL_STOP,
    ]);
    expect(preventDefault).toHaveBeenCalled();
  });

  test('rapid taps emit distinct reel tap events', () => {
    const { TouchInputSystem } = require('../index.js');
    const target = makeTargetMock();
    const input = new TouchInputSystem(target);

    input.attach();
    target.dispatch('pointerdown', { pointerType: 'touch', timeStamp: 10, preventDefault: jest.fn() });
    target.dispatch('pointerdown', { pointerType: 'touch', timeStamp: 80, preventDefault: jest.fn() });

    expect(global.document.events.filter(event => event.type === EVENT_REEL_TAP)).toHaveLength(2);
  });

  test('ignores taps while disabled', () => {
    const { TouchInputSystem } = require('../index.js');
    const target = makeTargetMock();
    const input = new TouchInputSystem(target);

    input.attach();
    input.setEnabled(false);
    target.dispatch('pointerdown', { pointerType: 'touch', timeStamp: 10, preventDefault: jest.fn() });

    expect(global.document.dispatchEvent).not.toHaveBeenCalled();
  });

  test('destroy removes touch listeners', () => {
    const { TouchInputSystem } = require('../index.js');
    const target = makeTargetMock();
    const input = new TouchInputSystem(target);

    input.attach();
    expect(target.listenerCount('pointerdown')).toBe(1);
    input.destroy();
    expect(target.listenerCount('pointerdown')).toBe(0);
  });

  test('touch navigation controls expose virtual arrow key state while pressed', () => {
    const { TouchInputSystem } = require('../index.js');
    const target = makeTargetMock();
    const leftControl = makeControlMock('left');
    const rightControl = makeControlMock('right');
    const input = new TouchInputSystem(target, { leftControl, rightControl });

    input.attach();
    leftControl.dispatch('pointerdown', { preventDefault: jest.fn() });
    expect(input.hasKey(KEY_ARROW_LEFT)).toBe(true);
    expect(input.hasKey(KEY_ARROW_RIGHT)).toBe(false);

    leftControl.dispatch('pointerup', { preventDefault: jest.fn() });
    rightControl.dispatch('pointerdown', { preventDefault: jest.fn() });
    expect(input.hasKey(KEY_ARROW_LEFT)).toBe(false);
    expect(input.hasKey(KEY_ARROW_RIGHT)).toBe(true);

    rightControl.dispatch('pointercancel', { preventDefault: jest.fn() });
    expect(input.hasKey(KEY_ARROW_RIGHT)).toBe(false);
  });

  test('disabled touch input clears virtual navigation keys', () => {
    const { TouchInputSystem } = require('../index.js');
    const target = makeTargetMock();
    const leftControl = makeControlMock('left');
    const input = new TouchInputSystem(target, { leftControl });

    input.attach();
    leftControl.dispatch('pointerdown', { preventDefault: jest.fn() });
    input.setEnabled(false);

    expect(input.hasKey(KEY_ARROW_LEFT)).toBe(false);
  });
});
