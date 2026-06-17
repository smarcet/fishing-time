'use strict';

class InputSystem {
  constructor(target = null) {
    this._target = target;
    this._enabled = true;
    this._attached = false;
  }

  attach() {
    this._attached = true;
  }

  destroy() {
    this._attached = false;
    this.setEnabled(false);
  }

  setEnabled(enabled) {
    this._enabled = enabled === true;
  }

  isEnabled() {
    return this._enabled;
  }

  hasKey() {
    return false;
  }

  _dispatch(type, detail = {}) {
    if (!this._enabled || typeof document === 'undefined') return;
    document.dispatchEvent(new CustomEvent(type, { detail }));
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { InputSystem };
}
