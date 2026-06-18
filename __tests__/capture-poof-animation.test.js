'use strict';

const { CapturePoofAnimation } = require('../index.js');

function makeMockCtx() {
  return {
    save: () => {}, restore: () => {},
    beginPath: () => {}, arc: () => {}, fill: () => {},
    globalAlpha: 1, shadowColor: '', shadowBlur: 0, fillStyle: '',
  };
}

describe('CapturePoofAnimation', () => {
  test('start({x,y,dirAngle}) spawns 35 particles and activates', () => {
    const anim = new CapturePoofAnimation(makeMockCtx());
    anim.start({ x: 100, y: 200, dirAngle: Math.PI });
    expect(anim._particles.length).toBe(35);
    expect(anim.isActive()).toBe(true);
    expect(anim._x).toBe(100);
    expect(anim._y).toBe(200);
    expect(anim._dirAngle).toBe(Math.PI);
  });

  test('all particles originate at the start position', () => {
    const anim = new CapturePoofAnimation(makeMockCtx());
    anim.start({ x: 50, y: 75, dirAngle: 0 });
    for (const p of anim._particles) {
      expect(p.x).toBe(50);
      expect(p.y).toBe(75);
    }
  });

  test('directional angle is honored - particles fan around dirAngle', () => {
    const anim = new CapturePoofAnimation(makeMockCtx());
    const dir = Math.PI / 2;
    anim.start({ x: 0, y: 0, dirAngle: dir });
    // All velocity vectors should be within the fan (55-degree half-angle)
    const spread = 55 * Math.PI / 180;
    for (const p of anim._particles) {
      const particleAngle = Math.atan2(p.vy / 0.4, p.vx); // undo Y_FLATTEN for angle check
      const diff = Math.abs(particleAngle - dir);
      const normalizedDiff = Math.min(diff, 2 * Math.PI - diff);
      expect(normalizedDiff).toBeLessThanOrEqual(spread + 1e-6);
    }
  });

  test('update(dt) advances each particle exactly once per call', () => {
    const anim = new CapturePoofAnimation(makeMockCtx());
    anim.start({ x: 0, y: 0, dirAngle: 0 });
    const p0 = anim._particles[0];
    const lifeBefore = p0.life;
    const xBefore = p0.x;
    anim.update(0);
    expect(p0.life).toBe(lifeBefore - 1);
    expect(p0.x).toBeCloseTo(xBefore + p0.vx, 5);
  });

  test('draw(ctx) is pure - does not advance particle state', () => {
    const anim = new CapturePoofAnimation(makeMockCtx());
    anim.start({ x: 0, y: 0, dirAngle: 0 });
    const lifeBefore = anim._particles[0].life;
    anim.draw(makeMockCtx());
    anim.draw(makeMockCtx());
    expect(anim._particles[0].life).toBe(lifeBefore);
    expect(anim._particles.length).toBe(35);
  });

  test('deactivates after all particles expire (max life = 22 + 8 - 1 = 29 ticks, loop 32)', () => {
    const anim = new CapturePoofAnimation(makeMockCtx());
    anim.start({ x: 100, y: 100, dirAngle: 0 });
    for (let i = 0; i < 32; i++) anim.update(0);
    expect(anim.isActive()).toBe(false);
    expect(anim.isFinished()).toBe(true);
  });

  test('reset() deactivates and clears particles', () => {
    const anim = new CapturePoofAnimation(makeMockCtx());
    anim.start({ x: 0, y: 0, dirAngle: 0 });
    anim.reset();
    expect(anim.isActive()).toBe(false);
    expect(anim._particles.length).toBe(0);
  });
});
