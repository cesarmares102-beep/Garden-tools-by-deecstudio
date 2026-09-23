# WHOP_CHECKOUT_EMBED_FULL_IMPLEMENTATION.md — Guía completa: embed de checkout Whop con Apple Pay + Google Pay funcionando

Guía de extremo a extremo: arquitectura, implementación paso a paso, verificaciones de seguridad, y cómo distinguir un bloqueo real de un falso positivo del entorno de pruebas. Todo lo aquí documentado corresponde a lo implementado y verificado en producción en el proyecto Garden Tools by DEEC Studio.

---

## 1. Arquitectura — la decisión que lo hace funcionar

Hay dos formas de embeber el checkout de Whop en una landing. Solo una soporta Google Pay embebido:

| Método | Dónde corre el formulario de pago | Apple Pay | Google Pay |
|---|---|---|---|
| **Widget "Elements"** (`js.whop.cloud/elements/...` + `WhopElements().checkout.create(...)`) | En tu propio dominio (`tudominio.com`) | Sí, con verificación de dominio propia | **No** — la aprobación de Google Pay está ligada al perfil de Whop, no a dominios de terceros; no hay autoservicio para aprobar tu dominio |
| **Iframe al checkout hosteado** (`<iframe src="https://whop.com/checkout/{planId}">`) | En el propio dominio de Whop (`whop.com`) | Sí, sin pasos extra de tu parte | **Sí** — el origen ya está aprobado porque es el de Whop mismo |

**Usa siempre el método de iframe.** Es el único que soporta ambos wallets sin depender de una aprobación que no puedes gestionar tú mismo.

```
tudominio.com → <iframe src="https://whop.com/checkout/{planId}">
                    ↳ el formulario de pago (tarjeta, Apple Pay, Google Pay)
                      corre DENTRO del origen whop.com, no en el tuyo
```

---

## 2. Implementación paso a paso

### 2.1 HTML — modal de checkout

Cada botón de compra del sitio (`Comprar ahora`, en Hero / barra sticky / menú / tarjeta de oferta) debe abrir un modal en vez de navegar. Dentro del modal va el iframe:

```html
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

- Reemplaza `plan_XXXXXXXXXXXX` por el ID real del plan, tomado de tu panel de Whop (Checkout Links) o de la URL de checkout directa que Whop te da para ese producto.
- `allow="payment"` en el propio iframe es obligatorio — sin él, aunque el header del padre lo permita, el navegador no le da al iframe permiso de usar la Payment Request API (ver sección 3).
- Los botones que abren el modal solo necesitan el atributo `data-checkout-cta` (además de su `href` normal como fallback semántico):
  ```html
  <a class="btn btn-primary" href="#oferta" data-checkout-cta>Comprar ahora</a>
  ```
- **Elimina por completo cualquier script del widget viejo**, si tu proyecto lo tenía:
  ```html
  <!-- ELIMINAR -->
  <script src="https://js.whop.cloud/elements/amber/elements.js" data-whop-elements></script>
  <script type="module" src="lib/checkout-init.js"></script>
  ```

### 2.2 CSS — modal y contenedor del iframe

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
  transition: opacity .3s ease;
}
.checkout-modal.is-open .checkout-modal-backdrop { opacity: 1; }
.checkout-modal-panel {
  position: relative;
  z-index: 1;
  background: #fff;
  width: min(480px, 100%);
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 4px;
  box-shadow: 0 20px 60px rgba(0,0,0,.25);
  padding: 2.5rem 1.5rem 1.5rem;
  opacity: 0;
  transform: translateY(16px) scale(.98);
  transition: opacity .3s ease, transform .3s ease;
}
.checkout-modal.is-open .checkout-modal-panel { opacity: 1; transform: translateY(0) scale(1); }
.checkout-modal-close {
  position: absolute;
  top: .75rem;
  right: .75rem;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #f4f4f4;
  border: 1px solid #ddd;
  font-size: 1.3rem;
  line-height: 1;
  cursor: pointer;
}

/* El iframe NO puede auto-ajustar su altura al contenido interno (es
   cross-origin — whop.com no envía postMessage con su altura real), así
   que necesita un alto mínimo fijo generoso para que el formulario
   completo (incluyendo los botones de wallet) quepa sin scroll interno. */
#whop-checkout { min-height: 640px; }
#whop-checkout iframe { display: block; width: 100%; height: 100%; min-height: 640px; border: 0; }

@media (max-width: 539px) {
  .checkout-modal { padding: 0; align-items: flex-end; }
  .checkout-modal-panel { width: 100%; max-height: 92vh; border-radius: 12px 12px 0 0; }
}
```

### 2.3 JavaScript — abrir/cerrar el modal

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

