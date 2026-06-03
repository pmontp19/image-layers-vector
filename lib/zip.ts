"use client";

import JSZip from "jszip";
import type { Layer } from "./types";
import { fetchViaProxy, fetchSvgText } from "./workflow";
import { cleanSvgForCricut, combineLayersToSvg, type CombineLayer } from "./svg";

export interface ExportOpts {
  /** Strip Cricut-incompatible constructs (filters, clip-paths, masks). */
  cricut?: boolean;
  /** Flatten each layer to its single cut color. Implies cricut. */
  monochrome?: boolean;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function getLayerSvg(layer: Layer): Promise<string | null> {
  if (layer.svgText) return layer.svgText;
  if (layer.svgUrl) return fetchSvgText(layer.svgUrl);
  return null;
}

export async function downloadSvg(layer: Layer, opts: ExportOpts = {}) {
  const text = await getLayerSvg(layer);
  if (!text) return;
  const out =
    opts.cricut || opts.monochrome
      ? cleanSvgForCricut(text, opts.monochrome ? { color: layer.color } : {})
      : text;
  triggerDownload(new Blob([out], { type: "image/svg+xml" }), `${layer.name}.svg`);
}

export async function downloadPng(layer: Layer) {
  const res = await fetchViaProxy(layer.rasterUrl);
  const blob = await res.blob();
  triggerDownload(blob, `${layer.name}.png`);
}

/** Stitch every vectorized layer into one multi-layer SVG and download it. */
export async function downloadCombinedSvg(layers: Layer[], opts: ExportOpts = {}) {
  const combine: CombineLayer[] = [];
  for (const layer of layers) {
    const text = await getLayerSvg(layer);
    if (text) combine.push({ name: layer.name, svgText: text, color: layer.color });
  }
  if (combine.length === 0) return;
  const svg = combineLayersToSvg(combine, opts);
  triggerDownload(new Blob([svg], { type: "image/svg+xml" }), "image-layers-combined.svg");
}

/** Bundle per-layer SVG + PNG and a combined.svg into one ZIP. */
export async function downloadAllSvgs(layers: Layer[], opts: ExportOpts = {}) {
  const zip = new JSZip();
  const svgFolder = zip.folder("svg");
  const pngFolder = zip.folder("png");
  const combine: CombineLayer[] = [];

  for (const layer of layers) {
    const png = await (await fetchViaProxy(layer.rasterUrl)).blob();
    pngFolder?.file(`${layer.name}.png`, png);

    const text = await getLayerSvg(layer);
    if (text) {
      const out =
        opts.cricut || opts.monochrome
          ? cleanSvgForCricut(text, opts.monochrome ? { color: layer.color } : {})
          : text;
      svgFolder?.file(`${layer.name}.svg`, out);
      combine.push({ name: layer.name, svgText: text, color: layer.color });
    }
  }

  if (combine.length > 0) {
    zip.file("combined.svg", combineLayersToSvg(combine, opts));
  }

  const blob = await zip.generateAsync({ type: "blob" });
  triggerDownload(blob, "image-layers.zip");
}
