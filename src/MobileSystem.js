'use strict';

class MobileSystem {
  constructor(options = {}) {
    this._window = options.window || (typeof window !== 'undefined' ? window : null);
    this._document = options.document || (typeof document !== 'undefined' ? document : null);
    this._canvas = options.canvas || (this._document && this._document.getElementById ? this._document.getElementById('canvas1') : null);
    this._overlay = options.overlay || (this._document && this._document.getElementById ? this._document.getElementById('rotate-overlay') : null);
    this._navControls = options.navControls || [];
    this._touchInputSystem = options.touchInputSystem || null;
    this._game = null;
    this._inputSystem = null;
    this._attached = false;
    this._handleViewportChange = () => this.apply();
  }

  attach(game, inputSystem = null) {
    this._game = game;
    this._inputSystem = inputSystem || this._touchInputSystem;
    if (!this._attached && this._window) {
      this._window.addEventListener('resize', this._handleViewportChange);
      this._window.addEventListener('orientationchange', this._handleViewportChange);
      const orientation = this._window.screen && this._window.screen.orientation;
      if (orientation && typeof orientation.addEventListener === 'function') {
        orientation.addEventListener('change', this._handleViewportChange);
      }
      this._attached = true;
    }
    this.apply();
  }

  destroy() {
    if (this._attached && this._window) {
      this._window.removeEventListener('resize', this._handleViewportChange);
      this._window.removeEventListener('orientationchange', this._handleViewportChange);
      const orientation = this._window.screen && this._window.screen.orientation;
      if (orientation && typeof orientation.removeEventListener === 'function') {
        orientation.removeEventListener('change', this._handleViewportChange);
      }
    }
    if (this._touchInputSystem && typeof this._touchInputSystem.destroy === 'function') {
      this._touchInputSystem.destroy();
    }
    this._attached = false;
  }

  getSnapshot() {
    const width = this._window ? this._window.innerWidth : 0;
    const height = this._window ? this._window.innerHeight : 0;
    const coarsePointer = this._window && typeof this._window.matchMedia === 'function'
      ? this._window.matchMedia('(pointer: coarse)').matches
      : false;
    const touchPoints = this._window && this._window.navigator
      ? this._window.navigator.maxTouchPoints || 0
      : 0;
    const isMobile = touchPoints > 0 || coarsePointer;
    const isPortrait = height > width;
    const isLandscape = width >= height;
    const profile = isMobile ? GAMEPLAY_PROFILE_MOBILE : GAMEPLAY_PROFILE_DESKTOP;
    return {
      width,
      height,
      isMobile,
      isPortrait,
      isLandscape,
      blocked: isMobile && isPortrait,
      canvasScale: 1,
      profile,
    };
  }

  apply() {
    const snapshot = this.getSnapshot();
    if (this._canvas) {
      this._canvas.width = snapshot.width;
      this._canvas.height = snapshot.height;
    }
    if (this._overlay) {
      this._overlay.hidden = !snapshot.blocked;
    }
    this._navControls.forEach(control => {
      if (control) control.hidden = !snapshot.isMobile || snapshot.blocked;
    });
    if (this._game && typeof this._game.resize === 'function') {
      this._game.resize(
        new Size(snapshot.height, snapshot.width),
        snapshot.profile,
        { resetTraffic: snapshot.isMobile }
      );
    }
    if (this._game && typeof this._game.setPaused === 'function') {
      this._game.setPaused(snapshot.blocked);
    }
    if (this._inputSystem && typeof this._inputSystem.setEnabled === 'function') {
      this._inputSystem.setEnabled(!snapshot.blocked);
    }
    return snapshot;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MobileSystem };
}
