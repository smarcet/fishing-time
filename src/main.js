if (typeof window !== 'undefined') { window.addEventListener('load', function(){
  const canvas = document.getElementById("canvas1");
  const overlay = document.getElementById("rotate-overlay");
  const touchLeft = document.getElementById("touch-left");
  const touchRight = document.getElementById("touch-right");
  const ctx = canvas.getContext('2d');
  const mobileSystem = new MobileSystem({ window, document, canvas, overlay, navControls: [touchLeft, touchRight] });
  const initialSnapshot = mobileSystem.getSnapshot();
  canvas.width = initialSnapshot.width;
  canvas.height = initialSnapshot.height;
  const inputSystem = initialSnapshot.isMobile
    ? new TouchInputSystem(canvas, { leftControl: touchLeft, rightControl: touchRight })
    : new KeyboardInputSystem(window);
  inputSystem.attach();

  const game = new Game(ctx, new Size(canvas.height, canvas.width), {
    inputSystem,
    profile: initialSnapshot.profile,
  });
  mobileSystem.attach(game, inputSystem);
  const e2eHarness = new E2ETestHarness(game, { window });
  e2eHarness.attach();

  /*
  window.requestAnimFrame = (function(callback) {
    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
      function(callback) {
        window.setTimeout(callback, 1000 / 10);
      };
  })();

   */

  function disableAntiAliasing(context) {
    // note: you must factor this into any other context.translate calls in the future
    context.translate(0.5, 0.5);
    context.webkitImageSmoothingEnabled = false;
    context.mozImageSmoothingEnabled = false;
    context.imageSmoothingEnabled = false;
  }

  window.requestAnimFrame = (function(callback) {
    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
      function(callback) {
        window.setTimeout(callback, 5000);
      };
  })();

  let lastTime = 0
  function animationLoop(timestamp){
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    game.update(deltaTime);
    game.draw();
    requestAnimationFrame(animationLoop);
  }

  disableAntiAliasing(ctx)
  const restoreCanvasSettings = () => disableAntiAliasing(ctx);
  window.addEventListener('resize', restoreCanvasSettings);
  window.addEventListener('orientationchange', restoreCanvasSettings);
  window.addEventListener('beforeunload', () => {
    window.removeEventListener('resize', restoreCanvasSettings);
    window.removeEventListener('orientationchange', restoreCanvasSettings);
    e2eHarness.destroy();
    mobileSystem.destroy();
    game.destroy();
  });
  animationLoop(0);

}); } // end if (typeof window !== 'undefined')
