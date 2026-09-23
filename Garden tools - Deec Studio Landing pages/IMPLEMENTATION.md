# IMPLEMENTATION.md — Elementos interactivos y de conversión (DEEC Studio)

Especificación técnica accionable. Extraída directamente del código real de la landing
"Garden Tools by DEEC Studio" (HTML + CSS + JS vanilla, sin frameworks, sin build step).
Cuando se entregue este archivo junto con un proyecto, la instrucción **"Implementa todo
lo especificado en IMPLEMENTATION.md"** debe poder ejecutarse sin preguntas adicionales.

**Nota de terminología** (importante, corrige dos supuestos comunes al pedir esto):
- El "FAQ popup" de este sitio es, en realidad, **un ícono flotante (FAB) que hace scroll
  hasta la sección de preguntas**, la cual está montada en la página como **acordeón
  inline de dos niveles** — no se abre ningún modal/overlay encima de la página. Ambas
  piezas (el FAB que dispara y el acordeón destino) se documentan juntas en la sección 3.
  Si el nuevo proyecto necesita el FAQ como modal real, ver la nota al final de esa sección.
- "Social proof" y "visitas al sitio" (puntos 6 y 7 del brief original) **son un único
  componente**, no dos — un mismo sistema de toast que rota entre 3 tipos de mensaje.
  Se documentan juntos en la sección 5.

---

## 1. Barra de navegación flotante

**Archivo/selector:** `<header class="nav" data-nav>` — `initNav()` + `initNavHeight()` en `main.js`.

**Comportamiento:**
- `position: fixed`, centrada horizontalmente (`left: 50%; transform: translateX(-50%)`),
  separada del borde superior (`top: clamp(.75rem, 2vw, 1.25rem)`) — flota como una
  píldora, no pegada al borde.
- Fondo transparente por defecto. Al hacer scroll (`window.scrollY > 12`) se le agrega
  la clase `.is-scrolled`, que aplica `background: rgba(255,255,255,.8)` + sombra sutil.
  Es la única transición de scroll — **no se oculta ni reaparece**, siempre está visible.
- La altura real se mide con `getBoundingClientRect()` (no un valor fijo asumido) y se
  escribe en `--nav-h` vía JS, porque el nav puede envolver a dos líneas en mobile o con
  textos traducidos más largos. Todo lo que depende de esa altura (padding del body,
  posición de otros elementos fixed) lee esa variable CSS.
- Se re-sincroniza en `resize` (debounced 120ms) y cuando las fuentes web terminan de
  cargar (`document.fonts.ready`).

**Contenido:** logo (link a `#top`) · iconos (FAQ, WhatsApp) · toggle de idioma ES/EN ·
botón hamburguesa (abre panel de navegación de secciones).

**Desktop vs mobile:** mismo comportamiento, solo cambia el padding/tamaño vía CSS
responsive normal. No hay lógica JS distinta por breakpoint.

**Estados:** `.is-scrolled` (con scroll) / sin ella (en el tope de la página).

---

## 2. Botón CTA sticky (barra de compra)

**Archivo/selector:** `<div class="cta-bar" data-cta-bar>` — `initCtaBarVisibility()` + `initCtaBarHeight()`.

**Comportamiento:**
- `position: fixed; bottom: 0; left: 0; right: 0;` con fondo `rgba(255,255,255,.92)` +
  `backdrop-filter: blur(14px)`.
- **Oculta por defecto.** Se muestra (`translateY(0)`, clase `.is-visible`) únicamente
  cuando el Hero (`#top`) sale completamente de viewport — un solo `IntersectionObserver`
  sobre el Hero, sin listener de scroll. Vuelve a ocultarse si el usuario regresa arriba.
- Contiene: precio + etiqueta ("Pago único"), el **mismo temporizador** que el Hero
  (sincronizado, ver sección 5a), botón "Comprar ahora" (abre el modal de checkout, no
  navega), y una fila de trust badges (pago único / acceso permanente / listo para usar).
- **No tiene integración directa con WhatsApp** — el contacto por WhatsApp vive en el nav
  y en el FAB flotante (sección 4), no en esta barra.

**Acción al clic:** el botón "Comprar ahora" tiene `data-checkout-cta` → intercepta el
click y abre el modal de checkout (no es un `<a href>` real, `e.preventDefault()`).

**Desktop vs mobile:** mismo comportamiento; el layout interno cambia de fila a columna
vía CSS responsive.

**Estados:** oculto / `.is-visible`. Su altura real (`--cta-bar-h`) se mide igual que la
del nav, para que el FAB flotante y el toast se posicionen justo encima sin solaparse.

