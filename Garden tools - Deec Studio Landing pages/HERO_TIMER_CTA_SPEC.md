# HERO_TIMER_CTA_SPEC.md — Réplica exacta: Timer + Botón CTA + Iconos de confianza (solo Hero)

Alcance: **únicamente el bloque `.hero-cta` dentro del Hero** (no la barra sticky `.cta-bar`, aunque comparte los mismos componentes con tamaños distintos — ver notas al final de cada sección). Todos los valores están tomados literalmente de `index.html`, `styles.css` y `main.js`. Nada fue inventado; donde el valor depende de un `clamp()` o de un token, se indica la fórmula completa.

---

## 0. Contenedor general — `.hero-cta`

```css
.hero-cta {
  grid-area: cta;
  margin-top: 2.2rem;
  text-align: center;
  width: 100%;
  max-width: 31rem;      /* 496px */
  margin-inline: auto;
}
```

Orden vertical interno (de arriba hacia abajo), cada uno separado solo por el `margin` propio del siguiente elemento:

1. Timer (`.urgency.urgency-hero`)
2. Bloque de precio (`.hero-price-block`)
3. Botón CTA (`.btn.btn-primary.btn-lg.btn-hero`)
4. Fila de confianza (`.trust-row.trust-row-simple`)

Posición en el layout del Hero: `.hero-cta` es el tercer `grid-area` (`"copy" "mockup" "cta"` en mobile; `"copy mockup" "cta mockup"` en desktop ≥960px, es decir, queda **debajo del copy, en la columna izquierda, junto al mockup a la derecha**). Ver sección 5.

---

## 1. Timer / Countdown (`.urgency.urgency-hero`)

### 1.1 HTML exacto (del Hero, línea 258 de `index.html`)

```html
<div class="urgency urgency-hero" data-urgency>
  <span class="urgency-dot" aria-hidden="true"></span>
  <span class="urgency-label" data-i18n="urgency.label">Oferta por tiempo limitado</span>
  <div class="urgency-box">
    <div class="urgency-box-time" aria-live="polite">
      <span data-countdown-mm>25</span><span class="urgency-box-colon">:</span><span data-countdown-ss>00</span>
    </div>
    <div class="urgency-box-labels">
      <span data-i18n="urgency.min">MIN</span>
      <span data-i18n="urgency.sec">SEG</span>
    </div>
  </div>
</div>
```

Textos literales (ES / EN, `lib/i18n.js`):
- `urgency.label`: "Oferta por tiempo limitado" / (equivalente EN, mismo key)
- `urgency.min`: "MIN"
- `urgency.sec`: "SEG"

### 1.2 CSS — base `.urgency` (aplica a todas las variantes)

```css
.urgency {
  display: inline-flex;
  align-items: center;
  gap: .45rem;
  margin-top: 1rem;
  font-family: var(--sans);      /* "Switzer", -apple-system, "Segoe UI", sans-serif */
  font-size: .78rem;
  font-weight: var(--fw-semibold);
  color: var(--accent-2);        /* #9c2f27 */
}
```

### 1.3 CSS — variante Hero `.urgency-hero` (sobrescribe/agrega sobre `.urgency`)

```css
.urgency-hero {
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;   /* centrado horizontal, a diferencia de .urgency base que es inline-flex a la izquierda */
  gap: .6rem;
}
.urgency-hero .urgency-label {
  font-size: .64rem;
  font-weight: var(--fw-bold);   /* 700 */
  letter-spacing: .03em;
  text-transform: uppercase;
  color: var(--accent-2);        /* #9c2f27 */
}
```

Nota: en `.urgency-hero`, la propiedad `margin-top: 1rem` heredada de `.urgency` sigue aplicando (no se sobrescribe), y se suma `margin-bottom: 1rem` propio.

### 1.4 Punto pulsante — `.urgency-dot`

```css
.urgency-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);      /* #c23b32 */
  flex-shrink: 0;
  animation: urgencyPulse 1.8s ease-in-out infinite;
}
@keyframes urgencyPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: .4; transform: scale(0.7); }
}
@media (prefers-reduced-motion: reduce) {
  .urgency-dot { animation: none; }
}
```

