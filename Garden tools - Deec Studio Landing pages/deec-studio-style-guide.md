# DEEC Studio — Guía de estilo visual (para replicar en nuevos proyectos)

Pega este documento completo al inicio de un chat nuevo de Claude cuando le pidas diseñar
otra landing, para que arranque alineado con la línea visual de DEEC Studio en vez de
inventar un estilo genérico.

## Stack técnico (no negociable)
- HTML + CSS + JavaScript vanilla. **Sin frameworks, sin build step, sin npm.**
- Patrón IIFE en el JS, con un `safe(fn, name)` envolviendo cada función `init*`
  llamada una sola vez desde un `boot()` central — si una falla, no tumba las demás.
- Animaciones con `IntersectionObserver` / `requestAnimationFrame` / `position: sticky`
  nativos. **Nunca GSAP ni librerías de animación externas.**
- Sitio 100% estático, pensado para desplegar en Cloudflare Pages/Workers o Hostinger
  sin ningún paso de compilación.

## Paleta de colores
```css
--bg:          #ffffff;   /* fondo base */
--bg-2:        #f4f4f2;   /* fondo secundario, secciones alternas */
--paper:       #ffffff;   /* tarjetas/mockups */
--ink:         #1c1d17;   /* texto principal, casi negro cálido */
--ink-soft:    #34362c;
--ink-mute:    #6c6a5c;   /* texto secundario */
--moss:        #3b4b34;   /* verde musgo — color de marca principal */
--moss-2:      #556a49;
--moss-soft:   #7d9070;
--terracotta:  #b35d3a;   /* acento cálido secundario */
--terracotta-2:#96492b;
--accent:      #c23b32;   /* rojo — para urgencia/descuentos, usar con moderación */
--accent-2:    #9c2f27;
--cream:       #f6f1e6;   /* crema, para contraste sobre fondos oscuros */
--line:        rgba(28, 29, 23, 0.12);   /* bordes sutiles */
--line-soft:   rgba(28, 29, 23, 0.07);
--shadow-soft: 0 24px 60px -30px rgba(28, 29, 23, 0.35);
--shadow-lift: 0 40px 90px -35px rgba(28, 29, 23, 0.45);
```
**Filosofía de color:** paleta terrosa/editorial (verde musgo + terracota + negro cálido
sobre blanco/crema). Nada de azules corporativos ni gradientes saturados tipo SaaS. El
rojo (`--accent`) se reserva para urgencia/ofertas, no para color de marca.

## Tipografía
```css
--display: "Satoshi", "Switzer", -apple-system, "Segoe UI", sans-serif;
--sans:    "Switzer", -apple-system, "Segoe UI", sans-serif;
```
- Cargadas vía Fontshare (`api.fontshare.com`), no Google Fonts para las principales.
- Pesos: 400/500/600/700/800/900 — los títulos usan pesos muy altos (800-900,
  "display-black") con `letter-spacing` negativo y `line-height` ajustado (~0.98-1.05).
- Jerarquía editorial: titulares grandes y condensados, cuerpo de texto generoso.

## Geometría — esquinas casi rectas, no "friendly rounded"
Radios de borde deliberadamente pequeños: `2px`, `3px`, `4px` en botones/tarjetas/inputs;
`50%` solo en elementos circulares reales (dots, avatares). **Nada de `border-radius: 12px+`
en tarjetas o botones** — es parte de la identidad editorial/premium del sitio, evita que
se vea como una plantilla SaaS genérica.

## Sombras y espaciado
- Sombras suaves y muy difusas (`shadow-soft`/`shadow-lift`), nunca sombras duras.
- Secciones con `padding-block: clamp(4.5rem, 9vw, 8rem)` en desktop — mucho aire
  vertical entre secciones. `clamp(2.5rem, 10vw, 3.5rem)` en mobile.
- `--container-w: 1180px` como ancho máximo de contenido.

## Componentes característicos de este sitio (reusar el patrón, no copiar literal)
- **Mockups de producto** en tarjetas tipo "ventana de navegador" (barra superior con
  3 dots + título), usados para mostrar el producto digital en contexto — recurrente
  en Hero, sección "Personalización" y comparativas.
- **Botones** (`.btn-primary`): fondo sólido `--moss` o `--ink`, esquinas de 3px, sin
  gradientes, hover con `translateY` sutil (no scale ni glow).
- **Navegación**: sticky, con altura fija vía variable CSS (`--nav-h`), logo + iconos +
  toggle de idioma.

## Tono de copy
- Español natural, cercano pero profesional — nunca "marketing agresivo" ni buzzwords
  (nada de "revolucionario", "desbloquea", "secretos").
- Frases cortas y directas en headlines; el cuerpo explica el beneficio concreto.

## Accesibilidad y hardening (aplica también en el nuevo proyecto)
- Respetar `prefers-reduced-motion` en toda animación.
- CSP + security headers vía archivo `_headers` (si el hosting es Cloudflare Pages/Workers).
- i18n vía `data-i18n` + diccionario JS si el sitio necesita más de un idioma.

---
*Origen: extraído del proyecto "Garden Tools by DEEC Studio" (cotizador web para
jardineros), construido con la skill `adrian-saenz-hostinger-premium-website`.*
