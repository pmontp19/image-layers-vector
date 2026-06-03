import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Image → Layers → Vector",
  description:
    "MVP playground: decompose a raster image into RGBA layers with Qwen-Image-Layered and vectorize each layer into a Cricut-ready SVG.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
