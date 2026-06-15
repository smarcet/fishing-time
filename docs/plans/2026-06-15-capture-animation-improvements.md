# Capture Animation Improvements Implementation Plan

Created: 2026-06-15
Author: smarcet@gmail.com
Agent: Claude Code
Status: VERIFIED
Approved: Yes
Iterations: 0
Worktree: No
Type: Feature

## Summary

**Goal:** Cuando un enemigo es capturado (colisión con el hook), el sprite parpadea en rojo/blanco mientras sube y al llegar al bote hace un arco parabólico que se achica y desvanece — dando la sensación de que se tira adentro del bote. Se dispara un `CustomEvent` `enemyCaptured` al completar la captura para el sistema de scoring futuro. La lógica de animación queda centralizada en `EnemyWithAnimation.drawCaptured()` con velocidad de blink configurable por subclase.

## Approach

**Chosen:** Extend `EnemyWithAnimation` with template-method `drawCaptured()` + `_drawCapturedSprite()`, driven by `Hook.getCaptureProgress()`.
**Why:** Centraliza la animación en la clase base sin duplicar código — cada subclase sólo sobreescribe el frame que muestra mientras es capturada (`_drawCapturedSprite`). El hook expone el progreso (0→1) para sincronizar la fase de arco. Costo: el Hook necesita un getter nuevo (`getCaptureProgress`) y guardar el `_catchRopeStart` en el momento de la captura.

## Context for Implementer

Cuando un enemigo es capturado, `Game.update()` lo filtra del array `_enemies` en ese mismo tick, por lo que su `update()` nunca más es llamado por el game loop. El hook sí lo sigue dibujando vía `this._catch.draw()` en `Hook.draw()`. Para que el contador de blink avance, `Hook.update()` llamará al nuevo `this._catch.updateCaptured()` en cada tick del estado `CATCH`.

## Progress Tracking

- [x] Task 0: Extraer strings hardcodeados a constantes con nombre
- [x] Task 1: Hook — capture progress + `enemyCaptured` event
- [x] Task 2: Enemy / EnemyWithAnimation — capture tick infrastructure
- [x] Task 3: EnemyWithAnimation — `drawCaptured()` + `_drawCapturedSprite()` template
- [x] Task 4: Fish, Octopus, Trash — override `_drawCapturedSprite()`, retire old captured blocks
- [x] Task 5: Tests

## Implementation Tasks

### Task 0: Extraer strings hardcodeados a constantes con nombre

**Objective:** Reemplazar todos los string literals de estado/fase en `index.js` por constantes nombradas. Esto hace el código refactor-safe y auto-documentado; es prerequisito para el resto de tareas que añaden nuevas constantes de fase.

**Files:**

- Modify: `index.js` (bloque de constantes al inicio + todos los usos en Hook, Enemy, Player, EnemyWithAnimation, Fish, Octopus, Trash)

**Key Decisions / Notes:**

- Constantes a agregar (al bloque de constants existente en el top del archivo):
  ```js
  // Hook status
  const HOOK_STATUS_IDLE  = 'IDLE';
  const HOOK_STATUS_CAST  = 'CAST';
  const HOOK_STATUS_CATCH = 'CATCH';

  // Enemy / capture status
  const ENEMY_STATUS_CAPTURED = 'CAPTURED';

  // Player state
  const PLAYER_STATE_IDLE     = 'IDLE';
  const PLAYER_STATE_MOVING_L = 'MOVING_L';
  const PLAYER_STATE_MOVING_R = 'MOVING_R';
  const PLAYER_STATE_CAST     = 'CAST';
  const PLAYER_STATE_REEL     = 'REEL';
  ```
- Reemplazar **todos** los usos de los strings hardcodeados en el archivo (comparaciones, asignaciones, guards). Usar `grep -n "'IDLE'\|'CAST'\|'CATCH'\|'CAPTURED'\|'MOVING_L'\|'MOVING_R'\|'REEL'" index.js` para encontrar todos los sitios antes de editar.
- `Trivial:` No aplica — cambio mecánico pero multi-sitio; el riesgo es dejar alguno sin reemplazar. Cubierto por `npm test` que ejercita los estados.

**Definition of Done:**