// Llamar una vez al iniciar el sitio:
initCheckoutModal();
```

Este JS es agnóstico de lo que hay dentro del modal — no sabe ni le importa que sea un iframe de Whop. Solo maneja abrir/cerrar, overlay, tecla Escape y restaurar el scroll del body.

### 2.4 Headers de seguridad — la parte que realmente desbloquea los wallets

Esta es la pieza más fácil de omitir y la causa más común de que Apple Pay/Google Pay no aparezcan aunque el iframe cargue bien. Hacen falta **dos directivas**, en el header HTTP del documento que contiene el iframe (no en el iframe mismo):

```
Content-Security-Policy: ...; frame-src https://whop.com; ...
Permissions-Policy: payment=(self "https://whop.com")
```

**`frame-src https://whop.com`** — permite que la página cargue el `<iframe>`. Sin esto, el navegador bloquea el iframe completo antes de que el tema de los wallets siquiera entre en juego (verás un error de CSP en consola nombrando `frame-src`).

**`Permissions-Policy: payment=(self "https://whop.com")`** — permite que la Payment Request API (de la que dependen los botones de Apple Pay y Google Pay en la web) se use tanto en tu propio origen como en `whop.com`. Esta es la regla que más se olvida.

**Cómo funciona la relación header-padre / atributo-hijo (crítico entenderlo):**
```
El header Permissions-Policy del documento padre = TECHO (máximo permitido)
El atributo allow="payment" del <iframe>          = RECORTE (nunca puede exceder el techo)
```
El `allow="payment"` en el iframe **nunca puede otorgar más permiso del que el header del padre ya concedió**. Si el header dice `payment=(self)` sin más orígenes, ningún `allow` en ningún iframe podrá desbloquear Apple Pay/Google Pay ahí dentro — el navegador simplemente no deja que la API se use, sin importar qué diga el iframe.

**Dónde va este header según tu hosting:**

- **Cloudflare Pages/Workers** — archivo `_headers` en la raíz del proyecto:
  ```
  /*
    Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(self "https://whop.com")
    Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' ...; frame-src https://whop.com; ...
  ```
- **Apache / hosting compartido (Hostinger, etc.)** — `.htaccess`:
  ```apache
  <IfModule mod_headers.c>
    Header set Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(self \"https://whop.com\")"
    Header set Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' ...; frame-src https://whop.com; ..."
  </IfModule>
  ```

**No agregues excepciones que ya no necesitas.** Con este método (iframe hosteado), el CSP **ya no necesita** permitir `js.whop.cloud` en `script-src` ni `connect-src` — esas excepciones eran del método viejo (widget "Elements"). Si migras desde ese método, elimínalas; el header debe quedar más limpio, no más permisivo.

### 2.5 Verificación de dominio para Apple Pay — paso independiente de los headers

Apple Pay en la web exige, además del header correcto, verificar el dominio ante Apple con un archivo estático:

1. En tu panel de Whop: **Checkout Settings → Apple Pay for embedded checkout**.
2. Descarga el archivo de verificación que Whop te entrega (contenido hex, específico de tu cuenta).
3. Súbelo **tal cual, sin modificar una sola letra**, a esta ruta exacta en tu hosting:
   ```
   /.well-known/apple-developer-merchantid-domain-association
   ```
4. Registra tu dominio en ese mismo panel de Whop.

**Nota:** con el método de iframe hosteado (whop.com), es posible que este paso ya no sea estrictamente necesario de tu lado — la verificación de dominio para Apple Pay la gestiona Whop sobre su propio dominio (`whop.com`), no sobre el tuyo. Aun así, si tu implementación previa (con el widget viejo) ya tenía este archivo subido, no hace daño dejarlo — solo asegúrate de que su contenido sea el correcto (ver verificación en sección 3.3).

---

## 3. Verificaciones de seguridad — cómo confirmar que cada pieza funciona de verdad

No te bases solo en "se ve bien en el navegador" — verifica cada capa por separado, contra la fuente real, no contra herramientas intermedias.

### 3.1 Verificar que el header se está sirviendo correctamente

```bash
curl -sI https://tudominio.com/ | grep -iE "permissions-policy|content-security-policy"
```

Debe mostrar exactamente el `payment=(self "https://whop.com")` y el `frame-src https://whop.com` que configuraste. Si no aparece o aparece un valor viejo:
- Confirma que el archivo (`_headers` o `.htaccess`) está en la raíz correcta del repo/hosting.
- Si usas Cloudflare, purga caché (`Purge Everything` en el dashboard) — es común que un header nuevo tarde en reflejarse por caché de edge, mostrando el valor viejo pese a que el deploy ya es correcto.

### 3.2 Verificar que el iframe realmente carga (no bloqueado por CSP)

Abre DevTools → Console mientras abres el modal de checkout. Si `frame-src` no incluye `whop.com`, verás un error explícito tipo:
```
Refused to frame 'https://whop.com/' because it violates the following Content Security Policy directive: "frame-src ..."
```
Este error, si aparece, es 100% real y bloqueante — corrige el `frame-src` en tu header.

