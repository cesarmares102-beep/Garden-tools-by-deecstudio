# PAYMENT_GATEWAY_IMPLEMENTATION.md — Cómo se resolvió Apple Pay / Google Pay en el checkout embebido (Garden Tools)

Este documento explica, con precisión, **el problema real que tuvimos, cómo lo diagnosticamos y qué arreglo lo resolvió**, para poder aplicar el mismo razonamiento (no necesariamente el mismo código, si el proveedor de pago es distinto) en la otra landing que está teniendo "el mismo inconveniente". Si el proveedor es también Whop, el arreglo es literalmente el mismo código. Si es otro proveedor (Stripe, PayPal, etc.), la causa raíz y el método de diagnóstico igual aplican — la sección 6 explica qué buscar.

---

## 1. Síntoma original

Los botones de **Apple Pay** y **Google Pay** no aparecían en el checkout embebido dentro del modal de la landing, aunque:
- El checkout **sí funcionaba** entrando por el link directo de Whop (fuera de la landing).
- Los métodos de pago normales (tarjeta) **sí funcionaban** dentro del embed.
- Otra landing distinta, con otro proveedor/agente, **sí lograba** mostrar los botones de wallet embebidos — evidencia que descartó "esto simplemente no se puede" y forzó a seguir buscando la causa real.

---

## 2. Arquitectura original (la que causaba el problema)

El checkout se montaba con el **widget "Elements" de Whop** (una librería JS más antigua), directamente sobre el dominio propio de la landing:

```html
<!-- ARQUITECTURA VIEJA — causaba el problema -->
<script src="https://js.whop.cloud/elements/amber/elements.js" data-whop-elements></script>
<script type="module" src="lib/checkout-init.js"></script>
```

`checkout-init.js` llamaba algo como `window.WhopElements().checkout.create(...)` y montaba el formulario de pago (inputs de tarjeta, botones de wallet) **dentro de un `<div>` de nuestra propia página** — es decir, el formulario de pago corría en el origin de la landing (`tudominio.com`), no en el de Whop.

---

## 3. Diagnóstico — 2 causas distintas, NO una sola

Esto es lo más importante del caso: parecía un solo problema ("los wallets no aparecen") pero en realidad eran **dos causas independientes**, una que sí se pudo arreglar desde nuestro lado y otra que no.

### 3.1 Causa #1 — Header `Permissions-Policy` bloqueando la Payment Request API (SÍ se pudo arreglar)

Nuestro `_headers` (Cloudflare) tenía:
```
Permissions-Policy: payment=(self)
```

`payment=(self)` restringe la **Payment Request API** (de la que dependen tanto el botón de Apple Pay como el de Google Pay en la web) únicamente al propio origin del documento. Como el widget "Elements" montaba el formulario en un `<iframe>` interno hacia `js.whop.cloud`, ese iframe **no estaba en la lista de orígenes permitidos**, así que el navegador simplemente no le dejaba usar la API — el botón ni se intentaba dibujar.

**Regla clave de cómo funciona `Permissions-Policy` con iframes:** el header del documento padre es un **techo**, no un piso. El atributo `allow="payment"` que pongas en el propio `<iframe>` **nunca puede otorgar más permiso del que ya concedió el header del padre** — solo puede recortarlo, nunca ampliarlo. Si el header del padre dice `payment=(self)`, ningún `allow` en el iframe puede desbloquear un origen que el header no listó.

**Arreglo aplicado:** ampliar la lista de orígenes permitidos en el header:
```
Permissions-Policy: payment=(self "https://js.whop.cloud")
```

Esto sí arregló **Apple Pay** (una vez combinado con la verificación de dominio de Apple, ver 3.2) — pero **no arregló Google Pay**. Eso llevó a la causa #2.

### 3.2 Requisito adicional para Apple Pay — verificación de dominio (independiente del header)

Apple Pay en la web exige, además del header correcto, que el dominio esté verificado ante Apple mediante un archivo estático:

```
/.well-known/apple-developer-merchantid-domain-association
```

Este archivo se descarga **desde el propio Whop** (tiene un contenido hex específico, distinto por cuenta/merchant), se sube tal cual a esa ruta exacta en el hosting propio, y se registra el dominio en el panel de Whop (`Checkout Settings → Apple Pay for embedded checkout`). Sin este archivo, Apple Pay no aparece **aunque el header esté perfecto**.