- [ ] `grep -n "'IDLE'\|'CAST'\|'CATCH'\|'CAPTURED'\|'MOVING_'" index.js` no retorna ningún hit (todos reemplazados por constantes).
- [ ] `npm test` pasa sin regresiones.
- [ ] Verify: `npm test -- --silent`

---

### Task 1: Hook — capture progress + `enemyCaptured` event

**Objective:** Agregar a `Hook` el tracking del `_catchRopeStart` para calcular el progreso de la captura (0=recién atrapado, 1=llega al bote). Al completar la entrega al bote (`clearCaptured`), disparar el `CustomEvent` `'enemyCaptured'` en `document` con la info del enemigo para el sistema de scoring futuro.

**Files:**

- Modify: `index.js` (Hook class: constructor, `setCatch`, `getCaptureProgress` NEW, `clearCaptured`, `update`)

**Key Decisions / Notes:**

- `_catchRopeStart`: guardar en `setCatch()` el valor actual de `_ropeLength` antes de retractarse.
- Nuevas constantes de fase (string enum):
  ```js
  const CAPTURE_PHASE_RISING   = 'RISING';    // subiendo con blink
  const CAPTURE_PHASE_THROWING = 'THROWING';  // arco parabólico hacia el bote
  ```
- `_getCaptureRawProgress()` (privado): `const denom = this._catchRopeStart - HOOK_REST_LENGTH; if (denom <= 0) return 1; return Math.min(1, (this._catchRopeStart - this._ropeLength) / denom);` — retorna float 0→1 del viaje total.
- `getCapturePhase()` (público): llama `_getCaptureRawProgress()` internamente; retorna `CAPTURE_PHASE_THROWING` si raw ≥ `CAPTURE_THROW_THRESHOLD`, sino `CAPTURE_PHASE_RISING`. Retorna `CAPTURE_PHASE_RISING` si no hay catch activo.
- El `CustomEvent` se dispara en `clearCaptured()` ANTES de nullear `this._catch`. Guard `typeof document !== 'undefined'`. Para evitar coupling del consumer al objeto `Enemy`, el `detail` lleva un snapshot plano: `{ enemyType: this._catch.constructor.name, x: hookPos.getX(), y: hookPos.getY() }` (sin referencia al objeto vivo).
- En `Hook.update()` bloque `CATCH`, agregar `this._catch.updateCaptured()` ANTES del reel retraction. Sin esto, `_captureTick` nunca avanza y el blink queda congelado.
- Agregar `this._catchRopeStart = null` al `clearCaptured()`.

**Definition of Done:**

- [ ] `getCapturePhase()` retorna `CAPTURE_PHASE_RISING` justo después de `setCatch` y `CAPTURE_PHASE_THROWING` cuando el raw progress ≥ threshold.
- [ ] `Hook.update()` CATCH block llama a `this._catch.updateCaptured()` en cada tick (integración, no sólo unit).
- [ ] `document.dispatchEvent` es llamado con `'enemyCaptured'` al completar la captura.
- [ ] `hook.test.js` pasa sin regresiones.
- [ ] Verify: `npm test -- --silent --testPathPattern=hook`

---

### Task 2: Enemy / EnemyWithAnimation — capture tick infrastructure

**Objective:** Agregar `_captureTick` a `Enemy` (inicializado en `captured()`) y el método `updateCaptured()` en `Enemy` (base: incrementa `_captureTick`) y `EnemyWithAnimation` (override: también avanza el frame de animación sin mover la posición). Agregar `_blinkInterval` configurable en `EnemyWithAnimation`. Agregar las 4 nuevas constantes al top de `index.js`.

**Files:**

- Modify: `index.js` (constants top, `Enemy.captured`, new `Enemy.updateCaptured`, `EnemyWithAnimation` constructor + new `updateCaptured`)

**Key Decisions / Notes:**

- Nuevas constantes (agregar junto a las existentes `ANIM_*`):
  ```js
  // Capture animation phases (string enum — returned by Hook.getCapturePhase())
  const CAPTURE_PHASE_RISING   = 'RISING';
  const CAPTURE_PHASE_THROWING = 'THROWING';

  // Capture animation timing/geometry
  const CAPTURE_BLINK_INTERVAL   = 6;    // ticks per blink state toggle
  const CAPTURE_THROW_THRESHOLD  = 0.78; // internal progress threshold for THROWING phase
  const CAPTURE_THROW_ARC_Y      = 50;   // px at peak of throw arc (parabola height)
  ```
  (No `CAPTURE_THROW_ARC_X` — el arco horizontal se calcula dinámicamente hacia el player.)
