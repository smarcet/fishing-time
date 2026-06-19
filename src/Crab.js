class Crab extends PremiumCatchableFish {

  constructor(game, ctx, size, position, image, maxFrameX, maxFrameY, dieFrameX, dieFrameY, spriteFrameSize) {
    super(game, ctx, size, position, image, maxFrameX, maxFrameY, dieFrameX, dieFrameY);
    this._spriteFrameSize = spriteFrameSize || size;
    this._sw = this._spriteFrameSize.getWidth();
    this._sh = this._spriteFrameSize.getHeight();
    this._staggerFrame = ANIM_STAGGER_SLOW;
    this._driftSpeed = CRAB_DRIFT_SPEED;
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

  _drawDebug(dx, dy, w, h) {
    this._ctx.fillStyle = 'red';
    this._ctx.font = '16px serif';
    this._ctx.fillText(`X ${dx} Y ${dy}`, 10, 260);
    this._ctx.fillRect(dx, dy, w, h);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Crab };
}
