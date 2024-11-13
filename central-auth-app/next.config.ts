import type { NextConfig } from "next";

const basePath = process.env.NEXT_BASE_PATH || "";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  basePath,
};

export default nextConfig;
