class Bubble extends GameObject {
  constructor(game, ctx, size, position, image) {
    super(ctx, size, position)
    this._game = game;
    this._speedY  = BUBBLE_SPEED_Y;
    this._speedX  = 0;
    this._image = image;
    this._dying = false;
    this._dieFrame = 0;
  }

  startDying() {
    if (this._dying) return;
    this._dying = true;
    this._dieFrame = 0;
  }

  update(){
    super.update();
    if (this._dying) {
      if (++this._dieFrame >= BUBBLE_DIE_DURATION) this.markDead();
      return;
    }
    const formerPosition = this._position;
    this._position = new Point(formerPosition.getX(), formerPosition.getY() - this._speedY);
  }

  draw(){
    if (this._dying) {
      const cx = this._position.getX() + this._size.getWidth() / 2;
      const cy = this._position.getY() + this._size.getHeight() / 2;
      const baseRadius = this._size.getWidth() / 2;
      const progress = Math.min(1, (this._dieFrame + 1) / BUBBLE_DIE_DURATION);

      for (let i = 0; i < BUBBLE_RING_COUNT; i++) {
        const delay = i * BUBBLE_RING_STAGGER;
        const t = Math.max(0, progress - delay);
        if (t <= 0) continue;
        const radius = baseRadius * (1 + t * 2);
        const alpha = Math.max(0, 1 - t / (1 - delay));
        const lineWidth = Math.max(0.5, 4 * (1 - t));

        this._ctx.save();
        this._ctx.globalAlpha = alpha;
        this._ctx.strokeStyle = 'rgba(150,200,255,1)';
        this._ctx.lineWidth = lineWidth;
        this._ctx.beginPath();
        this._ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        this._ctx.stroke();
        this._ctx.restore();
      }
      return;
    }

    if (!this._image) return;
    this._ctx.drawImage(this._image, this._position.getX(), this._position.getY(), this._size.getWidth(), this._size.getHeight());
  }

}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Bubble };
}
