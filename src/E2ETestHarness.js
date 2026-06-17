'use strict';

class E2ETestHarness {
  constructor(game, options = {}) {
    this._game = game;
    this._window = options.window || (typeof window !== 'undefined' ? window : null);
    this._enabled = options.enabled === undefined ? this._isEnabledFromLocation() : options.enabled === true;
  }

  attach() {
    if (!this._enabled || !this._window) {
      this.destroy();
      return;
    }
    this._window.__fishingTimeE2E = {
      forceHookedFish: (enemyType) => this._game.forceHookedFishForE2E(enemyType),
      getRuntimeStats: () => this._game.getRuntimeStats(),
      sampleFrames: (durationMs) => this.sampleFrames(durationMs),
    };
  }

  destroy() {
    if (this._window && this._window.__fishingTimeE2E) {
      delete this._window.__fishingTimeE2E;
    }
  }

  sampleFrames(durationMs = 5000) {
    const win = this._window;
    if (!win) {
      return Promise.resolve({ samples: 0, averageMs: 0, p95Ms: 0 });
    }
    const requestFrame = win.requestAnimationFrame
      ? win.requestAnimationFrame.bind(win)
      : (callback) => win.setTimeout(() => callback(Date.now()), 16);
    const targetDuration = Math.max(0, durationMs);
    const deltas = [];

    return new Promise((resolve) => {
      let start = null;
      let previous = null;
      const collect = (timestamp) => {
        if (start === null) start = timestamp;
        if (previous !== null) deltas.push(timestamp - previous);
        previous = timestamp;
        if (timestamp - start >= targetDuration) {
          resolve(this._summarizeFrameDeltas(deltas));
          return;
        }
        requestFrame(collect);
      };
      requestFrame(collect);
    });
  }

  _summarizeFrameDeltas(deltas) {
    if (!deltas.length) return { samples: 0, averageMs: 0, p95Ms: 0 };
    const sorted = deltas.slice().sort((a, b) => a - b);
    const sum = deltas.reduce((total, delta) => total + delta, 0);
    const p95Index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
    return {
      samples: deltas.length,
      averageMs: sum / deltas.length,
      p95Ms: sorted[p95Index],
    };
  }

  _isEnabledFromLocation() {
    if (!this._window || !this._window.location) return false;
    const search = this._window.location.search || '';
    return /(?:^\?|&)e2e=1(?:&|$)/.test(search);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { E2ETestHarness };
}
