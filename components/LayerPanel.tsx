"use client";

import type { Layer } from "@/lib/types";
import { downloadSvg, downloadPng, downloadAllSvgs } from "@/lib/zip";

function StatusBadge({ layer }: { layer: Layer }) {
  switch (layer.status) {
    case "vectorized":
      return <span className="badge vectorized">● SVG</span>;
    case "vectorizing":
      return (
        <span className="badge vectorizing">
          <span className="spinner" style={{ width: 9, height: 9 }} /> vectorizing
        </span>
      );
    case "error":
      return <span className="badge error">● error</span>;
    default:
      return <span className="badge raster">● raster</span>;
  }
}

export function LayerPanel({
  layers,
  onToggle,
  onVectorizeOne,
  busy,
}: {
  layers: Layer[];
  onToggle: (id: string) => void;
  onVectorizeOne: (id: string) => void;
  busy: boolean;
}) {
  const anyVector = layers.some((l) => l.svgUrl);

  if (layers.length === 0) {
    return (
      <div className="empty-note">
        No layers yet.
        <br />
        Run the pipeline to decompose your image.
      </div>
    );
  }

  return (
    <div>
      <div className="row between" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Layers ({layers.length})</h2>
        <button
          className="btn small"
          disabled={busy}
          onClick={() => downloadAllSvgs(layers)}
          title="Download all layers as a ZIP (SVG + PNG)"
        >
          ⬇ ZIP
        </button>
      </div>

      {/* render top layer first in the list (reverse of stack order) */}
      {[...layers].reverse().map((layer) => (
        <div
          key={layer.id}
          className={`layer-item${layer.visible ? "" : " hidden-layer"}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="lthumb" src={layer.rasterUrl} alt={layer.name} />
          <div className="lmeta">
            <div className="row between">
              <span className="lname">{layer.name}</span>
              <StatusBadge layer={layer} />
            </div>
            {layer.error ? (
              <div className="hint" style={{ color: "var(--bad)" }}>
                {layer.error}
              </div>
            ) : null}
            <div className="lactions">
              <button
                className="btn small ghost"
                onClick={() => onToggle(layer.id)}
                title="Toggle visibility"
              >
                {layer.visible ? "👁 Hide" : "🚫 Show"}
              </button>
              {layer.svgUrl ? (
                <button className="btn small" onClick={() => downloadSvg(layer)}>
                  SVG
                </button>
              ) : (
                <button
                  className="btn small"
                  disabled={busy || layer.status === "vectorizing"}
                  onClick={() => onVectorizeOne(layer.id)}
                >
                  Vectorize
                </button>
              )}
              <button className="btn small ghost" onClick={() => downloadPng(layer)}>
                PNG
              </button>
            </div>
          </div>
        </div>
      ))}

      {anyVector ? (
        <p className="hint" style={{ marginTop: 10 }}>
          Tip: import the SVGs directly into Cricut Design Space — each layer
          becomes its own cut path.
        </p>
      ) : null}
    </div>
  );
}
