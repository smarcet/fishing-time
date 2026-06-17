'use strict';

const { MobileSystem, Size } = require('../index.js');

function makeEventTarget() {
  const listeners = {};
  return {
    addEventListener: jest.fn((type, fn) => {
      listeners[type] = listeners[type] || [];
      listeners[type].push(fn);
    }),
    removeEventListener: jest.fn((type, fn) => {
      listeners[type] = (listeners[type] || []).filter(listener => listener !== fn);
    }),
    dispatch(type) {
      (listeners[type] || []).forEach(listener => listener());
    },
    listenerCount(type) {
      return (listeners[type] || []).length;
    },
  };
}

function makeWindow(width, height, coarse = true) {
  const win = makeEventTarget();
  win.innerWidth = width;
  win.innerHeight = height;
  win.navigator = { maxTouchPoints: coarse ? 1 : 0 };
  win.matchMedia = jest.fn(() => ({ matches: coarse }));
  win.screen = { orientation: makeEventTarget() };
  return win;
}

function makeCanvas() {
  return { width: 0, height: 0, style: {} };
}

function makeOverlay() {
  return { hidden: true, textContent: 'Rotate your phone to play' };
}

function makeGame() {
  return {
    resize: jest.fn(),
    setPaused: jest.fn(),
  };
}

function makeInput() {
  return {
    setEnabled: jest.fn(),
    destroy: jest.fn(),
  };
}

describe('MobileSystem orientation and resize lifecycle', () => {
  test('portrait mobile pauses gameplay, disables input, and shows rotate overlay', () => {
    const win = makeWindow(390, 844, true);
    const canvas = makeCanvas();
    const overlay = makeOverlay();
    const game = makeGame();
    const input = makeInput();
    const mobile = new MobileSystem({ window: win, canvas, overlay });

    mobile.attach(game, input);

    expect(canvas.width).toBe(390);
    expect(canvas.height).toBe(844);
    expect(overlay.hidden).toBe(false);
    expect(game.setPaused).toHaveBeenLastCalledWith(true);
    expect(input.setEnabled).toHaveBeenLastCalledWith(false);
    expect(game.resize).toHaveBeenCalledWith(
      expect.any(Size),
      expect.objectContaining({ name: 'mobile' }),
      expect.objectContaining({ resetTraffic: true })
    );
  });

  test('landscape mobile resumes gameplay, enables input, and hides rotate overlay', () => {
    const win = makeWindow(844, 390, true);
    const canvas = makeCanvas();
    const overlay = makeOverlay();
    const game = makeGame();
    const input = makeInput();
    const mobile = new MobileSystem({ window: win, canvas, overlay });

    mobile.attach(game, input);

    expect(overlay.hidden).toBe(true);
    expect(game.setPaused).toHaveBeenLastCalledWith(false);
    expect(input.setEnabled).toHaveBeenLastCalledWith(true);
    expect(game.resize.mock.calls[0][1]).toEqual(expect.objectContaining({ name: 'mobile' }));
  });

  test('small desktop viewport without touch capability uses desktop profile', () => {
    const win = makeWindow(800, 600, false);
    const canvas = makeCanvas();
    const game = makeGame();
    const input = makeInput();
    const mobile = new MobileSystem({ window: win, canvas, overlay: makeOverlay() });

    mobile.attach(game, input);

    expect(game.setPaused).toHaveBeenLastCalledWith(false);
    expect(input.setEnabled).toHaveBeenLastCalledWith(true);
    expect(game.resize.mock.calls[0][1]).toEqual(expect.objectContaining({ name: 'desktop' }));
    expect(game.resize.mock.calls[0][2]).toEqual(expect.objectContaining({ resetTraffic: false }));
  });

  test('resize event recalculates canvas and game dimensions', () => {
    const win = makeWindow(844, 390, true);
    const canvas = makeCanvas();
    const game = makeGame();
    const input = makeInput();
    const mobile = new MobileSystem({ window: win, canvas, overlay: makeOverlay() });

    mobile.attach(game, input);
    game.resize.mockClear();
    win.innerWidth = 900;
    win.innerHeight = 430;
    win.dispatch('resize');

    expect(canvas.width).toBe(900);
    expect(canvas.height).toBe(430);
    expect(game.resize).toHaveBeenCalledWith(
      expect.objectContaining({ _w: 900, _h: 430 }),
      expect.objectContaining({ name: 'mobile' }),
      expect.objectContaining({ resetTraffic: true })
    );
  });

  test('destroy removes window and screen listeners and destroys owned touch input', () => {
    const win = makeWindow(844, 390, true);
    const input = makeInput();
    const mobile = new MobileSystem({ window: win, canvas: makeCanvas(), overlay: makeOverlay(), touchInputSystem: input });

    mobile.attach(makeGame(), input);
    expect(win.listenerCount('resize')).toBe(1);
    expect(win.listenerCount('orientationchange')).toBe(1);
    expect(win.screen.orientation.listenerCount('change')).toBe(1);

    mobile.destroy();

    expect(win.listenerCount('resize')).toBe(0);
    expect(win.listenerCount('orientationchange')).toBe(0);
    expect(win.screen.orientation.listenerCount('change')).toBe(0);
    expect(input.destroy).toHaveBeenCalled();
  });
});
