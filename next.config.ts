import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXTPUBLICBASEURL: process.env.NEXTPUBLICBASEURL,
  },
};

export default nextConfig;
