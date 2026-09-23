# MOCKUP_TILT_EFFECT_SPEC.md — Réplica exacta: Efecto 3D tilt al pasar el cursor (mockup del Hero)

Alcance: únicamente el efecto de inclinación 3D (`3D tilt` / `mouse-tilt`) aplicado al mockup del Hero al mover el cursor sobre él en computadora. Es JS vainilla hecho a mano (no usa ninguna librería como Vanilla-Tilt.js o GSAP). Todos los valores están tomados literalmente de `main.js` y `styles.css`. Solo se activa en dispositivos con mouse fino; en touch/mobile no hace nada.

---

## 1. Requisito de activación (gate de dispositivo)

```js
var fineHover = matchMedia("(hover: hover) and (pointer: fine)").matches;
```

- Se evalúa **una sola vez al cargar el script** (no es reactivo a cambios de dispositivo en caliente).
- Si `fineHover` es `false` (tablets/teléfonos táctiles, o mouse sin hover fino), la función `initTilt()` retorna de inmediato y el efecto queda completamente desactivado — el mockup se queda fijo en su transform CSS de reposo.

---

## 2. HTML — estructura requerida

```html
<div class="hero-mockup" data-tilt aria-hidden="true">
  <div class="mockup" data-mockup>
    <!-- contenido del mockup -->
  </div>
  <div class="mockup-glow" aria-hidden="true"></div>
</div>
```

- El **wrapper** (el que detecta el mouse y define la perspectiva 3D) lleva el atributo `data-tilt`.
- El **elemento que realmente rota** debe tener la clase `.mockup` y estar dentro del wrapper (el JS lo busca con `wrap.querySelector(".mockup")`).
- `aria-hidden="true"` en el wrapper porque es un elemento puramente decorativo/visual (no aporta contenido accesible).

---

## 3. CSS

### 3.1 Wrapper — perspectiva 3D

```css
.hero-mockup {
  position: relative;
  justify-self: center;   /* o "end" en desktop, según tu layout */
  width: 100%;
  max-width: 420px;
  perspective: 1400px;    /* profundidad del espacio 3D — entre más bajo el valor, más exagerado se ve el tilt */
}
```

### 3.2 Card — transform de reposo + transición

```css
.mockup {
  border-radius: 2px;
  box-shadow: var(--shadow-lift);
  border: 1px solid rgba(28,29,23,0.06);
  overflow: hidden;
  transform: rotateY(-8deg) rotateX(3deg);       /* inclinación de reposo, SIN hover */
  transition: transform .6s var(--ease-out);      /* suaviza el regreso cuando el mouse SALE */
  will-change: transform;                         /* obligatorio para que la animación sea fluida */
}
```

### 3.3 Estado hover / activo (opcional, para transición de entrada)

```css
.hero-mockup:hover .mockup,
.hero-mockup.is-active .mockup { transform: rotateY(-3deg) rotateX(1deg); }
```

Nota: en la práctica, mientras el mouse se mueve dentro del wrapper, el JS sobrescribe este `transform` en cada `mousemove` con `element.style.transform` inline (mayor especificidad que la clase CSS), así que esta regla `:hover`/`.is-active` solo se percibe brevemente, en el instante en que el cursor entra antes del primer `mousemove`, o si por alguna razón el JS no corrió (fallback visual).

### 3.4 Brillo/aura opcional detrás del card (usado en el Hero, no es parte obligatoria del efecto de tilt)

```css
.mockup-glow {
  position: absolute;
  inset: 6% -12% -12% -12%;
  background: radial-gradient(ellipse 60% 55% at 50% 60%, rgba(59, 75, 52, 0.22), transparent 72%);
  filter: blur(30px);
  z-index: -1;
}
```

---

## 4. JavaScript — función completa, cópiala tal cual