### 3.3 Verificar el archivo de dominio de Apple Pay

```bash
curl -s https://tudominio.com/.well-known/apple-developer-merchantid-domain-association
```

Compara el resultado carácter por carácter contra el archivo que Whop te entregó. Un error común: pegar por accidente el contenido de otro archivo (por ejemplo, el texto de tu propio `_headers`) en este archivo — el servidor lo sirve sin error HTTP, pero Apple simplemente nunca verifica el dominio, y el botón de Apple Pay no aparece sin ningún mensaje de error visible en el navegador.

### 3.4 Verificar contra el servidor REAL de Whop, no contra herramientas intermedias

**Este es el paso que más confusión genera y el motivo de esta sección.** Algunas herramientas de testing automatizado (navegadores en sandbox, extensiones de pruebas, entornos de agentes de IA) a veces reportan en su consola errores de CSP como:
```
Framing 'https://whop.com/' violates the following Content Security Policy directive: "frame-ancestors 'self'". The request has been blocked.
```
**Antes de asumir que esto es real, verifica directamente contra el servidor de Whop:**
```bash
curl -sI https://whop.com/checkout/{tu-plan-id} | grep -iE "frame-ancestors|x-frame-options|content-security-policy"
```
Si el comando no devuelve nada (sin esas directivas en la respuesta real), **el error que viste no viene de whop.com** — es un artefacto del entorno de pruebas (por ejemplo, una política que el propio navegador sandboxed o la herramienta de automatización inyecta sobre CUALQUIER iframe cross-origin, sin relación con lo que el servidor real permite). Esto ya se confirmó así una vez en este mismo proyecto: la respuesta real de `whop.com` no trae `Content-Security-Policy` ni `X-Frame-Options` que restrinjan el framing.

**La prueba que sí cuenta es la manual, en un navegador real (Chrome/Safari/Firefox normal, no un entorno de automatización):**
1. Entra al sitio en producción (o en un túnel/preview accesible, no solo `localhost` si vas a probar Apple Pay — Apple Pay requiere un dominio verificado, no funciona sobre `localhost`).
2. Haz clic en "Comprar ahora".
3. Confirma que el iframe carga el formulario de Whop.
4. Intenta escribir en el campo de email/tarjeta — si acepta texto, el formulario es interactivo y no hay bloqueo real.
5. Confirma visualmente si aparecen los botones de Apple Pay (en Safari/macOS/iOS con una tarjeta configurada en Wallet) y Google Pay (en Chrome/Android con una tarjeta configurada).

---

## 4. Checklist de despliegue — de principio a fin

- [ ] El iframe apunta a `https://whop.com/checkout/{planId}` (no a `js.whop.cloud/elements/...`).
- [ ] Cualquier script del widget "Elements" viejo fue eliminado del HTML.
- [ ] `allow="payment"` está presente en la etiqueta `<iframe>`.
- [ ] El header `Permissions-Policy` incluye `payment=(self "https://whop.com")` — verificado con `curl -sI` contra el sitio en vivo, no solo revisado en el archivo fuente.
- [ ] El header `Content-Security-Policy` incluye `frame-src https://whop.com`.
- [ ] Si migraste desde el widget viejo, las excepciones de `js.whop.cloud` en `script-src`/`connect-src` fueron eliminadas del CSP (ya no se necesitan).
- [ ] El archivo `/.well-known/apple-developer-merchantid-domain-association` existe y su contenido coincide exactamente con el que entrega Whop (verificado con `curl`, no solo "se subió algo a esa ruta").
- [ ] El dominio está registrado en el panel de Whop (Checkout Settings → Apple Pay for embedded checkout).
- [ ] Cache de Cloudflare (u otro CDN) purgada después del último deploy de headers, para descartar que estés viendo una versión vieja cacheada.
- [ ] Probado en un navegador real (no en un entorno de automatización/sandbox) sobre el dominio de producción (no `localhost`), con DevTools abierto para capturar cualquier error de CSP real.
- [ ] Si la consola reporta un error de `frame-ancestors` u otra directiva atribuida a `whop.com`, se verificó con `curl -sI` directo al servidor real de Whop antes de tratarlo como bloqueante.
- [ ] El formulario dentro del iframe acepta texto (campo de email/tarjeta interactivo).
- [ ] El botón de Google Pay aparece en un navegador/dispositivo con Google Pay configurado.
- [ ] El botón de Apple Pay aparece en Safari (macOS/iOS) con una tarjeta configurada en Apple Wallet.

---

*Esta guía consolida la implementación y el proceso de diagnóstico verificado en producción en el proyecto Garden Tools by DEEC Studio, incluyendo la distinción entre bloqueos reales de CSP y falsos positivos de entornos de prueba automatizados. Todos los valores de header/CSS/JS son los que quedaron funcionando en vivo; adapta únicamente el `planId` del iframe y el dominio propio en los ejemplos de `curl`.*
