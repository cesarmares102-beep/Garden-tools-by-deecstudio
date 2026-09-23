# COMPARE_TABLE_SPEC.md — Réplica exacta: Tabla comparativa "Antes / Con tu cotizador web personalizado"

Alcance: el componente `.compare` dentro de la sección **02 — Problema** (`#problema`), a la derecha del showcase libreta→mockup (ver `TRANSFORM_SHOWCASE_SPEC.md`). Es una comparación de 2 columnas con flecha central, estática (sin animación propia más allá del fade-in de entrada compartido `.reveal` de toda la página). No usa JS propio — solo el `IntersectionObserver` genérico de `initReveals()` que hace fade-in a cualquier elemento con clase `.reveal` al entrar en pantalla. Todos los valores están tomados literalmente de `index.html` y `styles.css`.

---

## 1. Idea general del componente

Dos listas verticales lado a lado dentro de una tarjeta blanca con sombra:
- **Izquierda ("Antes")**: 4 puntos con una **×** roja/terracota antes de cada uno, texto en gris mute — representa el problema/dolor.
- **Derecha ("Con tu cotizador web personalizado")**: 4 puntos con un **✓** verde antes de cada uno, texto en color de tinta normal y peso medio (más "presente" visualmente que la columna izquierda) — representa la solución.
- **Centro**: una flecha (`→`) que conecta visualmente ambas columnas, indicando transformación/progreso.

En **mobile (≤719px)** las 2 columnas se apilan verticalmente (deja de ser un grid de 3 columnas) y la flecha rota 90° para apuntar hacia abajo en vez de hacia la derecha.

---

## 2. HTML exacto

```html
<div class="compare reveal">
  <div class="compare-side compare-before">
    <p class="compare-label" data-i18n="problem.compareBeforeLabel">Antes</p>
    <ul class="compare-list">
      <li data-i18n="problem.compareBefore1">Revisar precios manualmente</li>
      <li data-i18n="problem.compareBefore2">Sacar cuentas cada vez</li>
      <li data-i18n="problem.compareBefore3">Escribir el presupuesto desde cero</li>
      <li data-i18n="problem.compareBefore4">Formato distinto en cada cotización</li>
    </ul>
  </div>

  <div class="compare-arrow" aria-hidden="true">
    <svg viewBox="0 0 48 24" fill="none"><path d="M2 12H44M44 12L34 3M44 12L34 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </div>

  <div class="compare-side compare-after">
    <p class="compare-label" data-i18n="problem.compareAfterLabel">Con tu cotizador web personalizado</p>
    <ul class="compare-list">
      <li data-i18n="problem.compareAfter1">Precios ya configurados</li>
      <li data-i18n="problem.compareAfter2">Cálculo automático</li>
      <li data-i18n="problem.compareAfter3">Presupuesto generado al instante</li>
      <li data-i18n="problem.compareAfter4">Formato profesional y consistente</li>
    </ul>
  </div>
</div>
```

Textos literales (ES): `problem.compareBeforeLabel` = "Antes" · `problem.compareAfterLabel` = "Con tu cotizador web personalizado" · 4 ítems "Antes" (revisar precios manualmente / sacar cuentas cada vez / escribir el presupuesto desde cero / formato distinto en cada cotización) · 4 ítems "Después" (precios ya configurados / cálculo automático / presupuesto generado al instante / formato profesional y consistente).

Puntos clave de la estructura:
- `.compare` lleva la clase `.reveal` (fade-in al hacer scroll, compartido con el resto del sitio — ver sección 5), pero **los `<li>` internos NO tienen `.reveal` individual** — toda la tarjeta aparece de golpe como un solo bloque, no ítem por ítem.
- El orden en el HTML es: columna "Antes" → flecha → columna "Después". En mobile, al apilarse verticalmente, este mismo orden de documento se mantiene (Antes arriba, flecha en medio apuntando hacia abajo, Después abajo) — no hace falta reordenar nada con CSS.
- El símbolo `×` y `✓` **no están en el HTML** — se generan por CSS con `content: "×"` / `content: "✓"` en `::before` (ver sección 3). Esto significa que si copias el HTML sin el CSS, los `<li>` no mostrarán ningún ícono.
- La flecha central es un SVG inline, no una fuente de íconos ni un carácter Unicode — así se puede rotar limpiamente con `transform` en mobile sin depender del glifo de una fuente.

---

## 3. CSS

