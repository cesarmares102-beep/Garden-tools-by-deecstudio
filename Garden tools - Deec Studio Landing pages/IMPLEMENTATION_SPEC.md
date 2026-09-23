# IMPLEMENTATION_SPEC.md — Réplica exacta: Timer + Rating + Precio comparado + Badge (DEEC Studio)

Especificación literal, extraída directamente de `styles.css` / `index.html` /
`lib/i18n.js` / `main.js` del proyecto "Garden Tools by DEEC Studio". Objetivo:
replicar bit a bit — **no rediseñar, no simplificar, no modificar textos, no inventar
valores.** Donde algo no está determinado en el código, se marca `REQUIERE VERIFICACIÓN`.

**Dónde aparece cada componente (3 instancias exactas en el sitio actual):**
1. **Hero** (`#top`) — timer + rating + precio comparado, todo junto arriba del CTA.
2. **Tarjeta de oferta** (`#oferta`, `.offer-card`) — mismos 4 componentes, layout casi
   idéntico al del Hero (mismas clases CSS reutilizadas).
3. **Toast de social proof** (`data-sp-stack`, variante `rating`) — **solo el rating**,
   sin timer/precio/badge, ver sección 2.

---

## 1. Temporizador de oferta (countdown)

### 1.1 Lógica (idéntica en las 3 ubicaciones donde aparece un timer — Hero, oferta, y la barra CTA sticky documentada en el spec anterior)
```js
var COUNTDOWN_KEY = "gt-offer-deadline";  // clave de localStorage
var COUNTDOWN_MINUTES = 25;               // duración de la ventana
```
- Un único deadline compartido (timestamp en `localStorage`) — todas las instancias en
  pantalla muestran el mismo tiempo restante, sincronizadas.
- Persiste entre recargas/pestañas mientras no haya expirado.
- Al llegar a `00:00`: no se congela ni desaparece — se reinicia silenciosamente a 25
  minutos nuevos (`REQUIERE VERIFICACIÓN` si el nuevo proyecto necesita que expire de
  verdad una sola vez en vez de repetirse indefinidamente — el código actual **siempre**
  repite).
- Render cada 1000ms vía `setInterval`.

### 1.2 HTML exacto (idéntico en Hero y oferta)
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
**Textos exactos (ES / EN):**
| Clave | ES | EN |
|---|---|---|
| `urgency.label` | Oferta por tiempo limitado | Limited-time offer |
| `urgency.min` | MIN | MIN |
| `urgency.sec` | SEG | SEC |
| `urgency.caption` (solo en la tarjeta de oferta, ver 1.4) | Aprovecha este precio antes de que se acabe el tiempo. | Grab this price before time runs out. |

### 1.3 Diseño / posición / tamaño — variante `.urgency-hero` (Hero y oferta)
```css
.urgency-hero {
  margin-bottom: 1rem;
  display: flex; align-items: center; justify-content: center; gap: .6rem;
}
.urgency-hero .urgency-label {
  font-size: .64rem; font-weight: 700; letter-spacing: .03em;
  text-transform: uppercase; color: var(--accent-2);   /* #9c2f27 */
}
.urgency-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--accent);                            /* #c23b32 */
  animation: urgencyPulse 1.8s ease-in-out infinite;     /* pulso de opacidad+escala */
}
@keyframes urgencyPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: .4; transform: scale(0.7); }
}
.urgency-box {
  background: rgba(var(--accent-rgb), 0.08);             /* rojo muy tenue */
  border-radius: 4px;
  padding: .28rem .55rem;
  text-align: center;
}
.urgency-box-time {
  font-weight: 800;                                       /* --fw-black */
  font-size: .92rem;
  color: var(--accent-2);
  font-variant-numeric: tabular-nums;                     /* dígitos de ancho fijo, no "brinca" */
}
.urgency-box-colon { margin: 0 .1rem; }
.urgency-box-labels {
  display: flex; justify-content: space-between; gap: .55rem;
  margin-top: .05rem;
  font-size: .5rem; letter-spacing: .05em; text-transform: uppercase;
  color: var(--accent-2); opacity: .7;
}
```
**Reducción de movimiento:** `@media (prefers-reduced-motion: reduce) { .urgency-dot { animation: none; } }`
— el punto deja de pulsar, el temporizador sigue contando normalmente (el conteo no es
una animación CSS, es texto actualizado por JS).

