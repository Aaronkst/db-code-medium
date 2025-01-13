import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: function (config, options) {
    config.experiments = { layers: true, asyncWebAssembly: true };
    return config;
  },
};

export default nextConfig;
