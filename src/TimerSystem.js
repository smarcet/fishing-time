'use strict';

const TS_CENTER_Y   = 82;
const TS_RADIUS     = 66;
const TS_RING_WIDTH = 8;
const TS_BELL_R     = 11;
const TS_BELL_DIST  = 36;
const TS_BG_COLOR   = '#150030';
const TS_ARC_COLOR  = '#cc00ff';
const TS_GOLD       = '#ffd700';
const TS_FONT       = 'bold 30px monospace';
const TS_INITIAL_SECONDS = 120;

class TimerSystem extends GameObject {
  constructor(ctx, size, initialSeconds = TS_INITIAL_SECONDS) {
    super(ctx, size);
    this._timeMs    = initialSeconds * 1000;
    this._initialMs = initialSeconds * 1000;
    this._fired     = false;
  }

  update(dt) {
    super.update();
    if (this._fired) return;
    this._timeMs = Math.max(0, this._timeMs - dt);
    if (this._timeMs === 0 && typeof document !== 'undefined') {
      this._fired = true;
      document.dispatchEvent(new CustomEvent(EVENT_TIMER_TIMEUP));
    }
  }

  draw() {
    const ctx   = this._ctx;
    const cx    = this._size.getWidth() / 2;
    const cy    = TS_CENTER_Y;
    const ratio = Math.max(0, this._timeMs / this._initialMs);

    ctx.save();

    // Pulsating gold glow when 10 seconds or fewer remain
    if (this._timeMs <= 10000 && this._timeMs > 0) {
      const pulse = Math.abs(Math.sin(this._timeMs / 500 * Math.PI));
      ctx.shadowColor = TS_GOLD;
      ctx.shadowBlur  = 10 + 30 * pulse;
    }

    // 1. Two gold bell semicircles
    for (const sign of [-1, 1]) {
      const bx = cx + sign * TS_BELL_DIST;
      const by = cy - TS_RADIUS + 4;
      ctx.beginPath();
      ctx.arc(bx, by, TS_BELL_R, Math.PI, 0, true);
      ctx.fillStyle = TS_GOLD;
      ctx.fill();
    }

    // 2. Dark background circle
    ctx.beginPath();
    ctx.arc(cx, cy, TS_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = TS_BG_COLOR;
    ctx.fill();

    // 3. Purple pie arc (only when time remains)
    if (ratio > 0) {
      const startAngle = -Math.PI / 2;
      const endAngle   = startAngle + ratio * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, TS_RADIUS - TS_RING_WIDTH, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = TS_ARC_COLOR;
      ctx.fill();
    }

    // 4. Gold outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, TS_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = TS_GOLD;
    ctx.lineWidth   = TS_RING_WIDTH;
    ctx.stroke();

    // 5. White minute hand
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy - TS_RADIUS * 0.62);
    ctx.strokeStyle = 'white';
    ctx.lineWidth   = 3;
    ctx.stroke();

    // 6. White hour hand
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + TS_RADIUS * 0.42, cy + TS_RADIUS * 0.15);
    ctx.strokeStyle = 'white';
    ctx.lineWidth   = 4;
    ctx.stroke();

    // 7. Gold center dot
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = TS_GOLD;
    ctx.fill();

    // 8. Seconds label below clock
    const secsLeft = Math.ceil(this._timeMs / 1000);
    ctx.font         = TS_FONT;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle    = 'black';
    ctx.fillText(String(secsLeft), cx, cy + TS_RADIUS + 10);

    ctx.restore();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TimerSystem };
}