- `Enemy.captured(hook)`: añadir `this._captureTick = 0;` después de asignar `_hook`.
- `Enemy.updateCaptured()` (nuevo): sólo `this._captureTick++`.
- `EnemyWithAnimation.constructor`: añadir `this._blinkInterval = CAPTURE_BLINK_INTERVAL;` (las subclases pueden sobreescribir en su constructor para cambiar la velocidad).
- `EnemyWithAnimation.updateCaptured()` (override): `super.updateCaptured()` + avanzar `_frameX`/`_frameY` usando el mismo bloque que `update()` (sin llamar `super.update()` que mueve la posición).
- `Trivial:` No corresponde — introduce nueva lógica pública; cubierto por Task 5.

**Definition of Done:**

- [ ] `_captureTick` es 0 justo tras `enemy.captured(hook)`.
- [ ] Tras 6 llamadas a `updateCaptured()` en un `EnemyWithAnimation`, `_captureTick` es 6 y `_frameX` avanza como lo haría en update normal.
- [ ] `npm test` sin regresiones.
- [ ] Verify: `npm test -- --silent`

---

### Task 3: EnemyWithAnimation — `drawCaptured()` + `_drawCapturedSprite()` template

**Objective:** Agregar el método `drawCaptured()` a `EnemyWithAnimation` que implementa: (a) parpadeo estroboscópico (globalAlpha alterna 1.0↔0.2 cada `_blinkInterval` ticks), y (b) arco parabólico + scale down + fade out cuando `getCaptureProgress() >= CAPTURE_THROW_THRESHOLD`. También agregar el método template `_drawCapturedSprite(dx, dy, w, h)` con implementación default (die frame con `_dieFrameX`/`_dieFrameY`).

**Files:**

- Modify: `index.js` (`EnemyWithAnimation`: agregar `drawCaptured()` y `_drawCapturedSprite()`, modificar `draw()`)

**Key Decisions / Notes:**

- `drawCaptured()` estructura (globalAlpha SIEMPRE dentro de save/restore para que ctx.restore() lo limpie automáticamente):
  ```js
  drawCaptured() {
    const w = this._size.getWidth();
    const h = this._size.getHeight();
    const hookPos = this._hook.getPosition();
    const progress = this._hook.getCaptureProgress();
    const blinkOn = Math.floor(this._captureTick / this._blinkInterval) % 2 === 0;
    const blinkAlpha = blinkOn ? 1.0 : 0.2;

    let dx = hookPos.getX(), dy = hookPos.getY(), scale = 1.0, alpha = blinkAlpha;

    if (this._hook.getCapturePhase() === CAPTURE_PHASE_THROWING) {
      const raw = this._hook._getCaptureRawProgress();  // 0→1 overall rope progress
      const t = (raw - CAPTURE_THROW_THRESHOLD) / (1 - CAPTURE_THROW_THRESHOLD); // 0→1 within throw phase
      // Arc toward player position (not hardcoded left)
      const playerPos = this._hook._player.getPosition();
      const arcDx = (playerPos.getX() - hookPos.getX()) * t * 0.6;
      dx += arcDx;
      dy -= t * (1 - t) * 4 * CAPTURE_THROW_ARC_Y;  // parabola peaks at t=0.5
      scale = 1.0 - t * 0.7;
      alpha = blinkAlpha * (1.0 - t);
    }

    this._ctx.save();
    this._ctx.globalAlpha = Math.max(0, alpha);  // inside save/restore — auto-reset
    this._ctx.translate(dx + (w * scale) / 2, dy + (h * scale) / 2);
    this._ctx.scale(scale, scale);
    this._drawCapturedSprite(-w / 2, -h / 2, w, h);
    this._ctx.restore();
  }
  ```