**Error que cometimos y vale la pena advertir:** al crear este archivo a mano, es fácil pegar por error el contenido equivocado (por ejemplo, el texto de otro archivo que se tenía copiado en el portapapeles, como el propio `_headers`). El síntoma es que `curl` a esa ruta devuelve un archivo con el content-type correcto pero el contenido incorrecto — Apple simplemente no verifica el dominio y falla en silencio, sin error visible en el navegador. Verificar siempre con:
```bash
curl -s https://tudominio.com/.well-known/apple-developer-merchantid-domain-association
```
y comparar carácter por carácter contra el archivo que Whop entrega.

### 3.3 Causa #2 — Google Pay: el origen del embed nunca estaba aprobado (NO se podía arreglar desde nuestro lado, con esa arquitectura)

A diferencia de Apple Pay (que se verifica por dominio, con un archivo autoservicio), **la aprobación de Google Pay en Whop está ligada al "Google Pay Developer Profile" de la cuenta de Whop misma** — es Whop quien está aprobado ante Google, no cada dominio individual de cada cliente de Whop. No existe (al momento de esta implementación) un mecanismo de autoservicio para que un dominio de un tercero (nuestra landing) quede aprobado dentro de ese perfil.

Esto significa: **mientras el formulario de pago corriera en nuestro propio origen** (`tudominio.com`, vía el widget "Elements"), Google Pay **nunca** iba a aparecer, sin importar qué header se configurara. No era un bug de configuración — era una limitación arquitectónica del método de embed elegido.

---

## 4. La solución real — cambiar de "widget embebido en tu origen" a "iframe del checkout ya hosteado por el proveedor"

La corrección de causa raíz no fue un header ni un archivo — fue **cambiar qué corre dentro del modal**. En vez de montar el formulario de pago con JS sobre nuestro propio dominio, se reemplazó por un `<iframe>` que apunta directamente a la **página de checkout ya hosteada por Whop** (`whop.com`), que es el origen que Whop **sí** tiene aprobado tanto para Apple Pay como para Google Pay (porque es su propio dominio, no el de cada cliente).

```
ANTES:  tudominio.com  → carga JS de js.whop.cloud → dibuja el form EN tu origen (ni Google Pay aprobado, y Apple Pay requiere verificación extra)
DESPUÉS: tudominio.com  → <iframe src="https://whop.com/checkout/...">  → el form corre DENTRO del origen whop.com (ya aprobado para ambos wallets)
```

### 4.1 HTML — modal de checkout (versión final)

```html
<!-- Cada botón "Comprar ahora" del sitio abre este modal en vez de navegar,
     embebiendo la propia página de checkout hosteada por Whop en un iframe.
     Su origen (whop.com) es el que ya está aprobado para Apple Pay/Google
     Pay — el widget "Elements" se montaba en nuestro propio origen, que no
     está aprobado para Google Pay (Apple Pay solo necesitaba el archivo de
     verificación de dominio, que ya teníamos), así que ese botón se
     quedaba oculto sin importar qué arreglo de headers se aplicara.
     Embeber el checkout de whop.com mantiene al comprador dentro de este
     modal (sin redirigirlo fuera de la página). -->
<div class="checkout-modal" data-checkout-modal hidden>
  <div class="checkout-modal-backdrop" data-checkout-modal-backdrop></div>
  <div class="checkout-modal-panel" role="dialog" aria-modal="true" aria-label="Checkout">
    <button type="button" class="checkout-modal-close" data-checkout-modal-close aria-label="Cerrar">&times;</button>
    <div id="whop-checkout">
      <iframe src="https://whop.com/checkout/plan_XXXXXXXXXXXX" title="Checkout" allow="payment"></iframe>
    </div>
  </div>
</div>
```

**Puntos clave:**
- El `src` del iframe es la URL de checkout que el propio Whop genera para tu plan/producto (`whop.com/checkout/{planId}`) — no la URL antigua de "Elements".
- `allow="payment"` en el propio iframe sigue siendo necesario (es el "recorte" del lado del hijo), pero ahora sí funciona porque el header del padre (ver 4.3) también lo permite para este origen.
- **Ya NO se cargan los scripts de "Elements"** — se eliminan por completo:
  ```html
  <!-- ELIMINAR, ya no se usan -->
  <script src="https://js.whop.cloud/elements/amber/elements.js" data-whop-elements></script>
  <script type="module" src="lib/checkout-init.js"></script>
  ```
- El botón que abre el modal no cambia — sigue siendo cualquier `<a data-checkout-cta>` normal del sitio (ver `HERO_TIMER_CTA_SPEC.md` / `OFFER_CARD_CTA_TRUST_SPEC.md` para el botón en sí); lo único que cambió es qué hay DENTRO del modal.

