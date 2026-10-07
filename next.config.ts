import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    // 65: montage photographs (they sit under the atmosphere). 85: the foreground subjects.
    qualities: [65, 85],
  },
};

export default nextConfig;