- **CAPTURE_THROW_ARC_X** se elimina (el arco usa la posición real del player). Actualizar las constantes del Task 2 para removerlo.
- `_drawCapturedSprite(dx, dy, w, h)` default (usa die frame con `_dieFrameX`/`_dieFrameY`):
  ```js
  _drawCapturedSprite(dx, dy, w, h) {
    this._ctx.drawImage(this._image, this._dieFrameX * w, this._dieFrameY * h, w, h, dx, dy, w, h);
  }
  ```
- En `EnemyWithAnimation.draw()`, reemplazar el bloque `if(this._status === 'CAPTURED') { ... return; }` con:
  ```js
  if (this._status === 'CAPTURED') { this.drawCaptured(); return; }
  ```

**Definition of Done:**

- [ ] Cuando `_status === 'CAPTURED'` y `getCaptureProgress() < 0.78`, `globalAlpha` alterna entre 1.0 y 0.2 según `_captureTick`.
- [ ] Cuando `getCaptureProgress() >= 0.78`, `ctx.scale` recibe un valor `< 1` (sprite se achica).
- [ ] `_drawCapturedSprite` default usa `_dieFrameX`/`_dieFrameY`.
- [ ] Verify: `npm test -- --silent`

---

### Task 4: Fish, Octopus, Trash — override `_drawCapturedSprite()` y retirar bloques duplicados

**Objective:** Cada subclase implementa `_drawCapturedSprite()` con su lógica de frame específica, y elimina el bloque `if(this._status === 'CAPTURED') { ... return; }` de su `draw()` (ya lo maneja `EnemyWithAnimation.drawCaptured()` via `super.draw()` o la herencia directa).

**Files:**

- Modify: `index.js` (`Fish.draw`, `Fish.captured` NEW, `Fish._drawCapturedSprite` NEW, `Octopus.draw`, `Octopus._drawCapturedSprite` NEW, `Trash.draw`, `Trash._drawCapturedSprite` NEW)

**Key Decisions / Notes:**

- `Fish._drawCapturedSprite(dx, dy, w, h)`: usa `_frameX` actual (pez sigue animado mientras sube). Source rect: `this._frameX * w, 0, w, h`.
- `Fish.captured(hook)` (override): llamar a `super.captured(hook)` + bootstrap de dirección si `_direction === null`: `if (this._direction === null) this._direction = this._position.getX() < this._game.getSize().getWidth() / 2 ? 1 : -1;`. Sin esto, un pez capturado antes de su primer `update()` quedaría con `_direction = null`.
- `Octopus._drawCapturedSprite(dx, dy, w, h)`: usa `_dieFrameX`/`_dieFrameY` con `_sw`/`_sh` como source size (misma lógica que el bloque removido). Source rect: `this._dieFrameX * sw, this._dieFrameY * sh, sw, sh`.
- `Trash._drawCapturedSprite(dx, dy, w, h)` **[OBLIGATORIO]**: frame estático 0,0. Source rect: `0, 0, w, h`. El constructor de Trash no pasa `dieFrameX`/`dieFrameY` a la clase base, por lo que `this._dieFrameX` es `undefined` — sin este override, el default de `EnemyWithAnimation` produce coordenadas NaN y no renderiza nada.
- Las subclases (`Fish`, `Octopus`, `Trash`) NO llaman a `super.draw()`, así que cada una debe reemplazar su bloque `if(this._status === 'CAPTURED') { ctx.drawImage(...); return; }` con una delegación directa: `if(this._status === 'CAPTURED') { this.drawCaptured(); return; }` (una línea en lugar de ~10).
- `EnemyWithAnimation.draw()` también hace lo mismo (cubre el caso de instancias base directas).
- Todos los bloques CAPTURED quedan como one-liners que delegan a `drawCaptured()`.

**Definition of Done:**

- [ ] `Fish.draw()`, `Octopus.draw()`, `Trash.draw()` no contienen el bloque de rendered directo de CAPTURED (reemplazado por `this.drawCaptured(); return;`).
- [ ] `Fish.captured()` inicializa `_direction` si es null (race condition fix).
- [ ] `Trash._drawCapturedSprite()` existe y usa source rect `0, 0, w, h` (sin ella, dieFrameX undefined produce NaN).
- [ ] Fish capturado sigue mostrando el frame animado (via `_drawCapturedSprite` override).
- [ ] Octopus capturado usa `_sw`/`_sh` para el source rect (no pierde escala).
- [ ] Verify: `npm test -- --silent`

