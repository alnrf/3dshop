import type { NextConfig } from "next";

const config: NextConfig = {
  images: {
    remotePatterns: [
      // MinIO no mini server (dev)
      { protocol: "http", hostname: "192.168.50.92", port: "9000" },
      // R2 em produção — troque pelo seu domínio público
      { protocol: "https", hostname: "cdn.allanrf.dev" },
    ],
  },
};

export default config;
