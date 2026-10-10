import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "@elevenlabs/elevenlabs-js"],
};

export default nextConfig;
