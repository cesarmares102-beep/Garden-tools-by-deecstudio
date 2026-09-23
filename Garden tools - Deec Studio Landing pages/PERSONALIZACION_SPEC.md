# PERSONALIZACION_SPEC.md — Réplica exacta: Sección "Personalización" (ciclo automático de 4 etapas)

Alcance: la sección **04 — Personalización** (`#personalizacion`) completa — el ciclo automático que va mostrando 4 mockups distintos (Genérico → Tu negocio → Tus servicios → Tu cotizador final) sincronizados con una línea de tiempo horizontal de 4 pasos. Todos los valores están tomados literalmente de `index.html`, `styles.css` y `main.js`.

---

## 1. Idea general del componente

**No es un componente controlado por scroll.** Es un ciclo automático por temporizador (`setInterval`), cada 3.2 segundos, que alterna cuál de los 4 mockups está visible (superpuestos en el mismo espacio, con cross-fade) y cuál paso de la línea de tiempo de abajo está marcado como activo. El scroll de la página nunca se intercepta ni se lee — la sección ocupa solo la altura de su propio contenido, como cualquier sección normal.

**Nota de decisión de diseño (documentada en el propio CSS del proyecto):** existió una versión anterior que "clavaba" (`position: sticky`) la sección durante 400vh de scroll, donde cada una de las 4 etapas ocupaba un scroll completo. Se descartó porque los usuarios lo interpretaban como "la página se atoró aquí" al no esperar 4 scrolls consecutivos en el mismo lugar. La versión actual es la que se documenta abajo: siempre se puede seguir bajando por la página normalmente, y el ciclo se reproduce solo, temporizado, mientras la sección está a la vista.

**Control de reproducción**: un `IntersectionObserver` (`threshold: 0.35`) inicia el `setInterval` cuando el 35% de la sección entra en pantalla, y lo detiene (`clearInterval`) cuando sale — para no seguir corriendo el ciclo (y gastar CPU/batería) mientras el usuario está viendo otra parte de la página. A diferencia del showcase de la libreta (ver `TRANSFORM_SHOWCASE_SPEC.md`), aquí el estado **no se congela en un frame intermedio** al salir de vista — simplemente se pausa el temporizador y la etapa activa queda fija tal como estaba (no hay animación en curso que congelar, cada etapa es un estado estable).

**Respeto a `prefers-reduced-motion` (si existe en el propio código, a diferencia del showcase de la libreta):** si el sistema del usuario tiene activado "reducir movimiento", el ciclo automático **nunca arranca** — la sección se queda fija en la primera etapa ("Genérico") para siempre, sin temporizador ni `IntersectionObserver`.

---

## 2. HTML exacto