```css
.compare {
  display: grid;
  grid-template-columns: 1fr auto 1fr;   /* columna izq flexible / flecha con su ancho natural / columna der flexible */
  gap: clamp(1.2rem, 3vw, 2.5rem);
  align-items: center;
  background: var(--paper);              /* blanco */
  border-radius: 0;                      /* esquinas rectas, sin redondeo */
  padding: clamp(1.5rem, 4vw, 2.5rem);
  box-shadow: var(--shadow-soft);
}

.compare-label {
  font-family: var(--sans);
  font-size: .7rem;
  font-weight: var(--fw-semibold);
  letter-spacing: .06em;
  text-transform: uppercase;
  margin-bottom: .9rem;
  color: var(--ink-mute);
}
.compare-after .compare-label { color: var(--moss-2); }   /* la etiqueta "Después" se distingue en verde, "Antes" queda en gris neutro */

.compare-list {
  display: flex;
  flex-direction: column;
  gap: .65rem;
  font-size: .95rem;
}

/* Columna "Antes" — × roja/terracota, texto atenuado */
.compare-before li {
  color: var(--ink-mute);
  position: relative;
  padding-left: 1.3rem;
}
.compare-before li::before {
  content: "×";
  position: absolute;
  left: 0;
  color: rgba(179,93,58,0.6);   /* terracota al 60% de opacidad — no es un rojo de "error" puro, es más suave */
  font-weight: 700;
}

/* Columna "Después" — ✓ verde, texto con más peso/presencia visual */
.compare-after li {
  color: var(--ink);
  font-weight: var(--fw-medium);
  position: relative;
  padding-left: 1.3rem;
}
.compare-after li::before {
  content: "✓";
  position: absolute;
  left: 0;
  color: var(--moss-2);
  font-weight: 700;
}

.compare-arrow { color: var(--terracotta); width: 32px; }
```

### 3.1 Responsive — mobile (≤719px)

```css
@media (max-width: 719px) {
  .compare { grid-template-columns: 1fr; }              /* de 3 columnas a 1 sola — apila todo verticalmente */
  .compare-arrow { transform: rotate(90deg); justify-self: center; }   /* la flecha (→) rota a (↓) y se centra horizontalmente */
}
```

No hay ningún otro ajuste mobile-específico (tamaños de fuente, padding, gap) — el `clamp()` en `gap`/`padding` del `.compare` ya se encarga de reducir esos valores de forma fluida según el viewport, sin necesidad de un breakpoint aparte para eso.

---

## 4. Contexto de layout — dónde vive dentro de la sección Problema

```html
<section class="section problem" id="problema">
  <div class="container">
    <div class="section-head">...</div>
    <div class="problem-columns">
      <div class="transform-showcase reveal" data-transform aria-hidden="true">...</div>  <!-- columna izquierda: showcase libreta→mockup -->
      <div class="problem-grid">
        <p class="problem-lede reveal">...</p>
        <div class="compare reveal">...</div>              <!-- ← ESTE componente -->
        <p class="problem-close reveal">...</p>
      </div>
    </div>
  </div>
</section>
```

```css
.problem { background: var(--bg-2); }
.problem-columns { display: flex; flex-direction: column; gap: clamp(2.4rem, 5vw, 3.5rem); }
.problem-grid { display: flex; flex-direction: column; gap: 2.2rem; max-width: 46rem; }

@media (min-width: 960px) {
  .problem-columns {
    display: grid;
    grid-template-columns: 1fr 1.15fr;
    align-items: center;
    gap: clamp(2.5rem, 5vw, 4rem);
  }
}

.problem-lede { font-size: 1.1rem; color: var(--ink-mute); max-width: 58ch; line-height: 1.55; }
.problem-close { font-family: var(--display); font-weight: var(--fw-bold); font-size: 1.3rem; letter-spacing: -0.015em; color: var(--moss); max-width: 40ch; }
```

- La tabla `.compare` va **dentro** de `.problem-grid`, entre el párrafo introductorio (`.problem-lede`) y la frase de cierre (`.problem-close`) — no es un elemento independiente de la sección, es uno de 3 bloques de texto/contenido apilados verticalmente en esa columna.
- En desktop (≥960px), `.problem-grid` (que contiene la tabla) es la columna derecha del grid de 2 columnas de `.problem-columns`; el showcase libreta→mockup es la columna izquierda.
- En mobile (<960px), todo se apila: primero el showcase, luego el párrafo, luego la tabla comparativa, luego la frase de cierre.

---

## 5. Animación de entrada — `.reveal` (compartida con el resto del sitio, no es exclusiva de este componente)

```css
.reveal {
  opacity: 0;
  transform: translateY(28px);
  transition: opacity .8s var(--ease-out), transform .8s var(--ease-out);
}
.reveal.is-visible { opacity: 1; transform: none; }
```

