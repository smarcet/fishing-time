class AnglerFlish extends PremiumCatchableFish {

  constructor(game, ctx, size, position, image, maxFrameX, maxFrameY, dieFrameX, dieFrameY, spriteFrameSize) {
    super(game, ctx, size, position, image, maxFrameX, maxFrameY, dieFrameX, dieFrameY);
    this._spriteFrameSize = spriteFrameSize || size;
    this._sw = this._spriteFrameSize.getWidth();
    this._sh = this._spriteFrameSize.getHeight();
    this._staggerFrame = ANIM_STAGGER_SLOW;
    this._driftSpeed = ANGLER_FLISH_DRIFT_SPEED;
  }

  static create(game, ctx, spec) {
    return new AnglerFlish(
      game, ctx, spec.size,
      new Point(
        Enemy.randomSpawnX(game.getSize().getWidth(), spec.size.getWidth()),
        game.getSize().getHeight() * 0.88
      ),
      spec.image, spec.maxFrameX, spec.maxFrameY,
      spec.dieFrameX, spec.dieFrameY, spec.spriteFrameSize
    );
  }

  _drawTrafficSprite(dx, dy, w, h, sw, sh, flipX) {
    this._ctx.translate(dx + w / 2, dy + h / 2);
    this._ctx.scale(flipX, 1);
    this._ctx.drawImage(this._image,
      this._frameX * sw, this._frameY * sh, sw, sh,
      -w / 2, -h / 2, w, h);
  }

  _drawCapturedSprite(dx, dy, w, h) {
    this._ctx.drawImage(this._image,
      this._dieFrameX * this._sw, this._dieFrameY * this._sh, this._sw, this._sh,
      dx, dy, w, h);
  }

}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AnglerFlish };
}
