const MILLIS_PER_SECOND = 1000;
const HOOK_IMAGE_ID     = 'hook';  // DOM id of the hook sprite img element

// Rope rendering
const HOOK_ROPE_LINE_WIDTH = 5;         // px - rope stroke width
const HOOK_ROPE_COLOR      = 'brown';   // rope stroke colour
const HOOK_ROPE_DASH       = [5, 5];    // dash/gap lengths for rope stroke

// Debug overlay
const HOOK_DEBUG_FONT         = '16px serif';
const HOOK_DEBUG_TEXT_X       = 10;      // px - x of debug text readout
const HOOK_DEBUG_TEXT_Y       = 50;      // px - y of debug text readout
const HOOK_DEBUG_COLOR_HOOKED = 'green'; // bounding-box fill when hooked
const HOOK_DEBUG_COLOR_IDLE   = 'red';   // bounding-box fill otherwise

// Escape particle tunables - search "TUNE" to find all knobs
const HOOK_PARTICLE_GRAVITY      = 0.2;                    // px/tick² downward acceleration - TUNE
const HOOK_PARTICLE_SHADOW_COLOR = 'rgba(255,80,0,0.9)';  // glow colour
const HOOK_PARTICLE_SHADOW_BLUR  = 12;                     // px shadow spread - TUNE
const HOOK_PARTICLE_SPEED_MIN    = 3;                      // px/tick minimum radial speed - TUNE
const HOOK_PARTICLE_SPEED_RANGE  = 4;                      // random extra speed above min - TUNE
const HOOK_PARTICLE_LIFE         = 40;                     // ticks a particle lives - TUNE
const HOOK_PARTICLE_SIZE_MIN     = 4;                      // px minimum radius - TUNE
const HOOK_PARTICLE_SIZE_RANGE   = 4;                      // random extra radius above min - TUNE
const HOOK_PARTICLE_VY_BIAS      = -2;                     // px/tick upward initial bias - TUNE
const HOOK_PARTICLE_GREEN_MAX    = 80;                     // 0-255 green channel at full life - TUNE

class Hook extends GameObject {

  constructor(player, ctx, size, position) {
    super(ctx, size, position);
    this._image = (typeof document !== 'undefined') ? document.getElementById(HOOK_IMAGE_ID) : null;
    this._player = player;
    this._status = HOOK_STATUS_IDLE;
    this._catch = null;
    this._catchRopeStart = null;
    this._swingPhase = 0;
    this._angle = 0;
    this._castAngle = 0;
    this._ropeLength = HOOK_REST_LENGTH;
    this._prevSpaceHeld = false;
    this._escapeProgress = 0;
    this._drawTick = 0;
    this._escapeParticles = [];
    this._hookedEventFired = false;
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
    return new Point(pos.getX() + w / 2, this._pivot().getY());
  }

