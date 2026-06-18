'use strict';

const { Size, Point, CatchableFish, InertObject } = require('../index.js');

function makeMocks() {
  return {
    game: { getSize: () => new Size(600, 800), isDebug: () => false, hasKey: () => false },
    ctx: {
      drawImage: () => {}, beginPath: () => {}, stroke: () => {}, fillRect: () => {},
      fillText: () => {}, save: () => {}, restore: () => {}, translate: () => {},
      rotate: () => {}, scale: jest.fn(), setLineDash: () => {},
    },
  };
}

function makeCatchableFish() {
  const { game, ctx } = makeMocks();
  return new CatchableFish(game, ctx, new Size(80, 100), new Point(200, 400), {}, 10, 1, 0, 1);
}

function makeInertObject() {
  const { game, ctx } = makeMocks();
  return new InertObject(game, ctx, new Size(80, 100), new Point(200, 400), {}, 10, 1, 0, 1);
}

describe('CatchableFish getFightSpec()', () => {
  test('returns object with strength and escapeRate properties (defaults 0)', () => {
    const fish = makeCatchableFish();
    const spec = fish.getFightSpec();
    expect(spec).not.toBeNull();
    expect(spec).toHaveProperty('strength', 0);
    expect(spec).toHaveProperty('escapeRate', 0);
  });

  test('returns updated spec when subclass sets _strength and _escapeRate', () => {
    const fish = makeCatchableFish();
    fish._strength = 10;
    fish._escapeRate = 2.5;
    const spec = fish.getFightSpec();
    expect(spec.strength).toBe(10);
    expect(spec.escapeRate).toBe(2.5);
  });
});

describe('InertObject getFightSpec()', () => {
  test('returns null', () => {
    const obj = makeInertObject();
    expect(obj.getFightSpec()).toBeNull();
  });
});

describe('drawCaptured() fish center positioning', () => {
  const RX = 100;
  const RY = 300;
  const FISH_H = 82;
  const FISH_W = 100;

  function makeCapturingSetup() {
    const translateSpy = jest.fn();
    const rotateSpy = jest.fn();
    const ctx = {
      drawImage: () => {},
      save: () => {},
      restore: () => {},
      translate: translateSpy,
      rotate: rotateSpy,
      scale: () => {},
      set shadowColor(_) {},
      set shadowBlur(_) {},
      set globalAlpha(_) {},
    };
    const game = { getSize: () => new Size(600, 800), isDebug: () => false, hasKey: () => false };
    const mockHook = {
      getEndpoint: () => new Point(RX, RY),
      isCatchableFishHooked: () => false,
      _escapeProgress: 0,
      getCaptureRawProgress: () => 0,
      getLandingTarget: () => new Point(0, 0),
    };
    const fish = new CatchableFish(
      game, ctx,
      new Size(FISH_H, FISH_W),
      new Point(200, 400),
      {}, 10, 1, 0, 1
    );
    fish.captured(mockHook);
    return { fish, translateSpy, rotateSpy };
  }

  test('test_drawCaptured_translatesTo_hookEndpoint_not_hookEndpointPlusHalfHeight', () => {
    const { fish, translateSpy } = makeCapturingSetup();
    fish.draw();
    const calls = translateSpy.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const [translatedX, translatedY] = calls[0];
    expect(translatedX).toBe(RX);
    expect(translatedY).toBe(RY);
  });

  test('test_drawCaptured_rotates_by_captureRotation_in_radians', () => {
    const { fish, rotateSpy } = makeCapturingSetup();
    fish._captureRotation = 75;
    fish.draw();
    expect(rotateSpy).toHaveBeenCalledWith(75 * Math.PI / 180);
  });
});