- Tamaño: **6×6px**, círculo perfecto (`border-radius: 50%`).
- Color: `var(--accent)` = `#c23b32` (terracota/rojo).
- Animación: pulso de opacidad (1 → 0.4) y escala (1 → 0.7) cada 1.8s, infinito.
- Se desactiva si el usuario tiene `prefers-reduced-motion: reduce`.

### 1.5 Caja numérica del timer — `.urgency-box`

```css
.urgency-box {
  background: rgba(var(--accent-rgb), 0.08);   /* rgba(194, 59, 50, 0.08) */
  border-radius: 4px;
  padding: .28rem .55rem;
  text-align: center;
  flex-shrink: 0;
}
.urgency-box-time {
  font-family: var(--sans);
  font-weight: var(--fw-black);    /* 800 */
  font-size: .92rem;
  color: var(--accent-2);          /* #9c2f27 */
  font-variant-numeric: tabular-nums;   /* dígitos de ancho fijo, evita "brinco" al cambiar */
}
.urgency-box-colon { margin: 0 .1rem; }
.urgency-box-labels {
  display: flex;
  justify-content: space-between;
  gap: .55rem;
  margin-top: .05rem;
  font-size: .5rem;
  letter-spacing: .05em;
  text-transform: uppercase;
  color: var(--accent-2);
  opacity: .7;
}
```

- Fondo: rojo terracota al 8% de opacidad — muy sutil, no es una caja roja sólida.
- Radio de borde: **4px** (no redondeado tipo pill).
- Padding: `.28rem .55rem` (≈4.5px vertical / 8.8px horizontal a 16px base).
- El número (`25:00`) usa peso 800 (black), tamaño `.92rem` (~14.7px), color rojo oscuro (`--accent-2`).
- Debajo del número, las etiquetas "MIN" / "SEG" van en mayúsculas, `.5rem` (~8px), con `justify-content: space-between` (una a cada extremo de la caja) y opacidad 0.7.

### 1.6 Lógica funcional (`main.js`, `initCountdown`)

```js
var COUNTDOWN_KEY = "gt-offer-deadline";
var COUNTDOWN_MINUTES = 25;
```

- Al cargar la página, si no existe un deadline guardado en `localStorage` (clave `gt-offer-deadline`) o si el guardado ya expiró, se crea uno nuevo: `Date.now() + 25 * 60 * 1000` (25 minutos desde ahora).
- Si el usuario recarga la página antes de que expire, **el timer NO se reinicia** — sigue contando desde el deadline ya guardado en `localStorage` (persiste entre recargas/sesiones del mismo navegador).
- Cuando el tiempo llega a 0, se genera automáticamente un nuevo deadline de 25 minutos (el timer se auto-reinicia indefinidamente, nunca se "congela" en 00:00).
- Actualización: `setInterval(render, 1000)` — se re-renderiza cada segundo.
- Formato: `MM:SS` con ceros a la izquierda (`"05"`, no `"5"`).
- El mismo `data-countdown-mm` / `data-countdown-ss` se usa en **3 instancias simultáneas** en el sitio (barra sticky, Hero, sección de oferta) — todas muestran el mismo valor porque comparten el mismo deadline en `localStorage` y el mismo intervalo global.

### 1.7 Variante en la barra sticky (`.urgency-bar`, para referencia/contraste — NO es la del Hero)

```css
.urgency-bar { margin-bottom: 0; flex-shrink: 0; gap: .5rem; }
.urgency-bar .urgency-box { padding: .2rem .45rem; }
.urgency-bar .urgency-box-time { font-size: .8rem; }
.urgency-bar .urgency-box-labels { font-size: .44rem; gap: .45rem; }
```
Es más compacta (padding y fuente menores) porque convive en una fila horizontal angosta con el precio y el botón. **No usar estos valores para el Hero** — son solo para la barra sticky.

---

## 2. Bloque de precio (entre el timer y el botón — contexto necesario para el espaciado)

```html
<div class="hero-price-block">
  <div class="price-compare price-compare-hero">
    <span class="price-was">$62.49</span>
    <span class="hero-price-now" data-i18n="hero.priceNow">$49.99 USD</span>
    <span class="price-badge" data-i18n="offer.badge">Ahorra 25%</span>
  </div>
</div>
```

