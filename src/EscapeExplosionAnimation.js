'use strict';

// Owns the radial burst that fires when a fish escapes the hook.
// Hook calls start({x,y}) at the escape moment, then update(dt) and draw(ctx)
// each frame. draw() is a pure render; all state mutation happens in update().

// Escape particle tunables - TUNE
const HOOK_PARTICLE_GRAVITY      = 0.2;
const HOOK_PARTICLE_SHADOW_COLOR = 'rgba(255,80,0,0.9)';
const HOOK_PARTICLE_SHADOW_BLUR  = 12;
const HOOK_PARTICLE_SPEED_MIN    = 3;
const HOOK_PARTICLE_SPEED_RANGE  = 4;
const HOOK_PARTICLE_LIFE         = 40;
const HOOK_PARTICLE_SIZE_MIN     = 4;
const HOOK_PARTICLE_SIZE_RANGE   = 4;
const HOOK_PARTICLE_VY_BIAS      = -2;
const HOOK_PARTICLE_GREEN_MAX    = 80;

class EscapeExplosionAnimation {
  constructor(ctx) {
    this._ctx = ctx;
    this._particles = [];
  }

  // Spawn an evenly-spaced radial burst at (x, y). Angles are distributed around
  // the full circle so the burst looks symmetric. HOOK_PARTICLE_VY_BIAS gives
  // each particle a slight upward kick so the burst reads as an explosion rather
  // than a drop.
  start({ x, y }) {
    this._particles = [];
    for (let i = 0; i < CAPTURE_ESCAPE_PARTICLES; i++) {
      const angle = (Math.PI * 2 * i) / CAPTURE_ESCAPE_PARTICLES;
      const speed = HOOK_PARTICLE_SPEED_MIN + Math.random() * HOOK_PARTICLE_SPEED_RANGE;
      this._particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + HOOK_PARTICLE_VY_BIAS,
        life: HOOK_PARTICLE_LIFE, maxLife: HOOK_PARTICLE_LIFE,
        size: HOOK_PARTICLE_SIZE_MIN + Math.random() * HOOK_PARTICLE_SIZE_RANGE,
      });
    }
  }

  // Advance physics each tick. Velocity and gravity are in px/tick (not px/ms)
  // so dt is intentionally unused; the caller drives timing via frame rate.
  // Reverse-iterate so splicing expired particles does not skip the next element.
  update(dt) {
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += HOOK_PARTICLE_GRAVITY;
      p.life--;
      if (p.life <= 0) this._particles.splice(i, 1);
    }
  }

  // Pure render pass -- reads particle state, writes nothing. t = life/maxLife
  // drives both alpha and size so particles fade and shrink together.
  draw(ctx) {
    const c = ctx || this._ctx;
    for (const p of this._particles) {
      const t = p.life / p.maxLife;
      c.save();
      c.globalAlpha = t;
      c.shadowColor = HOOK_PARTICLE_SHADOW_COLOR;
      c.shadowBlur = HOOK_PARTICLE_SHADOW_BLUR;
      c.fillStyle = `rgba(255,${Math.round(t * HOOK_PARTICLE_GREEN_MAX)},0,1)`;
      c.beginPath();
      c.arc(p.x, p.y, p.size * t, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
  }

  isFinished() {
    return this._particles.length === 0;
  }

  reset() {
    this._particles = [];
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EscapeExplosionAnimation };
}