---

## 3. FAQ — botón flotante (FAB) + acordeón inline de dos niveles

Dos piezas que trabajan juntas: **un ícono flotante que "pica" el usuario** (el FAB) y,
al hacer clic, **lleva a la sección de preguntas**, que se despliega como acordeón — no es
un modal/popup separado, es scroll nativo hacia una sección de la misma página que ya
contiene el acordeón.

### 3a. Botón flotante (FAB) que dispara el acceso al FAQ

**Archivo/selector:** `.fab-stack` → primer `.fab-item` (ícono "?") — comparte el
contenedor `.fab-stack` con el botón de WhatsApp (sección 4), mismo mecanismo de
tooltip idle, `initFabTooltips()`.

**Comportamiento al clic:** es un `<a href="#faq">` normal — el navegador hace scroll
nativo (`scroll-behavior: smooth` está activo globalmente) hasta `<section id="faq">` y
ahí el usuario ve el acordeón ya montado en la página (sección 3b). **No se abre ningún
modal ni overlay** — el contenido "aparece" porque el usuario llega a él, no porque algo
se despliegue encima de la página.

**Posición:** `position: fixed; right: clamp(1rem,3vw,1.5rem); bottom: calc(var(--cta-bar-h) + 1rem);`
dentro de `.fab-stack` — **ancla su posición a la altura real de la barra CTA sticky**
(variable `--cta-bar-h`), así nunca queda tapado por ella ni flota mal si la barra cambia
de alto entre idiomas. Apilado verticalmente sobre el ícono de WhatsApp.

**Tooltip (label "Preguntas frecuentes" junto al ícono):**
- Aparece solo tras un período de inactividad (`IDLE_DELAY = 1100ms` sin scroll) —
  mientras el usuario está leyendo/quieto, no mientras hace scroll activo.
- Se oculta inmediatamente al hacer scroll, y se reprograma para reaparecer tras el mismo
  período de inactividad — un único listener de scroll (debounced) controla los tooltips
  de **todos** los ítems del FAB a la vez (FAQ + WhatsApp), no hay timers por ítem.
- También se muestra si el botón recibe foco por teclado (accesibilidad).
- La burbuja en sí (el ícono circular) **siempre es visible** — solo el texto del tooltip
  aparece/desaparece.

**Otro acceso al mismo destino:** el nav también tiene el mismo ícono "?" con el mismo
`href="#faq"` — es el mismo comportamiento, solo que fijo arriba en vez de flotante.

**Responsive:** mismo comportamiento en mobile y desktop; solo cambia tamaño vía CSS.

**Evitar interferencia con otros sticky:** `z-index: 80`, entre la barra CTA (90) y el
toast de social proof (70) — a propósito, para que la barra CTA quede siempre encima
visualmente y el social-proof toast nunca tape al FAB.

### 3b. Acordeón de preguntas (el destino del clic)

**Archivo/selector:** sección `<section id="faq">` con `.accordion-category` (nivel 1,
categorías) conteniendo `[data-accordion]` con `.accordion-item` (nivel 2, preguntas) —
`initAccordion()` + helper genérico `bindExclusiveGroup()`.

**Cómo se abre/cierra:** clic en `.accordion-cat-trigger` expande una categoría
(`max-height` generoso, no medido en px, para no tener que re-medir cuando el nivel
anidado cambia de tamaño). Dentro de cada categoría, clic en `.accordion-trigger` expande
una pregunta (aquí sí se mide `scrollHeight` en px, porque no hay otro nivel anidado
adentro).

**Regla de exclusividad:** cada nivel es su propio "grupo exclusivo" — abrir un ítem
cierra cualquier otro ítem abierto **en ese mismo nivel**. Los dos niveles no interfieren
entre sí (usan `bindExclusiveGroup()` con selectores independientes).

**Reflow:** en `resize`, cualquier panel de pregunta actualmente abierto recalcula su
`scrollHeight` (por si el texto cambió de alto). Lo mismo ocurre al cambiar de idioma
(dentro de `applyLanguage()`).

**Accesibilidad:** `aria-expanded` en cada trigger, sin roles ARIA inventados de más.

**Si el nuevo proyecto necesita el FAQ como modal/popup real** (que se despliegue encima
de la página en vez de hacer scroll a una sección): reutiliza el patrón de la sección 6
(Modal de checkout) como base — mismo mecanismo de `hidden` + `.is-open` + backdrop +
`Escape` para cerrar — y coloca el mismo markup de acordeón (`.accordion-category` /
`.accordion-item`) dentro del panel del modal en vez de inline en la página. En ese caso,
el FAB del punto 3a cambiaría de `<a href="#faq">` a un botón que abre el modal
(`e.preventDefault()` + mismo mecanismo que `[data-checkout-cta]`).

