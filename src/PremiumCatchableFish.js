class PremiumCatchableFish extends CatchableFish {

  constructor(game, ctx, size, position, image, maxFrameX, maxFrameY, dieFrameX, dieFrameY) {
    super(game, ctx, size, position, image, maxFrameX, maxFrameY, dieFrameX, dieFrameY);
    this._pulseTick = 0;
  }

  update() {
    super.update();
    this._pulseTick++;
  }

  draw() {
    const w  = this._size.getWidth();
    const h  = this._size.getHeight();
    const sw = this._sw;
    const sh = this._sh;
    const dx = this._position.getX();
    const dy = this._position.getY();

    if (this._status === ENEMY_STATUS_CAPTURED) { this.drawCaptured(); return; }

    this._ctx.save();
    if (this._game.isDebug()) this._drawDebug(dx, dy, w, h);
    const flipX = this._direction === -1 ? -1 : 1;

    this._drawPremiumGlint(dx, dy, w, h);

    // _drawTrafficSprite issues translate+scale without its own save/restore --
    // wrap it so sparkles drawn after are not affected by the sprite's transform.
    this._ctx.save();
    this._drawTrafficSprite(dx, dy, w, h, sw, sh, flipX);
    this._ctx.restore();

    this._drawPremiumSparkles(dx, dy, w, h);
    this._ctx.restore();
  }

  // No-op hook -- subclasses override to render creature-specific debug info
  _drawDebug(dx, dy, w, h) {}

  _drawPremiumGlint(dx, dy, w, h) {
    const pulse  = (Math.sin(this._pulseTick * PREMIUM_PULSE_SPEED) + 1) / 2;
    const alpha  = PREMIUM_GLINT_ALPHA_MIN + pulse * (PREMIUM_GLINT_ALPHA_MAX - PREMIUM_GLINT_ALPHA_MIN);
    const cx     = dx + w / 2;
    const cy     = dy + h / 2;
    const radius = Math.max(w, h) * PREMIUM_GLINT_RADIUS_FACTOR;

    const grad = this._ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, PREMIUM_GLINT_COLOR_CORE);
    grad.addColorStop(1, PREMIUM_GLINT_COLOR_EDGE);

    this._ctx.save();
    this._ctx.globalAlpha = alpha;
    this._ctx.fillStyle   = grad;
    this._ctx.beginPath();
    this._ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    this._ctx.fill();
    this._ctx.restore();
  }

  _drawPremiumSparkles(dx, dy, w, h) {
    const cx = dx + w / 2;
    const cy = dy + h / 2;
    const r  = Math.max(w, h) * PREMIUM_SPARKLE_SIZE_FACTOR;

    for (const anchor of PREMIUM_SPARKLE_ANCHORS) {
      const t = ((this._pulseTick + anchor.phase) % PREMIUM_SPARKLE_PERIOD) / PREMIUM_SPARKLE_PERIOD;
      if (t >= PREMIUM_SPARKLE_DUTY) continue;
      const twinkle = Math.sin((t / PREMIUM_SPARKLE_DUTY) * Math.PI);
      if (twinkle <= 0) continue;
      const sx = cx + anchor.ox * w;
      const sy = cy + anchor.oy * h;
      this._drawSparkleStar(sx, sy, r * twinkle, twinkle);
    }
  }

  _drawSparkleStar(x, y, r, alpha) {
    const inner = r * 0.38;
    const pts   = 4;
    this._ctx.save();
    this._ctx.globalAlpha = alpha;
    this._ctx.fillStyle   = PREMIUM_SPARKLE_COLOR;
    this._ctx.beginPath();
    for (let i = 0; i < pts * 2; i++) {
      const angle  = (i * Math.PI) / pts - Math.PI / 2;
      const radius = i % 2 === 0 ? r : inner;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (i === 0) this._ctx.moveTo(px, py);
      else         this._ctx.lineTo(px, py);
    }
    this._ctx.closePath();
    this._ctx.fill();
    this._ctx.restore();
  }

}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PremiumCatchableFish };
}
