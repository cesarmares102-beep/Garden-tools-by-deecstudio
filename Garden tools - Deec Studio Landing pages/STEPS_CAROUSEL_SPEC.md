# STEPS_CAROUSEL_SPEC.md — Réplica exacta: Carrusel "Cómo funciona" (4 pasos)

Alcance: el componente `.steps-carousel` — 4 tarjetas de pasos que en **desktop se muestran como grid fijo de 4 columnas (sin carrusel)** y en **mobile (≤719px) se convierten en un carrusel horizontal nativo con scroll-snap + puntos indicadores**. No usa ninguna librería (no Swiper, no Splide) — es CSS `scroll-snap` nativo + ~25 líneas de JS vainilla solo para sincronizar los puntos. Todos los valores están tomados literalmente de `index.html`, `styles.css` y `main.js`.

---

## 1. Idea general del componente

- **Desktop / tablet (>719px)**: es un `grid` normal de 4 columnas iguales. No hay overflow, no hay scroll horizontal, no hay puntos — es estático.
- **Mobile (≤719px)**: el mismo `<ol>` cambia a `display: flex` con `overflow-x: auto` + `scroll-snap-type: x mandatory` — se vuelve un carrusel deslizable con el dedo (o con el trackpad), con **scroll nativo del navegador**, sin JS manejando el swipe. El único JS presente sirve exclusivamente para actualizar cuál punto (`.steps-dot`) está activo, escuchando el evento `scroll` del track.
- No hay flechas de navegación (prev/next) — la única forma de navegar en mobile es deslizar; los puntos son solo indicadores visuales, no son clickeables.

---

## 2. HTML exacto

```html
<div class="steps-carousel">
  <ol class="steps-track" data-steps-track>
    <li class="step-card reveal">
      <span class="step-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none"><!-- ícono 1 --></svg>
      </span>
      <h3 data-i18n="steps.1.title">Selecciona el servicio</h3>
      <p data-i18n="steps.1.body">Elige el trabajo que vas a cotizar.</p>
    </li>
    <li class="step-card reveal">
      <span class="step-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none"><!-- ícono 2 --></svg>
      </span>
      <h3 data-i18n="steps.2.title">Introduce los datos</h3>
      <p data-i18n="steps.2.body">Agrega la información necesaria del trabajo.</p>
    </li>
    <li class="step-card reveal">
      <span class="step-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none"><!-- ícono 3 --></svg>
      </span>
      <h3 data-i18n="steps.3.title">Obtén el precio</h3>
      <p data-i18n="steps.3.body">El cotizador realiza el cálculo automáticamente.</p>
    </li>
    <li class="step-card reveal">
      <span class="step-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none"><!-- ícono 4 --></svg>
      </span>
      <h3 data-i18n="steps.4.title">Genera el presupuesto</h3>
      <p data-i18n="steps.4.body">Obtén tu presupuesto listo para presentar al cliente.</p>
    </li>
  </ol>
  <div class="steps-dots" data-steps-dots aria-hidden="true">
    <span class="steps-dot is-active"></span>
    <span class="steps-dot"></span>
    <span class="steps-dot"></span>
    <span class="steps-dot"></span>
  </div>
</div>
```

Puntos clave de la estructura:
- `.steps-carousel` es el wrapper exterior (no lleva estilos de layout propios más allá de contener a los otros dos).
- `.steps-track` (con `data-steps-track`) es el elemento que hace scroll — es una lista `<ol>` semántica, no un `<div>`.
- `.steps-dots` (con `data-steps-dots`) va **fuera** de `.steps-track`, como hermano, no dentro.
- El primer punto trae `is-active` ya en el HTML (estado inicial antes de que corra JS), para que no haya un parpadeo si el JS tarda en ejecutar.
- `.steps-dots` tiene `aria-hidden="true"` — son decorativos, la navegación real accesible es el propio scroll/swipe del `<ol>`.
- Cada tarjeta tiene la clase `reveal` (animación de aparición al hacer scroll de la página — comportamiento normal del sitio, ver nota en sección 5 sobre por qué se anula en mobile).

---

## 3. CSS

### 3.1 Tarjeta — estilos base (aplican en ambos layouts)

