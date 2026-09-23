# TRANSFORM_SHOWCASE_SPEC.md — Réplica exacta: Animación "libreta → mockup del cotizador" (sección Problema)

Alcance: el componente `.transform-showcase` dentro de la sección **02 — Problema** (`#problema`). Es una animación 100% CSS (keyframes), sin JS de dibujo ni canvas — el único JS presente solo controla **cuándo** corre la animación (play/pause según si el elemento está en pantalla), usando `IntersectionObserver`. Todos los valores están tomados literalmente de `index.html`, `styles.css` y `main.js`.

---

## 1. Idea general del componente

Es un ciclo infinito de 9 segundos que cruza-desvanece (`cross-fade`) entre dos "escenas" superpuestas en el mismo espacio:

1. **Escena libreta** (`.transform-notebook`): una hoja de libreta con texto escrito a mano (fuente cursiva "Caveat") que se va "revelando" línea por línea, como si alguien la estuviera escribiendo en tiempo real (usando `clip-path` animado, no `width` ni `opacity` por letra).
2. **Escena digital** (`.transform-digital`): el mismo componente `.mockup` que se usa en el Hero (reutilizado tal cual, mismos estilos), que aparece con un giro 3D sutil justo cuando la libreta termina de "escribirse" y empieza a desvanecerse.

Ambas escenas están **superpuestas en el mismo contenedor** (`position: absolute; inset: 0`) — no es un carrusel ni un slider, es un cross-fade de opacidad + transform, puramente temporizado por CSS `@keyframes`.

**Control de reproducción**: la animación está pausada por defecto (`animation-play-state: paused` en cada pieza). Un `IntersectionObserver` en JS agrega la clase `.is-playing` al contenedor cuando el 30% del elemento entra en el viewport, lo que cambia todas las animaciones a `animation-play-state: running`. Al salir de vista, vuelve a `paused` — es decir, **se congela en el frame donde iba, como un video en pausa**, no se reinicia desde cero cada vez que reaparece en pantalla.

---

## 2. HTML exacto

```html
<div class="transform-showcase reveal" data-transform aria-hidden="true">
  <div class="transform-stage">

    <!-- Escena 1: libreta escrita a mano -->
    <div class="transform-notebook">
      <div class="notebook-page">
        <span class="notebook-margin"></span>
        <div class="notebook-lines"></div>
        <div class="notebook-text">
          <p class="nb-line nb-heading nb-l1">LAWN CARE</p>
          <p class="nb-line nb-row nb-l2"><span>Mowing</span><span class="nb-leader"></span><span>$85</span></p>
          <p class="nb-line nb-row nb-l3"><span>Edging</span><span class="nb-leader"></span><span>$25</span></p>
          <p class="nb-line nb-row nb-l4"><span>Cleanup</span><span class="nb-leader"></span><span>$30</span></p>
          <p class="nb-line nb-row nb-total nb-l5"><span>TOTAL</span><span class="nb-leader"></span><span>$140</span></p>
        </div>
      </div>
    </div>

    <!-- Escena 2: mockup digital (reutiliza el MISMO componente .mockup del Hero) -->
    <div class="transform-digital">
      <div class="mockup">
        <!-- contenido idéntico al .mockup del Hero: mockup-bar, mockup-head,
             mockup-body con mockup-field/mockup-row/mockup-summary/mockup-action.
             Ver HERO_TIMER_CTA_SPEC.md o el index.html original si necesitas
             el mockup completo — aquí solo importa que sea el mismo componente,
             no una copia distinta. -->
      </div>
    </div>

  </div>
</div>
```

Puntos clave de la estructura:
- `data-transform` es el hook que usa el JS del `IntersectionObserver` — va en el **contenedor exterior** (`.transform-showcase`), no en `.transform-stage`.
- `aria-hidden="true"` en el contenedor exterior: es puramente decorativo — el copy de al lado (`.problem-lede` + la tabla `.compare` "Antes / Con tu cotizador") ya transmite la misma información en texto real para lectores de pantalla. **No dupliques este contenido como si fuera información nueva** — es una ilustración, no un dato.
- Cada línea de texto de la libreta tiene DOS clases de animación: una genérica (`nb-line`, define timing/duración compartidos) y una específica por línea (`nb-l1` a `nb-l5`, define en qué keyframe/momento del ciclo de 9s se revela esa línea en particular).
- `nb-heading` y `nb-row`/`nb-total` son clases de **estilo** (tamaño, peso, layout de la línea), independientes de las clases de animación — se combinan en el mismo elemento.