```js
function initReveals() {
  var targets = document.querySelectorAll(".reveal");
  if (!targets.length) return;

  if (!("IntersectionObserver" in window)) {
    targets.forEach(function (el) { el.classList.add("is-visible"); });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);   // una vez visible, deja de observarse — la animación no se repite al hacer scroll hacia arriba y volver a bajar
      }
    });
  }, { threshold: 0.02, rootMargin: "0px 0px -2% 0px" });

  targets.forEach(function (el) { io.observe(el); });

  // Red de seguridad: si algo ya está en el viewport al cargar la página
  // (por ejemplo, sección muy arriba) pero el observer no disparó a tiempo,
  // fuerza la visibilidad tras un breve delay.
  setTimeout(function () {
    document.querySelectorAll(".reveal:not(.is-visible)").forEach(function (el) {
      if (el.getBoundingClientRect().top < window.innerHeight) {
        el.classList.add("is-visible");
      }
    });
  }, 6000);   // red de seguridad general del sitio, no exclusiva de este componente
}
```

- La tabla completa (`.compare`) entra con un solo fade + `translateY(28px)→0` de `.8s`, como bloque único — no hay stagger (retraso escalonado) entre los `<li>` individuales ni entre las 2 columnas.
- El umbral de disparo es muy bajo (`threshold: 0.02` = 2% visible) con un `rootMargin` que adelanta el disparo un poco antes de que el elemento toque el borde inferior del viewport — se siente como que aparece "justo a tiempo" al hacer scroll, ni muy tarde ni muy anticipado.

---

## 6. Resumen de valores clave

| Elemento | Propiedad | Valor |
|---|---|---|
| `.compare` | grid-template-columns | `1fr auto 1fr` (desktop) → `1fr` (≤719px) |
| `.compare` | gap | `clamp(1.2rem, 3vw, 2.5rem)` |
| `.compare` | padding | `clamp(1.5rem, 4vw, 2.5rem)` |
| `.compare` | fondo / sombra | `var(--paper)` (blanco) / `var(--shadow-soft)` |
| `.compare-label` | fuente | `.7rem`, uppercase, letter-spacing `.06em` |
| `.compare-label` (Antes) | color | `var(--ink-mute)` |
| `.compare-label` (Después) | color | `var(--moss-2)` (verde) |
| Ícono "Antes" | símbolo / color | `×` / `rgba(179,93,58,0.6)` (terracota 60%) |
| Ícono "Después" | símbolo / color | `✓` / `var(--moss-2)` (verde) |
| `.compare-list` | gap entre ítems | `.65rem` |
| `.compare-list li` | font-size | `.95rem` |
| `.compare-before li` | color | `var(--ink-mute)`, peso normal |
| `.compare-after li` | color / peso | `var(--ink)`, `var(--fw-medium)` (500) — más "presente" que la columna izquierda |
| `.compare-arrow` | color / ancho | `var(--terracotta)` / 32px |
| `.compare-arrow` (mobile) | rotación | `rotate(90deg)`, centrada |
| Animación de entrada | tipo | fade + `translateY(28px)→0`, `.8s`, una sola vez (no se repite) |

---

## 7. Checklist para reutilizar en otra landing

- [ ] Los símbolos `×` y `✓` van por CSS (`content` en `::before`), no en el HTML — no los agregues manualmente en los `<li>` o se duplicarán si luego agregas el CSS.
- [ ] `grid-template-columns: 1fr auto 1fr` es clave: la columna central (la flecha) usa `auto` para tomar solo el ancho que necesita (32px fijo por `.compare-arrow { width: 32px }`), dejando que las 2 columnas de texto se repartan el resto del espacio en partes iguales.
- [ ] En mobile, solo cambian 2 propiedades (`grid-template-columns` a `1fr` y la rotación de la flecha) — no dupliques HTML ni reordenes el DOM para el layout apilado, el `flex-direction`/orden natural del documento ya resuelve el apilamiento correcto (Antes arriba, Después abajo).
- [ ] El SVG de la flecha es un `viewBox="0 0 48 24"` con `stroke="currentColor"` — hereda el color de `.compare-arrow { color: var(--terracotta) }`, no tiene un color hardcodeado dentro del SVG. Si cambias la paleta de la otra landing, la flecha cambia de color automáticamente con solo tocar esa variable.
- [ ] Toda la tarjeta anima como un solo bloque (`.reveal` en el `.compare` exterior) — no le pongas `.reveal` a cada `<li>` individualmente si quieres replicar exactamente este comportamiento (sin stagger).
- [ ] `border-radius: 0` es intencional (estética de esquinas rectas del sitio) — no es un olvido, no le agregues redondeo si quieres mantener la misma línea visual del resto de los componentes (mismo criterio que `.step-card`, `.offer-card`, etc.).

---

*Todos los valores fueron extraídos literalmente de `index.html` (sección `#problema`, componente `.compare`) y `styles.css` (bloque "Problem" / "compare") del proyecto Garden Tools by DEEC Studio. No hay valores `REQUIERE VERIFICACIÓN`.*
