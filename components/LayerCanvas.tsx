"use client";

import type { Layer, ViewMode } from "@/lib/types";

// The "stage": every visible layer rendered absolutely on top of each other,
// reconstructing the original image. Layer 1 is the bottom of the stack.
export function LayerCanvas({
  layers,
  viewMode,
  sourcePreview,
}: {
  layers: Layer[];
  viewMode: ViewMode;
  sourcePreview: string | null;
}) {
  if (layers.length === 0) {
    return (
      <div className="stage">
        <div className="stage-empty">
          {sourcePreview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sourcePreview}
                alt="source"
                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
              />
            </>
          ) : (
            <div>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🪄</div>
              Your decomposed layers will appear here.
              <br />
              Add an image and run the pipeline.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="stage">
      {layers.map((layer) => {
        if (!layer.visible) return null;
        const showVector = viewMode === "vector" && layer.svgText;
        if (showVector) {
          return (
            <div
              key={layer.id}
              className="layer svg"
              dangerouslySetInnerHTML={{ __html: layer.svgText! }}
            />
          );
        }
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={layer.id} className="layer" src={layer.rasterUrl} alt={layer.name} />
        );
      })}
    </div>
  );
}
