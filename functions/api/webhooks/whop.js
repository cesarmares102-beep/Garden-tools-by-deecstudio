// GardenTools — Whop webhook → Meta Conversions API (Purchase).
//
// Confirmed against a real Whop sandbox delivery (2026-09-23):
//
// Signature (Svix-style headers, Whop-specific key handling):
//   headers: webhook-id, webhook-timestamp, webhook-signature
//   signed content = `${webhook-id}.${webhook-timestamp}.${rawBody}`
//   key = the WHOP_WEBHOOK_SECRET string AS-IS (raw UTF-8 bytes,
//         including its "ws_" prefix — NOT stripped, NOT base64-decoded;
//         this is Whop's own convention, not standard Svix "whsec_")
//   signature = base64(HMAC-SHA256(keyBytes, signedContent))
//   webhook-signature header can hold multiple space-separated
//   "v1,<base64sig>" values (key rotation) — a match on any one is valid.
//
// Payload shape (payment.succeeded), fields actually used here:
//   payload.type              → "payment.succeeded"
//   payload.data.id           → "pay_..."      (Purchase event_id)
//   payload.data.settlement_amount → number    (Purchase value)
//   payload.data.currency     → "usd" etc.     (Purchase currency, uppercased)
//   payload.data.user.email   → buyer's email  (hashed into user_data.em)

const MAX_TIMESTAMP_SKEW_SECONDS = 5 * 60; // Svix's own recommended tolerance
const META_GRAPH_VERSION = "v21.0"; // confirm this is still a supported version when you deploy
const DEFAULT_META_DATASET_ID = "1118290030539871"; // fallback if env.META_DATASET_ID isn't set

function bytesToBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function sha256Hex(message) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(message));
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

async function computeWhopSignatureBase64(secret, webhookId, webhookTimestamp, rawBody) {
  const keyBytes = new TextEncoder().encode(secret); // full secret, incl. "ws_" prefix, as raw bytes
  const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`;
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
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

  // Timestamp freshness — check before doing any HMAC work.
  const tsSeconds = parseInt(webhookTimestamp, 10);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(tsSeconds) || Math.abs(nowSeconds - tsSeconds) > MAX_TIMESTAMP_SKEW_SECONDS) {
    return new Response("Timestamp outside allowed window", { status: 400 });
  }

  // Raw body — signature verification MUST run against the exact
  // bytes Whop signed, before any JSON parsing.
  const rawBody = await request.text();
  const expectedSigBase64 = await computeWhopSignatureBase64(env.WHOP_WEBHOOK_SECRET, webhookId, webhookTimestamp, rawBody);

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

  if (payload.type !== "payment.succeeded") {
    // Acknowledge so Whop doesn't retry — we simply don't act on it.
    return new Response("Ignored (not payment.succeeded)", { status: 200 });
  }

  const data = payload.data || {};
  const paymentId = data.id;
  const amount = data.settlement_amount;
  const currency = data.currency;
  const buyerEmail = data.user && data.user.email;

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
    userData.em = [await sha256Hex(String(buyerEmail).trim().toLowerCase())];
  }

  const capiPayload = {
    data: [
      {
        event_name: "Purchase",
        event_time: tsSeconds, // Whop's own webhook-timestamp — authoritative, already validated above
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

  // Test-event tagging — TEMPORARY, for the Whop sandbox testing
  // period only. env.META_TEST_EVENT_CODE (set on the Cloudflare
  // dashboard) makes real sandbox purchases show up under Events
  // Manager → "Probar eventos" instead of mixing into real event
  // data. DELETE that Cloudflare variable once sandbox testing is
  // done — leaving it set would divert every real future Purchase
  // into test mode instead of counting it for real.
  if (env.META_TEST_EVENT_CODE) {
    capiPayload.test_event_code = String(env.META_TEST_EVENT_CODE);
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
