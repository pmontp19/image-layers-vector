"use client";

import JSZip from "jszip";
import type { Layer } from "./types";
import { fetchViaProxy, fetchSvgText } from "./workflow";

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

export async function downloadSvg(layer: Layer) {
  if (!layer.svgUrl) return;
  const text = layer.svgText ?? (await fetchSvgText(layer.svgUrl));
  triggerDownload(new Blob([text], { type: "image/svg+xml" }), `${layer.name}.svg`);
}

export async function downloadPng(layer: Layer) {
  const res = await fetchViaProxy(layer.rasterUrl);
  const blob = await res.blob();
  triggerDownload(blob, `${layer.name}.png`);
}

/** Bundle every vectorized layer's SVG (plus PNGs) into one ZIP. */
export async function downloadAllSvgs(layers: Layer[]) {
  const zip = new JSZip();
  const svgFolder = zip.folder("svg");
  const pngFolder = zip.folder("png");

  for (const layer of layers) {
    const png = await (await fetchViaProxy(layer.rasterUrl)).blob();
    pngFolder?.file(`${layer.name}.png`, png);

    if (layer.svgUrl) {
      const text = layer.svgText ?? (await fetchSvgText(layer.svgUrl));
      svgFolder?.file(`${layer.name}.svg`, text);
    }
  }

  const blob = await zip.generateAsync({ type: "blob" });
  triggerDownload(blob, "image-layers.zip");
}
