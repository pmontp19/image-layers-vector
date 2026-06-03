"use client";

import { useState } from "react";
import type { Layer } from "@/lib/types";
import { downloadSvg, downloadPng } from "@/lib/zip";

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
  onReorder,
  onRecolor,
  busy,
}: {
  layers: Layer[];
  onToggle: (id: string) => void;
  onVectorizeOne: (id: string) => void;
  onReorder: (fromId: string, toId: string) => void;
  onRecolor: (id: string, color: string) => void;
  busy: boolean;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

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
      <div className="row between" style={{ marginBottom: 6 }}>
        <h2 style={{ margin: 0 }}>Layers ({layers.length})</h2>
      </div>
      <p className="hint" style={{ marginTop: 0, marginBottom: 12 }}>
        Top of the stack first. Drag to reorder · pick a cut color per layer.
      </p>

      {/* render top layer first (reverse of stack order) */}
      {[...layers].reverse().map((layer) => (
        <div
          key={layer.id}
          draggable={!busy}
          onDragStart={() => setDragId(layer.id)}
          onDragEnd={() => {
            setDragId(null);
            setOverId(null);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (layer.id !== overId) setOverId(layer.id);
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (dragId && dragId !== layer.id) onReorder(dragId, layer.id);
            setDragId(null);
            setOverId(null);
          }}
          className={
            `layer-item${layer.visible ? "" : " hidden-layer"}` +
            `${overId === layer.id && dragId && dragId !== layer.id ? " drop-target" : ""}` +
            `${dragId === layer.id ? " dragging" : ""}`
          }
        >
          <span className="drag-handle" title="Drag to reorder">
            ⠿
          </span>
          <label className="swatch" title="Cut color" style={{ background: layer.color }}>
            <input
              type="color"
              value={layer.color}
              onChange={(e) => onRecolor(layer.id, e.target.value)}
            />
          </label>
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
                <button
                  className="btn small"
                  onClick={() => downloadSvg(layer)}
                  title="Download this layer's raw SVG"
                >
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
    </div>
  );
}
