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