---

## 3. CSS

### 3.1 Contenedor y layout de las 2 escenas superpuestas

```css
.transform-showcase { display: flex; flex-direction: column; gap: 1.1rem; }

.transform-stage {
  position: relative;
  width: 100%;
  max-width: 380px;
  margin-inline: auto;
  min-height: 660px;      /* altura fija reservada — evita salto de layout al cambiar de escena */
  perspective: 1400px;    /* necesario para el giro 3D de la escena digital */
}

.transform-notebook,
.transform-digital {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### 3.2 Escena libreta

```css
.notebook-page {
  position: relative;
  width: 100%;
  max-width: 320px;
  background: var(--paper);
  box-shadow: var(--shadow-lift);
  padding: 2.1rem 1.5rem 1.7rem 2.3rem;
  transform-origin: center;
  animation: tfNotebook 9s ease-in-out infinite;
  animation-play-state: paused;
}

.notebook-margin {
  position: absolute;
  left: 1.35rem;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(179, 93, 58, 0.35);   /* línea vertical roja/terracota, como el margen de una libreta escolar */
}

.notebook-lines {
  position: absolute;
  inset: 1.5rem .9rem 1.5rem 2.3rem;
  background-image: repeating-linear-gradient(to bottom, transparent, transparent 26px, var(--line-soft) 26px, var(--line-soft) 27px);
  /* renglones horizontales de 1px cada 26px, generados por CSS, no son imágenes */
}

.notebook-text {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: .5rem;
  font-family: "Caveat", cursive;   /* fuente manuscrita — requiere el <link> de Google Fonts, ver sección 6 */
}

.nb-line {
  font-size: 1.45rem;
  line-height: 1.7rem;
  color: var(--ink-soft);
  white-space: nowrap;
  clip-path: inset(0 100% 0 0);   /* estado inicial: completamente "recortada" por la derecha, invisible */
  animation-duration: 9s;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  animation-play-state: paused;
}
.nb-heading { font-weight: 700; font-size: 1.65rem; color: var(--ink); letter-spacing: .01em; }
.nb-row { display: flex; align-items: baseline; gap: .4rem; }
.nb-leader { flex: 1; border-bottom: 1px dotted rgba(28, 29, 23, 0.35); margin-bottom: .3rem; }
.nb-total {
  font-weight: 700;
  color: var(--moss);
  border-top: 1px dashed rgba(28, 29, 23, 0.3);
  padding-top: .35rem;
  margin-top: .1rem;
}

.nb-l1 { animation-name: nbLine1; }
.nb-l2 { animation-name: nbLine2; }
.nb-l3 { animation-name: nbLine3; }
.nb-l4 { animation-name: nbLine4; }
.nb-l5 { animation-name: nbLine5; }
```

### 3.3 Escena digital (reutiliza `.mockup` del Hero — mismos estilos, no dupliques CSS)

```css
.transform-digital .mockup {
  width: 100%;
  max-width: 340px;
  animation: tfDigital 9s ease-in-out infinite;
  animation-play-state: paused;
}
```

### 3.4 Control de reproducción — clase `.is-playing`

```css
.transform-showcase.is-playing .notebook-page,
.transform-showcase.is-playing .nb-l1,
.transform-showcase.is-playing .nb-l2,
.transform-showcase.is-playing .nb-l3,
.transform-showcase.is-playing .nb-l4,
.transform-showcase.is-playing .nb-l5,
.transform-showcase.is-playing .transform-digital .mockup {
  animation-play-state: running;
}
```

### 3.5 Keyframes — timeline completo del ciclo de 9 segundos

```css
/* Escena libreta: aparece, se mantiene, se desvanece */
@keyframes tfNotebook {
  0%   { opacity: 0; transform: rotate(-1.4deg) scale(.96); }
  3%   { opacity: 1; transform: rotate(-1.4deg) scale(1); }
  64%  { opacity: 1; transform: rotate(-1.4deg) scale(1); }
  74%  { opacity: 0; transform: rotate(-1.4deg) scale(1.04); }
  100% { opacity: 0; transform: rotate(-1.4deg) scale(1.04); }
}

