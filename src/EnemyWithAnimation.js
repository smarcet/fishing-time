// Debug overlay
const ENEMY_DEBUG_COLOR    = 'red';
const ENEMY_DEBUG_FONT     = '16px serif';
const ENEMY_DEBUG_TEXT_X   = 10;    // px - x of debug text readout
const ENEMY_DEBUG_TEXT_Y_X = 200;   // px - y of the X-coord line
const ENEMY_DEBUG_TEXT_Y_Y = 220;   // px - y of the Y-coord line

// Capture glow pulse
const CAPTURE_PULSE_DANGER_FACTOR  = 3;    // how much danger multiplies pulse speed - TUNE
const CAPTURE_GLOW_MIN_SIZE        = 5;    // px - minimum glow radius - TUNE
const CAPTURE_GLOW_BASE_OFFSET     = 15;   // px - glow center offset - TUNE
const CAPTURE_GLOW_AMPLITUDE       = 25;   // px - sine wave amplitude for glow - TUNE
const CAPTURE_GLOW_DANGER_SCALE    = 0.6;  // glow size multiplier at max danger - TUNE

// Capture shadow colour (gold -> red as danger increases)
const CAPTURE_COLOR_GREEN_SAFE     = 215;  // 0-255 green channel when danger = 0 (gold) - TUNE
const CAPTURE_SHADOW_ALPHA_BASE    = 0.85; // shadow alpha at no danger - TUNE
const CAPTURE_SHADOW_ALPHA_DANGER  = 0.1;  // extra alpha added at max danger - TUNE

// Throw arc
const CAPTURE_THROW_SCALE_REDUCTION = 0.7; // scale shrinks by this fraction over throw - TUNE

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

    // Escape danger: 0 (safe) to 1 (about to escape) - drives color and speed
    const escapeDanger = this._hook.isCatchableFishHooked()
      ? Math.min(1, this._hook._escapeProgress / HOOK_STRUGGLE_MAX_ESCAPE)
      : 0;

    // Pulse speeds up 4× as fish nears escape; glow size grows too
    const pulseSpeed = CAPTURE_GLOW_SPEED * (1 + escapeDanger * CAPTURE_PULSE_DANGER_FACTOR);
    const baseGlow = Math.max(CAPTURE_GLOW_MIN_SIZE, CAPTURE_GLOW_BASE_OFFSET + CAPTURE_GLOW_AMPLITUDE * Math.sin(this._captureTick * pulseSpeed));
    const glowSize = baseGlow * (1 + escapeDanger * CAPTURE_GLOW_DANGER_SCALE);

    // Color: gold rgba(255,215,0) -> red rgba(255,30,0) as danger increases
    const shadowColor = `rgba(255,${Math.round(CAPTURE_COLOR_GREEN_SAFE * (1 - escapeDanger))},0,${(CAPTURE_SHADOW_ALPHA_BASE + escapeDanger * CAPTURE_SHADOW_ALPHA_DANGER).toFixed(2)})`;

    // cx/cy = visual center of sprite in world coords
    let cx = hookTip.getX();
    let cy = hookTip.getY();
    let scale = 1.0;
    let alpha = 1.0;
    let glow = glowSize;

    const raw = this._hook.getCaptureRawProgress();
    if (raw >= CAPTURE_THROW_THRESHOLD) {
      const t = (raw - CAPTURE_THROW_THRESHOLD) / (1 - CAPTURE_THROW_THRESHOLD);
      const target = this._hook.getLandingTarget();
      cx += (target.getX() - hookTip.getX()) * t;
      cy += (target.getY() - hookTip.getY()) * t;
      cy -= Math.sin(t * Math.PI) * CAPTURE_THROW_ARC_Y;
      scale = 1.0 - t * CAPTURE_THROW_SCALE_REDUCTION;
      alpha = 1.0 - t;
      glow = glowSize * (1.0 - t);
    }

    this._ctx.save();
    this._ctx.shadowColor = shadowColor;
    this._ctx.shadowBlur = glow;
    this._ctx.globalAlpha = Math.max(0, alpha);
    this._ctx.translate(cx, cy);
    this._ctx.scale(scale, scale);
    this._drawCapturedSprite(-w / 2, -h / 2, w, h);
    this._ctx.restore();
  }

  _drawCapturedSprite(dx, dy, w, h) {
    const sw = this._sw || w;
    const sh = this._sh || h;
    this._ctx.drawImage(this._image, this._dieFrameX * sw, this._dieFrameY * sh, sw, sh, dx, dy, w, h);
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
      this._ctx.fillStyle = ENEMY_DEBUG_COLOR;
      this._ctx.font = ENEMY_DEBUG_FONT;
      this._ctx.fillText(`X ${dx} `, ENEMY_DEBUG_TEXT_X, ENEMY_DEBUG_TEXT_Y_X);
      this._ctx.fillText(`Y ${dy} `, ENEMY_DEBUG_TEXT_X, ENEMY_DEBUG_TEXT_Y_Y);
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