---

## 4. WhatsApp — dos puntos de contacto, sin popup dedicado

**Archivo/selector:** `[data-whatsapp-cta]` (aplica a varios links: nav, FAB) — `initWhatsapp()`.

**Ubicaciones:** (1) icono en el nav, (2) segundo ícono del `.fab-stack` (mismo
contenedor flotante que el FAQ, ver sección 3a para posición/tooltip/z-index — son
mecánicamente idénticos). No hay un popup/widget de WhatsApp separado — es un link
`wa.me` en ambos sitios.

**Comportamiento:**
- El número viene de `config.whatsapp.number` (ver sección 8, `lib/manifest.js` en este
  proyecto). Se limpia con regex (`\D`) y se considera "configurado" si tiene ≥8 dígitos.
- Si **no** está configurado: el click hace `preventDefault()` y muestra un toast de
  aviso ("WhatsApp por configurar...") en vez de navegar a un número placeholder.
- Si está configurado: al hacer click se construye el href final
  `https://wa.me/{numero}?text={mensaje prellenado, URL-encoded}` — el mensaje sale de
  `config.whatsapp.message` (i18n).

**Responsive:** mismo comportamiento en mobile y desktop; solo cambia tamaño vía CSS.

**Evitar interferencia con otros sticky:** el `z-index` del FAB (80) está entre el de la
barra CTA (90, más arriba en el stacking) y el toast de social proof (70, más abajo) —
diseñado así a propósito para que la barra CTA quede siempre encima visualmente y el
social-proof toast nunca tape al FAB. El FAB se posiciona *sobre* la barra CTA
(`bottom: cta-bar-h + 1rem`), nunca superpuesto con ella.

---

## 5. Temporizador de oferta + Social proof / visitas (toast unificado)

### 5a. Temporizador (countdown)

**Archivo/selector:** `[data-countdown]` (texto completo) / `[data-countdown-mm]` /
`[data-countdown-ss]` (minutos y segundos por separado, para maquetar "MM : SS" con
estilos distintos) — `initCountdown()`.

**Tipo:** un único temporizador de cuenta regresiva, reutilizado en múltiples lugares de
la página (Hero y barra CTA) mediante los mismos `data-*` — **no son temporizadores
independientes**, todos leen el mismo deadline compartido.

**Configuración:**
```js
var COUNTDOWN_KEY = "gt-offer-deadline"; // clave de localStorage
var COUNTDOWN_MINUTES = 25;              // duración de la ventana
```

**Persistencia:** el deadline (timestamp) se guarda en `localStorage`. Si un usuario
recarga la página o vuelve más tarde *dentro* de la ventana de 25 minutos, ve el tiempo
restante real, no un reinicio — mismo comportamiento en todas las pestañas/visitas
mientras el deadline no haya expirado.

**Al llegar a cero:** no se congela en `00:00` ni desaparece — silenciosamente arranca
una ventana nueva de 25 minutos (se sobreescribe el deadline en localStorage). Es una
oferta "siempre activa" con temporizador visual, no una fecha límite real de una sola vez.

**Reutilización:** para usar en otra página/oferta, basta con:
1. Copiar `initCountdown()` tal cual.
2. Cambiar `COUNTDOWN_KEY` (para no compartir el mismo deadline entre ofertas distintas
   si conviven en el mismo dominio) y `COUNTDOWN_MINUTES` si la duración es otra.
3. Poner los `data-countdown*` donde se necesite mostrar el tiempo.

### 5b. Social proof + notificaciones de visitantes (un solo componente)

**Archivo/selector:** `[data-sp-stack]` — `initSocialProof()`.

**⚠️ Regla obligatoria de datos (pedida explícitamente):** la implementación actual usa
nombres y contadores **generados aleatoriamente de una lista de config, no eventos
reales**. Esto es contenido demostrativo. **Al reutilizar este componente en un proyecto
nuevo, el config debe declarar explícitamente si los datos son reales o demo**:
```js
socialProof: {
  isDemoData: true, // OBLIGATORIO declarar esto explícitamente
  // si es false, "names"/"visitorCounts" deben venir de datos reales
  // (ej. un webhook de ventas reales, analytics real), nunca de una
  // lista fija presentada como si fueran compras genuinas.
}
```
No modificar este comportamiento para presentar la lista fija como datos reales.

