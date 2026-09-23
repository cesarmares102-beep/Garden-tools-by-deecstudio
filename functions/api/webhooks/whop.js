// GardenTools — Whop webhook → Meta Conversions API (Purchase).
//
// ⚠️ VERIFY BEFORE GOING LIVE — two things in here are best-effort,
// not confirmed against a real Whop webhook delivery, because none
// was available while writing this:
//
//   1. SIGNATURE_HEADER below assumes Whop signs webhooks with an
//      HMAC-SHA256 hex digest of the raw body in a header named
//      "X-Whop-Signature". Confirm the real header name in your Whop
//      dashboard's webhook settings (or by inspecting one real
//      delivery's headers) before trusting this in production. If
//      it's different, only this one constant needs to change.
//
//   2. EVENT_TYPE_FIELD / EVENT_TYPE_VALUE and the field names read
//      off `data` (id / settlement_amount / currency / email) are
//      written from the field names you specified in the brief. Cross
//      -check them against one real payment.succeeded payload (Whop's
//      dashboard lets you resend/inspect past webhook deliveries)
//      before relying on this for real purchases — if a field name is
//      off, the webhook will reject the event instead of silently
//      using a wrong value (see the "Missing required payment fields"
//      check below), so a mismatch fails safe, but won't fire Purchase.

const SIGNATURE_HEADER = "x-whop-signature";
const MAX_TIMESTAMP_SKEW_SECONDS = 5 * 60; // reject events older/newer than 5 minutes
const META_GRAPH_VERSION = "v21.0"; // confirm this is still a supported version when you deploy
const DEFAULT_META_DATASET_ID = "1118290030539871"; // fallback if env.META_DATASET_ID isn't set

async function hmacSha256Hex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return bufferToHex(mac);
}

async function sha256Hex(message) {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(message));
  return bufferToHex(digest);
}

function bufferToHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Constant-time-ish string compare — avoids leaking how many leading
// characters of the signature matched via response-time differences.
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
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

  // Raw body first — signature verification MUST run against the
  // exact bytes Whop signed, before any JSON parsing.
  const rawBody = await request.text();
  const receivedSignature = (request.headers.get(SIGNATURE_HEADER) || "").trim().toLowerCase();

  if (!receivedSignature) {
    return new Response("Missing signature", { status: 401 });
  }

  const expectedSignature = await hmacSha256Hex(env.WHOP_WEBHOOK_SECRET, rawBody);
  if (!timingSafeEqual(expectedSignature, receivedSignature)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    return new Response("Invalid JSON", { status: 400 });
  }

  // Whop's event-type field name varies by integration style in
  // different docs versions — check the common variants defensively.
  const eventType = payload.type || payload.action || payload.event;

  const data = payload.data || {};

  // Timestamp freshness check. Whop payloads generally carry a
  // creation time on the event or on data — check both.
  const rawTimestamp = payload.created_at ?? payload.timestamp ?? data.created_at;
  if (rawTimestamp != null) {
    const eventSeconds = typeof rawTimestamp === "number"
      ? (rawTimestamp > 1e12 ? rawTimestamp / 1000 : rawTimestamp) // accept ms or s
      : Date.parse(rawTimestamp) / 1000;
    const nowSeconds = Date.now() / 1000;
    if (!Number.isFinite(eventSeconds) || Math.abs(nowSeconds - eventSeconds) > MAX_TIMESTAMP_SKEW_SECONDS) {
      return new Response("Timestamp outside allowed window", { status: 400 });
    }
  }

  if (eventType !== "payment.succeeded") {
    // Acknowledge so Whop doesn't retry — we simply don't act on it.
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

  const eventTimeUnix = rawTimestamp != null
    ? Math.floor(typeof rawTimestamp === "number" ? (rawTimestamp > 1e12 ? rawTimestamp / 1000 : rawTimestamp) : Date.parse(rawTimestamp) / 1000)
    : Math.floor(Date.now() / 1000);

  const userData = {};
  if (buyerEmail) {
    const normalizedEmail = String(buyerEmail).trim().toLowerCase();
    userData.em = [await sha256Hex(normalizedEmail)];
  }

  const capiPayload = {
    data: [
      {
        event_name: "Purchase",
        event_time: eventTimeUnix,
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