  clearCaptured() {
    if (typeof document !== 'undefined' && this._catch) {
      const pos = this.getPosition();
      document.dispatchEvent(new CustomEvent(EVENT_ENEMY_CAPTURED, {
        detail: { enemyType: this._catch.constructor.name, x: pos.getX(), y: pos.getY() }
      }));
      document.dispatchEvent(new CustomEvent(EVENT_HOOK_IDLE));
    }
    this._catch = null;
    this._catchRopeStart = null;
    this._escapeProgress = 0;
    this._hookedEventFired = false;
    this._status = HOOK_STATUS_IDLE;
    this._ropeLength = HOOK_REST_LENGTH;
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

  update(dt = 0) {
    super.update();
    this._drawTick++;
    const dtSec = dt / MILLIS_PER_SECOND;
    const spaceHeld = this._player._game.hasKey(KEY_SPACE) &&
      !(this._player._game.hasKey(KEY_ARROW_LEFT) || this._player._game.hasKey(KEY_ARROW_RIGHT));
    const spacePressed = spaceHeld && !this._prevSpaceHeld;
    this._prevSpaceHeld = spaceHeld;

    if (this._status === HOOK_STATUS_IDLE) {
      if (spacePressed) {
        this._castAngle = this._angle;
        this._status = HOOK_STATUS_CAST;
        this._ropeLength += HOOK_CAST_SPEED;
        if (typeof document !== 'undefined') {
          document.dispatchEvent(new CustomEvent(EVENT_ROD_CASTED));
        }
      } else {
        this._swingPhase += HOOK_SWING_SPEED;
        this._angle = HOOK_MAX_SWING_ANGLE * Math.sin(this._swingPhase);
      }
    } else if (this._status === HOOK_STATUS_CAST) {
      const gameHeight = this._player._game.getSize().getHeight();
      const atBottom = this._endpoint().getY() >= gameHeight * HOOK_MAX_DEPTH_FACTOR;
      if (atBottom) {
        this._status = HOOK_STATUS_RETRIEVING_EMPTY;
        if (typeof document !== 'undefined') {
          document.dispatchEvent(new CustomEvent(EVENT_REEL_RETRIEVING));
        }
      } else {
        this._ropeLength += HOOK_CAST_SPEED;
      }
    } else if (this._status === HOOK_STATUS_HOOKED) {
      this._catch.updateCaptured();
      if (this.isCatchableFishHooked()) {
        if (!this._hookedEventFired) {
          this._hookedEventFired = true;
          if (typeof document !== 'undefined') {
            document.dispatchEvent(new CustomEvent(EVENT_ENEMY_HOOKED, {
              detail: { enemyType: this._catch.constructor.name }
            }));
          }
        }
        const fightSpec = this._catch.getFightSpec();
        this._escapeProgress += fightSpec.strength * fightSpec.escapeRate * dtSec;
        if (spacePressed) {
          this._escapeProgress = Math.max(0, this._escapeProgress - HOOK_STRUGGLE_REEL_POWER);
          this._ropeLength = Math.max(HOOK_REST_LENGTH, this._ropeLength - HOOK_REEL_DISTANCE_PER_PRESS);
        }
        if (this._escapeProgress >= HOOK_STRUGGLE_MAX_ESCAPE) {
          this._buildEscapeHookExplosion(this._endpoint());
          const escapee = this._catch;
          escapee.escaped();
          this._player._game.releaseEnemy(escapee);
          if (typeof document !== 'undefined') {
            const hookPos = this.getPosition();
            document.dispatchEvent(new CustomEvent(EVENT_ENEMY_ESCAPED, {
              detail: { enemyType: escapee.constructor.name, x: hookPos.getX(), y: hookPos.getY() }
            }));
          }
          this._catch = null;
          this._catchRopeStart = null;
          this._escapeProgress = 0;
          this._status = HOOK_STATUS_IDLE;
          this._ropeLength = HOOK_REST_LENGTH;
          if (typeof document !== 'undefined') {
            document.dispatchEvent(new CustomEvent(EVENT_HOOK_IDLE));
          }
          return;
        } else if (typeof document !== 'undefined') {
          const power = 1 - Math.min(1, this._escapeProgress / HOOK_STRUGGLE_MAX_ESCAPE);
          document.dispatchEvent(new CustomEvent(EVENT_REEL_POWER_CHANGED, { detail: { power } }));
        }
      } else {
        this._ropeLength -= HOOK_CATCH_REEL_SPEED;
      }
      if (this._ropeLength <= HOOK_REST_LENGTH) {
        this.clearCaptured();
      }
    } else if (this._status === HOOK_STATUS_RETRIEVING_EMPTY) {
      this._ropeLength -= HOOK_REEL_SPEED;
      if (this._ropeLength <= HOOK_REST_LENGTH) {
        this._ropeLength = HOOK_REST_LENGTH;
        this._status = HOOK_STATUS_IDLE;
        if (typeof document !== 'undefined') {
          document.dispatchEvent(new CustomEvent(EVENT_HOOK_IDLE));
        }
      }
    }
  }

  draw() {
    super.draw();
    const pivot = this._pivot();
    const ep = this._endpoint();
    const pos = this.getPosition();
    const w = this._size.getWidth();
    const h = this._size.getHeight();

    this._ctx.save();
    this._ctx.beginPath();
    this._ctx.lineWidth = HOOK_ROPE_LINE_WIDTH;
    this._ctx.strokeStyle = HOOK_ROPE_COLOR;
    this._ctx.setLineDash(HOOK_ROPE_DASH);
    this._ctx.moveTo(pivot.getX(), pivot.getY());
    this._ctx.lineTo(ep.getX(), ep.getY());
    this._ctx.stroke();
    this._ctx.restore();

    if (this._player._game.isDebug()) {
      this._ctx.fillStyle = this._status === HOOK_STATUS_HOOKED ? HOOK_DEBUG_COLOR_HOOKED : HOOK_DEBUG_COLOR_IDLE;
      this._ctx.font = HOOK_DEBUG_FONT;
      this._ctx.fillText(`X ${pos.getX().toFixed(1)} Y ${pos.getY().toFixed(1)} angle ${this._angle.toFixed(3)}`, HOOK_DEBUG_TEXT_X, HOOK_DEBUG_TEXT_Y);
      this._ctx.fillRect(pos.getX(), pos.getY(), w, h);
    }

    if (this._image) {
      this._ctx.drawImage(this._image, pos.getX(), pos.getY(), w, h);
    }

    if (this._catch) {
      this._catch.draw();
    }

    this._drawEscapeHookExplosion();
  }

  _drawEscapeHookExplosion() {
    for (let i = this._escapeParticles.length - 1; i >= 0; i--) {
      const p = this._escapeParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += HOOK_PARTICLE_GRAVITY;
      p.life--;
      if (p.life <= 0) { this._escapeParticles.splice(i, 1); continue; }
      const t = p.life / p.maxLife;
      this._ctx.save();
      this._ctx.globalAlpha = t;
      this._ctx.shadowColor = HOOK_PARTICLE_SHADOW_COLOR;
      this._ctx.shadowBlur = HOOK_PARTICLE_SHADOW_BLUR;
      this._ctx.fillStyle = `rgba(255,${Math.round(t * HOOK_PARTICLE_GREEN_MAX)},0,1)`;
      this._ctx.beginPath();
      this._ctx.arc(p.x, p.y, p.size * t, 0, Math.PI * 2);
      this._ctx.fill();
      this._ctx.restore();
    }
  }

  hadCatch() {
    return this._status === HOOK_STATUS_HOOKED;
  }

  isCasting() {
    return this._status === HOOK_STATUS_CAST;
  }

  isRetrievingEmpty() {
    return this._status === HOOK_STATUS_RETRIEVING_EMPTY;
  }

  isHooked() {
    return this._status === HOOK_STATUS_HOOKED;
  }

  isCatchableFishHooked() {
    return this._catch instanceof CatchableFish;
  }

  _buildEscapeHookExplosion(pos) {
    for (let i = 0; i < CAPTURE_ESCAPE_PARTICLES; i++) {
      const angle = (Math.PI * 2 * i) / CAPTURE_ESCAPE_PARTICLES;
      const speed = HOOK_PARTICLE_SPEED_MIN + Math.random() * HOOK_PARTICLE_SPEED_RANGE;
      this._escapeParticles.push({
        x: pos.getX(), y: pos.getY(),
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed + HOOK_PARTICLE_VY_BIAS,
        life: HOOK_PARTICLE_LIFE, maxLife: HOOK_PARTICLE_LIFE,
        size: HOOK_PARTICLE_SIZE_MIN + Math.random() * HOOK_PARTICLE_SIZE_RANGE
      });
    }
  }

  setCatch(entity) {
    this._status = HOOK_STATUS_HOOKED;
    this._catch = entity;
    this._catchRopeStart = this._ropeLength;
    this._escapeProgress = 0;
    this._hookedEventFired = false;
    entity.captured(this);
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent(EVENT_REEL_RETRIEVING));
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Hook };
}