```css
.hero-price-block { margin-bottom: .9rem; }
.price-compare-hero { justify-content: center; gap: .45rem; margin-bottom: 0; }
.hero-price-now {
  font-family: var(--sans);
  font-weight: var(--fw-black);              /* 800 */
  font-size: clamp(1.3rem, 2.6vw, 1.6rem);   /* 20.8px → 25.6px según viewport */
  color: var(--ink);                          /* #1c1d17 */
  letter-spacing: -0.01em;
}
.price-compare-hero .price-was { font-size: .78rem; }
.price-compare-hero .price-badge { font-size: .6rem; padding: .16rem .4rem; }
```

(Base `.price-was` / `.price-badge` completas, por si se necesitan para otro chat: ver `IMPLEMENTATION_SPEC.md` ya entregado — no se repite aquí para no duplicar contenido fuera de alcance.)

---

## 3. Botón CTA (`.btn.btn-primary.btn-lg.btn-hero`)

### 3.1 HTML exacto

```html
<a class="btn btn-primary btn-lg btn-hero" href="#oferta" data-checkout-cta>
  <span data-i18n="hero.cta">Comprar ahora</span>
  <span class="btn-arrow" aria-hidden="true">→</span>
</a>
```

Nota de comportamiento: el `href="#oferta"` es un ancla de scroll suave, pero `data-checkout-cta` es el atributo real que dispara el modal de checkout vía JS (`initCheckoutModal` intercepta el click con `preventDefault()` — el ancla es solo un fallback semántico/accesible, no navega).

### 3.2 CSS — clase base `.btn` (aplica siempre)

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: .5rem;
  padding: .85rem 1.6rem;
  border-radius: 3px;
  font-family: var(--sans);
  font-weight: 600;
  font-size: .95rem;
  letter-spacing: .01em;
  transition: transform .4s var(--ease-out), box-shadow .4s var(--ease-out), background-color .3s var(--ease-out);
  white-space: nowrap;
}
```

### 3.3 CSS — variante de color `.btn-primary`

```css
.btn-primary {
  background: var(--moss);          /* verde musgo */
  color: var(--cream);              /* #f6f1e6 */
  box-shadow: 0 14px 30px -14px rgba(59, 75, 52, 0.6);
}
.btn-primary:hover {
  background: var(--moss-2);
  box-shadow: 0 18px 36px -14px rgba(85, 106, 73, 0.55);
  transform: translateY(-2px);
}
.btn-primary:active { transform: translateY(0); }
```

### 3.4 CSS — variante de tamaño `.btn-lg` (se combina con `.btn-hero`, ver 3.5 para el resultado final)

```css
.btn-lg { padding: 1.05rem 2.1rem; font-size: 1.02rem; }
```

### 3.5 CSS — variante específica del Hero `.btn-hero` (esta es la que realmente gana por especificidad/orden de cascada — sobrescribe el padding/font-size de `.btn-lg`)

```css
.btn-hero {
  width: 100%;              /* ocupa el 100% del ancho de .hero-cta (max 31rem/496px) */
  justify-content: center;
  padding: .75rem 1.3rem;   /* ← este padding es el que se aplica realmente, NO el de .btn-lg */
  font-size: .88rem;        /* ← esta fuente es la que se aplica realmente, NO la de .btn-lg */
}
.btn-hero .btn-arrow { font-size: 1rem; line-height: 1; }
```

**Valores finales reales del botón del Hero** (resultado de la cascada `.btn` → `.btn-primary` → `.btn-lg` → `.btn-hero`, en ese orden en el HTML `class="btn btn-primary btn-lg btn-hero"`, con `.btn-hero` definido más abajo en el archivo CSS por lo que gana):
- **Ancho**: 100% del contenedor `.hero-cta` (máx. 496px).
- **Padding**: `.75rem 1.3rem` (≈12px vertical / ≈20.8px horizontal a 16px base).
- **Border-radius**: 3px (de `.btn`).
- **Tipografía**: `var(--sans)`, peso 600, tamaño `.88rem` (≈14px).
- **Color de fondo**: `var(--moss)` (verde musgo, ver token en `styles.css :root`).
- **Color de texto**: `var(--cream)` (#f6f1e6).
- **Sombra**: `0 14px 30px -14px rgba(59, 75, 52, 0.6)`.
- **Flecha** (`→`): tamaño de fuente `1rem`, `line-height: 1`, separada del texto por el `gap: .5rem` de `.btn`.
- **Hover**: fondo cambia a `--moss-2`, sombra más difusa, se eleva `-2px` en Y, con transición de `.4s`.
- **Posición**: centrado horizontalmente dentro de `.hero-cta` (que a su vez está centrado con `margin-inline: auto` y `text-align: center`), justo debajo del bloque de precio, con el `margin-top: .9rem` que aporta `.hero-price-block` antes de él.

---

## 4. Fila de confianza / iconos (`.trust-row.trust-row-simple`)

### 4.1 HTML exacto

```html
<div class="trust-row trust-row-simple">
  <span class="trust-item">
    <svg class="trust-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="1.5" stroke="currentColor" stroke-width="1.6"/><path d="M3 10.2H21" stroke="currentColor" stroke-width="1.6"/></svg>
    <span data-i18n="trust.paid">Pago único</span>
  </span>
  <span class="trust-item">
    <svg class="trust-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 12C7 10.34 8.34 9 10 9C11.66 9 13 10.34 13 12C13 13.66 14.34 15 16 15C17.66 15 19 13.66 19 12C19 10.34 17.66 9 16 9C14.34 9 13 10.34 13 12C13 13.66 11.66 15 10 15C8.34 15 7 13.66 7 12Z" stroke="currentColor" stroke-width="1.6"/></svg>
    <span data-i18n="trust.access">Acceso permanente</span>
  </span>
  <span class="trust-item">
    <svg class="trust-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M13 3L4 14H11L10 21L20 9H13L13 3Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>
    <span data-i18n="trust.ready">Listo para usar</span>
  </span>
