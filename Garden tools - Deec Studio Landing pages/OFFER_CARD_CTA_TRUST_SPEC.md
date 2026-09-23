# OFFER_CARD_CTA_TRUST_SPEC.md — Réplica exacta: Botón CTA + Iconos de confianza de la tarjeta de oferta

Alcance: únicamente el **botón de compra** y la **fila de iconos de confianza** dentro de `.offer-card` (sección 07 — Oferta, `#oferta`). Todos los valores están tomados literalmente de `index.html` y `styles.css`.

**Hallazgo clave verificado en el código:** el botón y los iconos de confianza de la tarjeta de oferta usan **exactamente las mismas clases CSS que en el Hero** (`.btn.btn-primary.btn-lg.btn-hero` y `.trust-row.trust-row-simple`) — no existe ningún CSS `.offer-card .btn-hero { ... }` ni `.offer-card .trust-row { ... }` que los sobrescriba. Es el mismo componente reutilizado tal cual, solo que aquí vive dentro de la tarjeta de oferta en lugar del bloque `.hero-cta`. Si ya implementaste `HERO_TIMER_CTA_SPEC.md` en la otra landing, el botón y los iconos ya están listos — solo falta el contenedor de la tarjeta (documentado abajo) y el orden en que aparecen dentro de ella.

---

## 1. HTML exacto (fragmento relevante, dentro de `.offer-card`)

```html
<!-- ...kicker, título, rating y precio van ANTES de esto (ver sección 3 para contexto completo)... -->

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

<a class="btn btn-primary btn-lg btn-hero" href="#oferta" data-checkout-cta>
  <span data-i18n="hero.cta">Comprar ahora</span>
  <span class="btn-arrow" aria-hidden="true">→</span>
</a>

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

<p class="urgency-caption" data-i18n="urgency.caption">Aprovecha este precio antes de que se acabe el tiempo.</p>
```

Textos literales: `trust.paid` = "Pago único" · `trust.access` = "Acceso permanente" · `trust.ready` = "Listo para usar" · `hero.cta` = "Comprar ahora" · `urgency.caption` = "Aprovecha este precio antes de que se acabe el tiempo."

Nota de comportamiento: igual que en el Hero, el `href="#oferta"` es solo un ancla de fallback — el clic real lo intercepta `data-checkout-cta` vía JS (`initCheckoutModal`), que abre el modal de checkout con `preventDefault()`.

**Diferencia respecto al Hero:** en la tarjeta de oferta no hay un `.hero-price-block` (precio tachado + precio actual juntos) antes del botón — el precio grande ya se mostró arriba, separado, en `.offer-price` (ver sección 3). Aquí el botón va inmediatamente después del bloque de urgencia/timer, sin bloque de precio intermedio.

---

## 2. CSS — botón (idéntico al Hero, cascada completa)

```css
/* Base — aplica siempre */
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

/* Color */
.btn-primary {
  background: var(--moss);
  color: var(--cream);
  box-shadow: 0 14px 30px -14px rgba(59, 75, 52, 0.6);
}
.btn-primary:hover {
  background: var(--moss-2);
  box-shadow: 0 18px 36px -14px rgba(85, 106, 73, 0.55);
  transform: translateY(-2px);
}
.btn-primary:active { transform: translateY(0); }

/* .btn-lg existe en el HTML pero .btn-hero (definido después en el
   archivo CSS) gana la cascada y sobrescribe su padding/font-size —
   ver HERO_TIMER_CTA_SPEC.md sección 3.4 para el detalle completo */
.btn-lg { padding: 1.05rem 2.1rem; font-size: 1.02rem; }

/* Estos son los valores que realmente se aplican */
.btn-hero {
  width: 100%;
  justify-content: center;
  padding: .75rem 1.3rem;
  font-size: .88rem;
}
.btn-hero .btn-arrow { font-size: 1rem; line-height: 1; }
```

**Valores finales reales:** ancho 100% del contenedor, padding `.75rem 1.3rem`, `border-radius: 3px`, fuente `.88rem`/peso 600, fondo `var(--moss)` con hover a `var(--moss-2)` + elevación `-2px`. Exactamente igual que en el Hero — cero diferencias.

**Ancho real del botón en este contexto:** como `.btn-hero` es `width: 100%`, el ancho final del botón dentro de la tarjeta de oferta queda determinado por el ancho interior de `.offer-card` (ver sección 3.1) — que es más angosto que el Hero (`.offer-card` está dentro de `.container-narrow`), así que visualmente el botón se ve más angosto aquí, aunque el CSS del botón en sí sea idéntico.

---

## 3. CSS — fila de iconos de confianza (idéntico al Hero)

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
  color: var(--ink-mute);
  letter-spacing: .01em;
}
.trust-icon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  color: var(--moss-2);
}