### 1.4 Solo en la tarjeta de oferta — caption debajo del CTA
```html
<p class="urgency-caption" data-i18n="urgency.caption">Aprovecha este precio antes de que se acabe el tiempo.</p>
```
```css
.urgency-caption { margin-top: .4rem; font-size: .78rem; color: var(--ink-mute); }
```
Esta línea de texto **no existe en el Hero**, solo en `#oferta`.

### 1.5 Variante de la barra CTA sticky — `.urgency-bar` (más compacta)
```css
.urgency-bar { margin-bottom: 0; flex-shrink: 0; gap: .5rem; }
.urgency-bar .urgency-box { padding: .2rem .45rem; }
.urgency-bar .urgency-box-time { font-size: .8rem; }
.urgency-bar .urgency-box-labels { font-size: .44rem; gap: .45rem; }
@media (max-width: 539px) {
  .urgency-bar { flex: 1 1 100%; order: -1; justify-content: center; }
  .urgency-bar .urgency-box { padding: .16rem .38rem; }
  .urgency-bar .urgency-box-time { font-size: .72rem; }
}
```

### 1.6 Responsive — Hero/oferta
No hay media query propia para `.urgency-hero` en mobile — se achica junto con el resto
del Hero vía los `clamp()` del layout padre. `REQUIERE VERIFICACIÓN` si se esperaba un
breakpoint dedicado; el código actual no tiene uno para esta variante específica (sí lo
tiene la variante `.urgency-bar`, sección 1.5).

---

## 2. Rating de estrellas

### 2.1 Estructura — SIEMPRE 5 estrellas: 4 llenas + 1 al 80% (nunca varía la cantidad)
Cada estrella es el mismo `<svg viewBox="0 0 20 20">` con el mismo `path` (misma
geometría exacta en las 3 ubicaciones del sitio):
```
d="M10 1.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L1.3 7.8l6.1-.7L10 1.5Z"
```
Las primeras 4: `<path fill="currentColor" d="...">` (llenas al 100%).
La 5ª usa un relleno parcial vía gradiente lineal, con **un `id` de gradiente único por
instancia** (para no colisionar cuando varias estrellas viven en el DOM a la vez):
```html
<svg viewBox="0 0 20 20">
  <defs>
    <linearGradient id="starFill-{instancia}">
      <stop offset="80%" stop-color="currentColor"/>
      <stop offset="80%" stop-color="transparent"/>
    </linearGradient>
  </defs>
  <path fill="url(#starFill-{instancia})" stroke="currentColor" stroke-width="1" stroke-linejoin="round" d="M10 1.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L1.3 7.8l6.1-.7L10 1.5Z"/>
</svg>
```
IDs usados en este proyecto: `starFill-hero` (Hero), `starFill-offer` (tarjeta de
oferta), `starFill-toast` (toast de social proof, generado desde `main.js`, ver 2.4).
**El 80% de relleno es fijo en el código — no es un cálculo dinámico del puntaje real**
(el puntaje mostrado, "4.8", y el relleno de la 5ª estrella al 80% son dos valores
independientes escritos a mano, no derivados el uno del otro).

### 2.2 Contenedor / estilos — Hero y oferta (idénticos, misma clase)
```html
<div class="hero-rating reveal">                    <!-- Hero -->
<div class="hero-rating hero-rating-center reveal">  <!-- Oferta: agrega .hero-rating-center -->
  <span class="hero-rating-lead">
    <span class="hero-rating-stars" aria-hidden="true"> <!-- las 5 svg del punto 2.1 --> </span>
    <strong class="hero-rating-score">4.8</strong>
    <span class="hero-rating-sep" aria-hidden="true">·</span>
  </span>
  <span class="hero-rating-text" data-i18n="hero.rating">Más de 214 jardineros y profesionales de mantenimiento de jardines han confiado en nosotros</span>
</div>
```
```css
.hero-rating {
  display: flex; align-items: center; flex-wrap: wrap;
  gap: .45rem; margin-top: 1rem;
  font-size: .88rem; color: var(--ink-mute);
}
.hero-rating-lead { display: inline-flex; align-items: center; gap: .35rem; flex-shrink: 0; }
.hero-rating-stars { display: flex; align-items: center; gap: .1rem; flex-shrink: 0; color: #F5B301; }  /* amarillo dorado */
.hero-rating-stars svg { width: 14px; height: 14px; }
.hero-rating-score { font-weight: 700; color: var(--ink); }
.hero-rating-sep { opacity: .5; }
.hero-rating-center { justify-content: center; margin-inline: auto; margin-bottom: 1.2rem; }  /* solo en la oferta */
@media (max-width: 599px) { .hero-rating { font-size: .82rem; } }
```
**Diferencia Hero vs. oferta:** la oferta agrega la clase `.hero-rating-center`
(centra el bloque y le da `margin-bottom: 1.2rem`); el Hero no la lleva (queda alineado
a la izquierda, sin ese margen inferior extra). Todo lo demás es idéntico.

