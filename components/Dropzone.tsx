"use client";

import { useRef, useState } from "react";

export function Dropzone({
  previewUrl,
  onFile,
  disabled,
}: {
  previewUrl: string | null;
  onFile: (file: File) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file && file.type.startsWith("image/")) onFile(file);
  }

  return (
    <div
      className={`dropzone${drag ? " drag" : ""}`}
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      style={{ cursor: disabled ? "not-allowed" : "pointer" }}
    >
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="thumb" src={previewUrl} alt="source preview" />
      ) : null}
      <div>
        <strong>{previewUrl ? "Replace image" : "Drop an image"}</strong>
        <div className="hint">or click to browse — PNG / JPG / WEBP</div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
