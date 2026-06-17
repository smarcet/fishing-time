'use strict';

class TouchInputSystem extends InputSystem {
  constructor(target = null, options = {}) {
    super(target);
    this._leftControl = options.leftControl || null;
    this._rightControl = options.rightControl || null;
    this._stopDelayMs = options.stopDelayMs || TOUCH_REEL_STOP_DELAY_MS;
    this._duplicateGuardMs = options.duplicateGuardMs || TOUCH_DUPLICATE_TAP_GUARD_MS;
    this._lastTapTime = -Infinity;
    this._keys = [];
    this._stopTimer = null;
    this._handlePointerDown = (event) => this._onTap(event);
    this._handleTouchStart = (event) => this._onTap(event);
    this._handleLeftStart = (event) => this._startNavigation(KEY_ARROW_LEFT, event);
    this._handleLeftEnd = (event) => this._stopNavigation(KEY_ARROW_LEFT, event);
    this._handleRightStart = (event) => this._startNavigation(KEY_ARROW_RIGHT, event);
    this._handleRightEnd = (event) => this._stopNavigation(KEY_ARROW_RIGHT, event);
  }

  attach() {
    if (this._attached || !this._target) return;
    this._target.addEventListener('pointerdown', this._handlePointerDown);
    this._target.addEventListener('touchstart', this._handleTouchStart, { passive: false });
    this._attachControl(this._leftControl, this._handleLeftStart, this._handleLeftEnd);
    this._attachControl(this._rightControl, this._handleRightStart, this._handleRightEnd);
    this._attached = true;
  }

  destroy() {
    if (this._attached && this._target) {
      this._target.removeEventListener('pointerdown', this._handlePointerDown);
      this._target.removeEventListener('touchstart', this._handleTouchStart);
      this._detachControl(this._leftControl, this._handleLeftStart, this._handleLeftEnd);
      this._detachControl(this._rightControl, this._handleRightStart, this._handleRightEnd);
    }
    this._clearStopTimer();
    this._keys = [];
    this._attached = false;
    this.setEnabled(false);
  }

  setEnabled(enabled) {
    super.setEnabled(enabled);
    if (!this._enabled) {
      this._clearStopTimer();
      this._keys = [];
    }
  }

  hasKey(key) {
    return this._enabled && this._keys.indexOf(key) > -1;
  }

  _onTap(event) {
    if (!this._enabled) return;
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    const timeStamp = event && typeof event.timeStamp === 'number' ? event.timeStamp : Date.now();
    if (timeStamp - this._lastTapTime < this._duplicateGuardMs) return;
    this._lastTapTime = timeStamp;

    this._dispatch(EVENT_CAST_REQUESTED);
    this._dispatch(EVENT_REEL_START);
    this._dispatch(EVENT_REEL_TAP);
    this._attemptOrientationLock();
    this._clearStopTimer();
    this._stopTimer = setTimeout(() => {
      this._stopTimer = null;
      this._dispatch(EVENT_REEL_STOP);
    }, this._stopDelayMs);
  }

  _clearStopTimer() {
    if (this._stopTimer !== null) {
      clearTimeout(this._stopTimer);
      this._stopTimer = null;
    }
  }

  _attemptOrientationLock() {
    if (
      typeof screen === 'undefined' ||
      !screen.orientation ||
      typeof screen.orientation.lock !== 'function'
    ) return;
    try {
      const result = screen.orientation.lock('landscape');
      if (result && typeof result.catch === 'function') result.catch(() => {});
    } catch (_) {}
  }

  _attachControl(control, startHandler, endHandler) {
    if (!control || typeof control.addEventListener !== 'function') return;
    control.addEventListener('pointerdown', startHandler);
    control.addEventListener('pointerup', endHandler);
    control.addEventListener('pointercancel', endHandler);
    control.addEventListener('pointerleave', endHandler);
  }

  _detachControl(control, startHandler, endHandler) {
    if (!control || typeof control.removeEventListener !== 'function') return;
    control.removeEventListener('pointerdown', startHandler);
    control.removeEventListener('pointerup', endHandler);
    control.removeEventListener('pointercancel', endHandler);
    control.removeEventListener('pointerleave', endHandler);
  }

  _startNavigation(key, event) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    if (!this._enabled) return;
    this._keys = this._keys.filter(existing => existing !== KEY_ARROW_LEFT && existing !== KEY_ARROW_RIGHT);
    this._keys.push(key);
  }

  _stopNavigation(key, event) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    const index = this._keys.indexOf(key);
    if (index > -1) this._keys.splice(index, 1);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TouchInputSystem };
}
