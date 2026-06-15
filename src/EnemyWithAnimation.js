class EnemyWithAnimation extends Enemy {

   constructor(game, ctx, size, position, image, maxFrameX, maxFrameY, dieFrameX, dieFrameY) {
     super(game, ctx, size, position, image);
     // this is frame 1
     this._frameX = 0;
     this._frameY = 0;
     this._maxFrameX = maxFrameX;
     this._maxFrameY = maxFrameY;
     this._dieFrameX = dieFrameX;
     this._dieFrameY = dieFrameY;
     this._opacity = 1;
     this._direction = null;
     this._staggerFrame = 1;
     this._tick = 0;
     this._blinkInterval = CAPTURE_BLINK_INTERVAL;
   }

  updateCaptured() {
    super.updateCaptured();
    if (this._staggerFrame <= 0) return;
    if (++this._tick % this._staggerFrame === 0) {
      if (this._frameX < this._maxFrameX - 1) {
        ++this._frameX;
      } else {
        this._frameX = 0;
        if (this._frameY < this._maxFrameY - 1) {
          ++this._frameY;
        } else {
          this._frameY = 0;
        }
      }
    }
  }

  update() {

    super.update();
    // frames
    if (++this._tick % this._staggerFrame === 0) {
      if (this._frameX < this._maxFrameX -1 ) {
        ++this._frameX;
      } else {
        this._frameX = 0;
        if (this._frameY < this._maxFrameY -1 ) {
          ++this._frameY
        } else {
          this._frameY = 0;
        }
      }
    }
  }


  drawCaptured() {
    const w = this._size.getWidth();
    const h = this._size.getHeight();
    const hookTip = this._hook.getEndpoint();
    const blinkOn = Math.floor(this._captureTick / this._blinkInterval) % 2 === 0;
    const blinkAlpha = blinkOn ? 1.0 : 0.2;

    // cx/cy = visual center of sprite in world coords
    let cx = hookTip.getX();
    let cy = hookTip.getY() + h / 2;
    let scale = 1.0;
    let alpha = blinkAlpha;

    const raw = this._hook.getCaptureRawProgress();
    if (raw >= CAPTURE_THROW_THRESHOLD) {
      const t = (raw - CAPTURE_THROW_THRESHOLD) / (1 - CAPTURE_THROW_THRESHOLD);
      const target = this._hook.getLandingTarget();
      // Lerp visual center from hook tip toward boat center
      cx += (target.getX() - hookTip.getX()) * t;
      cy += (target.getY() - (hookTip.getY() + h / 2)) * t;
      // Sine arc: upward bump above the straight-line trajectory
      cy -= Math.sin(t * Math.PI) * CAPTURE_THROW_ARC_Y;
      scale = 1.0 - t * 0.7;
      alpha = blinkAlpha * (1.0 - t);
    }

    // translate to center so ctx.scale() shrinks around the center (no drift)
    this._ctx.save();
    this._ctx.globalAlpha = Math.max(0, alpha);
    this._ctx.translate(cx, cy);
    this._ctx.scale(scale, scale);
    this._drawCapturedSprite(-w / 2, -h / 2, w, h);
    this._ctx.restore();
  }

  _drawCapturedSprite(dx, dy, w, h) {
    this._ctx.drawImage(this._image, this._dieFrameX * w, this._dieFrameY * h, w, h, dx, dy, w, h);
  }

  draw(){

    const w = this._size.getWidth();
    const h =  this._size.getHeight();
    const dx = this._position.getX();
    const dy = this._position.getY()

    if(this._status === ENEMY_STATUS_CAPTURED){ this.drawCaptured(); return; }

    // this._ctx.filter = `opacity(${this._opacity})`;
    // debug
    if(this._game.isDebug()) {
      this._ctx.fillStyle = 'red';
      this._ctx.font = "16px serif";
      this._ctx.fillText(`X ${dx} `, 10, 200);
      this._ctx.fillText(`Y ${dy} `, 10, 220);
      this._ctx.fillRect(this._position.getX(), this._position.getY(), this._size.getWidth(), this._size.getHeight());
    }

    this._ctx.drawImage
    (
      this._image,
      this._frameX * w,
      this._frameY * h,
      //h * (this._direction === 1 ? 1 : 0),
      w,
      h,
      dx,
      dy,
      w,
      h)
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EnemyWithAnimation };
}
