// GardenTools — Worker entry point.
//
// This project is deployed as a Cloudflare Worker with static assets
// (not Cloudflare Pages), so there is no automatic file-based routing
// for a `functions/` folder. This script is the manual equivalent:
// one route (/api/webhooks/whop) runs real code, everything else
// falls through to the static site exactly as before.

import { handleWhopWebhook } from "./functions/api/webhooks/whop.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/webhooks/whop") {
      return handleWhopWebhook(request, env, ctx);
    }

    // Everything else: serve the static site unchanged.
    return env.ASSETS.fetch(request);
  },
};
