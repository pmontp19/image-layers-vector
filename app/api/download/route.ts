import { NextRequest, NextResponse } from "next/server";

// Small server-side download proxy. We fetch fal.media assets here (instead of
// from the browser) so that bundling SVGs into a ZIP and reading SVG markup
// inline never trips over CORS. Only fal.media URLs are allowed.
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing 'url' query param" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const allowed = parsed.protocol === "https:" && /(^|\.)fal\.media$/.test(parsed.hostname);
  if (!allowed) {
    return NextResponse.json({ error: "URL host not allowed" }, { status: 403 });
  }

  const upstream = await fetch(parsed.toString());
  if (!upstream.ok) {
    return NextResponse.json(
      { error: `Upstream responded ${upstream.status}` },
      { status: 502 },
    );
  }

  const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
  const body = await upstream.arrayBuffer();

  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=3600",
    },
  });
}
