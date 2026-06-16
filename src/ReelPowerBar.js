'use strict';

const RPB_X          = 10;
const RPB_Y          = 10;
const RPB_WIDTH      = 200;
const RPB_HEIGHT     = 20;
const RPB_LABEL_Y    = 26;
const RPB_BAR_Y      = 32;
const RPB_BG_PAD     = 6;
const RPB_SEGMENTS   = 10;
const RPB_SEG_GAP    = 2;
const RPB_SEG_WIDTH  = (RPB_WIDTH - (RPB_SEGMENTS - 1) * RPB_SEG_GAP) / RPB_SEGMENTS;
const RPB_BG_HEIGHT  = RPB_BAR_Y + RPB_HEIGHT - RPB_Y + RPB_BG_PAD * 2;
const RPB_FONT       = 'bold 12px monospace';
const RPB_TRACK_COLOR = 'rgba(0,0,0,0.35)';
const RPB_BG_COLOR   = 'rgba(0,0,0,0.55)';

class ReelPowerBar {
  constructor() {
    this._visible = false;
    this._power   = 0;

    this._handlePowerChanged = (e) => {
      this._visible = true;
      this._power   = e.detail.power;
    };

    this._handleHookIdle = () => {
      this._visible = false;
    };

    if (typeof document !== 'undefined') {
      document.addEventListener(EVENT_REEL_POWER_CHANGED, this._handlePowerChanged);
      document.addEventListener(EVENT_HOOK_IDLE, this._handleHookIdle);
    }
  }

  update() {}

  draw(ctx) {
    if (!this._visible) return;
    const power = this._power;
    const filledCount = Math.round(power * RPB_SEGMENTS);
    const r = Math.round(255 * (1 - power));
    const g = Math.round(255 * power);
    const fillColor = `rgb(${r},${g},0)`;

    ctx.save();
    ctx.fillStyle = RPB_BG_COLOR;
    ctx.fillRect(RPB_X - RPB_BG_PAD, RPB_Y - RPB_BG_PAD, RPB_WIDTH + RPB_BG_PAD * 2, RPB_BG_HEIGHT);
    ctx.fillStyle = 'white';
    ctx.font = RPB_FONT;
    ctx.fillText('REEL', RPB_X, RPB_LABEL_Y);
    for (let i = 0; i < RPB_SEGMENTS; i++) {
      const segX = RPB_X + i * (RPB_SEG_WIDTH + RPB_SEG_GAP);
      ctx.fillStyle = i < filledCount ? fillColor : RPB_TRACK_COLOR;
      ctx.fillRect(segX, RPB_BAR_Y, RPB_SEG_WIDTH, RPB_HEIGHT);
    }
    ctx.restore();
  }

  destroy() {
    if (typeof document !== 'undefined') {
      document.removeEventListener(EVENT_REEL_POWER_CHANGED, this._handlePowerChanged);
      document.removeEventListener(EVENT_HOOK_IDLE, this._handleHookIdle);
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ReelPowerBar };
}
