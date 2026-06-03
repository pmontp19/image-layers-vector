// Client-side SVG utilities for Cricut-friendly output.
// These use the browser DOMParser / XMLSerializer, so call them only in the
// browser (they run from user event handlers, never on the server).

const SVG_NS = "http://www.w3.org/2000/svg";
const INKSCAPE_NS = "http://www.inkscape.org/namespaces/inkscape";

// Elements & attributes that Cricut Design Space chokes on (it rasterizes or
// silently drops filters, clip-paths and masks).
const STRIP_ELEMENTS = ["filter", "clipPath", "mask"];
const STRIP_ATTRS = ["filter", "clip-path", "mask"];

function parseSvg(svgText: string): SVGSVGElement | null {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  if (doc.getElementsByTagName("parsererror").length > 0) return null;
  const root = doc.documentElement;
  if (!root || root.nodeName.toLowerCase() !== "svg") return null;
  return root as unknown as SVGSVGElement;
}

export interface SvgDims {
  width: number;
  height: number;
}

export function getSvgDims(root: Element): SvgDims {
  let width = parseFloat(root.getAttribute("width") ?? "");
  let height = parseFloat(root.getAttribute("height") ?? "");
  const vb = root.getAttribute("viewBox");
  if (vb) {
    const parts = vb.split(/[\s,]+/).map(Number);
    if (parts.length === 4) {
      if (!width || Number.isNaN(width)) width = parts[2];
      if (!height || Number.isNaN(height)) height = parts[3];
    }
  }
  return {
    width: Number.isNaN(width) ? 0 : width,
    height: Number.isNaN(height) ? 0 : height,
  };
}

/**
 * Strip Cricut-incompatible constructs from an SVG. Optionally flatten every
 * painted shape to a single solid color (ideal for one-color-per-layer cut
 * files). Falls back to the original string if the SVG can't be parsed.
 */
export function cleanSvgForCricut(svgText: string, opts: { color?: string } = {}): string {
  const root = parseSvg(svgText);
  if (!root) return svgText;

  STRIP_ELEMENTS.forEach((tag) =>
    root.querySelectorAll(tag).forEach((el) => el.remove()),
  );

  root.querySelectorAll("*").forEach((el) => {
    STRIP_ATTRS.forEach((a) => el.removeAttribute(a));

    if (opts.color) {
      if (el.getAttribute("fill") !== "none" && el.hasAttribute("fill")) {
        el.setAttribute("fill", opts.color);
      }
      if (el.getAttribute("stroke") !== "none" && el.hasAttribute("stroke")) {
        el.setAttribute("stroke", opts.color);
      }
      // kill leftover gradient/pattern references
      const fill = el.getAttribute("fill");
      if (fill && fill.startsWith("url(")) el.setAttribute("fill", opts.color);
    }
  });

  // When flattening to one color, gradient/pattern defs are now dead weight.
  if (opts.color) {
    root
      .querySelectorAll("linearGradient,radialGradient,pattern")
      .forEach((el) => el.remove());
  }

  root.setAttribute("xmlns", SVG_NS);
  return new XMLSerializer().serializeToString(root);
}

export interface CombineLayer {
  name: string;
  svgText: string;
  color?: string;
}

/**
 * Merge per-layer SVGs into a single SVG, one named <g> per layer (bottom of
 * the stack first), so the whole artwork imports as grouped, individually
 * selectable cut paths. Assumes layers share the same coordinate system
 * (true for Qwen-Image-Layered output — every layer is the full canvas size).
 */
export function combineLayersToSvg(
  layers: CombineLayer[],
  opts: { cricut?: boolean; monochrome?: boolean } = {},
): string {
  const serializer = new XMLSerializer();
  let masterW = 0;
  let masterH = 0;
  const groups: string[] = [];

  for (const layer of layers) {
    const text = opts.cricut
      ? cleanSvgForCricut(layer.svgText, opts.monochrome ? { color: layer.color } : {})
      : layer.svgText;
    const root = parseSvg(text);
    if (!root) continue;

    const dims = getSvgDims(root);
    masterW = Math.max(masterW, dims.width);
    masterH = Math.max(masterH, dims.height);

    const inner = Array.from(root.childNodes)
      .map((n) => serializer.serializeToString(n))
      .join("");
    const safe = layer.name.replace(/[^a-zA-Z0-9_-]/g, "_");
    groups.push(`<g id="${safe}" inkscape:label="${safe}" data-layer="${safe}">${inner}</g>`);
  }

  const w = masterW || 1024;
  const h = masterH || 1024;
  return (
    `<svg xmlns="${SVG_NS}" xmlns:inkscape="${INKSCAPE_NS}" ` +
    `width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n` +
    groups.join("\n") +
    `\n</svg>\n`
  );
}
