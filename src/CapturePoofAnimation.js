'use strict';

// Owns the directional starburst that fires when a catch lands at the boat.
// Hook calls start({x, y, dirAngle}) where dirAngle is the player-facing angle
// (computed by Hook._getPlayerFrontDirection). Particles fan in a cone around
// that angle so the poof reads as coming from the fish arrival direction.
// draw() is a pure render; all particle advancement happens in update().

// Landing directional poof tunables - TUNE
const CAPTURE_POOF_PARTICLE_COUNT = 35;
const CAPTURE_POOF_LIFE           = 22;
const CAPTURE_POOF_LIFE_JITTER    = 8;
const CAPTURE_POOF_SPEED_MIN      = 5;
const CAPTURE_POOF_SPEED_RANGE    = 15;
const CAPTURE_POOF_SIZE_MIN       = 5;
const CAPTURE_POOF_SIZE_RANGE     = 4;
const CAPTURE_POOF_FAN_HALF_DEG   = 55;
const CAPTURE_POOF_Y_FLATTEN      = 0.4;

class CapturePoofAnimation {
  constructor(ctx) {
    this._ctx = ctx;
    this._particles = [];
    this._active = false;
    this._x = 0;
    this._y = 0;
    this._dirAngle = 0;
  }

  // Spawn particles fanning out from (x, y) in the direction of dirAngle.
  // Each particle gets a random angle within +/-CAPTURE_POOF_FAN_HALF_DEG of
  // dirAngle. Vertical velocity is multiplied by CAPTURE_POOF_Y_FLATTEN (<1) to
  // make the fan wider than it is tall, giving it a spray rather than starburst
  // silhouette. The random green channel (g) produces an orange-to-yellow range.
  start({ x, y, dirAngle = 0 }) {
    this._x = x;
    this._y = y;
    this._dirAngle = dirAngle;
    this._particles = [];
    const spread = CAPTURE_POOF_FAN_HALF_DEG * Math.PI / 180;
    for (let i = 0; i < CAPTURE_POOF_PARTICLE_COUNT; i++) {
      const angle = this._dirAngle + (Math.random() - 0.5) * 2 * spread;
      const speed = CAPTURE_POOF_SPEED_MIN + Math.random() * CAPTURE_POOF_SPEED_RANGE;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed * CAPTURE_POOF_Y_FLATTEN;
      const life = CAPTURE_POOF_LIFE + Math.floor(Math.random() * CAPTURE_POOF_LIFE_JITTER);
      const size = CAPTURE_POOF_SIZE_MIN + Math.random() * CAPTURE_POOF_SIZE_RANGE;
      const g = Math.floor(Math.random() * 180);
      this._particles.push({ x, y, vx, vy, life, maxLife: life, size, g });
    }
    this._active = true;
  }

  // Advance all particles one tick. Deactivates automatically once the last
  // particle expires so Hook.getCaptureTrailCount() reflects real liveness.
  update(dt) {
    if (!this._active) return;
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) this._particles.splice(i, 1);
    }
    if (this._particles.length === 0) this._active = false;
  }

  // Pure render. Particle size is constant (no shrink) but alpha fades with life,
  // matching the original _drawCapturePoof behavior intentionally.
  draw(ctx) {
    if (!this._active) return;
    const c = ctx || this._ctx;
    for (const p of this._particles) {
      const t = p.life / p.maxLife;
      c.save();
      c.globalAlpha = t;
      c.shadowColor = `rgba(255,${p.g},0,1)`;
      c.shadowBlur = 10;
      c.fillStyle = `rgba(255,${p.g},0,1)`;
      c.beginPath();
      c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
  }

  isActive() {
    return this._active;
  }

  isFinished() {
    return !this._active;
  }

  reset() {
    this._particles = [];
    this._active = false;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CapturePoofAnimation };
}
