class Crab extends CatchableFish {

  constructor(game, ctx, size, position, image, maxFrameX, maxFrameY, dieFrameX, dieFrameY, spriteFrameSize) {
    super(game, ctx, size, position, image, maxFrameX, maxFrameY, dieFrameX, dieFrameY);
    this._spriteFrameSize = spriteFrameSize || size;
    this._sw = this._spriteFrameSize.getWidth();
    this._sh = this._spriteFrameSize.getHeight();
    this._staggerFrame = ANIM_STAGGER_SLOW;
    this._driftSpeed = CRAB_DRIFT_SPEED;
    this._strength   = FISH_SPECS['crab'].strength;
    this._escapeRate = FISH_SPECS['crab'].escape_rate;
  }

  static create(game, ctx, spec) {
    return new Crab(
      game, ctx, spec.size,
      new Point(0, game.getSize().getHeight() * CRAB_SEABED_FACTOR),
      spec.image, spec.maxFrameX, spec.maxFrameY, spec.dieFrameX, spec.dieFrameY, spec.spriteFrameSize
    );
  }

  _drawCapturedSprite(dx, dy, w, h) {
    const sw = this._sw;
    const sh = this._sh;
    this._ctx.drawImage(this._image, this._dieFrameX * sw, this._dieFrameY * sh, sw, sh, dx, dy, w, h);
  }

  _drawTrafficSprite(dx, dy, w, h, sw, sh, flipX) {
    this._ctx.translate(dx + w / 2, dy + h / 2);
    this._ctx.scale(flipX, 1);
    this._ctx.drawImage(this._image, this._frameX * sw, this._frameY * sh, sw, sh, -w / 2, -h / 2, w, h);
  }

  _drawRewardGlow(dx, dy, w, h, sw, sh, flipX) {
    const pulse = Math.abs(Math.sin(this._tick * CRAB_REWARD_GLOW_PULSE_SPEED));
    const shadowBlur = CRAB_REWARD_GLOW_SHADOW_BLUR_MIN
      + pulse * (CRAB_REWARD_GLOW_SHADOW_BLUR_MAX - CRAB_REWARD_GLOW_SHADOW_BLUR_MIN);
    const alpha = CRAB_REWARD_GLOW_ALPHA_MIN
      + pulse * (CRAB_REWARD_GLOW_ALPHA_MAX - CRAB_REWARD_GLOW_ALPHA_MIN);

    this._ctx.save();
    this._ctx.shadowColor = CRAB_REWARD_GLOW_COLOR;
    this._ctx.shadowBlur = shadowBlur;
    this._ctx.globalAlpha = alpha;
    this._drawTrafficSprite(dx, dy, w, h, sw, sh, flipX);
    this._ctx.restore();
  }

  draw() {
    const w  = this._size.getWidth();
    const h  = this._size.getHeight();
    const sw = this._sw;
    const sh = this._sh;
    const dx = this._position.getX();
    const dy = this._position.getY();

    if (this._status === ENEMY_STATUS_CAPTURED) { this.drawCaptured(); return; }

    if (this._game.isDebug()) {
      this._ctx.fillStyle = 'red';
      this._ctx.font = '16px serif';
      this._ctx.fillText(`X ${dx} Y ${dy}`, 10, 260);
      this._ctx.fillRect(dx, dy, w, h);
    }

    const flipX = this._direction === -1 ? -1 : 1;
    this._drawRewardGlow(dx, dy, w, h, sw, sh, flipX);

    this._ctx.save();
    this._drawTrafficSprite(dx, dy, w, h, sw, sh, flipX);
    this._ctx.restore();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Crab };
}
