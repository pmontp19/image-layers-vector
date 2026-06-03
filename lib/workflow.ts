"use client";

import { fal } from "./fal";
import type { FalImage, RecraftStyle } from "./types";

type LogFn = (message: string) => void;

function pipeLogs(onLog?: LogFn) {
  return (update: { status: string; logs?: { message: string }[] }) => {
    if (!onLog) return;
    if (update.status === "IN_PROGRESS" && update.logs) {
      update.logs.forEach((l) => l?.message && onLog(l.message));
    }
  };
}

/**
 * Optional step 0: generate a flat illustration from a text prompt with
 * Recraft V3. `vector_illustration` styles produce clean, flat artwork that
 * decomposes and vectorizes nicely.
 * Docs: https://fal.ai/models/fal-ai/recraft/v3/text-to-image/api
 */
export async function generateImage(
  prompt: string,
  style: RecraftStyle,
  onLog?: LogFn,
): Promise<FalImage> {
  const res = await fal.subscribe("fal-ai/recraft/v3/text-to-image", {
    input: {
      prompt,
      style,
      image_size: "square_hd",
    },
    logs: true,
    onQueueUpdate: pipeLogs(onLog),
  });
  const image = (res.data as { images: FalImage[] }).images?.[0];
  if (!image?.url) throw new Error("Recraft did not return an image");
  return image;
}

/** Upload a local file to fal storage and return a public URL. */
export async function uploadImage(file: File): Promise<string> {
  return fal.storage.upload(file);
}

/**
 * Step 1: decompose a raster image into N transparent RGBA layers with
 * Qwen-Image-Layered.
 * Docs: https://fal.ai/models/fal-ai/qwen-image-layered/api
 */
export async function decomposeImage(
  imageUrl: string,
  opts: { numLayers: number; prompt?: string },
  onLog?: LogFn,
): Promise<FalImage[]> {
  const res = await fal.subscribe("fal-ai/qwen-image-layered", {
    input: {
      image_url: imageUrl,
      num_layers: opts.numLayers,
      prompt: opts.prompt || undefined,
      output_format: "png",
    },
    logs: true,
    onQueueUpdate: pipeLogs(onLog),
  });
  const images = (res.data as { images: FalImage[] }).images ?? [];
  if (images.length === 0) throw new Error("No layers returned by Qwen-Image-Layered");
  return images;
}

/**
 * Step 2: vectorize a single raster layer into an SVG with Recraft.
 * Docs: https://fal.ai/models/fal-ai/recraft/vectorize/api
 * Returns the URL of the produced SVG.
 */
export async function vectorizeLayer(imageUrl: string, onLog?: LogFn): Promise<string> {
  const res = await fal.subscribe("fal-ai/recraft/vectorize", {
    input: { image_url: imageUrl },
    logs: true,
    onQueueUpdate: pipeLogs(onLog),
  });
  const svgUrl = (res.data as { image: FalImage }).image?.url;
  if (!svgUrl) throw new Error("Vectorizer did not return an SVG");
  return svgUrl;
}

/** Fetch an asset's raw text/bytes through our server download proxy (CORS-safe). */
export async function fetchViaProxy(url: string): Promise<Response> {
  return fetch(`/api/download?url=${encodeURIComponent(url)}`);
}

export async function fetchSvgText(url: string): Promise<string> {
  const res = await fetchViaProxy(url);
  if (!res.ok) throw new Error(`Failed to fetch SVG (${res.status})`);
  return res.text();
}
