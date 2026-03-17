import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // @react-pdf/renderer はサーバーサイドのみで使用
  serverExternalPackages: ['@react-pdf/renderer'],
};

export default nextConfig;
