// GardenTools — Whop webhook → Meta Conversions API (Purchase).
//
// Whop's webhooks are delivered via Svix (confirmed from a real
// delivery's headers — see the 3 headers read below). Svix's
// signature scheme, not a generic single-header HMAC:
//   https://docs.svix.com/receiving/verifying-payloads/how-manual
//
//   headers: webhook-id, webhook-timestamp, webhook-signature
//   signed content = `${webhook-id}.${webhook-timestamp}.${rawBody}`
//   secret = base64, usually prefixed "whsec_" — strip the prefix,
//            base64-decode the rest, use as the raw HMAC key
//   signature = base64(HMAC-SHA256(secretBytes, signedContent))
//   webhook-signature header can hold multiple space-separated
//   "v1,<base64sig>" values (for secret rotation) — a match on any
//   one of them is valid.
//
// ⚠️ STILL TO CONFIRM — the JSON body's field names (event type,
// data.id/settlement_amount/currency/email) are written from the
// brief, not from an inspected real payload (Cloudflare's request
// logging doesn't capture the body by default). There's a temporary
// debug log below (search DEBUG) that prints the verified body to
// Cloudflare's Observability logs — check it after the next sandbox
// webhook fires, confirm the real field names, adjust if needed, then
// remove that log line.

const MAX_TIMESTAMP_SKEW_SECONDS = 5 * 60; // Svix's own recommended tolerance
const META_GRAPH_VERSION = "v21.0"; // confirm this is still a supported version when you deploy
const DEFAULT_META_DATASET_ID = "1118290030539871"; // fallback if env.META_DATASET_ID isn't set

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function sha256Hex(message) {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(message));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Constant-time-ish string compare — avoids leaking how many leading
// characters of the signature matched via response-time differences.
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function computeSvixSignatureBase64(secret, webhookId, webhookTimestamp, rawBody) {
  const secretB64 = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  const secretBytes = base64ToBytes(secretB64);
  const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`;
  const key = await crypto.subtle.importKey("raw", secretBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedContent));
  return bytesToBase64(new Uint8Array(mac));
}

export async function handleWhopWebhook(request, env, ctx) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
  }

  if (!env.WHOP_WEBHOOK_SECRET) {
    console.error("WHOP_WEBHOOK_SECRET is not configured as a Cloudflare Secret");
    return new Response("Server misconfigured", { status: 500 });
  }
  if (!env.META_ACCESS_TOKEN) {
    console.error("META_ACCESS_TOKEN is not configured as a Cloudflare Secret");
    return new Response("Server misconfigured", { status: 500 });
  }
  if (!env.WHOP_PURCHASES) {
    console.error("WHOP_PURCHASES KV binding is missing");
    return new Response("Server misconfigured", { status: 500 });
  }

  const webhookId = request.headers.get("webhook-id");
  const webhookTimestamp = request.headers.get("webhook-timestamp");
  const webhookSignatureHeader = request.headers.get("webhook-signature");

  if (!webhookId || !webhookTimestamp || !webhookSignatureHeader) {
    return new Response("Missing signature headers", { status: 401 });
  }

  // Timestamp freshness — check BEFORE doing any HMAC work, using
  // Svix's own header (not something inside the JSON body).
  const tsSeconds = parseInt(webhookTimestamp, 10);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(tsSeconds) || Math.abs(nowSeconds - tsSeconds) > MAX_TIMESTAMP_SKEW_SECONDS) {
    return new Response("Timestamp outside allowed window", { status: 400 });
  }

  // Raw body — signature verification MUST run against the exact
  // bytes Whop/Svix signed, before any JSON parsing.
  const rawBody = await request.text();

  const expectedSigBase64 = await computeSvixSignatureBase64(env.WHOP_WEBHOOK_SECRET, webhookId, webhookTimestamp, rawBody);

  // webhook-signature can carry multiple space-separated "v1,<sig>"
  // values (key rotation) — valid if ANY one matches.
  const providedSignatures = webhookSignatureHeader.split(" ").map((s) => s.trim()).filter(Boolean);
  let signatureValid = false;
  for (const entry of providedSignatures) {
    const commaIndex = entry.indexOf(",");
    if (commaIndex === -1) continue;
    const version = entry.slice(0, commaIndex);
    const sigValue = entry.slice(commaIndex + 1);
    if (version === "v1" && sigValue.length === expectedSigBase64.length && timingSafeEqual(sigValue, expectedSigBase64)) {
      signatureValid = true;
      break;
    }
  }
  if (!signatureValid) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    return new Response("Invalid JSON", { status: 400 });
  }

  // DEBUG (temporary) — once you confirm the real field names from
  // this log in Cloudflare Observability, remove this line.
  console.log("Whop webhook verified payload (DEBUG, remove after confirming field names):", rawBody);

  // Whop's event-type field name — check the common variants
  // defensively until confirmed from a real payload (see DEBUG log).
  const eventType = payload.type || payload.action || payload.event;

  const data = payload.data || {};

  if (eventType !== "payment.succeeded") {
    // Acknowledge so Whop/Svix doesn't retry — we simply don't act on it.
    return new Response("Ignored (not payment.succeeded)", { status: 200 });
  }

  const paymentId = data.id;
  const amount = data.settlement_amount ?? data.amount;
  const currency = data.currency;
  const buyerEmail = data.email || data.user_email || (data.customer && data.customer.email);

  if (!paymentId || amount == null || !currency) {
    return new Response("Missing required payment fields (id/settlement_amount/currency)", { status: 400 });
  }

  const kvKey = `processed:${paymentId}`;
  const alreadyProcessed = await env.WHOP_PURCHASES.get(kvKey);
  if (alreadyProcessed) {
    return new Response("Already processed", { status: 200 });
  }

  const userData = {};
  if (buyerEmail) {
    const normalizedEmail = String(buyerEmail).trim().toLowerCase();
    userData.em = [await sha256Hex(normalizedEmail)];
  }

  const capiPayload = {
    data: [
      {
        event_name: "Purchase",
        event_time: tsSeconds, // Svix's own webhook-timestamp — authoritative, already validated above
        event_id: String(paymentId),
        action_source: "website",
        user_data: userData,
        custom_data: {
          value: Number(amount),
          currency: String(currency).toUpperCase(),
        },
      },
    ],
  };

  // Test-event tagging — two sources, in priority order:
  //  1. payload.test_event_code — only present when testing manually
  //     via docs/test-webhook.js; a real Whop payload never sends this.
  //  2. env.META_TEST_EVENT_CODE — an OPTIONAL Cloudflare variable you
  //     can set temporarily while doing real Whop sandbox purchases,
  //     so those real webhook calls also show up under Events Manager
  //     → "Probar eventos" instead of mixing into real Purchase data.
  //     Delete this variable once sandbox testing is done — leaving it
  //     set would silently divert every REAL future Purchase into test
  //     mode instead of counting it for real.
  const testEventCode = payload.test_event_code || env.META_TEST_EVENT_CODE;
  if (testEventCode) {
    capiPayload.test_event_code = String(testEventCode);
  }

  const datasetId = env.META_DATASET_ID || DEFAULT_META_DATASET_ID;
  const metaUrl = `https://graph.facebook.com/${META_GRAPH_VERSION}/${datasetId}/events?access_token=${encodeURIComponent(env.META_ACCESS_TOKEN)}`;

  let metaResponse;
  try {
    metaResponse = await fetch(metaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(capiPayload),
    });
  } catch (err) {
    console.error("Meta CAPI request threw:", err);
    // Return 5xx so Whop retries the webhook later — nothing was marked processed.
    return new Response("Meta CAPI request failed", { status: 502 });
  }

  if (!metaResponse.ok) {
    const errorText = await metaResponse.text();
    console.error("Meta CAPI error:", metaResponse.status, errorText);
    // Do NOT mark as processed — allow Whop to retry the webhook.
    return new Response("Meta CAPI error", { status: 502 });
  }

  // Only mark as processed after Meta confirms success.
  await env.WHOP_PURCHASES.put(kvKey, JSON.stringify({ processedAt: Date.now(), paymentId }), {
    expirationTtl: 60 * 60 * 24 * 90, // 90 days — plenty for dedup purposes
  });

  return new Response("OK", { status: 200 });
}
