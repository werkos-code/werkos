import type { NextConfig } from "next";

// Validate env at build time (fails the deploy if required vars are missing)
import "./src/lib/env";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