.trust-row.trust-row-simple { margin-top: 1rem; justify-content: center; flex-wrap: nowrap; gap: 0; }
.trust-row-simple .trust-item { padding: 0 .55rem; white-space: nowrap; }
.trust-row-simple .trust-item + .trust-item { border-left: 1px solid var(--line); }

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
@media (max-width: 340px) {
  .trust-row-simple .trust-item { padding: 0 .12rem; font-size: .5rem; gap: .12rem; }
  .trust-row-simple .trust-icon { width: 9px; height: 9px; }
}
```

Mismos 3 iconos (tarjeta/pago, eslabones/acceso, rayo/listo), mismo layout (fila única sin wrap, centrada, con divisores de 1px entre ítems), mismos breakpoints de reducción (15px → 12px → 9px). No hay ninguna diferencia con el Hero.

### 3.1 Ajuste específico de la tarjeta de oferta (único override real que existe)

```css
@media (max-width: 599px) {
  /* El padding propio de la tarjeta le quitaba mucho más ancho
     que el que tenía el bloque CTA del hero, así que sus iconos de
     confianza tenían notablemente menos espacio para trabajar y
     se envolvían donde los del hero no lo hacían. */
  .offer-card { padding-inline: 1.25rem; }
}
```

Este es el **único ajuste real** relacionado con el trust-row en este contexto — no toca el trust-row directamente, sino el padding lateral de la tarjeta contenedora en mobile, específicamente para darle más ancho disponible a los iconos y evitar que se envuelvan a dos líneas (bug que existió y se corrigió reduciendo el padding de la tarjeta, no el trust-row).

---

## 4. Contenedor — `.offer-card` (contexto necesario para reproducir el mismo ancho/espaciado)

```css
.offer { background: var(--bg-2); }
.offer-card {
  background: var(--paper);
  border-radius: 0;
  border: 1px solid var(--line);
  border-top: 3px solid var(--moss);   /* franja verde superior — el único acento de color del borde */
  padding: clamp(2rem, 6vw, 3.5rem);
  text-align: center;
  box-shadow: var(--shadow-lift);
}
@media (max-width: 599px) {
  .offer-card { padding-inline: 1.25rem; }
}
```

La sección usa `<div class="container container-narrow">` como wrapper exterior (más angosto que el `.container` normal de `var(--container-w)` = 1180px) — por eso la tarjeta se ve compacta y centrada, no de ancho completo.

---

## 5. Orden vertical completo dentro de `.offer-card` (para saber dónde va el botón/iconos respecto al resto)

1. `.offer-head` — kicker centrado + título + subtítulo.
2. `.hero-rating.hero-rating-center` — rating de estrellas (mismo componente que el Hero, variante centrada).
3. `.price-compare.price-compare-center` — precio tachado + badge de ahorro.
4. `.offer-price` — precio grande (`$49.99` + `USD`).
5. `.offer-tag` — "Pago único" en mayúsculas pequeñas.
6. `.offer-list` — lista de 16 ítems incluidos, con check verde (`✓`), alineada a la izquierda dentro de la tarjeta centrada.
7. `.urgency.urgency-hero` — **el timer** (mismo componente que el Hero).
8. **`.btn.btn-primary.btn-lg.btn-hero`** — **el botón**, objeto de este documento.
9. **`.trust-row.trust-row-simple`** — **los iconos de confianza**, objeto de este documento.
10. `.urgency-caption` — texto pequeño de cierre bajo los iconos.

**Diferencia de orden respecto al Hero:** en el Hero el orden es timer → precio → botón → iconos. En la tarjeta de oferta, el precio grande y la lista de ítems ya se mostraron mucho antes (arriba de la tarjeta), así que aquí el orden inmediato es simplemente: timer → botón → iconos → caption. No hay un bloque de precio repetido justo antes del botón.

---

## 6. Checklist para reutilizar en otra landing

- [ ] No crees CSS nuevo para el botón/iconos de la tarjeta de oferta — reutiliza literalmente las mismas clases `.btn.btn-primary.btn-lg.btn-hero` y `.trust-row.trust-row-simple` que uses para el Hero. Es intencional que sean el mismo componente.
- [ ] Si tu tarjeta de oferta tiene un padding lateral distinto al del Hero en mobile, revisa que los 3 iconos de confianza no se envuelvan a dos líneas — el proyecto original resolvió esto reduciendo el padding de la tarjeta (`padding-inline: 1.25rem` en ≤599px), no cambiando el trust-row.
- [ ] El botón sigue usando `data-checkout-cta` como el disparador real (no el `href`) — si replicas el modal de checkout, asegúrate de que el JS que lo escucha esté enganchado a este mismo atributo en ambos lugares (Hero y tarjeta de oferta), no solo en uno.
- [ ] El orden dentro de la tarjeta es: timer → botón → iconos de confianza → caption. No repitas el bloque de precio (`price-compare`/`offer-price`) justo antes del botón — ya se mostró arriba en la tarjeta.

---

*Todos los valores fueron extraídos literalmente de `index.html` (sección `#oferta`) y `styles.css` (bloques "Offer" y los compartidos con el Hero: `.btn`, `.trust-row`) del proyecto Garden Tools by DEEC Studio. Se confirmó explícitamente, revisando el CSS completo, que no existe ningún selector `.offer-card .btn-hero` ni `.offer-card .trust-row` que sobrescriba el comportamiento del Hero — son el mismo componente. No hay valores `REQUIERE VERIFICACIÓN`.*
