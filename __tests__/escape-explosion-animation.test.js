'use strict';

const { EscapeExplosionAnimation } = require('../index.js');

function makeMockCtx() {
  return {
    save: () => {}, restore: () => {},
    beginPath: () => {}, arc: () => {}, fill: () => {},
    globalAlpha: 1, shadowColor: '', shadowBlur: 0, fillStyle: '',
  };
}

describe('EscapeExplosionAnimation', () => {
  test('start({x,y}) builds CAPTURE_ESCAPE_PARTICLES particles', () => {
    const anim = new EscapeExplosionAnimation(makeMockCtx());
    anim.start({ x: 200, y: 300 });
    expect(anim._particles.length).toBe(CAPTURE_ESCAPE_PARTICLES);
    expect(anim._particles[0].x).toBe(200);
    expect(anim._particles[0].y).toBe(300);
  });

  test('update(dt) advances each particle exactly once per call', () => {
    const anim = new EscapeExplosionAnimation(makeMockCtx());
    anim.start({ x: 100, y: 100 });
    const p0 = anim._particles[0];
    const lifeBefore = p0.life;
    const xBefore = p0.x;
    const vxBefore = p0.vx;
    const vyBefore = p0.vy;
    anim.update(0);
    expect(p0.life).toBe(lifeBefore - 1);
    expect(p0.x).toBeCloseTo(xBefore + vxBefore, 5);
    // vy increases by HOOK_PARTICLE_GRAVITY (0.2) each tick
    expect(p0.vy).toBeCloseTo(vyBefore + 0.2, 5);
  });

  test('draw(ctx) is pure - does not advance particle state', () => {
    const anim = new EscapeExplosionAnimation(makeMockCtx());
    anim.start({ x: 0, y: 0 });
    const lifeBefore = anim._particles[0].life;
    anim.draw(makeMockCtx());
    anim.draw(makeMockCtx());
    expect(anim._particles[0].life).toBe(lifeBefore);
    expect(anim._particles.length).toBe(CAPTURE_ESCAPE_PARTICLES);
  });

  test('isFinished() returns false when particles remain', () => {
    const anim = new EscapeExplosionAnimation(makeMockCtx());
    anim.start({ x: 0, y: 0 });
    expect(anim.isFinished()).toBe(false);
  });

  test('isFinished() returns true after all particles expire', () => {
    const anim = new EscapeExplosionAnimation(makeMockCtx());
    anim.start({ x: 0, y: 0 });
    const maxLife = anim._particles[0].maxLife;
    for (let i = 0; i < maxLife + 1; i++) anim.update(0);
    expect(anim.isFinished()).toBe(true);
    expect(anim._particles.length).toBe(0);
  });

  test('reset() clears all particles', () => {
    const anim = new EscapeExplosionAnimation(makeMockCtx());
    anim.start({ x: 0, y: 0 });
    anim.reset();
    expect(anim._particles.length).toBe(0);
    expect(anim.isFinished()).toBe(true);
  });
});
