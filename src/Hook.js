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
    this._escapeProgress = 0;
    this._drawTick = 0;
    this._hookedEventFired = false;
    this._launchEntity = null;
    this._launchTarget = null;
    this._castRequested = false;
    this._reelTapCount = 0;
    this._reelForce = 0;
    this._isReeling = false;

    // Three dedicated animation objects own all visual-effect state. Hook triggers
    // them but holds none of their internal particle/timing data.
    this._escapeExplosion = new EscapeExplosionAnimation(ctx);
    this._capturePoof     = new CapturePoofAnimation(ctx);
    this._captureLaunch   = new CaptureLaunchAnimation(ctx);

    this._handleCastRequested = () => {
      if (this._status === HOOK_STATUS_IDLE) this._castRequested = true;
    };
    this._handleReelTap = () => {
      if (this._status === HOOK_STATUS_HOOKED) {
        this._reelTapCount += 1;
        this._reelForce = Math.min(HOOK_STRUGGLE_MAX_ESCAPE, this._reelForce + HOOK_STRUGGLE_REEL_POWER);
      }
    };
    this._handleReelStart = () => {
      this._isReeling = true;
    };
    this._handleReelStop = () => {
      this._isReeling = false;
    };

    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener(EVENT_CAST_REQUESTED, this._handleCastRequested);
      document.addEventListener(EVENT_REEL_TAP, this._handleReelTap);
      document.addEventListener(EVENT_REEL_START, this._handleReelStart);
      document.addEventListener(EVENT_REEL_STOP, this._handleReelStop);
    }
  }

  _pivot() {
    const pos = this._player.getPosition();
    const w = this._player.getSize().getWidth();
    const casting = this._player._state === PLAYER_STATE_CAST;
    const displayScale = typeof this._player.getDisplayScale === 'function'
      ? this._player.getDisplayScale()
      : 1;
    const xOffset = (casting ? HOOK_CAST_PIVOT_X_OFFSET : HOOK_PIVOT_X_OFFSET) * displayScale;
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

  update(dt = 0) {
    super.update();
    this._drawTick++;
    const dtSec = dt / MILLIS_PER_SECOND;
    const castRequested = this._castRequested;
    const reelTapCount = this._reelTapCount;
    this._castRequested = false;
    this._reelTapCount = 0;
    this._reelForce = Math.max(0, this._reelForce - HOOK_STRUGGLE_REEL_POWER * dtSec);

    if (this._status === HOOK_STATUS_IDLE) {
      if (castRequested) {
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
        if (reelTapCount > 0) {
          this._escapeProgress = Math.max(0, this._escapeProgress - HOOK_STRUGGLE_REEL_POWER * reelTapCount);
          this._ropeLength = Math.max(HOOK_REST_LENGTH, this._ropeLength - HOOK_REEL_DISTANCE_PER_PRESS * reelTapCount);
        }
        if (this._isReeling && this._reelForce > 0 && dtSec > 0) {
          this._escapeProgress = Math.max(0, this._escapeProgress - this._reelForce * dtSec);
        }
        if (this._escapeProgress >= HOOK_STRUGGLE_MAX_ESCAPE) {
          const ep = this._endpoint();
          this._escapeExplosion.start({ x: ep.getX(), y: ep.getY() });
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
        } else if (typeof document !== 'undefined') {
          const power = 1 - Math.min(1, this._escapeProgress / HOOK_STRUGGLE_MAX_ESCAPE);
          document.dispatchEvent(new CustomEvent(EVENT_REEL_POWER_CHANGED, { detail: { power } }));
        }
      } else {
        this._ropeLength -= HOOK_CATCH_REEL_SPEED;
      }
      // Status guard replaces the early return that previously ended the escape
      // branch; after an escape _status is IDLE so this is correctly skipped.
      if (this._status === HOOK_STATUS_HOOKED && this._ropeLength <= HOOK_REST_LENGTH) {
        this._beginCaptureLaunch();
      }
    } else if (this._status === HOOK_STATUS_CAPTURE_LAUNCH) {
      this._captureLaunch.update(dt);
      if (this._captureLaunch.isFinished()) {
        this._finishCaptureLaunch();
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

    // Advance animations every frame. Running these after the state machine means
    // any animation started this frame (e.g. escapeExplosion.start) is advanced
    // exactly once before draw() renders it -- same per-frame advance count as
    // before the refactor when advancement happened inside draw().
    this._capturePoof.update(dt);
    this._escapeExplosion.update(dt);
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

    // Draw order preserved from pre-refactor: explosion at back, launch arc on top.
    this._escapeExplosion.draw(this._ctx);
    this._capturePoof.draw(this._ctx);
    this._captureLaunch.draw(this._ctx);
  }

  // Snapshot endpoint and landing target NOW (before rope length changes further),
  // hand them to the launch animation, and null _catch so the fish stops drawing
  // while the arc plays. _launchEntity and _launchTarget stay on Hook because
  // _finishCaptureLaunch needs them for the EVENT_ENEMY_CAPTURED payload.
  _beginCaptureLaunch() {
    this._launchTarget = this.getLandingTarget();
    this._launchEntity = this._catch;
    this._catch = null;
    this._captureLaunch.start({
      entity: this._launchEntity,
      origin: this.getEndpoint(),
      target: this._launchTarget,
    });
    this._status = HOOK_STATUS_CAPTURE_LAUNCH;
  }

  _finishCaptureLaunch() {
    // Read-before-null: poof position and event payload are derived from
    // _launchTarget/_launchEntity, which must be read before they are cleared.
    this._capturePoof.start({
      x: this._launchTarget.getX(),
      y: this._launchTarget.getY(),
      dirAngle: this._getPlayerFrontDirection(),
    });
    if (typeof document !== 'undefined' && this._launchEntity) {
      document.dispatchEvent(new CustomEvent(EVENT_ENEMY_CAPTURED, {
        detail: {
          enemyType: this._launchEntity.constructor.name,
          x: this._launchTarget.getX(),
          y: this._launchTarget.getY()
        }
      }));
      document.dispatchEvent(new CustomEvent(EVENT_HOOK_IDLE));
    }
    this._captureLaunch.reset();
    this._launchEntity = null;
    this._launchTarget = null;
    this._catchRopeStart = null;
    this._escapeProgress = 0;
    this._hookedEventFired = false;
    this._status = HOOK_STATUS_IDLE;
    this._ropeLength = HOOK_REST_LENGTH;
  }

  _getPlayerFrontDirection() {
    return (this._player && this._player._state === PLAYER_STATE_MOVING_L) ? 0 : Math.PI;
  }

  hadCatch() {
    return this._status === HOOK_STATUS_HOOKED || this._status === HOOK_STATUS_CAPTURE_LAUNCH;
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

  getStatus() {
    return this._status;
  }

  getCaptureTrailCount() {
    return this._capturePoof.isActive() ? 1 : 0;
  }

  destroy() {
    if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
      document.removeEventListener(EVENT_CAST_REQUESTED, this._handleCastRequested);
      document.removeEventListener(EVENT_REEL_TAP, this._handleReelTap);
      document.removeEventListener(EVENT_REEL_START, this._handleReelStart);
      document.removeEventListener(EVENT_REEL_STOP, this._handleReelStop);
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