### 4.2 CSS — modal y contenedor del iframe

```css
.checkout-modal[hidden] { display: none; }
.checkout-modal {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}
.checkout-modal-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(28, 29, 23, 0.6);
  opacity: 0;
  transition: opacity .3s var(--ease-out);
}
.checkout-modal.is-open .checkout-modal-backdrop { opacity: 1; }
.checkout-modal-panel {
  position: relative;
  z-index: 1;
  background: var(--paper);
  width: min(480px, 100%);
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 4px;
  box-shadow: var(--shadow-lift);
  padding: 2.5rem 1.5rem 1.5rem;
  opacity: 0;
  transform: translateY(16px) scale(.98);
  transition: opacity .3s var(--ease-out), transform .3s var(--ease-out);
}
.checkout-modal.is-open .checkout-modal-panel { opacity: 1; transform: translateY(0) scale(1); }
.checkout-modal-close {
  position: absolute;
  top: .75rem;
  right: .75rem;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-2);
  border: 1px solid var(--line);
  font-size: 1.3rem;
  line-height: 1;
  color: var(--ink-mute);
  transition: color .2s var(--ease-out), border-color .2s var(--ease-out);
}
.checkout-modal-close:hover { color: var(--ink); border-color: var(--moss); }

/* Contenedor específico del iframe — necesita alto mínimo fijo porque un
   iframe cross-origin no puede auto-ajustar su altura al contenido
   interno (eso requeriría que whop.com te mande postMessage con su
   altura real, cosa que su checkout hosteado no hace). */
#whop-checkout { min-height: 640px; }
#whop-checkout iframe { display: block; width: 100%; height: 100%; min-height: 640px; border: 0; }

@media (max-width: 539px) {
  .checkout-modal { padding: 0; align-items: flex-end; }
  .checkout-modal-panel { width: 100%; max-height: 92vh; border-radius: 12px 12px 0 0; }
}
```

### 4.3 JS — apertura/cierre del modal (no cambió con la migración — el modal es agnóstico de qué hay adentro)

```js
function initCheckoutModal() {
  var modal = document.querySelector("[data-checkout-modal]");
  var backdrop = document.querySelector("[data-checkout-modal-backdrop]");
  var closeBtn = document.querySelector("[data-checkout-modal-close]");
  var triggers = Array.prototype.slice.call(document.querySelectorAll("[data-checkout-cta]"));
  if (!modal || !triggers.length) return;

  function open(e) {
    if (e) e.preventDefault();
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(function () { modal.classList.add("is-open"); });
  }
  function close() {
    modal.classList.remove("is-open");
    document.body.style.overflow = "";
    setTimeout(function () { modal.hidden = true; }, 300);
  }

  triggers.forEach(function (btn) { btn.addEventListener("click", open); });
  if (backdrop) backdrop.addEventListener("click", close);
  if (closeBtn) closeBtn.addEventListener("click", close);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !modal.hidden) close();
  });
}
```

Nada de este JS sabe ni le importa si adentro hay un iframe de Whop, un widget "Elements", o cualquier otra cosa — es puramente el mecánico abrir/cerrar. **Esto es importante para portar la solución a otro proveedor de pago: el modal en sí no necesita cambiar, solo el contenido del `#whop-checkout` (o el `div` equivalente).**

### 4.4 Headers finales — `_headers` (Cloudflare Pages/Workers)

```
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(self "https://whop.com")
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://api.fontshare.com https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com https://api.fontshare.com https://cdn.fontshare.com; img-src 'self' data:; frame-src https://whop.com; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; object-src 'none'
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

Piezas relevantes al checkout, explicadas:

| Directiva | Valor | Para qué |
|---|---|---|
| `Permissions-Policy: payment=(self "https://whop.com")` | permite la Payment Request API en el propio origen Y en `whop.com` | Sin esto, aunque el iframe tenga `allow="payment"`, el navegador lo bloquea — es el "techo" descrito en 3.1 |
| `Content-Security-Policy: frame-src https://whop.com` | permite que la página cargue un `<iframe>` cuyo origen sea `whop.com` | Sin esto, el navegador ni siquiera carga el iframe — CSP lo bloquea antes de que llegue a la parte de Payment Request API |