```js
var fineHover = matchMedia("(hover: hover) and (pointer: fine)").matches;

function initTilt() {
  if (!fineHover) return;

  var wrap = document.querySelector("[data-tilt]");
  var card = wrap ? wrap.querySelector(".mockup") : null;
  if (!wrap || !card) return;

  wrap.addEventListener("mousemove", function (e) {
    var rect = wrap.getBoundingClientRect();
    var px = (e.clientX - rect.left) / rect.width - 0.5;   // posición X del mouse normalizada: -0.5 (borde izq) a 0.5 (borde der)
    var py = (e.clientY - rect.top) / rect.height - 0.5;   // posición Y del mouse normalizada: -0.5 (borde sup) a 0.5 (borde inf)

    var ry = px * 14 - 8;    // rotación en Y (eje horizontal): rango final -15° a +6°
    var rx = py * -10 + 2;   // rotación en X (eje vertical, invertido): rango final -3° a +7°

    card.style.transform = "rotateY(" + ry + "deg) rotateX(" + rx + "deg)";
  });

  wrap.addEventListener("mouseover", function (e) {
    if (wrap.contains(e.relatedTarget)) return;   // ignora bubbling entre hijos del wrapper
    wrap.classList.add("is-active");
  });

  wrap.addEventListener("mouseout", function (e) {
    if (wrap.contains(e.relatedTarget)) return;
    wrap.classList.remove("is-active");
    card.style.transform = "";   // borra el inline style → el CSS retoma el transform de reposo, con transición suave
  });
}
```

Llamada al inicializar (dentro del `boot()` general del sitio, envuelta en el wrapper de seguridad `safe()` propio de este proyecto — omite el `safe()` si tu otro proyecto no usa ese patrón):

```js
initTilt();
```

---

## 5. Cómo se comporta exactamente (para que la réplica se sienta igual)

1. **Mouse afuera / reposo**: el card está inclinado `rotateY(-8deg) rotateX(3deg)` — una inclinación fija hacia un lado, no está "plano".
2. **Mouse entra**: se agrega la clase `is-active` al wrapper (disponible por si quieres enganchar otro efecto visual a este estado; el tilt en sí no la necesita).
3. **Mouse se mueve dentro del wrapper**: en cada evento `mousemove` (se dispara con la frecuencia nativa del navegador, sin throttle/debounce) se recalcula la rotación en función de la posición exacta del cursor dentro del rectángulo del wrapper, y se aplica **sin transición** (instantáneo, sensación "pegada" al cursor).
   - Extremo izquierdo del wrapper → `ry` cercano a `-15°`.
   - Extremo derecho del wrapper → `ry` cercano a `+6°`.
   - Extremo superior del wrapper → `rx` cercano a `+7°`.
   - Extremo inferior del wrapper → `rx` cercano a `-3°`.
   - Centro exacto del wrapper → `ry = -8°`, `rx = 2°` (nota: esto es ligeramente distinto al transform de reposo del CSS, `rotateY(-8deg) rotateX(3deg)` — es una diferencia menor de 1° en `rx`, imperceptible en la práctica).
4. **Mouse sale del wrapper**: se quita `is-active`, se borra el `transform` inline, y el CSS anima de vuelta a `rotateY(-8deg) rotateX(3deg)` en `.6s` con el easing `var(--ease-out)` del proyecto.
5. El chequeo `if (wrap.contains(e.relatedTarget)) return;` en ambos listeners evita que el efecto "parpadee" cuando el cursor pasa entre elementos hijos dentro del wrapper (por ejemplo, el `.mockup-glow` u otros elementos internos) — solo dispara la entrada/salida real del wrapper completo.

---

## 6. Checklist para reutilizar en otra landing

- [ ] El wrapper tiene `perspective` en CSS (sin esto, `rotateY`/`rotateX` no producen efecto 3D real, solo escalado plano).
- [ ] El wrapper tiene `data-tilt`.
- [ ] El elemento a rotar tiene la clase que usa el `querySelector` del JS (`.mockup` en este proyecto — renómbralo si tu proyecto usa otra clase, pero mantén el selector JS sincronizado).
- [ ] El elemento a rotar tiene `transition: transform` y `will-change: transform` en CSS.
- [ ] El gate `fineHover` está presente — sin él, el efecto se activaría también en touch, donde `mousemove` no se dispara igual y puede sentirse roto o quedarse "pegado" en una rotación tras un tap.
- [ ] No se usa ninguna librería externa — es ~20 líneas de JS vainilla, cero dependencias.

---

*Todos los valores fueron extraídos literalmente de `main.js` (función `initTilt`) y `styles.css` (`.hero-mockup`, `.mockup`) del proyecto Garden Tools by DEEC Studio. No hay valores `REQUIERE VERIFICACIÓN`.*
