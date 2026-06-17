'use strict';

const { Size, Point, Player } = require('../index.js');

const ANIM_BOB_AMPLITUDE = 12;
const ANIM_BOB_SPEED     = 0.08;

function makeMocks() {
  const mockGame = {
    getSize: () => new Size(600, 800),
    isDebug: () => false,
    hasKey:  () => false,
  };
  const mockCtx = {
    drawImage:  () => {},
    beginPath:  () => {},
    stroke:     () => {},
    fillRect:   () => {},
    fillText:   () => {},
    save:       () => {},
    restore:    () => {},
    translate:  () => {},
    rotate:     () => {},
    scale:      jest.fn(),
    setLineDash:() => {},
    lineWidth:   0,
    strokeStyle: '',
    moveTo:     () => {},
    lineTo:     () => {},
  };
  return { mockGame, mockCtx };
}

function makePlayer() {
  const { mockGame, mockCtx } = makeMocks();
  return new Player(mockGame, mockCtx, new Size(315, 404), new Point(100, 0));
}

describe('Player left-flip in draw()', () => {
  test('draw() calls ctx.scale(-1, 1) when state is MOVING_L', () => {
    const { mockGame, mockCtx } = makeMocks();
    const player = new Player(mockGame, mockCtx, new Size(315, 404), new Point(100, 0));
    player._state = 'MOVING_L';
    player.draw();
    expect(mockCtx.scale).toHaveBeenCalledWith(-1, 1);
  });

  test('draw() calls ctx.scale(1, 1) when state is IDLE (no flip)', () => {
    const { mockGame, mockCtx } = makeMocks();
    const player = new Player(mockGame, mockCtx, new Size(315, 404), new Point(100, 0));
    player._state = 'IDLE';
    player.draw();
    expect(mockCtx.scale).toHaveBeenCalledWith(1, 1);
  });
});

describe('Player display scaling', () => {
  test('setDisplayScale scales the rendered boat while preserving source frame dimensions', () => {
    const { mockGame, mockCtx } = makeMocks();
    mockCtx.drawImage = jest.fn();
    const player = new Player(mockGame, mockCtx, new Size(315, 404), new Point(100, 0));

    player.setDisplayScale(0.6);
    player.draw();

    const idleDrawCall = mockCtx.drawImage.mock.calls[0];
    expect(player.getSize().getWidth()).toBeCloseTo(404 * 0.6, 5);
    expect(player.getSize().getHeight()).toBeCloseTo(315 * 0.6, 5);
    expect(idleDrawCall[3]).toBe(404);
    expect(idleDrawCall[4]).toBe(315);
    expect(idleDrawCall[7]).toBeCloseTo(404 * 0.6, 5);
    expect(idleDrawCall[8]).toBeCloseTo(315 * 0.6, 5);
  });

  test('setProfileYOffset moves the rendered boat upward without changing base position', () => {
    const player = makePlayer();

    player.setProfileYOffset(-44);

    expect(player.getPosition().getY()).toBe(-44);
    expect(player._position.getY()).toBe(0);
  });
});

describe('Player water bob in update()', () => {
  test('_bobOffset follows sinusoidal formula after N updates', () => {
    const player = makePlayer();
    const N = 10;
    for (let i = 0; i < N; i++) player.update();
    const expected = ANIM_BOB_AMPLITUDE * Math.sin(N * ANIM_BOB_SPEED);
    expect(player._bobOffset).toBeCloseTo(expected, 5);
  });

  test('_bobOffset is 0 before any update', () => {
    const player = makePlayer();
    expect(player._bobOffset).toBe(0);
  });
});

describe('Player REEL state when hook catches a fish', () => {
  test('update() sets _state to REEL when hook.hadCatch() is true', () => {
    const player = makePlayer();
    player._hook.hadCatch = jest.fn().mockReturnValue(true);
    player.update();
    expect(player._state).toBe('REEL');
  });

  test('update() does not set _state to REEL when hook.hadCatch() is false', () => {
    const player = makePlayer();
    player._hook.hadCatch = jest.fn().mockReturnValue(false);
    player.update();
    expect(player._state).not.toBe('REEL');
  });
});

describe('Player deltaTime threading', () => {
  test('update(dt) passes dt to hook.update(dt)', () => {
    const player = makePlayer();
    const spy = jest.fn();
    player._hook.update = spy;
    player._hook.hadCatch = jest.fn().mockReturnValue(false);
    player._hook.isCasting = jest.fn().mockReturnValue(false);
    player.__castAnimationEnded = true;
    player.update(50);
    expect(spy).toHaveBeenCalledWith(50);
  });
});

describe('Player CAST state driven by hook.isCasting()', () => {
  test('enters PLAYER_STATE_CAST when hook.isCasting() is true even with no Space key', () => {
    const player = makePlayer();
    player._hook.hadCatch = jest.fn().mockReturnValue(false);
    player._hook.isCasting = jest.fn().mockReturnValue(true);
    player._hook.update = jest.fn();
    player.update(16);
    expect(player._state).toBe('CAST');
  });

  test('does not enter PLAYER_STATE_CAST from Space key alone after refactor', () => {
    const { mockCtx } = makeMocks();
    const spaceGame = { getSize: () => new Size(600, 800), isDebug: () => false, hasKey: (k) => k === ' ' };
    const player = new Player(spaceGame, mockCtx, new Size(315, 404), new Point(100, 0));
    player._hook.hadCatch = jest.fn().mockReturnValue(false);
    player._hook.isCasting = jest.fn().mockReturnValue(false);
    player._hook.update = jest.fn();
    player.update(16);
    // Space is held but hook.isCasting() returns false => not CAST
    expect(player._state).not.toBe('CAST');
  });
});
