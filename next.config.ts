import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  reactStrictMode: true,
  serverExternalPackages: ["jspdf", "jspdf-autotable", "fflate"],
};

export default nextConfig;
