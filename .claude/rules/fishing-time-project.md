# Project: fishing-time

**Last Updated:** 2026-06-14

## Overview

Vanilla JS 2D canvas fishing game. No framework, no bundler. Jest is the only devDependency (unit tests for game logic).

## Technology Stack

- **Language:** Vanilla JavaScript (ES6 classes, no modules/bundler)
- **Rendering:** HTML5 Canvas API
- **Assets:** PNG/SVG sprites in `images/`, MP3 sound effects in `sfx/`
- **Entry point:** `main.html` → `index.js`
- **Testing:** Jest 29 (`npm test`) — unit tests in `__tests__/`

## Directory Structure

```
index.js          # All game logic (~760 lines, dual-mode browser/CommonJS)
main.html         # Canvas + hidden sprite <img> elements
main.css          # Canvas centering + pixel-art rendering
images/           # Sprites: fish, bottles, backgrounds, player, hook
sfx/              # Sound effects
__tests__/        # Jest unit tests (game logic only, no canvas)
docs/adr/         # Architecture Decision Records
package.json      # Jest devDependency only
index2.js         # Experimental/WIP - not used by main.html
parallax.html     # Experimental parallax prototype
```

## Running the Game

No build step. Serve locally to avoid CORS issues with assets:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/main.html
```

Opening `main.html` directly via `file://` may fail to load images in some browsers.

```bash
npm test          # run Jest unit tests (game logic, no browser required)
```

## Architecture

### Class Hierarchy

```
GameObject
├── Player        — fisherman boat, keyboard-driven, owns Hook
├── Hook          — cast/reel mechanic, AABB collision
├── Bubble        — rises from bottom, cosmetic
└── Enemy
    └── EnemyWithAnimation  — spritesheet-animated enemy
        └── Trash           — bottle/trash variant
```

`Game` extends `GameObject` and owns all entities + the game loop.

### Game Loop

```js
function animationLoop(timestamp) {
  game.update(deltaTime);  // update all entities
  game.draw();             // clear canvas, redraw all
  requestAnimationFrame(animationLoop);
}
```

Every entity has `update()` for logic and `draw()` for rendering. Call `super.update()` / `super.draw()` first.

### Sprite Image Loading Pattern

**IMPORTANT:** All sprite images must be declared as hidden `<img>` tags in `main.html` BEFORE referencing them in JS.

```html
<!-- main.html -->
<img src="images/fish1_sprite.png" id="fish1_sprite"/>
```

```js
// index.js — reference by DOM id after window load
const image = document.getElementById('fish1_sprite');
```

Never load images with `new Image()` — the game relies on the DOM-preload pattern in `main.html`.

### Spritesheet Animation

Sprites use a grid layout. `frameX` / `frameY` index into the grid; `staggerFrame` controls speed.

```js
// Draw a single frame from a spritesheet
ctx.drawImage(image,
  frameX * w, frameY * h,  // source position in spritesheet
  w, h,                    // source size
  dx, dy, w, h             // destination on canvas
);
```

### Collision Detection

AABB bounding-box check via `game.checkCollision(obj1, obj2)`. Both objects need `getPosition()` (returns `Point`) and `getSize()` (returns `Size`).

### Input

`InputHandler` adds/removes keys via `game.addKey()` / `game.removeKey()`. Check with `game.hasKey(KEY_SPACE)` etc.

```js
const AllowedKeys = [KEY_ARROW_UP, KEY_ARROW_DOWN, KEY_ARROW_LEFT, KEY_ARROW_RIGHT, KEY_SPACE];
```

### Debug Mode

`game._debug = true` enables bounding-box overlays and coordinate readouts. Toggle in the `Game` constructor.

## Entity Factories

`EnemyFactory` holds enemy specs (size, spritesheet config) and creates instances via `createEnemy(name, game, ctx)`. Add new enemy types to `EnemyFactory.specs` first.
