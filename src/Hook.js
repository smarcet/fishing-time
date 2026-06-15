class Hook extends GameObject {

  constructor(player, ctx, size, position) {
    super(ctx, size, position);
    this._image = (typeof document !== 'undefined') ? document.getElementById('hook') : null;
    this._player = player;
    this._status = HOOK_STATUS_IDLE;
    this._catch = null;
    this._catchRopeStart = null;
    this._swingPhase = 0;
    this._angle = 0;
    this._castAngle = 0;
    this._ropeLength = HOOK_REST_LENGTH;
    this._reachedBottom = false;
  }

  _pivot() {
    const pos = this._player.getPosition();
    const w = this._player.getSize().getWidth();
    const casting = this._player._state === PLAYER_STATE_CAST;
    const xOffset = casting ? HOOK_CAST_PIVOT_X_OFFSET : HOOK_PIVOT_X_OFFSET;
    const yFactor = casting ? HOOK_CAST_PIVOT_Y_FACTOR : HOOK_PIVOT_Y_FACTOR;
    const flipped = this._player._state === PLAYER_STATE_MOVING_L;
    const px = flipped
      ? pos.getX() + w - xOffset
      : pos.getX() + xOffset;
    const py = pos.getY() + this._player.getSize().getHeight() * yFactor;
    return new Point(px, py);
  }

  _endpoint() {
    const a = (this._status === HOOK_STATUS_IDLE) ? this._angle : this._castAngle;
    const pivot = this._pivot();
    return new Point(
      pivot.getX() + this._ropeLength * Math.sin(a),
      pivot.getY() + this._ropeLength * Math.cos(a)
    );
  }

  getPosition() {
    const ep = this._endpoint();
    return new Point(ep.getX() - this._size.getWidth() / 2, ep.getY());
  }

  getEndpoint() {
    return this._endpoint();
  }

  getPivotPoint() {
    return this._pivot();
  }

  getLandingTarget() {
    const pos = this._player.getPosition();
    const w   = this._player.getSize().getWidth();
    // Horizontal center of the boat at the rod-tip height (where the fish "lands")
    return new Point(pos.getX() + w / 2, this._pivot().getY());
  }

  clearCaptured(){
    if (typeof document !== 'undefined' && this._catch) {
      const pos = this.getPosition();
      document.dispatchEvent(new CustomEvent('enemyCaptured', {
        detail: { enemyType: this._catch.constructor.name, x: pos.getX(), y: pos.getY() }
      }));
    }
    this._catch = null;
    this._catchRopeStart = null;
    this._status = HOOK_STATUS_IDLE;
    this._ropeLength = HOOK_REST_LENGTH;
    this._reachedBottom = false;
  }

  getCaptureRawProgress() {
    const denom = this._catchRopeStart - HOOK_REST_LENGTH;
    if (denom <= 0) return 1;
    return Math.min(1, (this._catchRopeStart - this._ropeLength) / denom);
  }

  getCapturePhase() {
    if (!this._catch) return CAPTURE_PHASE_RISING;
    return this.getCaptureRawProgress() >= CAPTURE_THROW_THRESHOLD
      ? CAPTURE_PHASE_THROWING : CAPTURE_PHASE_RISING;
  }

  update(){
    super.update();
    const spaceHeld = this._player._game.hasKey(KEY_SPACE) &&
      !(this._player._game.hasKey(KEY_ARROW_LEFT) || this._player._game.hasKey(KEY_ARROW_RIGHT));

    if (this._status === HOOK_STATUS_IDLE) {
      if (spaceHeld && !this._reachedBottom) {
        this._castAngle = this._angle;
        this._status = HOOK_STATUS_CAST;
        this._ropeLength += HOOK_CAST_SPEED;
      } else {
        if (!spaceHeld) this._reachedBottom = false;
        this._swingPhase += HOOK_SWING_SPEED;
        this._angle = HOOK_MAX_SWING_ANGLE * Math.sin(this._swingPhase);
      }
    } else if (this._status === HOOK_STATUS_CAST) {
      const gameHeight = this._player._game.getSize().getHeight();
      const atBottom = this._endpoint().getY() >= gameHeight * HOOK_MAX_DEPTH_FACTOR;
      if (atBottom) this._reachedBottom = true;
      if (spaceHeld && !atBottom) {
        this._ropeLength += HOOK_CAST_SPEED;
      } else {
        this._ropeLength -= HOOK_REEL_SPEED;
        if (this._ropeLength <= HOOK_REST_LENGTH) {
          this._ropeLength = HOOK_REST_LENGTH;
          this._status = HOOK_STATUS_IDLE;
        }
      }
    } else if (this._status === HOOK_STATUS_CATCH) {
      this._catch.updateCaptured();
      this._ropeLength -= HOOK_CATCH_REEL_SPEED;
      if (this._ropeLength <= HOOK_REST_LENGTH) {
        this.clearCaptured();
      }
    }
  }

  draw(){
    super.draw();
    const pivot = this._pivot();
    const ep = this._endpoint();
    const pos = this.getPosition();
    const w = this._size.getWidth();
    const h = this._size.getHeight();

    this._ctx.save();
    this._ctx.beginPath();
    this._ctx.lineWidth = 5;
    this._ctx.strokeStyle = "brown";
    this._ctx.setLineDash([5, 5]);
    this._ctx.moveTo(pivot.getX(), pivot.getY());
    this._ctx.lineTo(ep.getX(), ep.getY());
    this._ctx.stroke();
    this._ctx.restore();

    if(this._player._game.isDebug()) {
      this._ctx.fillStyle = this._status === HOOK_STATUS_CATCH ? 'green' : 'red';
      this._ctx.font = "16px serif";
      this._ctx.fillText(`X ${pos.getX().toFixed(1)} Y ${pos.getY().toFixed(1)} angle ${this._angle.toFixed(3)}`, 10, 50);
      this._ctx.fillRect(pos.getX(), pos.getY(), w, h);
    }

    if (this._image) {
      this._ctx.drawImage(this._image, pos.getX(), pos.getY(), w, h);
    }

    if(this._catch) {
      this._catch.draw();
    }
  }

  hadCatch(){
    return this._status === HOOK_STATUS_CATCH;
  }

  isCasting(){
    return this._status === HOOK_STATUS_CAST;
  }

  setCatch(fish){
    this._status = HOOK_STATUS_CATCH;
    this._catch = fish;
    this._catchRopeStart = this._ropeLength;
    this._catch.captured(this);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Hook };
}
