import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: function (config, options) {
    config.experiments = { layers: true, asyncWebAssembly: true };

    // For easier debugging, log Webpack config if necessary
    if (!options.isServer) {
      console.log("Client Webpack config:", config);
    }

    return config;
  },
};

export default nextConfig;
