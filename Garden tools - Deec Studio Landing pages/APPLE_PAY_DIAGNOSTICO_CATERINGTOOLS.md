# APPLE_PAY_DIAGNOSTICO_CATERINGTOOLS.md — Diagnóstico y solución: botón de Apple Pay no aparece en deecstudio-cateringtools.online

Sitio afectado: **https://deecstudio-cateringtools.online/**
Sitio de referencia (mismo proveedor, Apple Pay funcionando): Garden Tools by DEEC Studio

---

## 1. Resumen del diagnóstico

**Causa raíz confirmada:** al sitio `deecstudio-cateringtools.online` le falta el archivo de verificación de dominio de Apple Pay (`/.well-known/apple-developer-merchantid-domain-association`). El sitio de referencia (Garden Tools), que sí muestra el botón de Apple Pay correctamente, **sí tiene ese archivo publicado**. Es la única diferencia real encontrada entre ambos sitios — la arquitectura del checkout, los headers de seguridad y la configuración de CSP son correctos en ambos.

No es un problema de código, de CSP, ni de `Permissions-Policy` — esos ya están bien configurados. Es un paso de **verificación de dominio ante Apple** que falta completar.

---

## 2. Evidencia — verificación realizada en vivo

### 2.1 Arquitectura del checkout — correcta ✅

```bash
curl -s "https://deecstudio-cateringtools.online/" | grep -iE "whop|checkout-modal|iframe"
```
Resultado: el sitio ya usa la arquitectura correcta (iframe hacia el checkout hosteado por Whop, no el widget "Elements" viejo):
```html
<div class="checkout-modal" data-checkout-modal hidden>
  <div id="whop-checkout">
    <iframe src="https://whop.com/checkout/plan_GLifvy5XFV15e" title="Checkout" allow="payment"></iframe>
  </div>
</div>
```
✅ Correcto — mismo patrón documentado en `WHOP_CHECKOUT_EMBED_FULL_IMPLEMENTATION.md`.

### 2.2 Headers de seguridad — correctos ✅

```bash
curl -sI "https://deecstudio-cateringtools.online/"
```
Resultado relevante:
```
content-security-policy: default-src 'self'; ...; frame-src https://whop.com; ...
permissions-policy: camera=(), microphone=(), geolocation=(), payment=(self "https://whop.com")
```
✅ `frame-src` permite el iframe de Whop. ✅ `Permissions-Policy` permite la Payment Request API tanto en el propio origen como en `https://whop.com`. Ambos headers están correctamente configurados — descarta la causa #1 documentada en `PAYMENT_GATEWAY_IMPLEMENTATION.md` (el bloqueo de `Permissions-Policy`).

### 2.3 Prueba visual en el modal — confirma el patrón exacto del problema

Al abrir el modal de checkout en el sitio, el formulario de Whop carga correctamente y **el botón de Google Pay sí aparece** (franja negra con el logo de Google arriba del formulario). Pero **no hay ningún botón de Apple Pay** — ni visible, ni deshabilitado, simplemente no está en el DOM. Esto es consistente con: la Payment Request API está funcionando (por eso Google Pay sí se dibuja), pero específicamente el requisito de Apple Pay — la verificación de dominio — no se está cumpliendo.

*(Nota: la prueba también se hizo desde un navegador basado en Chromium, donde Apple Pay JAMÁS aparece por diseño de Apple, sin importar la configuración — ver sección 4. Por eso la evidencia decisiva no es "no vi el botón en mi prueba", sino la comparación directa del archivo de verificación en la sección 2.4.)*

### 2.4 El archivo de verificación de dominio — LA DIFERENCIA ENCONTRADA ❌

```bash
# Garden Tools (funciona, Apple Pay visible en producción)
curl -s -o /dev/null -w "%{http_code}\n" "https://garden-tools-by-deecstudio.cesar-mares102.workers.dev/.well-known/apple-developer-merchantid-domain-association"
→ 200
curl -s "https://garden-tools-by-deecstudio.cesar-mares102.workers.dev/.well-known/apple-developer-merchantid-domain-association"
→ 7b2276657273696f6e223a312c227073704964223a...  (contenido hex presente)

# CateringTools (con el problema)
curl -s -o /dev/null -w "%{http_code}\n" "https://deecstudio-cateringtools.online/.well-known/apple-developer-merchantid-domain-association"
→ 404
```

**El archivo simplemente no existe en `deecstudio-cateringtools.online`.** Esta es la causa.

---

## 3. Por qué este archivo es necesario incluso usando el método de iframe

En `PAYMENT_GATEWAY_IMPLEMENTATION.md` (documentando Garden Tools) se anotó como posibilidad que, al migrar al método de iframe hacia `whop.com`, este archivo tal vez "ya no fuera estrictamente necesario" del lado del dominio propio, porque la verificación de Apple Pay ocurriría sobre el dominio de Whop, no el nuestro.

**La evidencia de este caso contradice esa suposición:** Garden Tools usa el mismo método de iframe y **sí tiene el archivo publicado en su propio dominio**, y ahí Apple Pay funciona. Lo más probable es que Apple valide el archivo de verificación de dominio también contra el **dominio que aparece en la barra de direcciones del navegador** (el dominio que embebe el iframe), no solo contra `whop.com` — es decir, Safari/Apple Pay JS puede estar comprobando el "top-level browsing context" (tu propio dominio), además de (o en vez de) el origen del iframe.

**Conclusión práctica: el archivo de verificación debe publicarse en CADA dominio propio que embeba el checkout, sin importar el método de embed usado.** No es opcional con el método de iframe.

