"use client";

import { useState, useCallback } from "react";
import type { Layer, Stage, ViewMode, RecraftStyle, GenerateStyle } from "@/lib/types";
import {
  uploadImage,
  generateImage,
  decomposeImage,
  vectorizeLayer,
  fetchSvgText,
} from "@/lib/workflow";
import { downloadAllSvgs } from "@/lib/zip";
import { Dropzone } from "./Dropzone";
import { LayerCanvas } from "./LayerCanvas";
import { LayerPanel } from "./LayerPanel";

const GEN_STYLES: GenerateStyle[] = [
  { id: "vector_illustration", label: "Vector illustration (flat)" },
  { id: "digital_illustration", label: "Digital illustration" },
  { id: "realistic_image", label: "Realistic photo" },
];

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

export function Playground() {
  const [mode, setMode] = useState<"upload" | "generate">("upload");

  // source
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [remoteUrl, setRemoteUrl] = useState<string | null>(null);

  // generate controls
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<RecraftStyle>(GEN_STYLES[0].id);

  // decompose controls
  const [numLayers, setNumLayers] = useState(4);
  const [decomposePrompt, setDecomposePrompt] = useState("");
  const [autoVectorize, setAutoVectorize] = useState(true);

  // results
  const [layers, setLayers] = useState<Layer[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("raster");

  // status
  const [stage, setStage] = useState<Stage>("idle");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const busy = ["generating", "uploading", "decomposing", "vectorizing"].includes(stage);
  const addLog = useCallback((m: string) => setLogs((l) => [...l.slice(-60), m]), []);

  function updateLayer(id: string, patch: Partial<Layer>) {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function handleFile(file: File) {
    setUploadFile(file);
    setLocalPreview(URL.createObjectURL(file));
    setRemoteUrl(null);
    setLayers([]);
    setError(null);
    setStatus("");
    setStage("idle");
  }

  async function handleGenerate() {
    if (!prompt.trim()) {
      setError("Enter a prompt to generate an image.");
      return;
    }
    try {
      setError(null);
      setLogs([]);
      setStage("generating");
      setStatus("Generating image with Recraft V3…");
      const img = await generateImage(prompt, style, addLog);
      setRemoteUrl(img.url);
      setLocalPreview(img.url);
      setUploadFile(null);
      setLayers([]);
      setStage("idle");
      setStatus("Image generated. Run the pipeline to decompose it into layers.");
    } catch (e) {
      setError(errMsg(e));
      setStage("error");
      setStatus("");
    }
  }

  async function vectorizeLayers(list: Layer[]) {
    setStage("vectorizing");
    setViewMode("vector");
    for (const layer of list) {
      if (layer.svgUrl) continue;
      updateLayer(layer.id, { status: "vectorizing" });
      setStatus(`Vectorizing ${layer.name}…`);
      try {
        const svgUrl = await vectorizeLayer(layer.rasterUrl, addLog);
        const svgText = await fetchSvgText(svgUrl);
        updateLayer(layer.id, { svgUrl, svgText, status: "vectorized" });
      } catch (e) {
        updateLayer(layer.id, { status: "error", error: errMsg(e) });
      }
    }
  }

  async function runPipeline() {
    try {
      setError(null);
      let imageUrl = remoteUrl;

      if (mode === "upload") {
        if (!uploadFile && !imageUrl) {
          setError("Add an image first.");
          return;
        }
        if (uploadFile) {
          setStage("uploading");
          setStatus("Uploading image to fal storage…");
          imageUrl = await uploadImage(uploadFile);
          setRemoteUrl(imageUrl);
        }
      } else if (!imageUrl) {
        setError("Generate an image first.");
        return;
      }

      setLogs([]);
      setStage("decomposing");
      setStatus(`Decomposing into ${numLayers} layers with Qwen-Image-Layered…`);
      const images = await decomposeImage(
        imageUrl!,
        { numLayers, prompt: decomposePrompt },
        addLog,
      );

      const newLayers: Layer[] = images.map((img, i) => ({
        id: `layer-${Date.now()}-${i}`,
        index: i,
        name: `layer-${String(i + 1).padStart(2, "0")}`,
        rasterUrl: img.url,
        width: img.width ?? 0,
        height: img.height ?? 0,
        visible: true,
        status: "raster",
      }));
      setLayers(newLayers);
      setViewMode("raster");
      setStage("decomposed");
      setStatus(`${newLayers.length} layers ready.`);

      if (autoVectorize) {
        await vectorizeLayers(newLayers);
      }
      setStage("done");
      setStatus("Done. Toggle layers, switch raster/vector, and export.");
    } catch (e) {
      setError(errMsg(e));
      setStage("error");
      setStatus("");
    }
  }

  function vectorizeOne(id: string) {
    const layer = layers.find((l) => l.id === id);
    if (layer) vectorizeLayers([layer]).then(() => setStage("done"));
  }

  const hasSource = Boolean(localPreview);
  const stageLabels: Record<Stage, string> = {
    idle: "Idle",
    generating: "Generating",
    uploading: "Uploading",
    decomposing: "Decomposing",
    decomposed: "Decomposed",
    vectorizing: "Vectorizing",
    done: "Done",
    error: "Error",
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="logo">🪄</div>
          <div>
            <h1>Image → Layers → Vector</h1>
            <p>Magic-layers MVP · Qwen-Image-Layered + Recraft Vectorize on fal.ai</p>
          </div>
        </div>
        <div className="pipeline">
          <span className="chip">{mode === "generate" ? "Recraft V3" : "Upload"}</span>
          <span>→</span>
          <span className="chip">Qwen-Image-Layered</span>
          <span>→</span>
          <span className="chip">Recraft Vectorize</span>
          <span>→</span>
          <span className="chip">SVG layers</span>
        </div>
      </header>

      <div className="layout">
        {/* ---------------- LEFT: controls ---------------- */}
        <aside className="col left">
          <div className="section">
            <div className="tabs">
              <button
                className={`tab${mode === "upload" ? " active" : ""}`}
                onClick={() => setMode("upload")}
              >
                Upload
              </button>
              <button
                className={`tab${mode === "generate" ? " active" : ""}`}
                onClick={() => setMode("generate")}
              >
                Generate
              </button>
            </div>

            {mode === "upload" ? (
              <Dropzone previewUrl={localPreview} onFile={handleFile} disabled={busy} />
            ) : (
              <>
                <div className="field">
                  <label>Prompt</label>
                  <textarea
                    placeholder="A flat illustration of a fox sitting under a pine tree, bold shapes, few colors"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Style</label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value as RecraftStyle)}
                  >
                    {GEN_STYLES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  className="btn block"
                  onClick={handleGenerate}
                  disabled={busy}
                >
                  {stage === "generating" ? (
                    <>
                      <span className="spinner" /> Generating…
                    </>
                  ) : (
                    "✨ Generate image"
                  )}
                </button>
                {localPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={localPreview}
                    alt="generated"
                    style={{
                      width: "100%",
                      borderRadius: 8,
                      marginTop: 12,
                      border: "1px solid var(--border)",
                    }}
                  />
                ) : null}
              </>
            )}
          </div>

          <div className="section">
            <h2>Decompose</h2>
            <div className="field">
              <div className="row between">
                <label style={{ margin: 0 }}>Layers</label>
                <strong>{numLayers}</strong>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={numLayers}
                onChange={(e) => setNumLayers(Number(e.target.value))}
                disabled={busy}
              />
            </div>
            <div className="field">
              <label>Guidance prompt (optional)</label>
              <input
                type="text"
                placeholder="e.g. separate background, character, text"
                value={decomposePrompt}
                onChange={(e) => setDecomposePrompt(e.target.value)}
              />
            </div>
            <label className="row" style={{ gap: 8, fontSize: 13, color: "var(--text)" }}>
              <input
                type="checkbox"
                checked={autoVectorize}
                onChange={(e) => setAutoVectorize(e.target.checked)}
              />
              Auto-vectorize every layer
            </label>
          </div>

          <button
            className="btn primary"
            onClick={runPipeline}
            disabled={busy || !hasSource}
          >
            {busy ? (
              <>
                <span className="spinner" /> {stageLabels[stage]}…
              </>
            ) : (
              "▶ Run pipeline"
            )}
          </button>

          <div className={`status${error ? " err" : ""}`}>{error ?? status}</div>
          {logs.length > 0 ? <div className="logbox">{logs.join("\n")}</div> : null}
        </aside>

        {/* ---------------- CENTER: canvas ---------------- */}
        <main className="col center">
          <div className="stage-toolbar">
            <div className="toggle-group">
              <button
                className={viewMode === "raster" ? "active" : ""}
                onClick={() => setViewMode("raster")}
              >
                Raster
              </button>
              <button
                className={viewMode === "vector" ? "active" : ""}
                onClick={() => setViewMode("vector")}
                title="Show vectorized layers (where available)"
              >
                Vector
              </button>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <span className="chip">{stageLabels[stage]}</span>
              {layers.length > 0 ? (
                <button
                  className="btn small"
                  disabled={busy}
                  onClick={() => downloadAllSvgs(layers)}
                >
                  ⬇ Export ZIP
                </button>
              ) : null}
            </div>
          </div>

          <LayerCanvas layers={layers} viewMode={viewMode} sourcePreview={localPreview} />
        </main>

        {/* ---------------- RIGHT: layer list ---------------- */}
        <aside className="col right">
          <LayerPanel
            layers={layers}
            busy={busy}
            onToggle={(id) =>
              updateLayer(id, { visible: !layers.find((l) => l.id === id)?.visible })
            }
            onVectorizeOne={vectorizeOne}
          />
        </aside>
      </div>
    </div>
  );
}