```css
.step-icon {
  display: inline-flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  color: var(--moss);
  margin-bottom: 1.1rem;
}
.step-icon svg { width: 22px; height: 22px; }
.step-card h3 { font-size: 1.05rem; margin-bottom: .4rem; }
.step-card p { font-size: .88rem; color: var(--ink-mute); }

.step-card {
  padding: 1.6rem 1.5rem;
  border: 1px solid var(--line);
  border-radius: 2px;
}
```

Diseño deliberadamente plano: sin sombra, sin gradiente, sin elevación al hover — solo un borde de 1px y esquinas casi rectas (2px de radio), para que esta sección se sienta "en pausa" respecto a las secciones más inmersivas del resto del sitio.

### 3.2 Desktop / tablet (>719px) — grid de 4 columnas, sin carrusel

```css
.steps-track {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.75rem;
}
.steps-dots { display: none; }
```

### 3.3 Mobile (≤719px) — se convierte en carrusel

```css
@media (max-width: 719px) {
  .steps-track {
    display: flex;
    grid-template-columns: none;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 6px, #000 calc(100% - 28px), transparent 100%);
    mask-image: linear-gradient(90deg, transparent 0, #000 6px, #000 calc(100% - 28px), transparent 100%);
    gap: 1rem;
    scrollbar-width: none;
  }
  .steps-track::-webkit-scrollbar { display: none; }

  .step-card {
    flex: 0 0 80%;
    max-width: 320px;
    min-width: 0;
    scroll-snap-align: start;
  }

  /* Desactiva la animación normal de scroll-reveal de la página en
     estas tarjetas — si no, cada tarjeta "aparece" (fade+translateY)
     al deslizarla horizontalmente, lo cual se ve como si la tarjeta
     se moviera sola mientras el usuario la desliza. */
  .step-card.reveal { opacity: 1; transform: none; transition: none; }

  .steps-dots {
    display: flex;
    justify-content: center;
    gap: .5rem;
    margin-top: 1.5rem;
  }
  .steps-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--line);
    transition: background-color .3s var(--ease-out), transform .3s var(--ease-out);
  }
  .steps-dot.is-active { background: var(--moss); transform: scale(1.3); }
}
```

**Explicación de cada pieza no obvia:**

- `scroll-snap-type: x mandatory` en el track + `scroll-snap-align: start` en cada card → el navegador "ajusta" automáticamente el scroll para que siempre quede una tarjeta alineada al borde izquierdo tras soltar el swipe, sin JS.
- `flex: 0 0 80%; max-width: 320px;` → cada tarjeta ocupa el 80% del ancho visible (deja ver un pedacito de la siguiente tarjeta, sugiriendo que hay más contenido), con un tope de 320px en pantallas más anchas dentro del rango mobile.
- `mask-image` con gradiente → desvanece visualmente (fade) los primeros ~6px y últimos ~28px del track, para que el borde de corte del scroll no se sienta como un tijeretazo abrupto. El lado derecho tiene más fade (28px) que el izquierdo (6px) para insinuar mejor que hay más contenido a la derecha.
- `scrollbar-width: none` + `::-webkit-scrollbar { display: none; }` → oculta la barra de scroll nativa (el indicador visual son los puntos, no la scrollbar del navegador).
- **Importante (nota real del código):** no se usa la técnica de "sangría/bleed con márgenes negativos" para que la tarjeta 1 y la tarjeta 4 respiren con el margen de la página — el track simplemente hereda el padding normal del `.container` de la sección. Esto es deliberado: la técnica de sangría puede hacer que algunos navegadores recorten el padding inicial del contenedor cuando hace overflow horizontal (la tarjeta 1 queda pegada al borde izquierdo sin margen, aunque el CSS computado sí muestre el padding). Si replicas esto en otra landing, **no apliques negative-margin bleed al track** — deja que el padding lateral normal de la sección sea el único margen de la primera/última tarjeta.
- El punto activo (`.steps-dot.is-active`) se distingue por color (`var(--moss)`, verde) y por escala (`scale(1.3)`, ligeramente más grande) — no solo color, para accesibilidad de contraste/daltonismo.

---

