'use strict';

const { CaptureLaunchAnimation } = require('../index.js');

function makeTrackingCtx() {
  return {
    globalAlpha: 1, shadowColor: '', shadowBlur: 0, fillStyle: '',
    save: () => {}, restore: () => {},
    translate: () => {}, rotate: () => {},
    scale: jest.fn(),
  };
}

function makeMockEntity() {
  return {
    getSize: () => ({ getWidth: () => 100, getHeight: () => 60 }),
    _captureOffsetX: 0, _captureOffsetY: 0, _captureRotation: 0,
    _drawCapturedSprite: jest.fn(),
  };
}

describe('CaptureLaunchAnimation', () => {
  test('start() stores entity/origin/target and getTarget() returns target', () => {
    const anim = new CaptureLaunchAnimation(makeTrackingCtx());
    const entity = makeMockEntity();
    const origin = new Point(50, 400);
    const target = new Point(300, 100);
    anim.start({ entity, origin, target });
    expect(anim._active).toBe(true);
    expect(anim._elapsedMs).toBe(0);
    expect(anim.getTarget()).toBe(target);
    expect(anim._entity).toBe(entity);
  });

  test('isFinished() is false before duration elapses', () => {
    const anim = new CaptureLaunchAnimation(makeTrackingCtx());
    anim.start({ entity: makeMockEntity(), origin: new Point(0, 0), target: new Point(100, 0) });
    anim.update(CAPTURE_LAUNCH_DURATION_MS - 1);
    expect(anim.isFinished()).toBe(false);
  });

  test('isFinished() is true once elapsed >= CAPTURE_LAUNCH_DURATION_MS', () => {
    const anim = new CaptureLaunchAnimation(makeTrackingCtx());
    anim.start({ entity: makeMockEntity(), origin: new Point(0, 0), target: new Point(100, 0) });
    anim.update(CAPTURE_LAUNCH_DURATION_MS);
    expect(anim.isFinished()).toBe(true);
  });

  test('update(dt) increments elapsed time', () => {
    const anim = new CaptureLaunchAnimation(makeTrackingCtx());
    anim.start({ entity: makeMockEntity(), origin: new Point(0, 0), target: new Point(100, 0) });
    anim.update(100);
    anim.update(200);
    expect(anim._elapsedMs).toBe(300);
  });

  test('entity shrinks and fades linearly across arc (regression: ADR-0030 grow+full-alpha bug)', () => {
    const ctx = makeTrackingCtx();
    const anim = new CaptureLaunchAnimation(ctx);
    const entity = makeMockEntity();
    anim.start({ entity, origin: new Point(200, 400), target: new Point(300, 100) });

    // t = 0: alpha = 1.0, scale = 1.0
    anim._elapsedMs = 0;
    anim.draw(ctx);
    expect(ctx.globalAlpha).toBeCloseTo(1.0, 2);
    expect(ctx.scale.mock.calls[0][0]).toBeCloseTo(1.0, 2);

    // t = 0.5: alpha = 0.5, scale = 0.5
    anim._elapsedMs = CAPTURE_LAUNCH_DURATION_MS * 0.5;
    anim.draw(ctx);
    expect(ctx.globalAlpha).toBeCloseTo(0.5, 2);
    expect(ctx.scale.mock.calls[1][0]).toBeCloseTo(0.5, 2);

    // t = 1.0: alpha = 0, scale = 0
    anim._elapsedMs = CAPTURE_LAUNCH_DURATION_MS;
    anim.draw(ctx);
    expect(ctx.globalAlpha).toBeCloseTo(0, 2);
    expect(ctx.scale.mock.calls[2][0]).toBeCloseTo(0, 2);
  });

  test('draw(ctx) is pure - does not advance elapsed time', () => {
    const ctx = makeTrackingCtx();
    const anim = new CaptureLaunchAnimation(ctx);
    anim.start({ entity: makeMockEntity(), origin: new Point(0, 0), target: new Point(100, 0) });
    anim._elapsedMs = 100;
    anim.draw(ctx);
    anim.draw(ctx);
    expect(anim._elapsedMs).toBe(100);
  });

  test('reset() clears all refs and deactivates', () => {
    const anim = new CaptureLaunchAnimation(makeTrackingCtx());
    anim.start({ entity: makeMockEntity(), origin: new Point(0, 0), target: new Point(100, 0) });
    anim.reset();
    expect(anim._active).toBe(false);
    expect(anim._entity).toBeNull();
    expect(anim._target).toBeNull();
    expect(anim._elapsedMs).toBe(0);
  });
});