---

### Task 5: Tests para la nueva funcionalidad

**Objective:** Cubrir los comportamientos públicos nuevos: `getCaptureProgress()` en hook, la alternancia de alpha en `drawCaptured()`, y el dispatch del evento `enemyCaptured`.

**Files:**

- Modify: `__tests__/hook.test.js` (tests para `getCaptureProgress` y event dispatch)
- Modify: `__tests__/fish.test.js` (test para blink alpha en captured draw)

**Key Decisions / Notes:**

- **`getCapturePhase()`**: construir un hook stub, extender rope (simular ticks de CAST), llamar `setCatch()`, verificar retorna `CAPTURE_PHASE_RISING`; simular ticks de reel hasta superar `CAPTURE_THROW_THRESHOLD`, verificar retorna `CAPTURE_PHASE_THROWING`. Verificar que con rope sin extender (`_ropeLength === HOOK_REST_LENGTH`) retorna `CAPTURE_PHASE_RISING` (no NaN ni throw).
- **Integración updateCaptured()**: construir un Hook con catch, llamar `hook.update()` N veces en estado CATCH, verificar que `hook._catch._captureTick` incrementó N veces (prueba que el CATCH block llama updateCaptured() por cada tick).
- **`enemyCaptured` event**: mock `global.document = { dispatchEvent: jest.fn() }` dentro del test. Verificar que `clearCaptured()` con un catch previo llama `dispatchEvent` con `type === 'enemyCaptured'` y `detail.enemyType` correcto (sin referencia al objeto live).
- **Blink alpha en Fish captured draw**: mockCtx captura el valor de `globalAlpha`. Con `_captureTick=0`: alpha=1.0; con `_captureTick=6`: alpha=0.2; con `_captureTick=12`: alpha=1.0. (Nota: globalAlpha se asigna como propiedad dentro de save/restore — el mock no necesita método, sólo ser un objeto).
- No agregar test class nuevo — agregar describes dentro de los archivos existentes.
- `Trivial:` No aplica — comportamiento nuevo con múltiples ramas.

**Definition of Done:**

- [ ] `getCapturePhase()` retorna `CAPTURE_PHASE_RISING` en setCatch y `CAPTURE_PHASE_THROWING` al superar el threshold (test en hook.test.js).
- [ ] `document.dispatchEvent` llamado con event type `'enemyCaptured'` al completar la captura (test en hook.test.js con `global.document` mock).
- [ ] `globalAlpha` del ctx alterna 1.0→0.2→1.0 según `_captureTick` múltiplos de `CAPTURE_BLINK_INTERVAL` (test en fish.test.js).
- [ ] Verify: `npm test -- --silent`

## E2E Test Scenarios

### TS-001: Captura completa con blink visible
**Priority:** Critical
**Preconditions:** Servidor local corriendo (`python3 -m http.server 8000`), navegador abierto en `http://localhost:8000/main.html`
**Mapped Tasks:** Task 1, 2, 3, 4

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Abrir `http://localhost:8000/main.html` | Juego carga, peces y octopus visibles |
| 2 | Presionar SPACE para lanzar el anzuelo hacia un pez | Anzuelo desciende |
| 3 | Esperar colisión con un pez, soltar SPACE | El pez sube con el anzuelo y parpadea (alterna opacidad visible) |
| 4 | Observar cuando el pez llega al 80% del viaje | El sprite empieza a hacer un arco lateral y se achica |
| 5 | Pez llega al bote | Sprite desaparece con fade — parece tirado adentro del bote |

### TS-002: Evento `enemyCaptured` en consola
**Priority:** High
**Preconditions:** DevTools abierto en tab Console antes de iniciar
**Mapped Tasks:** Task 1

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | En DevTools Console pegar: `document.addEventListener('enemyCaptured', e => console.log('CAPTURED:', e.detail))` | Sin output (solo registra el handler) |
| 2 | Capturar un pez | Console muestra `CAPTURED: { enemy: Fish {...}, enemyType: "Fish" }` |
| 3 | Capturar una lata (Trash) | Console muestra `CAPTURED: { ..., enemyType: "Trash" }` |