**Tipos de mensaje (rota entre los 3, nunca repite el mismo tipo dos veces seguidas):**
1. `visitors` — "X personas están viendo esta página" (X = aleatorio de `visitorCounts`).
2. `purchase` — "{nombre} de {ciudad} acaba de comprar {producto}" + "hace un momento".
3. `rating` — muestra el badge de estrellas + puntaje (4.8), sin nombre/ciudad.

**Estructura del toast:** icono (ojo para `visitors`, carrito-check para `purchase`,
estrellas para `rating`) + texto + metadato opcional ("hace un momento").

**Posición:** `position: fixed; top: calc(var(--nav-h) + 1rem); right: ...;` — debajo del
nav, esquina superior derecha. `pointer-events: none` en el contenedor — **nunca bloquea
clics** en el contenido de debajo.

**Animación:** fade + slide vía clase `.is-visible` (CSS transition, no JS). Solo existe
un nodo de toast a la vez (se reemplaza el `innerHTML` del stack, no se apilan varios).

**Frecuencia/duración:**
```js
var SP_CONFIG = {
  visibleMs:    5000,   // cuánto tiempo se ve cada toast
  firstDelayMs: 6000,   // espera antes del primer toast tras cargar la página
  gapMinMs:     14000,  // espera mínima entre toasts
  gapMaxMs:     24000   // espera máxima entre toasts (el gap real es aleatorio en ese rango)
};
```
Cadena auto-programada con un único `setTimeout` (nunca `setInterval`) — no hay
acumulación de timers ni memory leaks aunque el usuario pase mucho tiempo en la página.

**Responsive:** `max-width: min(320px, calc(100vw - 2rem))` — nunca se sale del viewport
en mobile.

**Cómo configurar los datos:** todo vive en `SP_CONFIG` (nombres, ciudad, rangos de
contador de visitantes, tiempos) — **separado de la lógica de programación/render**, tal
como pide la sección 9 del brief.

**Cómo reutilizar:** copiar `SP_CONFIG`, `SP_ICONS`, `initSocialProof()` tal cual; ajustar
`names`/`city`/`visitorCounts`/textos i18n al nuevo producto; **decidir y declarar**
`isDemoData` según corresponda.

---

## 6. Modal de checkout (patrón base reutilizable para cualquier popup/modal)

**Archivo/selector:** `[data-checkout-modal]` + `[data-checkout-cta]` (cualquier botón
con este atributo lo abre) — `initCheckoutModal()`.

Este es el **patrón genérico de modal** del sitio — reutilízalo para cualquier otro
popup/modal que el nuevo proyecto necesite (incluido un FAQ-modal si se requiere, ver
nota al final de la sección 3).

**Apertura:** `modal.hidden = false` → siguiente frame añade `.is-open` (para que la
transición CSS se dispare, no un salto instantáneo) → `document.body.style.overflow = "hidden"`
(bloquea el scroll de fondo mientras el modal está abierto).

**Cierre:** quita `.is-open` → tras 300ms (duración de la transición CSS) recién pone
`hidden = true` — así el modal no desaparece de golpe a mitad de la animación de salida.
Restaura `overflow` del body.

**Se cierra con:** click en el backdrop, click en el botón `×`, o tecla `Escape`
(solo si el modal está visible).

**Accesibilidad:** `role="dialog"` `aria-modal="true"` `aria-label` en el panel.

---

## 7. Arquitectura reutilizable

Este proyecto **no separa en archivos/carpetas de componentes** (es un único `main.js`
con funciones `init*` independientes) — pero cada función ya es, en la práctica, un
componente autocontenido: lee su propio config, busca sus propios `data-*` en el DOM, y
no depende de que otras `init*` corran antes o después (cada una hace `if (!el) return;`
si no encuentra su markup). Para un proyecto donde SÍ se justifique separar en archivos,
la equivalencia es:

```text
/lib
  manifest.js         → config centralizada (sección 9)
  i18n.js              → diccionario ES/EN

main.js
  initNav / initNavHeight        → responsable: nav flotante (sección 1)
  initCtaBarVisibility/Height    → responsable: barra CTA sticky (sección 2)
  initAccordion                  → responsable: FAQ acordeón (sección 3)
  initWhatsapp / initFabTooltips → responsable: contacto WhatsApp + FAB (sección 4)
  initCountdown                  → responsable: temporizador (sección 5a)
  initSocialProof                → responsable: toasts social proof/visitantes (sección 5b)
  initCheckoutModal              → responsable: modal genérico (sección 6)
  initLangToggle / applyLanguage → responsable: i18n ES/EN
```