/* Escena digital: invisible mientras escribe la libreta, luego aparece con giro 3D */
@keyframes tfDigital {
  0%   { opacity: 0; transform: rotateY(-8deg) rotateX(3deg) scale(.96); }
  64%  { opacity: 0; transform: rotateY(-8deg) rotateX(3deg) scale(.96); }
  74%  { opacity: 1; transform: rotateY(-8deg) rotateX(3deg) scale(1); }
  92%  { opacity: 1; transform: rotateY(-8deg) rotateX(3deg) scale(1); }
  100% { opacity: 0; transform: rotateY(-8deg) rotateX(3deg) scale(.97); }
}

/* Cada línea de texto se "escribe" (revela de izquierda a derecha) en su propia
   ventana de tiempo dentro del ciclo de 9s, en cascada una tras otra */
@keyframes nbLine1 { 0%, 3%  { clip-path: inset(0 100% 0 0); } 14% { clip-path: inset(0 0% 0 0); } 100% { clip-path: inset(0 0% 0 0); } }
@keyframes nbLine2 { 0%, 14% { clip-path: inset(0 100% 0 0); } 25% { clip-path: inset(0 0% 0 0); } 100% { clip-path: inset(0 0% 0 0); } }
@keyframes nbLine3 { 0%, 25% { clip-path: inset(0 100% 0 0); } 36% { clip-path: inset(0 0% 0 0); } 100% { clip-path: inset(0 0% 0 0); } }
@keyframes nbLine4 { 0%, 36% { clip-path: inset(0 100% 0 0); } 47% { clip-path: inset(0 0% 0 0); } 100% { clip-path: inset(0 0% 0 0); } }
@keyframes nbLine5 { 0%, 47% { clip-path: inset(0 100% 0 0); } 58% { clip-path: inset(0 0% 0 0); } 100% { clip-path: inset(0 0% 0 0); } }
```

### 3.6 Layout de la sección completa (contexto — para posicionar el showcase junto al copy)

```css
.problem-columns { display: flex; flex-direction: column; gap: clamp(2.4rem, 5vw, 3.5rem); }
.problem-grid { display: flex; flex-direction: column; gap: 2.2rem; max-width: 46rem; }