**Texto del rating (clave `hero.rating`, ES / EN):**
| ES | EN |
|---|---|
| Más de 214 jardineros y profesionales de mantenimiento de jardines han confiado en nosotros | Trusted by 214+ gardeners and garden maintenance professionals |

### 2.3 Puntaje mostrado
`4.8` — texto plano dentro de `<strong class="hero-rating-score">`, igual en ES y EN
(no es una clave i18n, está hardcodeado en `index.html` en las dos ubicaciones).

### 2.4 Variante dentro del toast de social proof (`kind: "rating"`, generada por JS)
```js
// main.js — construida dinámicamente, mismo path de estrella que 2.1
var SP_STARS_HTML =
  ('<svg viewBox="0 0 20 20"><path fill="currentColor" d="' + SP_STAR_PATH + '"/></svg>').repeat(4) +
  '<svg viewBox="0 0 20 20"><defs><linearGradient id="starFill-toast">...' + /* misma estructura 80%/transparent */
  '<path fill="url(#starFill-toast)" ...></svg>';
```
```html
<div class="sp-toast-body">
  <div class="hero-rating-lead"> <!-- reutiliza la clase del Hero --> </div>
  <p>{texto de socialproof.ratingText}</p>
</div>
```
```css
.sp-toast-body .hero-rating-lead { margin-bottom: .3rem; }  /* único override propio de esta variante */
```
Puntaje: también `4.8` (mismo valor hardcodeado, escrito en el JS). Texto:
| Clave | ES | EN |
|---|---|---|
| `socialproof.ratingText` | Más de 214 jardineros y profesionales de mantenimiento de jardines de Estados Unidos y México confían en nosotros | Trusted by 214+ gardeners and garden maintenance professionals across the US and Mexico |

**Nota:** el texto de esta variante (`socialproof.ratingText`) es **distinto** al de
`hero.rating` (menciona "Estados Unidos y México", el otro no) — no unificar, son dos
claves i18n independientes en el código real.

---

## 3. Precio de comparación (precio tachado)

### 3.1 HTML — Hero
```html
<div class="hero-price-block">
  <div class="price-compare price-compare-hero">
    <span class="price-was">$62.49</span>
    <span class="hero-price-now" data-i18n="hero.priceNow">$49.99 USD</span>
    <span class="price-badge" data-i18n="offer.badge">Ahorra 25%</span>
  </div>
</div>
```
### 3.2 HTML — tarjeta de oferta (estructura distinta: el precio actual vive aparte, más grande)
```html
<div class="price-compare price-compare-center">
  <span class="price-was">$62.49</span>
  <span class="price-badge" data-i18n="offer.badge">Ahorra 25%</span>
</div>
<div class="offer-price">
  <span class="offer-currency">$49.99</span>
  <span class="offer-unit">USD</span>
</div>
```
**Diferencia clave Hero vs. oferta:** en el Hero, el precio actual (`hero-price-now`)
va **dentro** de la misma fila que el precio tachado y el badge. En la oferta, el precio
actual se separa a un bloque propio (`offer-price`, mucho más grande tipográficamente,
debajo) — el precio tachado y el badge quedan solos arriba, sin el precio actual al lado.

