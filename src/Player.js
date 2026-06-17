class Player extends GameObject {
  constructor(game, ctx, size, position) {
    super(ctx, size, position)
    this._game = game;
    this._sourceFrameSize = size;
    this._baseDisplaySize = size;
    this._hookBaseSize = new Size(25, 25);
    this._profileYOffset = 0;
    this._speedY  = 0;
    this._speedX  = 0;
    this._frameX = 0;
    this._frameY = 0;
    this._hook = new Hook (this, ctx, this._hookBaseSize , new Point(position.getX() , position.getY() + (size.getHeight() * HOOK_PIVOT_Y_FACTOR)));
    this._image = (typeof document !== 'undefined') ? document.getElementById('boat_idle') : null;
    this._castAnimation = (typeof document !== 'undefined') ? document.getElementById('boat_cast') : null;
    this._catchAnimation = (typeof document !== 'undefined') ? document.getElementById('boat_catch') : null;
    this._state = PLAYER_STATE_IDLE;
    this.__castAnimationEnded = false;
    this._gameFrame = 0;
    this._bobPhase  = 0;
    this._bobOffset = 0;
    this._angle     = 0;
    this._catchFrameX = 0;
    this._catchFrameY = 0;
  }

  getHook(){
    return this._hook;
  }

  setDisplayScale(scale) {
    const nextScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
    this._size = new Size(
      this._baseDisplaySize.getHeight() * nextScale,
      this._baseDisplaySize.getWidth() * nextScale
    );
    if (this._hook) {
      this._hook._size = new Size(
        this._hookBaseSize.getHeight() * nextScale,
        this._hookBaseSize.getWidth() * nextScale
      );
    }
  }

  getDisplayScale() {
    return this._size.getWidth() / this._baseDisplaySize.getWidth();
  }

  setProfileYOffset(offsetY) {
    this._profileYOffset = Number.isFinite(offsetY) ? offsetY : 0;
  }

  getPosition() {
    const p = super.getPosition();
    return new Point(p.getX(), p.getY() + this._profileYOffset + this._bobOffset);
  }

  update(dt = 0){
    super.update();

    const formerPosition = this._position;
    const lBound = formerPosition.getX();

    if(this._game.hasKey(KEY_ARROW_RIGHT) && formerPosition.getX() + this._size.getWidth() <= this._game.getSize().getWidth()) {
      this._speedX = 2;
      this._state = PLAYER_STATE_MOVING_R;
    }
    else if(this._game.hasKey(KEY_ARROW_LEFT) && lBound !== 0) {
      this._speedX = -2;
      this._state = PLAYER_STATE_MOVING_L;
    }
    else if (this._hook.isCasting()) {
      if(this._state !== PLAYER_STATE_CAST){
        this._frameY = this._frameX = 0;
        this.__castAnimationEnded = false;
      }
      this._state = PLAYER_STATE_CAST;
    }
    else {
      this._state = PLAYER_STATE_IDLE;
      this._speedX = 0;
    }

    // Override to REEL when a fish is being reeled in
    if (this._hook.hadCatch()) {
      if (this._state !== PLAYER_STATE_REEL) {
        this._catchFrameX = 0;
        this._catchFrameY = 0;
      }
      this._state = PLAYER_STATE_REEL;
    }

    // Bob: sinusoidal vertical offset (no tilt - keeps hook pivot aligned with rod tip)
    this._bobPhase  += ANIM_BOB_SPEED;
    this._bobOffset  = ANIM_BOB_AMPLITUDE * Math.sin(this._bobPhase);

    this._position = new Point(formerPosition.getX() + this._speedX, formerPosition.getY() + this._speedY);
    if(this.__castAnimationEnded || this._state !== PLAYER_STATE_CAST)
      this._hook.update(dt);
  }

  draw(){
    super.draw();
    const pos = this.getPosition();
    const w = this._size.getWidth();
    const h = this._size.getHeight();
    const sourceW = this._sourceFrameSize.getWidth();
    const sourceH = this._sourceFrameSize.getHeight();
    const cx = pos.getX() + w / 2;
    const cy = pos.getY() + h / 2;

    if (this._game.isDebug()) {
      this._ctx.strokeStyle = "red";
      this._ctx.fillRect(pos.getX(), pos.getY(), w, h);
      this._ctx.fillStyle = 'black';
      this._ctx.font = "16px serif";
      this._ctx.fillText(`frameX ${this._frameX} frameY ${this._frameY} state ${this._state}`, 10, 90);
    }

    if (this._state === PLAYER_STATE_REEL) {
      if (this._gameFrame % PLAYER_ANIM_STAGGER === 0) {
        if (this._catchFrameX < PLAYER_CATCH_MAX_FRAME_X) {
          ++this._catchFrameX;
        } else {
          this._catchFrameX = 0;
          this._catchFrameY = this._catchFrameY < PLAYER_CATCH_MAX_FRAME_Y ? this._catchFrameY + 1 : 0;
        }
      }
      this._ctx.save();
      this._ctx.translate(cx, cy);
      this._ctx.scale(1, 1);
      this._ctx.drawImage(this._catchAnimation, this._catchFrameX * sourceW, this._catchFrameY * sourceH, sourceW, sourceH, -w / 2, -h / 2, w, h);
      this._ctx.restore();
    } else if (this._state === PLAYER_STATE_MOVING_L || this._state === PLAYER_STATE_MOVING_R || this._state === PLAYER_STATE_IDLE) {
      if (this._gameFrame % PLAYER_ANIM_STAGGER === 0) {
        if (this._frameX < 3) {
          ++this._frameX;
        } else {
          this._frameX = 0;
          this._frameY = this._frameY < 4 ? this._frameY + 1 : 0;
        }
      }
      const flipX = this._state === PLAYER_STATE_MOVING_L ? -1 : 1;
      this._ctx.save();
      this._ctx.translate(cx, cy);
      this._ctx.scale(flipX, 1);
      this._ctx.drawImage(this._image, this._frameX * sourceW, this._frameY * sourceH, sourceW, sourceH, -w / 2, -h / 2, w, h);
      this._ctx.restore();
    } else {
      // CAST state
      if (this._gameFrame % PLAYER_ANIM_STAGGER === 0) {
        if (this.__castAnimationEnded) {
          this._frameY = 2;  // last row: rod pointed toward water, tip at y≈0.6
          this._frameX = 0;
        } else {
          if (this._frameX < 3) {
            ++this._frameX;
          } else {
            this._frameX = 0;
            if (this._frameY < 2) {
              ++this._frameY;
            } else {
              this._frameY = 0;
              this._frameX = 0;
              this.__castAnimationEnded = true;
            }
          }
        }
      }
      this._ctx.save();
      this._ctx.translate(cx, cy);
      this._ctx.scale(1, 1);
      this._ctx.drawImage(this._castAnimation, this._frameX * sourceW, this._frameY * sourceH, sourceW, sourceH, -w / 2, -h / 2, w, h);
      this._ctx.restore();
    }

    if (this.__castAnimationEnded || this._state !== PLAYER_STATE_CAST)
      this._hook.draw();
    ++this._gameFrame;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Player };
}