**Comparado con la arquitectura vieja:** ya no hace falta ningún permiso especial para `js.whop.cloud` en `script-src`/`connect-src` — al no cargar ya ese JS, esas excepciones se eliminaron del CSP. El header quedó **más restrictivo/limpio**, no más permisivo, gracias al cambio de arquitectura.

---

## 5. Verificación — cómo confirmamos que el arreglo funcionaba de verdad (no solo "parece que sí")

1. **`curl -sI` contra el sitio en vivo** (no solo el dashboard de Cloudflare) para confirmar que el header desplegado coincide EXACTAMENTE con lo que se escribió en `_headers` — hubo un caso de caché de Cloudflare sirviendo una versión vieja del header pese a que el commit correcto ya estaba desplegado; se resolvió con un "Purge Everything" manual en el dashboard.
2. **Consola del navegador (DevTools)** al abrir el modal — cualquier bloqueo de CSP aparece ahí como un error explícito nombrando la directiva y el dominio bloqueado. Es la forma más rápida de confirmar si el problema es de headers o de otra cosa.
3. **Verificación directa contra `whop.com`** cuando una herramienta de terceros (agente externo, sandbox de testing) reportaba una restricción que parecía venir de Whop — se comprobó con `curl` directo al servidor real de Whop si el header/meta tag realmente existía ahí. En un caso, la herramienta de sandbox estaba inyectando una restricción que no existía en la respuesta real del servidor — no asumir que toda señal de una herramienta de testing es 100% fiable sin cruzarla contra la fuente real.
4. **No confiar en mensajes de "agentes" de terceros sin verificar** — durante este proceso recibimos más de una recomendación externa (de un "agente de Whop", de herramientas de IA de otros paneles) que resultó ser genérica o inexacta para este caso específico (ej. sugerir cambiar `not_found_handling` a `single-page-application` cuando el sitio no es una SPA). Toda instrucción externa se trató como dato a verificar, nunca como una orden a ejecutar directamente.

---

## 6. Checklist de diagnóstico para aplicar en la otra landing

Si el síntoma es "Apple Pay / Google Pay no aparece en un checkout embebido", sin importar el proveedor de pago:

1. **¿Dónde corre realmente el formulario de pago?** ¿Es un widget JS que dibuja el form en tu propio dominio, o es un iframe hacia una página ya hosteada por el proveedor? Esta es la pregunta más importante — si es lo primero, revisa el punto 2; si ya es lo segundo y aun así falla, salta al punto 3.
2. **Revisa el header `Permissions-Policy` del documento padre** (`curl -sI` al sitio en vivo, no solo el editor de código). Si dice `payment=(self)` sin más orígenes, ningún iframe de terceros podrá usar Apple Pay/Google Pay, sin importar su propio `allow`. Amplíalo al origen real que sirve el formulario de pago.
3. **Revisa si el proveedor de pago requiere verificación de dominio para Apple Pay** — casi todos los procesadores (Stripe, Whop, etc.) piden subir un archivo a `/.well-known/apple-developer-merchantid-domain-association` y registrar el dominio en su panel. Sin este archivo, Apple Pay no aparece pase lo que pase con los headers.
4. **Para Google Pay específicamente, pregúntate: ¿el origen que dibuja el botón está aprobado en el Google Pay Developer Profile del PROVEEDOR (no el tuyo)?** Si el widget corre en tu propio dominio y el proveedor no tiene un mecanismo de autoservicio para aprobar dominios de clientes individuales, es muy probable que esta sea la causa raíz — y la única solución real suele ser migrar a un iframe hacia la página de checkout ya hosteada por el proveedor (el mismo cambio que se hizo aquí), no un ajuste de configuración.
5. **Verifica CSP `frame-src`** si decides usar un iframe — sin el dominio del proveedor ahí, el navegador bloquea el iframe completo antes de que el problema de wallets siquiera entre en juego.
6. **No aceptes un "no tiene solución" sin evidencia concreta.** En este proyecto, la primera conclusión fue que Google Pay no se podía arreglar — se revirtió esa conclusión únicamente cuando se presentó evidencia concreta (otra landing real, con el mismo proveedor, mostrando el botón). Si tienes evidencia de que sí es posible, sigue investigando la diferencia de arquitectura en vez de aceptar el diagnóstico inicial.

---

*Todos los valores fueron extraídos literalmente de `index.html`, `styles.css`, `main.js` y `_headers` del proyecto Garden Tools by DEEC Studio, en su estado final ya funcionando en producción. La sección 6 es la única parte pensada para generalizar a un proveedor de pago distinto al de este proyecto — el resto documenta exactamente lo que se implementó aquí.*
