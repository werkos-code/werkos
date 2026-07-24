import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "./src/lib/env";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    // Pin root when a parent directory also has a lockfile
    root: projectRoot,
  },
};

export default nextConfig;
