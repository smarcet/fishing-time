'use strict';

class AudioSystem {
  constructor() {
    this._reelAudio = null;
    this._handleCapture   = () => this._play('sfx/fish.mp3');
    this._handleHooked    = () => this._play('sfx/bite.mp3');
    this._handleCast      = () => this._play('sfx/cast.mp3');
    this._handleReel      = () => {
      if (typeof Audio === 'undefined') return;
      if (this._reelAudio) { this._reelAudio.pause(); }
      this._reelAudio = new Audio('sfx/fishing-reel.mp3');
      this._reelAudio.play().catch(() => {});
    };
    this._handleIdle = () => {
      if (this._reelAudio) {
        this._reelAudio.pause();
        this._reelAudio = null;
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener(EVENT_ENEMY_CAPTURED,  this._handleCapture);
      document.addEventListener(EVENT_ENEMY_HOOKED,    this._handleHooked);
      document.addEventListener(EVENT_ROD_CASTED,      this._handleCast);
      document.addEventListener(EVENT_REEL_RETRIEVING, this._handleReel);
      document.addEventListener(EVENT_HOOK_IDLE,       this._handleIdle);
    }
  }

  _play(src) {
    if (typeof Audio === 'undefined') return;
    const audio = new Audio(src);
    audio.play().catch(() => {});
  }

  destroy() {
    if (this._reelAudio) {
      this._reelAudio.pause();
      this._reelAudio = null;
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener(EVENT_ENEMY_CAPTURED,  this._handleCapture);
      document.removeEventListener(EVENT_ENEMY_HOOKED,    this._handleHooked);
      document.removeEventListener(EVENT_ROD_CASTED,      this._handleCast);
      document.removeEventListener(EVENT_REEL_RETRIEVING, this._handleReel);
      document.removeEventListener(EVENT_HOOK_IDLE,       this._handleIdle);
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AudioSystem };
}