```html
<section class="section custom" id="personalizacion">
  <div class="container">
    <div class="pv-track" data-pv-track>
      <div class="pv-pin" data-pv-pin>
        <div class="pv-layout">

          <div class="pv-copy">
            <p class="kicker reveal" data-i18n="custom.kicker">Personalización</p>
            <h2 class="reveal" data-i18n="custom.title">No es un cotizador genérico.<br><em>Es el tuyo.</em></h2>
            <p class="section-sub reveal" data-i18n="custom.sub">Se configura con el nombre de tu negocio, tus servicios, tus precios y la información que necesitas.</p>
          </div>

          <div class="pv-mockups">

            <!-- 01 · Genérico (estado inicial, is-active ya en el HTML) -->
            <div class="pv-mockup is-active" data-pv-stage="generic">
              <div class="mockup mockup-generic">
                <div class="mockup-bar">
                  <span class="mockup-dot"></span><span class="mockup-dot"></span><span class="mockup-dot"></span>
                  <span class="mockup-bar-title" data-i18n="custom.generic.barTitle">Cotizador Web</span>
                </div>
                <div class="mockup-head">
                  <div class="mockup-biz">
                    <span class="mockup-biz-mark pv-muted-mark">—</span>
                    <div>
                      <p class="mockup-biz-name pv-muted-name" data-i18n="custom.generic.bizName">Nombre del negocio</p>
                      <p class="mockup-biz-role">Presupuesto de servicio</p>
                    </div>
                  </div>
                </div>
                <div class="mockup-body">
                  <div class="mockup-field">
                    <label>Servicio</label>
                    <div class="mockup-select"><span>Selecciona un servicio</span> <span>▾</span></div>
                  </div>
                  <div class="mockup-field">
                    <label data-i18n="custom.generic.priceLabel">Precio</label>
                    <div class="mockup-input pv-muted-input">—</div>
                  </div>
                  <div class="mockup-action pv-disabled-action">Generar presupuesto</div>
                </div>
              </div>
            </div>

            <!-- 02 · Tu negocio -->
            <div class="pv-mockup" data-pv-stage="business">
              <div class="mockup">
                <div class="mockup-bar">
                  <span class="mockup-dot"></span><span class="mockup-dot"></span><span class="mockup-dot"></span>
                  <span class="mockup-bar-title" data-i18n="mockup.barTitle">Cotizador Web Personalizado</span>
                </div>
                <div class="mockup-head">
                  <div class="mockup-biz">
                    <span class="mockup-biz-mark">VJ</span>
                    <div>
                      <p class="mockup-biz-name" data-i18n="mockup.bizName">Verde &amp; Jardín</p>
                      <p class="mockup-biz-role" data-i18n="mockup.bizRole">Presupuesto de servicio</p>
                    </div>
                  </div>
                  <span class="mockup-badge" data-i18n="mockup.badge">Nuevo presupuesto</span>
                </div>
                <div class="mockup-body">
                  <div class="mockup-field">
                    <label data-i18n="mockup.serviceLabel">Servicio</label>
                    <div class="mockup-select"><span data-i18n="custom.morph.serviceEmpty">Selecciona un servicio</span> <span>▾</span></div>
                  </div>
                  <div class="mockup-action pv-disabled-action" data-i18n="mockup.action">Generar presupuesto</div>
                </div>
              </div>
            </div>

            <!-- 03 · Tus servicios -->
            <div class="pv-mockup" data-pv-stage="services">
              <div class="mockup">
                <div class="mockup-bar">
                  <span class="mockup-dot"></span><span class="mockup-dot"></span><span class="mockup-dot"></span>
                  <span class="mockup-bar-title" data-i18n="mockup.barTitle">Cotizador Web Personalizado</span>
                </div>
                <div class="mockup-head">
                  <div class="mockup-biz">
                    <span class="mockup-biz-mark">VJ</span>
                    <div>
                      <p class="mockup-biz-name" data-i18n="mockup.bizName">Verde &amp; Jardín</p>
                      <p class="mockup-biz-role" data-i18n="mockup.bizRole">Presupuesto de servicio</p>
                    </div>
                  </div>
                  <span class="mockup-badge" data-i18n="mockup.badge">Nuevo presupuesto</span>
                </div>
                <div class="mockup-body">
                  <div class="mockup-field">
                    <label data-i18n="mockup.addServicesLabel">Servicios adicionales</label>
                    <div class="mockup-tags">
                      <span class="mockup-tag is-active" data-i18n="custom.morph.mowing">Mantenimiento de césped</span>
                      <span class="mockup-tag is-active" data-i18n="custom.morph.edging">Poda de arbustos</span>
                      <span class="mockup-tag is-active" data-i18n="custom.morph.cleanup">Limpieza de jardín</span>
                    </div>
                  </div>
                  <div class="mockup-action pv-disabled-action" data-i18n="mockup.action">Generar presupuesto</div>
                </div>
              </div>
            </div>

            <!-- 04 · Tu cotizador (estado final, con precios y total) -->
            <div class="pv-mockup" data-pv-stage="final">
              <div class="mockup">
                <div class="mockup-bar">
                  <span class="mockup-dot"></span><span class="mockup-dot"></span><span class="mockup-dot"></span>
                  <span class="mockup-bar-title" data-i18n="mockup.barTitle">Cotizador Web Personalizado</span>
                </div>
                <div class="mockup-head">
                  <div class="mockup-biz">
                    <span class="mockup-biz-mark">VJ</span>
                    <div>
                      <p class="mockup-biz-name" data-i18n="mockup.bizName">Verde &amp; Jardín</p>
                      <p class="mockup-biz-role" data-i18n="mockup.bizRole">Presupuesto de servicio</p>
                    </div>
                  </div>
                  <span class="mockup-badge" data-i18n="mockup.badge">Nuevo presupuesto</span>
                </div>
                <div class="mockup-body">
                  <div class="mockup-summary">
                    <div class="mockup-summary-row"><span data-i18n="custom.morph.mowing">Mantenimiento de césped</span><span>$85.00</span></div>
                    <div class="mockup-summary-row"><span data-i18n="custom.morph.edging">Poda de arbustos</span><span>$25.00</span></div>
                    <div class="mockup-summary-row"><span data-i18n="custom.morph.cleanup">Limpieza de jardín</span><span>$30.00</span></div>
                    <div class="mockup-summary-row mockup-summary-total">
                      <span data-i18n="mockup.summaryTotalLabel">Total del presupuesto</span>
                      <span class="mockup-price" data-count-to="140.00">$0.00</span>
                    </div>
                  </div>
                  <div class="mockup-action" data-i18n="mockup.action">Generar presupuesto</div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div class="pv-timeline" data-pv-timeline>
          <div class="pv-timeline-line" aria-hidden="true"></div>
          <div class="pv-step is-active reveal" data-pv-stage="generic">
            <span class="pv-dot" aria-hidden="true"></span>
            <h3 data-i18n="custom.stage.generic">Genérico</h3>
            <p data-i18n="custom.stage.genericBody">Empiezas con un cotizador estándar.</p>
          </div>
          <div class="pv-step reveal" data-pv-stage="business">
            <span class="pv-dot" aria-hidden="true"></span>
            <h3 data-i18n="custom.card1.title">Tu negocio</h3>
            <p data-i18n="custom.card1.body">Agregas el nombre y la información.</p>
          </div>
          <div class="pv-step reveal" data-pv-stage="services">
            <span class="pv-dot" aria-hidden="true"></span>
            <h3 data-i18n="custom.card2.title">Tus servicios</h3>
            <p data-i18n="custom.card2.body">Configuras los servicios que ofreces.</p>
          </div>
          <div class="pv-step reveal" data-pv-stage="final">
            <span class="pv-dot" aria-hidden="true"></span>
            <h3 data-i18n="custom.card5.title">Tu cotizador</h3>
            <p data-i18n="custom.card5.body">Listo para usar con tus precios y tu imagen.</p>
          </div>
        </div>

      </div>
    </div>
  </div>
</section>
```

