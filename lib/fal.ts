"use client";

import { fal } from "@fal-ai/client";

// Route every fal call through our Next.js proxy so the FAL_KEY stays
// server-side. This must run before any fal.subscribe / fal.storage call.
fal.config({
  proxyUrl: "/api/fal/proxy",
});

export { fal };