@media (min-width: 960px) {
  .problem-columns {
    display: grid;
    grid-template-columns: 1fr 1.15fr;   /* showcase a la izquierda (1fr), copy+compare a la derecha (1.15fr) */
    align-items: center;
    gap: clamp(2.5rem, 5vw, 4rem);
  }
}
```

- **Mobile (<960px)**: `.problem-columns` es `flex-direction: column` — el showcase queda arriba, el copy/tabla comparativa abajo, apilados verticalmente.
- **Desktop (≥960px)**: se convierte en grid de 2 columnas, showcase a la izquierda ocupando ligeramente menos espacio (`1fr`) que el bloque de texto a la derecha (`1.15fr`), centrados verticalmente entre sí (`align-items: center`).

---

## 4. JavaScript — función completa, cópiala tal cual

```js
function initTransformShowcase() {
  var el = document.querySelector("[data-transform]");
  if (!el) return;

  if (!("IntersectionObserver" in window)) {
    el.classList.add("is-playing");   // fallback: navegadores sin soporte reproducen siempre
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      el.classList.toggle("is-playing", entry.isIntersecting);
    });
  }, { threshold: 0.3 });
  io.observe(el);
}
```

Llamada al inicializar (dentro del `boot()` general del sitio):

```js
initTransformShowcase();
```

### Cómo funciona el JS, paso a paso

1. Busca el elemento con `data-transform` (el `.transform-showcase`).
2. Si el navegador no soporta `IntersectionObserver` (muy raro hoy en día), simplemente agrega `.is-playing` de forma permanente — la animación corre siempre, sin control de visibilidad. Es un fallback de compatibilidad, no el comportamiento principal.
3. Si sí soporta `IntersectionObserver`, crea uno con `threshold: 0.3` — es decir, se considera "visible" cuando al menos el 30% del elemento está dentro del viewport.
4. Cada vez que cambia el estado de intersección (entra o sale de ese 30%), alterna la clase `.is-playing` — al entrar, todas las animaciones CSS (que estaban en `paused`) pasan a `running` y **continúan desde donde iban** (CSS conserva el progreso de la animación al pausar/reanudar, no la reinicia). Al salir, vuelve a `paused` y queda congelada en ese frame.

---

## 5. Comportamiento con `prefers-reduced-motion`

**Nota importante:** a diferencia de otras animaciones del sitio (como `.urgency-dot`), **este componente NO tiene una regla `@media (prefers-reduced-motion: reduce)` propia** que lo desactive — el control de play/pause depende únicamente de si está en pantalla, no de la preferencia de movimiento reducido del sistema operativo. Si en la otra landing quieres respetar `prefers-reduced-motion` para este componente (recomendable, ya que es una animación continua de 9s en loop), agrega:

```css
@media (prefers-reduced-motion: reduce) {
  .transform-showcase.is-playing .notebook-page,
  .transform-showcase.is-playing .nb-l1,
  .transform-showcase.is-playing .nb-l2,
  .transform-showcase.is-playing .nb-l3,
  .transform-showcase.is-playing .nb-l4,
  .transform-showcase.is-playing .nb-l5,
  .transform-showcase.is-playing .transform-digital .mockup {
    animation: none;
  }
  /* deja la escena digital visible como estado final estático, en vez de congelada a mitad de una escena aleatoria */
  .transform-digital .mockup { opacity: 1; transform: rotateY(-8deg) rotateX(3deg) scale(1); }
  .notebook-page { opacity: 0; }
  .nb-line { clip-path: inset(0 0% 0 0); }
}
```
Esto es una **adición recomendada, no algo que exista en el sitio actual** — inclúyela si quieres un comportamiento más accesible que el original.

---

## 6. Requisito externo — fuente "Caveat"

El texto de la libreta usa la fuente Google Fonts **Caveat** (cursiva, imita escritura a mano). Debe cargarse en el `<head>`:

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&display=swap">
```

Pesos usados: `500` (regular, líneas normales) y `700` (bold, usado en `.nb-heading` y `.nb-total`).

---

## 7. Checklist para reutilizar en otra landing

- [ ] El contenedor `.transform-stage` tiene `min-height` fija (660px en el original) — sin esto, al ser ambas escenas `position: absolute`, el contenedor colapsaría a altura 0 y nada sería visible.
- [ ] Ambas escenas (`.transform-notebook` y `.transform-digital`) están superpuestas con `position: absolute; inset: 0` dentro de `.transform-stage` (que debe ser `position: relative`).
- [ ] Las animaciones arrancan en `animation-play-state: paused` por defecto en CSS — el JS es el único que las activa, agregando `.is-playing` al contenedor padre.
- [ ] Si agregas o quitas líneas de texto en la libreta, debes: (a) crear una nueva `@keyframes nbLineN` con su propia ventana de porcentajes dentro del ciclo de 9s, (b) actualizar las ventanas de las líneas siguientes para que sigan en cascada, y (c) ajustar el punto donde empieza `tfDigital` (actualmente 64%/74%) si cambia cuánto tarda en "terminar de escribirse" la libreta.
- [ ] La fuente Caveat debe cargarse aparte — no es una fuente del sistema ni parte de Satoshi/Switzer del resto del sitio.
- [ ] El componente `.mockup` reutilizado en la escena digital es el mismo que el del Hero — no dupliques sus estilos, solo reutiliza la clase.
- [ ] `aria-hidden="true"` en el contenedor raíz — este showcase es decorativo; asegúrate de que la información equivalente (antes/después) exista en texto real accesible en algún lugar cercano de la página (en el sitio original, es la tabla `.compare`).

---

*Todos los valores fueron extraídos literalmente de `index.html` (sección `#problema`), `styles.css` (bloque "Transformation showcase") y `main.js` (función `initTransformShowcase`) del proyecto Garden Tools by DEEC Studio. No hay valores `REQUIERE VERIFICACIÓN`. La única adición no presente en el original es la sugerencia de `prefers-reduced-motion` de la sección 5, marcada explícitamente como recomendación, no como comportamiento existente.*