### 2.1 Cómo leer la estructura de atributos `data-*`

| Atributo | Dónde va | Para qué sirve |
|---|---|---|
| `data-pv-track` | Contenedor raíz interno | Hook que usa el JS para arrancar todo (`initPersonalizacion` busca este selector primero; si no existe, la función no hace nada) |
| `data-pv-pin` | Envoltorio de layout | Solo estructural/CSS, no lo lee el JS |
| `data-pv-stage="generic|business|services|final"` | En cada `.pv-mockup` Y en cada `.pv-step` | El JS empareja mockup↔paso por este valor exacto — deben coincidir letra por letra en ambos lugares |
| `data-pv-timeline` | El contenedor de los 4 `.pv-step` | El JS lo usa para hacer scroll automático en mobile cuando cambia de etapa (ver sección 4) |
| `is-active` (clase, no atributo) | Ya presente en el HTML en el mockup y paso "generic" | Estado inicial antes de que corra el JS — evita parpadeo en la primera carga |

**Los 4 valores de `stages` están hardcodeados en el JS en este orden exacto: `["generic", "business", "services", "final"]`. Si agregas una 5ª etapa, debes: (1) agregar el string al array `stages`, (2) agregar el `.pv-mockup` correspondiente, (3) agregar el `.pv-step` correspondiente, y (4) agregar un `.pv-dot`/tarjeta a la línea de tiempo — nada de esto se genera dinámicamente.**