---

## 4. Nota importante — por qué "no lo vi en mi navegador" no es prueba suficiente

Apple Pay **solo se renderiza en Safari** (macOS o iOS), y únicamente si el dispositivo tiene una tarjeta configurada en Apple Wallet. En Chrome, Firefox, Edge, o cualquier navegador basado en Chromium (incluyendo entornos de automatización/testing), la API `ApplePaySession` ni siquiera existe — el botón nunca se intentará dibujar, con o sin verificación de dominio correcta. Esto es una restricción de Apple, no un bug de la implementación.

**Por eso la verificación correcta no es "abrí el sitio y no until vi el botón"**, sino:
1. Confirmar el archivo de verificación con `curl` (sección 2.4) — esto SÍ es concluyente sin importar el navegador.
2. Probar visualmente solo en Safari real (macOS o iPhone/iPad), con una tarjeta configurada en Apple Wallet.

---

## 5. Solución — pasos exactos

### 5.1 Obtener el archivo de verificación correcto de Whop

1. Entra al panel de Whop de la cuenta/producto correspondiente a CateringTools.
2. Ve a **Checkout Settings → Apple Pay for embedded checkout**.
3. Descarga el archivo de verificación que Whop entrega para **este dominio específico** (`deecstudio-cateringtools.online`) — **no reutilices el archivo de Garden Tools**, el contenido es específico por cuenta/dominio registrado, aunque el formato se vea similar.
4. Si el dominio `deecstudio-cateringtools.online` no aparece todavía como registrado en ese panel, regístralo ahí primero — es un paso manual en el dashboard de Whop, independiente de subir el archivo.

### 5.2 Publicar el archivo en el sitio

Sube el archivo, **sin modificar una sola letra de su contenido**, a esta ruta exacta:
```
https://deecstudio-cateringtools.online/.well-known/apple-developer-merchantid-domain-association
```

Si el sitio corre en Cloudflare Pages/Workers (como Garden Tools), el archivo debe colocarse en la carpeta que sirve los assets estáticos del proyecto, en la ruta `/.well-known/apple-developer-merchantid-domain-association` (sin extensión). Confirma que el `wrangler.jsonc` (o equivalente) del proyecto de CateringTools no esté excluyendo la carpeta `.well-known` de los assets servidos — algunos generadores estáticos ocultan por defecto carpetas que empiezan con punto.

### 5.3 Verificar que se publicó correctamente

```bash
curl -s -o /dev/null -w "%{http_code}\n" "https://deecstudio-cateringtools.online/.well-known/apple-developer-merchantid-domain-association"
```
Debe devolver `200`, no `404`.

```bash
curl -s "https://deecstudio-cateringtools.online/.well-known/apple-developer-merchantid-domain-association"
```
Compara el contenido carácter por carácter contra el archivo descargado del panel de Whop en el paso 5.1. **Error común (ya ocurrió antes en este mismo proyecto):** pegar por accidente el contenido de otro archivo (como el propio `_headers`) en este archivo — el servidor lo serviría sin error HTTP, pero Apple nunca completaría la verificación, y el síntoma sería idéntico al actual (sin ningún error visible en el navegador).

### 5.4 Purgar caché si el hosting usa CDN

Si el sitio está en Cloudflare (como parece, por los headers `CF-RAY`/`cf-cache-status` observados), purga caché (`Purge Everything`) después de publicar el archivo — de lo contrario, `curl` podría seguir mostrando el `404` viejo cacheado en el edge durante un rato, aunque el archivo ya esté correctamente desplegado.

### 5.5 Verificación final en un dispositivo real

Una vez que el paso 5.3 devuelva `200` con el contenido correcto:
1. Espera unos minutos (la propagación de la verificación de dominio del lado de Apple/Whop no siempre es instantánea).
2. Abre el sitio en **Safari real** (macOS o iOS) con una tarjeta configurada en Apple Wallet.
3. Abre el modal de checkout — el botón de Apple Pay debería aparecer junto (o en vez de) el de Google Pay.

---

## 6. Checklist resumen

- [ ] El dominio `deecstudio-cateringtools.online` está registrado en el panel de Whop (Checkout Settings → Apple Pay for embedded checkout).
- [ ] Se descargó el archivo de verificación específico de ese registro (no reutilizado de otro dominio/proyecto).
- [ ] El archivo se publicó en `/.well-known/apple-developer-merchantid-domain-association` en la raíz del sitio.
- [ ] `curl -s -o /dev/null -w "%{http_code}\n" .../apple-developer-merchantid-domain-association` devuelve `200`.
- [ ] El contenido devuelto coincide exactamente con el archivo entregado por Whop.
- [ ] Caché del CDN purgada tras el deploy.
- [ ] Probado visualmente en Safari real (no en Chrome/entorno de automatización) con Apple Wallet configurado.

**Todo lo demás en este sitio (arquitectura del iframe, `Permissions-Policy`, CSP `frame-src`) ya está correcto y no necesita cambios — el único paso pendiente es este archivo de verificación.**

---

*Diagnóstico realizado en vivo el 2026-09-21 mediante `curl` directo contra `deecstudio-cateringtools.online` y comparación con el sitio de referencia funcionando (Garden Tools by DEEC Studio), más inspección del modal de checkout en navegador. Ver también `PAYMENT_GATEWAY_IMPLEMENTATION.md` y `WHOP_CHECKOUT_EMBED_FULL_IMPLEMENTATION.md` para el contexto completo de la arquitectura del checkout.*