</div>
```

Textos literales: `trust.paid` = "Pago único" · `trust.access` = "Acceso permanente" · `trust.ready` = "Listo para usar".

Iconos (en orden): 1) **tarjeta de crédito** (rectángulo con banda superior — representa "pago"), 2) **eslabones de cadena/enlace** (representa "acceso permanente"), 3) **rayo** (representa "listo para usar / inmediato").

### 4.2 CSS — base `.trust-row` y `.trust-item` / `.trust-icon`

```css
.trust-row {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .6rem 1.4rem;
}
.trust-item {
  display: inline-flex;
  align-items: center;
  gap: .4rem;
  font-family: var(--sans);
  font-size: .82rem;
  font-weight: var(--fw-medium);
  color: var(--ink-mute);      /* #6c6a5c */
  letter-spacing: .01em;
}
.trust-icon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  color: var(--moss-2);        /* el ícono hereda el verde vía currentColor */
}
```

### 4.3 CSS — variante Hero `.trust-row-simple` (sobrescribe layout, sin círculos, con divisores)

```css
.trust-row.trust-row-simple { margin-top: 1rem; justify-content: center; flex-wrap: nowrap; gap: 0; }
.trust-row-simple .trust-item { padding: 0 .55rem; white-space: nowrap; }
.trust-row-simple .trust-item + .trust-item { border-left: 1px solid var(--line); }
```

- Layout: **fila única centrada, sin wrap** (los 3 ítems siempre en una línea, nunca se apilan verticalmente en desktop/tablet).
- Separador: línea vertical de 1px (`var(--line)`) a la izquierda de cada ítem excepto el primero — es decir, hay exactamente **2 líneas divisorias** entre los 3 ítems, no bordes en los extremos.
- Padding horizontal por ítem: `.55rem` (≈8.8px) a cada lado.
- Tamaño de icono: 15×15px (heredado de `.trust-icon` base, sin override aquí).
- Color de icono: `var(--moss-2)` vía `currentColor` + `stroke="currentColor"` en el SVG.
- Grosor de trazo del SVG: `1.6px`.

### 4.4 Responsive — mobile (≤599px)

```css
@media (max-width: 599px) {
  .trust-row.trust-row-simple { flex-wrap: nowrap; gap: 0; }
  .trust-row-simple .trust-item {
    padding: 0 .3rem;
    gap: .25rem;
    font-size: .62rem;
    white-space: nowrap;
  }
  .trust-row-simple .trust-icon { width: 12px; height: 12px; }
}
```

### 4.5 Responsive — pantallas muy angostas (≤340px)

```css
@media (max-width: 340px) {
  .trust-row-simple .trust-item { padding: 0 .12rem; font-size: .5rem; gap: .12rem; }
  .trust-row-simple .trust-icon { width: 9px; height: 9px; }
}
```

Se sigue manteniendo **una sola fila sin wrap** incluso en el teléfono más angosto contemplado — el diseño reduce icono/fuente/padding en cascada en vez de permitir que los 3 ítems se apilen.

---

## 5. Posición del conjunto dentro del Hero (contexto de layout)

```css
.hero-inner {
  position: relative;
  z-index: 1;
  max-width: var(--container-w);      /* 1180px */
  margin-inline: auto;
  padding-inline: clamp(1.25rem, 4vw, 2.5rem);
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: "copy" "mockup" "cta";
  row-gap: 0;
  column-gap: clamp(2.5rem, 6vw, 4rem);
  align-items: center;
}
.hero-cta { grid-area: cta; }