---

## 3. CSS

### 3.1 Contenedor y layout general

```css
.custom { background: var(--bg-2); }
.pv-track { position: relative; }
.pv-pin {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: clamp(1rem, 2.5vh, 2rem);
  padding-top: .75rem;
  padding-bottom: 1rem;
  box-sizing: border-box;
  background: var(--bg-2);
}

.pv-layout { display: flex; flex-direction: column; gap: clamp(1rem, 2.5vh, 2rem); }
.pv-copy { max-width: 46ch; }
.pv-copy h2 { font-size: clamp(1.9rem, 3.4vw, 2.5rem); }
.pv-copy .section-sub { margin-top: .75rem; }
```

**Nota crítica:** `.pv-track` y `.pv-pin` son elementos de flujo normal — **NO llevan `position: sticky` ni altura artificial**. Si vienes de replicar otro sitio con scroll-pinning, no agregues eso aquí; es justamente lo que este componente evita a propósito (ver sección 1).

### 3.2 Los 4 mockups — superpuestos con cross-fade

```css
.pv-mockups {
  display: grid;
  justify-items: center;
  min-height: min(400px, 30vh);   /* reserva espacio fijo para que no haya salto de layout al cambiar de etapa */
}
.pv-mockup {
  grid-area: 1 / 1;                          /* los 4 ocupan la MISMA celda del grid → quedan superpuestos */
  width: 100%;
  max-width: 360px;
  display: flex;
  align-items: center;
  opacity: 0;
  transform: scale(.97) translateY(10px);
  filter: blur(3px);
  transition: opacity .6s var(--ease-out), transform .6s var(--ease-out), filter .6s var(--ease-out);
  pointer-events: none;                      /* los mockups inactivos no son clickeables/interactivos */
}
.pv-mockup.is-active {
  opacity: 1;
  transform: none;
  filter: blur(0);
  pointer-events: auto;
}
.pv-mockup .mockup { width: 100%; }
```

- La técnica de superposición es `display: grid` en el contenedor + `grid-area: 1 / 1` en los 4 hijos — todos ocupan la misma celda de grid, apilados unos sobre otros, y solo la visibilidad (`opacity`/`filter`/`transform`) decide cuál se ve.
- La transición de entrada/salida combina 3 propiedades: opacidad (fade), escala + desplazamiento vertical (`scale(.97) translateY(10px)` → `none`, un ligero "acercamiento desde abajo"), y desenfoque (`blur(3px)` → `blur(0)`, un enfoque progresivo). Las 3 corren en paralelo, `.6s`, mismo easing.

### 3.3 Estilos específicos de la Etapa 1 "Genérico" (versión deslucida/sin marca)

```css
.pv-muted-mark { background: var(--line); color: var(--ink-mute); }
.pv-muted-name { color: var(--ink-mute); font-style: italic; }
.pv-muted-input { color: var(--ink-mute); }
.pv-disabled-action { background: var(--line); color: var(--ink-mute); }
```

Estas 4 clases se usan para representar visualmente "todavía no personalizado": el marcador de marca es gris en vez de las iniciales "VJ", el nombre del negocio va en cursiva gris ("Nombre del negocio" como placeholder), el campo de precio muestra un guión ("—"), y el botón de acción se ve deshabilitado (gris, no verde). Se reutilizan también en las etapas 2 y 3 donde aplique (el botón "Generar presupuesto" sigue deshabilitado hasta la etapa final).

### 3.4 Línea de tiempo horizontal (4 pasos)