### 3.3 Estilos — precio tachado
```css
.price-compare { display: inline-flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
.price-compare-center { justify-content: center; margin-bottom: .6rem; }  /* oferta */
.price-compare-hero { justify-content: center; gap: .45rem; margin-bottom: 0; }  /* Hero */
.price-was {
  font-weight: 600;                          /* --fw-semibold */
  font-size: .95rem;
  color: var(--ink-mute);
  text-decoration: line-through;
  text-decoration-color: var(--accent);      /* #c23b32 — la línea es roja, no del color del texto */
  text-decoration-thickness: 1.5px;
}
.price-compare-hero .price-was { font-size: .78rem; }  /* override: más chico en el Hero que en la oferta */
```
### 3.4 Precio actual — Hero (`.hero-price-now`)
```css
.hero-price-now {
  font-weight: 800;                          /* --fw-black */
  font-size: clamp(1.3rem, 2.6vw, 1.6rem);
  color: var(--ink);
  letter-spacing: -0.01em;
}
```
### 3.5 Precio actual — oferta (`.offer-currency` + `.offer-unit`, mucho más grande, es el precio protagonista de esa sección)
```css
.offer-currency {
  font-size: clamp(3.2rem, 8vw, 4.8rem);     /* MUCHO más grande que en el Hero */
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--ink);
  line-height: 1;
}
.offer-unit {
  font-weight: 600;
  font-size: .95rem;
  color: var(--ink-mute);
  margin-top: .6rem;                          /* alineado a la base del número grande */
}
```
### 3.6 Valores mostrados (literales del código actual — datos del producto, no valores de diseño)
| Elemento | Valor |
|---|---|
| Precio tachado (`$62.49`) | Hardcodeado en HTML, idéntico en Hero y oferta, **no es una clave i18n** (mismo número en ES y EN) |
| Precio actual (Hero, `hero.priceNow`) | `$49.99 USD` (ES y EN, idéntico) |
| Precio actual (oferta) | `$49.99` + `USD` como unidad separada — hardcodeado, no i18n |

---

## 4. Badge de ahorro

### 4.1 HTML (idéntico en Hero y oferta)
```html
<span class="price-badge" data-i18n="offer.badge">Ahorra 25%</span>
```
### 4.2 Estilos
```css
.price-badge {
  font-weight: 700;
  font-size: .68rem;
  letter-spacing: .04em;
  text-transform: uppercase;
  color: var(--cream);          /* #f6f1e6 */
  background: var(--accent);    /* #c23b32 */
  padding: .22rem .5rem;
  border-radius: 2px;
  white-space: nowrap;
}
.price-compare-hero .price-badge { font-size: .6rem; padding: .16rem .4rem; }  /* más chico en el Hero */
```
### 4.3 Texto y cálculo — **importante, verificado en este documento, no asumido**
| Clave | ES | EN |
|---|---|---|
| `offer.badge` | Ahorra 25% | Save 25% |

**El porcentaje NO se calcula dinámicamente a partir de los dos precios mostrados.** Es
un texto fijo en `lib/i18n.js`. Verificación aritmética con los valores reales del sitio
($62.49 → $49.99): el descuento real es **~20.0%**, no 25% — el texto del badge y los
precios mostrados **no coinciden matemáticamente** en la implementación actual. Esto no
es un error a corregir en este documento (es una réplica literal), pero **al reutilizar
este componente con precios distintos, el texto del badge debe actualizarse a mano** —
no existe ninguna lógica en el código que lo recalcule solo.

---

## 5. Configuración a centralizar (para editar sin tocar CSS/JS de lógica)

```js
// Countdown — igual que en el spec anterior
var COUNTDOWN_KEY = "gt-offer-deadline";
var COUNTDOWN_MINUTES = 25;
```
**Valores de producto que deben quedar fáciles de editar** (hoy están repartidos entre
`index.html` hardcodeado y `lib/i18n.js`, no en un único objeto de config — replicar tal
cual esa separación, o centralizarlos en un config si el nuevo proyecto lo prefiere,
pero documentando el cambio):
- Precio tachado (`$62.49`, hardcodeado, 2 apariciones idénticas).
- Precio actual (`$49.99` / `$49.99 USD`, hardcodeado + 1 clave i18n).
- Texto y porcentaje del badge (`offer.badge`, i18n — **no calculado**, ver 4.3).
- Puntaje del rating (`4.8`, hardcodeado, 3 apariciones — Hero, oferta, toast).
- Relleno de la 5ª estrella (80%, hardcodeado en el `<stop offset="80%">` de cada SVG —
  no ligado al puntaje "4.8").
- Duración del countdown (`COUNTDOWN_MINUTES = 25`).

**No son configuración editable, son CSS fijo del diseño:** todos los px/rem/colores
listados en las secciones 1, 2, 3 y 4 de este documento.
