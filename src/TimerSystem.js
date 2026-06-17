'use strict';

const TS_CENTER_Y   = 100;
const TS_RADIUS     = 66;
const TS_RING_WIDTH = 8;
const TS_BELL_R     = 11;
const TS_BELL_DIST  = 36;
const TS_BG_COLOR   = 'white';
const TS_ARC_COLOR  = 'red';
const TS_GOLD       = '#ffd700';
const TS_FONT       = 'bold 30px monospace';
const TS_INITIAL_SECONDS = 120;

class TimerSystem extends GameObject {
  constructor(ctx, size, initialSeconds = TS_INITIAL_SECONDS) {
    super(ctx, size);
    this._timeMs    = initialSeconds * 1000;
    this._initialMs = initialSeconds * 1000;
    this._fired     = false;
    this._scale     = 1;
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

  resize(size) {
    this._size = size;
  }

  setScale(scale) {
    this._scale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  }

  draw() {
    const ctx   = this._ctx;
    const cx    = this._size.getWidth() / 2;
    const scale = this._scale;
    const cy    = TS_CENTER_Y * scale;
    const radius = TS_RADIUS * scale;
    const ringWidth = TS_RING_WIDTH * scale;
    const bellRadius = TS_BELL_R * scale;
    const bellDistance = TS_BELL_DIST * scale;
    const ratio = Math.max(0, this._timeMs / this._initialMs);

    ctx.save();

    // Pulsating gold glow when 10 seconds or fewer remain
    if (this._timeMs <= 10000 && this._timeMs > 0) {
      const pulse = Math.abs(Math.sin(this._timeMs / 500 * Math.PI));
      ctx.shadowColor = TS_GOLD;
      ctx.shadowBlur  = (10 + 30 * pulse) * scale;
    }

    // 1. Two gold bell semicircles
    for (const sign of [-1, 1]) {
      const bx = cx + sign * bellDistance;
      const by = cy - radius + 4 * scale;
      ctx.beginPath();
      ctx.arc(bx, by, bellRadius, Math.PI, 0, true);
      ctx.fillStyle = TS_GOLD;
      ctx.fill();
    }

    // 2. Dark background circle
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = TS_BG_COLOR;
    ctx.fill();

    // 3. Purple pie arc (only when time remains)
    if (ratio > 0) {
      const startAngle = -Math.PI / 2;
      const endAngle   = startAngle + ratio * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius - ringWidth, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = TS_ARC_COLOR;
      ctx.fill();
    }

    // 4. Gold outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = TS_GOLD;
    ctx.lineWidth   = ringWidth;
    ctx.stroke();

    // 5. White minute hand
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy - radius * 0.62);
    ctx.strokeStyle = 'black';
    ctx.lineWidth   = 3 * scale;
    ctx.stroke();

    // 6. White hour hand
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + radius * 0.42, cy + radius * 0.15);
    ctx.strokeStyle = 'black';
    ctx.lineWidth   = 4 * scale;
    ctx.stroke();

    // 7. Gold center dot
    ctx.beginPath();
    ctx.arc(cx, cy, 4 * scale, 0, Math.PI * 2);
    ctx.fillStyle = 'black';
    ctx.fill();

    // 8. Seconds label below clock
    const secsLeft = Math.ceil(this._timeMs / 1000);
    ctx.font         = `bold ${Math.round(30 * scale)}px monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle    = 'black';
    ctx.fillText(String(secsLeft), cx, cy + radius + 10 * scale);

    ctx.restore();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TimerSystem };
}