```css
.pv-timeline {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
  padding-top: 1rem;
}
.pv-timeline-line {
  position: absolute;
  top: 0;
  left: calc(12.5% + 6px);
  right: calc(12.5% + 6px);
  height: 1px;
  background: var(--line);
}
.pv-step { position: relative; text-align: center; }
.pv-dot {
  display: block;
  width: 13px;
  height: 13px;
  margin: 0 auto .9rem;
  border-radius: 50%;
  background: var(--paper);
  border: 1.5px solid var(--line);
  transition: background-color .4s var(--ease-out), border-color .4s var(--ease-out);
}
.pv-step.is-active .pv-dot { background: var(--moss); border-color: var(--moss); }
.pv-step h3 { font-size: .92rem; margin-bottom: .3rem; }
.pv-step p { font-size: .8rem; color: var(--ink-mute); }
```

- La línea conectora (`.pv-timeline-line`) es un `div` absoluto de 1px de alto, posicionado matemáticamente para empezar/terminar en el centro del primer y último punto (`12.5% + 6px` = mitad de la primera columna de 4 más medio ancho del punto de 13px) — **es un elemento decorativo separado, no un `border` del grid**.
- El punto (`.pv-dot`) es un círculo de 13×13px, vacío (fondo `--paper`, borde gris) por defecto, y se llena de verde (`--moss`) cuando su `.pv-step` padre tiene `.is-active`.
- Los 4 pasos siempre están visibles en el HTML (no se generan/destruyen) — solo cambia cuál tiene la clase `.is-active`.

### 3.5 Responsive — Desktop ≥960px (layout de 2 columnas: copy a la izquierda, mockups a la derecha)

```css
@media (min-width: 960px) {
  .pv-layout { flex-direction: row; align-items: center; gap: clamp(3rem, 6vw, 5rem); }
  .pv-copy { flex: 0 0 36%; }
  .pv-mockups { flex: 1; }
}
```

### 3.6 Responsive — Mobile ≤719px (línea de tiempo se convierte en carrusel horizontal)

```css
@media (max-width: 719px) {
  .pv-timeline {
    display: flex;
    flex-wrap: nowrap;
    grid-template-columns: none;
    gap: 1rem;
    padding-top: .4rem;
    margin-inline: -1.25rem;
    padding-inline: 1.25rem;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 1.25rem, #000 calc(100% - 1.25rem), transparent 100%);
    mask-image: linear-gradient(90deg, transparent 0, #000 1.25rem, #000 calc(100% - 1.25rem), transparent 100%);
  }
  .pv-timeline::-webkit-scrollbar { display: none; }
  .pv-timeline-line { display: none; }   /* la línea conectora no tiene sentido en un carrusel — se oculta */
  .pv-step {
    flex: 0 0 62%;
    min-width: 0;
    scroll-snap-align: start;
  }
  .pv-pin { gap: clamp(.5rem, 1.5vh, .85rem); padding-top: .25rem; padding-bottom: .5rem; }
  .pv-layout { gap: .75rem; }
  .pv-mockups { min-height: min(320px, 28vh); }
  .pv-dot { margin: 0 auto .5rem; }
}
```

**Importante — comportamiento único de este componente en mobile:** a diferencia del carrusel "Cómo funciona" (`STEPS_CAROUSEL_SPEC.md`), donde el usuario controla el swipe manualmente, aquí **el JS mueve automáticamente el scroll de la línea de tiempo** (`timeline.scrollTo(...)`) cada vez que cambia de etapa, para mantenerla sincronizada con el mockup activo sin que el usuario tenga que deslizar manualmente. Ver sección 4.2.

---

## 4. JavaScript — función completa, cópiala tal cual