/* Desktop ≥960px */
@media (min-width: 960px) {
  .hero-inner {
    grid-template-columns: 1.05fr 0.95fr;
    grid-template-areas: "copy mockup" "cta mockup";
  }
  .hero-mockup { justify-self: end; }
}
```

- **Mobile / tablet (<960px)**: layout de una sola columna, orden vertical: copy → mockup (imagen del cotizador) → cta (timer+precio+botón+confianza). El bloque completo del CTA queda **debajo del mockup**.
- **Desktop (≥960px)**: grid de 2 columnas (`1.05fr` / `0.95fr`). La columna izquierda apila copy arriba y cta abajo; la columna derecha es el mockup, que ocupa ambas filas (`justify-self: end`, alineado a la derecha). El bloque del CTA queda **a la izquierda, debajo del texto del hero, al lado del mockup** (no debajo de él).
- El propio `.hero-cta` tiene `max-width: 31rem` (496px) y `margin-inline: auto`, así que dentro de su columna se auto-centra si la columna es más ancha que 496px.

---

## 6. Resumen de todos los valores numéricos (referencia rápida)

| Elemento | Propiedad | Valor |
|---|---|---|
| `.hero-cta` | max-width | 496px (31rem) |
| `.hero-cta` | margin-top | 2.2rem (~35.2px) |
| `.urgency-hero` | margin-top (heredado) / margin-bottom | 1rem / 1rem |
| `.urgency-dot` | tamaño | 6×6px, círculo |
| `.urgency-dot` | animación | pulso 1.8s infinito (opacidad 1↔0.4, escala 1↔0.7) |
| `.urgency-box` | border-radius | 4px |
| `.urgency-box` | padding | .28rem .55rem |
| `.urgency-box` | fondo | rgba(194,59,50,0.08) |
| `.urgency-box-time` | fuente | 800 weight, .92rem, tabular-nums |
| `.urgency-box-labels` | fuente | .5rem, uppercase, opacity .7 |
| Countdown | duración | 25 minutos, persistente en localStorage, auto-reinicio al llegar a 0 |
| `.hero-price-block` | margin-bottom | .9rem |
| `.hero-price-now` | fuente | 800 weight, clamp(1.3rem, 2.6vw, 1.6rem) |
| Botón CTA (`.btn-hero`) | padding | .75rem 1.3rem |
| Botón CTA | border-radius | 3px |
| Botón CTA | ancho | 100% de `.hero-cta` (máx. 496px) |
| Botón CTA | fuente | 600 weight, .88rem |
| Botón CTA | fondo/hover | `--moss` / `--moss-2`, elevación -2px en hover |
| `.trust-row-simple` | layout | fila única, sin wrap, centrada, separadores 1px entre ítems |
| `.trust-icon` | tamaño (desktop) | 15×15px |
| `.trust-icon` | tamaño (≤599px) | 12×12px |
| `.trust-icon` | tamaño (≤340px) | 9×9px |
| `.trust-item` | fuente (desktop) | .82rem, weight medium |

---

*Todos los valores fueron extraídos literalmente de `index.html`, `styles.css` y `main.js` del proyecto Garden Tools by DEEC Studio. No hay valores `REQUIERE VERIFICACIÓN` — todo lo solicitado (posición, altura/tamaño, botón, iconos de confianza, alcance limitado al Hero) fue determinable directamente del código fuente.*
