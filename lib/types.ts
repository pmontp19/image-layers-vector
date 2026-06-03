// Shape of a single image asset as returned by fal models.
export interface FalImage {
  url: string;
  content_type?: string;
  file_name?: string;
  file_size?: number;
  width?: number;
  height?: number;
}

export type LayerStatus = "raster" | "vectorizing" | "vectorized" | "error";

// One decomposed layer as we track it in the UI. Starts as a raster PNG and
// optionally gains a vectorized SVG.
export interface Layer {
  id: string;
  index: number;
  name: string;
  rasterUrl: string;
  width: number;
  height: number;
  visible: boolean;
  status: LayerStatus;
  svgUrl?: string;
  svgText?: string;
  error?: string;
}

export type ViewMode = "raster" | "vector";

export type Stage =
  | "idle"
  | "generating"
  | "uploading"
  | "decomposing"
  | "decomposed"
  | "vectorizing"
  | "done"
  | "error";

// Recraft V3 styles. Kept to the top-level presets that are guaranteed to
// exist in the fal client's typed union, and that make sense for flat /
// cuttable artwork.
export type RecraftStyle =
  | "vector_illustration"
  | "digital_illustration"
  | "realistic_image";

export interface GenerateStyle {
  id: RecraftStyle;
  label: string;
}
