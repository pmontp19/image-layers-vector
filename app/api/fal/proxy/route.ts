// fal.ai server proxy. The browser talks to /api/fal/proxy and this route
// forwards the request to fal.run using the server-side FAL_KEY, so the key
// is never exposed to the client.
//
// Docs: https://docs.fal.ai/model-apis/integrations/nextjs
import { createRouteHandler } from "@fal-ai/server-proxy/nextjs";

export const { GET, POST, PUT } = createRouteHandler();

// fal requests (image decomposition can be slow) may run longer than the
// default. Allow up to 5 minutes when deployed on a platform that honours it.
export const maxDuration = 300;