## 4. JavaScript — función completa, cópiala tal cual

```js
function initStepsCarousel() {
  var track = document.querySelector("[data-steps-track]");
  var dots = Array.prototype.slice.call(document.querySelectorAll("[data-steps-dots] .steps-dot"));
  if (!track || !dots.length) return;

  var cards = Array.prototype.slice.call(track.querySelectorAll(".step-card"));
  var ticking = false;

  function updateActive() {
    ticking = false;
    var center = track.scrollLeft + track.clientWidth / 2;
    var closest = 0;
    var closestDist = Infinity;
    cards.forEach(function (card, i) {
      var dist = Math.abs((card.offsetLeft + card.offsetWidth / 2) - center);
      if (dist < closestDist) { closestDist = dist; closest = i; }
    });
    dots.forEach(function (dot, i) { dot.classList.toggle("is-active", i === closest); });
  }

  track.addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateActive);
  }, { passive: true });

  updateActive();
}
```

Llamada al inicializar (dentro del `boot()` general del sitio):

```js
initStepsCarousel();
```

### Cómo funciona el JS, paso a paso

1. En cada evento `scroll` del track, calcula el **centro visible actual** del track (`scrollLeft + clientWidth / 2`).
2. Recorre todas las tarjetas y calcula, para cada una, la distancia entre su propio centro (`offsetLeft + offsetWidth / 2`) y el centro visible del track.
3. La tarjeta con menor distancia es la "más centrada" → esa es la que se marca como activa en los puntos.
4. Usa `requestAnimationFrame` + una bandera `ticking` como throttle manual — evita recalcular en cada micro-evento de scroll (que puede dispararse decenas de veces por segundo), limitándolo a una vez por frame de pintura.
5. El listener de scroll es `{ passive: true }` — le dice al navegador que el JS nunca llamará `preventDefault()` en este evento, lo que permite que el scroll táctil siga siendo fluido/nativo sin esperar al JS.
6. `updateActive()` se llama una vez de inmediato al iniciar, para sincronizar el estado por si el track no arranca en `scrollLeft: 0` (por ejemplo, restauración de posición de scroll del navegador).
7. En desktop, este JS sigue corriendo (no hay gate de `matchMedia`), pero es inofensivo: como `.steps-dots` tiene `display: none` fuera del breakpoint mobile, actualizar sus clases no tiene ningún efecto visible ni de layout.

---

## 5. Checklist para reutilizar en otra landing

- [ ] El track es un elemento con overflow horizontal nativo (`overflow-x: auto`) — no se simula el swipe con JS/`transform`, es scroll real del navegador.
- [ ] `scroll-snap-type: x mandatory` en el track + `scroll-snap-align: start` en cada card — sin esto el scroll es libre/suelto, no "encaja" en cada tarjeta.
- [ ] El HTML de los puntos existe siempre en el DOM (no se genera dinámicamente por JS) — el JS solo alterna la clase `is-active`, nunca crea/destruye elementos `.steps-dot`.
- [ ] El número de `.steps-dot` debe coincidir manualmente con el número de `.step-card` — no hay generación automática, si agregas una 5ª tarjeta debes agregar un 5º punto a mano en el HTML.
- [ ] Si las tarjetas tienen animación de scroll-reveal de la página (fade/translateY al entrar en viewport), **anúlala en el breakpoint mobile** (`opacity: 1; transform: none; transition: none;`) para que no se mezcle con el gesto de swipe horizontal.
- [ ] No agregues flechas prev/next ni intentes clickear los puntos para navegar — este componente, tal como está construido, es solo swipe + indicador pasivo. Si quieres puntos clickeables, es una función adicional que no existe en el original (habría que agregar `scrollTo` en cada dot).
- [ ] Desktop no necesita el JS para nada visual (los puntos están ocultos ahí) — puedes dejar el mismo `initStepsCarousel()` corriendo siempre, sin gate de `matchMedia`, tal como en el original.

---

*Todos los valores fueron extraídos literalmente de `index.html`, `styles.css` (sección "Steps") y `main.js` (función `initStepsCarousel`) del proyecto Garden Tools by DEEC Studio. No hay valores `REQUIERE VERIFICACIÓN`.*
