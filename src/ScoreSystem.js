'use strict';

const SCORE_MAP = FISH_SCORE_MAP;

const LS_KEY_HIGH_SCORE = 'fishingTime_highScore';

const ESCAPE_PENALTY_DIVISOR = 2;
const EVADE_PENALTY_DIVISOR  = 4;

const HUD_FONT         = 'bold 34px monospace';
const HUD_LINE_WIDTH   = 3;
const HUD_STROKE_COLOR = 'black';
const HUD_FILL_COLOR   = 'white';
const HUD_MARGIN_RIGHT = 20;
const HUD_SCORE_Y      = 40;
const HUD_BEST_Y       = 85;

const ANIM_COLOR_POSITIVE   = '#00dd55';
const ANIM_COLOR_NEGATIVE   = '#ff2244';
const ANIM_COLOR_TIME_BONUS = '#ffd700';
const ANIM_ALPHA_INITIAL  = 1.0;
const ANIM_ALPHA_DECAY    = 1 / 120;
const ANIM_VY             = -2;
const ANIM_FONT_SIZE_START = 24;
const ANIM_FONT_GROWTH    = 0.29;
const ANIM_LINE_WIDTH     = 2;
const ANIM_SHADOW_BLUR    = 18;

class ScoreSystem {
  constructor() {
    const hasStorage = typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function' && typeof localStorage.setItem === 'function';
    this._score = 0;
    this._highScore = hasStorage ? (parseInt(localStorage.getItem(LS_KEY_HIGH_SCORE)) || 0) : 0;
    this._animations = [];
    this._scale = 1;

    this._handleCapture = (e) => {
      const pts = SCORE_MAP[e.detail.enemyType];
      if (pts !== undefined) {
        this._score += pts;
        if (pts > 0 && this._score > this._highScore) this._highScore = this._score;
        this._persist();
        this._animations.push({
          text: pts > 0 ? `+${pts}` : `${pts}`,
          x: e.detail.x ?? 0,
          y: e.detail.y ?? 0,
          alpha: ANIM_ALPHA_INITIAL,
          vy: ANIM_VY,
          color: pts > 0 ? ANIM_COLOR_POSITIVE : ANIM_COLOR_NEGATIVE,
          fontSize: ANIM_FONT_SIZE_START,
          fontGrowth: ANIM_FONT_GROWTH,
        });
      }
    };
    this._handleEscape = (e) => {
      const pts = SCORE_MAP[e.detail.enemyType];
      if (pts !== undefined && pts > 0) {
        this._score -= Math.floor(pts / ESCAPE_PENALTY_DIVISOR);
        this._persist();
        const delta = -Math.floor(pts / ESCAPE_PENALTY_DIVISOR);
        this._animations.push({
          text: delta > 0 ? `+${delta}` : `${delta}`,
          x: e.detail.x ?? 0,
          y: e.detail.y ?? 0,
          alpha: ANIM_ALPHA_INITIAL,
          vy: ANIM_VY,
          color: delta > 0 ? ANIM_COLOR_POSITIVE : ANIM_COLOR_NEGATIVE,
          fontSize: ANIM_FONT_SIZE_START,
          fontGrowth: ANIM_FONT_GROWTH,
        });
      }
    };
    this._handleEvade = (e) => {
      const pts = SCORE_MAP[e.detail.enemyType];
      if (pts !== undefined && pts > 0) { this._score -= Math.floor(pts / EVADE_PENALTY_DIVISOR); this._persist(); }
    };
    this._handleTimeBonus = (e) => {
      this._animations.push({
        text: `+${e.detail.seconds}s`,
        x: e.detail.x ?? 0,
        y: e.detail.y ?? 0,
        alpha: ANIM_ALPHA_INITIAL,
        vy: ANIM_VY,
        color: ANIM_COLOR_TIME_BONUS,
        fontSize: ANIM_FONT_SIZE_START,
        fontGrowth: ANIM_FONT_GROWTH,
      });
    };
    if (typeof document !== 'undefined') {
      document.addEventListener(EVENT_ENEMY_CAPTURED, this._handleCapture);
      document.addEventListener(EVENT_ENEMY_ESCAPED, this._handleEscape);
      document.addEventListener(EVENT_ENEMY_EVADED, this._handleEvade);
      document.addEventListener(EVENT_TIME_BONUS, this._handleTimeBonus);
    }
  }

  update() {
    for (const a of this._animations) {
      a.y += a.vy;
      a.alpha -= ANIM_ALPHA_DECAY;
      if (a.fontGrowth) a.fontSize += a.fontGrowth;
    }
    this._animations = this._animations.filter(a => a.alpha > 0);
  }

  _persist() {
    if (typeof localStorage === 'undefined' || typeof localStorage.setItem !== 'function') return;
    localStorage.setItem(LS_KEY_HIGH_SCORE, String(this._highScore));
  }

  getScore() { return this._score; }

  setScale(scale) {
    this._scale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  }

  draw(ctx, canvasWidth) {
    const scale = this._scale;
    ctx.save();
    ctx.font = `bold ${Math.round(34 * scale)}px monospace`;
    ctx.textAlign = 'right';
    ctx.lineWidth = Math.max(1, HUD_LINE_WIDTH * scale);
    ctx.strokeStyle = HUD_STROKE_COLOR;
    ctx.fillStyle = HUD_FILL_COLOR;
    const x = canvasWidth - HUD_MARGIN_RIGHT * scale;
    const scoreY = HUD_SCORE_Y * scale;
    const bestY = HUD_BEST_Y * scale;
    const scoreColor = this._score < 0 ? ANIM_COLOR_NEGATIVE : this._score > 0 ? ANIM_COLOR_POSITIVE : HUD_FILL_COLOR;
    ctx.fillStyle = scoreColor;
    ctx.strokeText(`Score: ${this._score}`, x, scoreY);
    ctx.fillText(`Score: ${this._score}`, x, scoreY);
    ctx.fillStyle = HUD_FILL_COLOR;
    ctx.strokeText(`Best: ${this._highScore}`, x, bestY);
    ctx.fillText(`Best: ${this._highScore}`, x, bestY);
    ctx.textAlign = 'left';
    ctx.lineWidth = Math.max(1, ANIM_LINE_WIDTH * scale);
    for (const a of this._animations) {
      const color = a.color || ANIM_COLOR_POSITIVE;
      ctx.globalAlpha = a.alpha;
      ctx.font = `bold ${Math.round((a.fontSize ?? ANIM_FONT_SIZE_START) * scale)}px monospace`;
      ctx.shadowBlur = ANIM_SHADOW_BLUR;
      ctx.shadowColor = color;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.strokeText(a.text, a.x, a.y);
      ctx.fillText(a.text, a.x, a.y);
    }
    ctx.restore();
  }

  destroy() {
    if (typeof document !== 'undefined') {
      document.removeEventListener(EVENT_ENEMY_CAPTURED, this._handleCapture);
      document.removeEventListener(EVENT_ENEMY_ESCAPED, this._handleEscape);
      document.removeEventListener(EVENT_ENEMY_EVADED, this._handleEvade);
      document.removeEventListener(EVENT_TIME_BONUS, this._handleTimeBonus);
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ScoreSystem, SCORE_MAP };
}
