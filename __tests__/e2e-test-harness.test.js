'use strict';

const { E2ETestHarness } = require('../index.js');

function makeWindow(search) {
  return { location: { search } };
}

describe('E2ETestHarness', () => {
  test('does not expose helpers without e2e query flag', () => {
    const win = makeWindow('');
    const game = { forceHookedFishForE2E: jest.fn(), getRuntimeStats: jest.fn() };
    const harness = new E2ETestHarness(game, { window: win });

    harness.attach();

    expect(win.__fishingTimeE2E).toBeUndefined();
  });

  test('exposes force-hook and runtime stats helpers when e2e flag is present', () => {
    const win = makeWindow('?e2e=1');
    const game = {
      forceHookedFishForE2E: jest.fn(() => ({ hooked: true })),
      getRuntimeStats: jest.fn(() => ({ activeTraffic: 2 })),
    };
    const harness = new E2ETestHarness(game, { window: win });

    harness.attach();

    expect(win.__fishingTimeE2E.forceHookedFish()).toEqual({ hooked: true });
    expect(win.__fishingTimeE2E.getRuntimeStats()).toEqual({ activeTraffic: 2 });
  });

  test('destroy removes exposed helpers', () => {
    const win = makeWindow('?e2e=1');
    const harness = new E2ETestHarness({}, { window: win });

    harness.attach();
    harness.destroy();

    expect(win.__fishingTimeE2E).toBeUndefined();
  });
});
