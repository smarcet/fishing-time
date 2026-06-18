'use strict';

// Animates a caught entity flying from the hook endpoint to the boat landing
// point along a parabolic arc. The entity shrinks and fades linearly over the
// flight so it visually "disappears" into the boat rather than abruptly vanishing.
//
// Hook calls start({entity, origin, target}) when rope reaches rest while hooked,
// then update(dt) each frame. draw() is a pure render; elapsed time advances only
// in update(). isFinished() returns true once the full CAPTURE_LAUNCH_DURATION_MS
// has elapsed, at which point Hook calls _finishCaptureLaunch() and resets this.

// Capture launch render tunables - TUNE
const CAPTURE_LAUNCH_ARC_Y          = 70;
const CAPTURE_LAUNCH_SCALE_START    = 1.0;
const CAPTURE_LAUNCH_GLOW_BLUR      = 8;
const CAPTURE_LAUNCH_GLOW_BLUR_PEAK = 22;

class CaptureLaunchAnimation {
  constructor(ctx) {
    this._ctx = ctx;
    this._entity = null;
    this._origin = null;
    this._target = null;
    this._elapsedMs = 0;
    this._active = false;
  }

  start({ entity, origin, target }) {
    this._entity = entity;
    this._origin = origin;
    this._target = target;
    this._elapsedMs = 0;
    this._active = true;
  }

  update(dt) {
    if (this._active) this._elapsedMs += dt;
  }

  // _active guard prevents an unstarted animation from reporting finished.
  isFinished() {
    return this._active && this._elapsedMs >= CAPTURE_LAUNCH_DURATION_MS;
  }

  getTarget() {
    return this._target;
  }

  // Lerp x linearly; y lerps then subtracts a sine arc that peaks at t=0.5.
  // CAPTURE_LAUNCH_ARC_Y controls arc height in pixels.
  _point(t) {
    const ox = this._origin.getX(), oy = this._origin.getY();
    const tx = this._target.getX(), ty = this._target.getY();
    const x = ox + (tx - ox) * t;
    const y = oy + (ty - oy) * t - Math.sin(t * Math.PI) * CAPTURE_LAUNCH_ARC_Y;
    return new Point(x, y);
  }

  // Pure render. Scale and alpha both go from 1 to 0 linearly so the sprite
  // shrinks and fades simultaneously (ADR-0030 established this over the earlier
  // grow+full-alpha approach). Glow blur interpolates from GLOW_BLUR at launch to
  // GLOW_BLUR_PEAK at landing for a bloom effect near the boat.
  //
  // The sprite is drawn twice: first with shadowBlur set (soft glow halo), then
  // again with shadowBlur = 0 (crisp layer on top). Two passes preserve the glow
  // without blurring the actual sprite image.
  //
  // captureRotation/captureOffsetX/captureOffsetY come from the entity's
  // FISH_DEFINITIONS entry (ADR-0029) so each species hangs at its own angle.
  draw(ctx) {
    if (!this._active || !this._entity) return;
    const e = this._entity;
    const c = ctx || this._ctx;
    const w = e.getSize().getWidth();
    const h = e.getSize().getHeight();
    const t = Math.min(1, this._elapsedMs / CAPTURE_LAUNCH_DURATION_MS);
    const p = this._point(t);
    const scale = CAPTURE_LAUNCH_SCALE_START * (1 - t);
    const alpha = 1 - t;
    const glowBlur = CAPTURE_LAUNCH_GLOW_BLUR + (CAPTURE_LAUNCH_GLOW_BLUR_PEAK - CAPTURE_LAUNCH_GLOW_BLUR) * t;
    c.save();
    c.globalAlpha = alpha;
    c.translate(p.getX() + (e._captureOffsetX || 0), p.getY() + (e._captureOffsetY || 0));
    c.scale(scale, scale);
    c.rotate((e._captureRotation || 0) * Math.PI / 180);
    c.shadowColor = CAPTURE_LAUNCH_GLOW_COLOR;
    c.shadowBlur = glowBlur;
    e._drawCapturedSprite(-w / 2, -h / 2, w, h);
    c.shadowBlur = 0;
    e._drawCapturedSprite(-w / 2, -h / 2, w, h);
    c.restore();
  }

  reset() {
    this._entity = null;
    this._origin = null;
    this._target = null;
    this._elapsedMs = 0;
    this._active = false;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CaptureLaunchAnimation };
}