**Regla de implementación:** cada `init*` recibe su configuración leyendo variables
`window.__BRAND__` / objetos `*_CONFIG` definidos arriba en el mismo archivo — nunca
hardcodea textos, números o URLs dentro de la lógica (ver sección 9). Cada `init*` se
registra en `boot()` envuelta en `safe(fn, "nombre")` — si una falla, no rompe las demás
(try/catch con `console.warn`, no un error silencioso ni un crash total).

---

## 8. Configuración centralizada

**Patrón real usado en este proyecto** — dos config globales que existen ANTES de que
`main.js` corra (cargadas como `<script defer>` previos):

`lib/manifest.js`:
```js
window.__BRAND__ = {
  whatsappNumber: "+525642145001" // único dato realmente leído por main.js
};
```

`lib/i18n.js`:
```js
window.__I18N__ = { es: { /* ...todas las claves de texto... */ }, en: { /* ... */ } };
```

Dentro de `main.js`, la configuración específica de cada componente vive como constante
al inicio de su bloque (no dispersa en la lógica):
```js
var SP_CONFIG = { names: [...], city: "...", visibleMs: 5000, firstDelayMs: 6000, ... };
var COUNTDOWN_KEY = "gt-offer-deadline";
var COUNTDOWN_MINUTES = 25;
```

**Regla para el nuevo proyecto:** seguir el mismo patrón — un objeto de config por
componente, declarado junto a (arriba de) la función que lo usa, con nombres en
MAYÚSCULAS si es una constante de módulo. No es necesario un único mega-objeto `config`
global si el proyecto es de este tamaño (una sola landing) — la sobra de abstracción va
en contra de "sin interpretar demasiado, sin decisiones innecesarias".

---

## 9. Reglas de implementación (checklist)

- **Qué implementar:** exactamente las 6 piezas de arriba (nav, cta-bar, FAQ-acordeón,
  WhatsApp+FAB, countdown, social-proof/visitantes) + el modal genérico como base para
  cualquier popup adicional.
- **Archivos a crear/tocar:** `index.html` (markup + `data-*` hooks), `styles.css`
  (visual + transiciones), `main.js` (un `init*` por componente + registro en `boot()`),
  `lib/manifest.js` (config de marca: WhatsApp, etc.), `lib/i18n.js` (todos los textos).
- **Dependencias:** ninguna externa. Solo APIs nativas del navegador: `IntersectionObserver`,
  `requestAnimationFrame`, `localStorage`, CSS transitions/`position: sticky`. **Nunca
  GSAP ni ninguna librería de animación.**
- **Qué debe ser reutilizable:** el modal genérico (sección 6), el patrón de acordeón
  exclusivo (`bindExclusiveGroup`), el temporizador (parametrizable por key/duración), y
  el sistema de toasts (parametrizable por config).
- **Qué debe ser responsive:** los 6 componentes, sin excepción — todos ya usan `clamp()`
  y media queries, ninguno tiene una versión JS distinta para mobile salvo el carrusel de
  "steps" (fuera de este documento) y el timeline de Personalización.
- **Estados a contemplar:** nav (`is-scrolled`/no), cta-bar (oculta/visible), acordeón
  (cada item abierto/cerrado, por nivel), modal (hidden/is-open/cerrando), WhatsApp
  (configurado/no configurado → toast de aviso), countdown (corriendo/expirado→reinicio),
  social-proof (con toast visible/vacío, tipo actual ≠ tipo anterior).
- **Casos límite:**
  - Sin `IntersectionObserver` (navegador viejo): cta-bar se muestra siempre visible por
    defecto en vez de quedar oculta para siempre.
  - WhatsApp sin número configurado: nunca debe abrir un chat a un número placeholder —
    debe avisar con el toast, no fallar silenciosamente.
  - `prefers-reduced-motion`: el conteo de precio (`data-count-to`) usa duración de
    animación de 1ms en vez de 1400ms; cualquier animación en loop indefinido (como el
    timeline de Personalización, fuera de este doc) debe desactivarse por completo, no
    solo acelerarse.
  - Countdown expirado mientras la pestaña está abierta: se detecta en el propio `render()`
    (corre cada 1s) y reinicia el deadline sin recargar la página.
  - Cambio de idioma con acordeón/countdown abiertos: el alto del panel abierto se
    recalcula (`applyLanguage()` ya lo hace) para que no quede cortado si el texto nuevo
    es más largo/corto.

---

*Generado a partir del código real de este proyecto (no inventado) —
`main.js`, `styles.css`, `index.html` tal como están en el repositorio, el 2026-09-15.*
