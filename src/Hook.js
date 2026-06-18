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

// Capture launch render tunables - search "TUNE" to find all knobs
const CAPTURE_LAUNCH_ARC_Y          = 70;   // px - arc height at midpoint - TUNE
const CAPTURE_LAUNCH_SCALE_START    = 1.0;  // sprite scale at launch origin - TUNE
const CAPTURE_LAUNCH_SCALE_END      = 1.25; // sprite scale at boat landing - TUNE
const CAPTURE_LAUNCH_GLOW_BLUR      = 20;   // px shadow spread for entity glow - TUNE
const CAPTURE_SPARKLES_PER_TICK     = 3;    // particles spawned each update tick - TUNE
const CAPTURE_SPARKLE_SPREAD        = 14;   // px random positional jitter - TUNE
const CAPTURE_SPARKLE_DRIFT         = 1.2;  // px/tick max random velocity - TUNE
const CAPTURE_SPARKLE_LIFE          = 18;   // ticks a sparkle lives - TUNE
const CAPTURE_SPARKLE_SIZE_MIN      = 2;    // px minimum radius - TUNE
const CAPTURE_SPARKLE_SIZE_RANGE    = 3;    // random extra radius above min - TUNE
const CAPTURE_SPARKLE_SHADOW_BLUR   = 8;    // px glow on each sparkle - TUNE

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
    this._escapeProgress = 0;
    this._drawTick = 0;
    this._escapeParticles = [];
    this._hookedEventFired = false;
    this._launchEntity = null;
    this._launchOrigin = null;
    this._launchTarget = null;
    this._launchElapsedMs = 0;
    this._captureTrail = [];
    this._castRequested = false;
    this._reelTapCount = 0;
    this._reelForce = 0;
    this._isReeling = false;

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
        this._beginCaptureLaunch();
      }
    } else if (this._status === HOOK_STATUS_CAPTURE_LAUNCH) {
      this._launchElapsedMs += dt;
      const lt = Math.min(1, this._launchElapsedMs / CAPTURE_LAUNCH_DURATION_MS);
      const lp = this._captureLaunchPoint(lt);
      this._spawnCaptureSparkles(lp.getX(), lp.getY());
      if (this._launchElapsedMs >= CAPTURE_LAUNCH_DURATION_MS) {
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
    this._drawCaptureTrail();
    this._drawCaptureLaunch();
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

  _beginCaptureLaunch() {
    this._launchOrigin = this.getEndpoint();
    this._launchTarget = this.getLandingTarget();
    this._launchEntity = this._catch;
    this._catch = null;
    this._launchElapsedMs = 0;
    this._status = HOOK_STATUS_CAPTURE_LAUNCH;
  }

  _finishCaptureLaunch() {
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
    this._launchEntity = null;
    this._launchOrigin = null;
    this._launchTarget = null;
    this._launchElapsedMs = 0;
    this._catchRopeStart = null;
    this._escapeProgress = 0;
    this._hookedEventFired = false;
    this._status = HOOK_STATUS_IDLE;
    this._ropeLength = HOOK_REST_LENGTH;
  }

  _captureLaunchPoint(t) {
    const ox = this._launchOrigin.getX(), oy = this._launchOrigin.getY();
    const tx = this._launchTarget.getX(), ty = this._launchTarget.getY();
    const x = ox + (tx - ox) * t;
    const y = oy + (ty - oy) * t - Math.sin(t * Math.PI) * CAPTURE_LAUNCH_ARC_Y;
    return new Point(x, y);
  }

  _spawnCaptureSparkles(x, y) {
    for (let i = 0; i < CAPTURE_SPARKLES_PER_TICK; i++) {
      const jx = (Math.random() - 0.5) * CAPTURE_SPARKLE_SPREAD;
      const jy = (Math.random() - 0.5) * CAPTURE_SPARKLE_SPREAD;
      const vx = (Math.random() - 0.5) * CAPTURE_SPARKLE_DRIFT * 2;
      const vy = (Math.random() - 0.5) * CAPTURE_SPARKLE_DRIFT * 2;
      this._captureTrail.push({
        x: x + jx, y: y + jy, vx, vy,
        life: CAPTURE_SPARKLE_LIFE, maxLife: CAPTURE_SPARKLE_LIFE,
        size: CAPTURE_SPARKLE_SIZE_MIN + Math.random() * CAPTURE_SPARKLE_SIZE_RANGE,
        color: CAPTURE_SPARKLE_COLORS[i % CAPTURE_SPARKLE_COLORS.length]
      });
    }
  }

  _drawCaptureTrail() {
    for (let i = this._captureTrail.length - 1; i >= 0; i--) {
      const p = this._captureTrail[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) { this._captureTrail.splice(i, 1); continue; }
      const t = p.life / p.maxLife;
      this._ctx.save();
      this._ctx.globalAlpha = t;
      this._ctx.shadowColor = p.color;
      this._ctx.shadowBlur = CAPTURE_SPARKLE_SHADOW_BLUR;
      this._ctx.fillStyle = p.color;
      this._ctx.beginPath();
      this._ctx.arc(p.x, p.y, p.size * t, 0, Math.PI * 2);
      this._ctx.fill();
      this._ctx.restore();
    }
  }

  _drawCaptureLaunch() {
    if (this._status !== HOOK_STATUS_CAPTURE_LAUNCH || !this._launchEntity) return;
    const e = this._launchEntity;
    const w = e.getSize().getWidth();
    const h = e.getSize().getHeight();
    const t = Math.min(1, this._launchElapsedMs / CAPTURE_LAUNCH_DURATION_MS);
    const p = this._captureLaunchPoint(t);
    const scale = CAPTURE_LAUNCH_SCALE_START + (CAPTURE_LAUNCH_SCALE_END - CAPTURE_LAUNCH_SCALE_START) * t;
    const alpha = t < 0.75 ? 1.0 : Math.max(0, 1 - (t - 0.75) / 0.25);
    this._ctx.save();
    this._ctx.globalAlpha = alpha;
    this._ctx.shadowColor = CAPTURE_LAUNCH_GLOW_COLOR;
    this._ctx.shadowBlur = CAPTURE_LAUNCH_GLOW_BLUR;
    this._ctx.translate(p.getX() + (e._captureOffsetX || 0), p.getY() + (e._captureOffsetY || 0));
    this._ctx.scale(scale, scale);
    this._ctx.rotate((e._captureRotation || 0) * Math.PI / 180);
    e._drawCapturedSprite(-w / 2, -h / 2, w, h);
    this._ctx.restore();
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
    return this._captureTrail.length;
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