```js
function initPersonalizacion() {
  var track = document.querySelector("[data-pv-track]");
  if (!track) return;

  var mockups = Array.prototype.slice.call(document.querySelectorAll("[data-pv-stage].pv-mockup"));
  var steps = Array.prototype.slice.call(document.querySelectorAll("[data-pv-stage].pv-step"));
  var timeline = document.querySelector("[data-pv-timeline]");
  var stages = ["generic", "business", "services", "final"];
  var STAGE_MS = 3200;

  var current = -1;
  function setStage(index) {
    index = ((index % stages.length) + stages.length) % stages.length;   // normaliza índices negativos/fuera de rango (wrap circular)
    if (index === current) return;
    current = index;
    var stage = stages[index];
    var activeStep = null;

    mockups.forEach(function (el) {
      el.classList.toggle("is-active", el.getAttribute("data-pv-stage") === stage);
    });
    steps.forEach(function (el) {
      var isActive = el.getAttribute("data-pv-stage") === stage;
      el.classList.toggle("is-active", isActive);
      if (isActive) activeStep = el;
    });

    // En mobile la línea de tiempo es un carrusel horizontal — se mantiene
    // sincronizada con el mockup en vez de requerir un swipe aparte.
    if (activeStep && timeline && timeline.scrollWidth > timeline.clientWidth) {
      var target = activeStep.offsetLeft - timeline.clientWidth * 0.06;
      timeline.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
    }
  }

  setStage(0);

  // Un movimiento automático, en loop, que se repite indefinidamente es
  // exactamente lo que prefers-reduced-motion pide evitar — se respeta
  // dejando la sección en su primera etapa en vez de ciclar.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var timer = null;
  function start() {
    if (timer) return;
    timer = setInterval(function () { setStage(current + 1); }, STAGE_MS);
  }
  function stop() {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
  }

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) start(); else stop();
      });
    }, { threshold: 0.35 });
    io.observe(track);
  } else {
    start();
  }
}
```

Llamada al inicializar (dentro del `boot()` general del sitio):

```js
initPersonalizacion();
```

### 4.1 Lógica del ciclo, paso a paso

1. Recolecta todos los `.pv-mockup` y `.pv-step` que tengan `data-pv-stage`, y guarda el array fijo de nombres de etapa `["generic", "business", "services", "final"]`.
2. `setStage(index)` normaliza el índice con módulo (para poder llamarlo con `current + 1` indefinidamente sin desbordarse — al llegar a 4 vuelve a 0 automáticamente).
3. Si el índice pedido es el mismo que ya está activo, no hace nada (evita quitar/poner la misma clase innecesariamente).
4. Actualiza `.is-active` en el mockup correspondiente y en el paso correspondiente de la línea de tiempo, comparando por el string de `data-pv-stage` (no por índice numérico de array — así el orden del HTML no tiene que coincidir con el orden del array `stages`, aunque en la práctica sí coincide).
5. Se llama `setStage(0)` inmediatamente al iniciar — esto es **redundante visualmente** (la etapa "generic" ya tiene `is-active` en el HTML) pero establece `current = 0` en el estado interno de JS, necesario para que el primer `setStage(current + 1)` del timer avance correctamente a la etapa 1.

### 4.2 Sincronización del scroll en mobile

```js
if (activeStep && timeline && timeline.scrollWidth > timeline.clientWidth) {
  var target = activeStep.offsetLeft - timeline.clientWidth * 0.06;
  timeline.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
}
```

- Solo se ejecuta si el timeline realmente tiene overflow horizontal (`scrollWidth > clientWidth` — es decir, solo quando está en el layout de carrusel mobile; en desktop, donde es un grid de 4 columnas sin overflow, esta condición es `false` y no hace nada).
- Calcula la posición de scroll objetivo como la posición del paso activo, con un margen extra del 6% del ancho visible del timeline hacia la izquierda (para que el paso activo no quede pegado justo al borde izquierdo del área visible, sino con un poco de aire).
- `Math.max(0, target)` evita valores de scroll negativos (por ejemplo, en la primera etapa).
- Usa scroll suave nativo del navegador (`behavior: "smooth"`), no una animación JS manual.

### 4.3 Temporizador y control de reproducción

