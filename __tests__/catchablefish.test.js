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
