/** @type {import('next').NextConfig} */
const nextConfig = {
  // fal.media is where layer PNGs and SVGs are served from.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.fal.media" },
      { protocol: "https", hostname: "fal.media" },
    ],
  },
};

export default nextConfig;
