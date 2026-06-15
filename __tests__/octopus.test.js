'use strict';

const { Size, Point, EnemyWithAnimation, Octopus } = require('../index.js');

function makeMocks(startX = 0) {
  const mockGame = {
    getSize: () => new Size(600, 800),
    isDebug: () => false,
    hasKey: () => false,
  };
  const mockCtx = {
    drawImage: () => {},
    beginPath: () => {},
    stroke: () => {},
    fillRect: () => {},
    fillText: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    scale: () => {},
    setLineDash: () => {},
  };
  const mockImage = {};
  return { mockGame, mockCtx, mockImage, startX };
}

function makeOctopus(startX = 0) {
  const { mockGame, mockCtx, mockImage } = makeMocks(startX);
  // maxFrameX=4, maxFrameY=4, dieFrameX=1, dieFrameY=1 - matches EnemyFactory spec
  return new Octopus(
    mockGame, mockCtx,
    new Size(244.75, 198.75),
    new Point(startX, 300),
    mockImage,
    4, 4, 1, 1
  );
}

describe('Octopus animation', () => {
  describe('bob (sinusoidal vertical offset)', () => {
    test('_bobOffset is 0 before any update', () => {
      const oct = makeOctopus();
      expect(oct._bobOffset).toBe(0);
    });

    test('_bobOffset ≈ 12*sin(0.08) after one update', () => {
      const oct = makeOctopus();
      oct.update();
      expect(oct._bobOffset).toBeCloseTo(12 * Math.sin(0.08), 5);
    });

    test('_bobOffset follows 12*sin(0.08*n) across multiple updates', () => {
      const oct = makeOctopus();
      for (let i = 0; i < 5; i++) oct.update();
      expect(oct._bobOffset).toBeCloseTo(12 * Math.sin(0.08 * 5), 5);
    });

    test('getPosition().getY() reflects bob offset after update', () => {
      const oct = makeOctopus(0);
      oct.update();
      const expected = 300 + 12 * Math.sin(0.08);
      expect(oct.getPosition().getY()).toBeCloseTo(expected, 5);
    });
  });

  describe('rock (rotational tilt, out of phase with bob)', () => {
    test('_angle ≈ 0.1745*cos(0.08) after one update', () => {
      const oct = makeOctopus();
      oct.update();
      expect(oct._angle).toBeCloseTo(0.1745 * Math.cos(0.08), 5);
    });

    test('_angle follows 0.1745*cos(0.08*n) across multiple updates', () => {
      const oct = makeOctopus();
      for (let i = 0; i < 7; i++) oct.update();
      expect(oct._angle).toBeCloseTo(0.1745 * Math.cos(0.08 * 7), 5);
    });
  });

  describe('frame stagger (advance every 6 ticks)', () => {
    test('_frameX stays 0 for first 5 updates', () => {
      const oct = makeOctopus();
      for (let i = 0; i < 5; i++) {
        oct.update();
        expect(oct._frameX).toBe(0);
      }
    });

    test('_frameX becomes 1 on the 6th update', () => {
      const oct = makeOctopus();
      for (let i = 0; i < 6; i++) oct.update();
      expect(oct._frameX).toBe(1);
    });
  });

  describe('direction (rightward from spawn at lBound=0)', () => {
    test('_direction is 1 after first update (spawns at left wall)', () => {
      const oct = makeOctopus(0);
      oct.update();
      expect(oct._direction).toBe(1);
    });
  });

  describe('inheritance', () => {
    test('Octopus is an instance of EnemyWithAnimation', () => {
      const oct = makeOctopus();
      expect(oct).toBeInstanceOf(EnemyWithAnimation);
    });
  });
});