- `STAGE_MS = 3200` → cada etapa dura exactamente 3.2 segundos en pantalla antes de avanzar a la siguiente.
- El `setInterval` se crea/destruye completo (`clearInterval` + `timer = null`) en vez de solo pausarlo, cada vez que la sección entra/sale del 35% de visibilidad en el viewport.
- Si el navegador no soporta `IntersectionObserver`, el ciclo simplemente arranca de inmediato y corre siempre (sin pausa por scroll) — es el mismo patrón de fallback usado en otros componentes del sitio.

---

## 5. Resumen de valores numéricos clave

| Elemento | Propiedad | Valor |
|---|---|---|
| Duración por etapa | `STAGE_MS` | 3200ms (3.2s) |
| Umbral de visibilidad para iniciar/pausar | `IntersectionObserver threshold` | 0.35 (35%) |
| Número de etapas | — | 4 (fijo: generic, business, services, final) |
| Transición de cross-fade del mockup | `opacity`/`transform`/`filter` | `.6s`, mismo easing (`var(--ease-out)`) para las 3 |
| Estado inactivo del mockup | `opacity` / `transform` / `filter` | 0 / `scale(.97) translateY(10px)` / `blur(3px)` |
| Altura reservada de mockups (desktop) | `min-height` | `min(400px, 30vh)` |
| Altura reservada de mockups (mobile ≤719px) | `min-height` | `min(320px, 28vh)` |
| Punto de la línea de tiempo | tamaño | 13×13px, círculo |
| Punto activo | color | `var(--moss)` (fondo y borde) |
| Ancho de cada paso en carrusel mobile | `flex` | `0 0 62%` |
| Margen de scroll al centrar paso activo (mobile) | offset | `-6%` del ancho visible del timeline |
| Breakpoint desktop (copy + mockups lado a lado) | `min-width` | 960px |
| Breakpoint mobile (timeline se vuelve carrusel) | `max-width` | 719px |

---

## 6. Checklist para reutilizar en otra landing

- [ ] `.pv-track`/`.pv-pin` deben ser elementos de flujo normal — **no** agregar `position: sticky` ni una altura artificial de varios "viewports" de scroll. Este componente fue rediseñado explícitamente para NO hacer scroll-pinning.
- [ ] Los 4 `data-pv-stage` deben coincidir exactamente (mismo string) entre cada `.pv-mockup` y su `.pv-step` correspondiente.
- [ ] El array `stages` en JS debe listar los mismos 4 (o N) strings, en el mismo orden en que quieres que avance el ciclo — el orden del array controla el orden de reproducción, no el orden del HTML.
- [ ] El mockup y el paso de la primera etapa deben traer la clase `is-active` ya en el HTML (evita parpadeo/flash antes de que el JS corra).
- [ ] `.pv-mockups` necesita `display: grid` + cada `.pv-mockup` con `grid-area: 1 / 1` para que la superposición funcione — sin esto, los 4 mockups se apilarían verticalmente en vez de superponerse.
- [ ] Respeta `prefers-reduced-motion` con el mismo `if (matchMedia(...).matches) return;` antes de crear el timer — es three líneas y evita una animación en loop infinito para usuarios que la desactivaron explícitamente en su sistema.
- [ ] Si el timeline no tiene overflow horizontal (porque estás en desktop, o porque decidiste no convertirlo en carrusel en mobile en tu nueva landing), el bloque de `timeline.scrollTo(...)` es inofensivo — la condición `scrollWidth > clientWidth` lo desactiva solo.
- [ ] El `IntersectionObserver` observa `.pv-track` (el contenedor completo), no los mockups individuales — asegúrate de mantener el hook `data-pv-track` en el elemento que envuelve TODO el componente (copy + mockups + timeline), no solo una parte.

---

*Todos los valores fueron extraídos literalmente de `index.html` (sección `#personalizacion`), `styles.css` (bloque "Personalización") y `main.js` (función `initPersonalizacion`) del proyecto Garden Tools by DEEC Studio. No hay valores `REQUIERE VERIFICACIÓN`.*
