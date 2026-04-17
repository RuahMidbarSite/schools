/** @type {import('next').NextConfig} */

const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
    serverComponentsExternalPackages: ['pdf2json'], 
  },

  typescript: {
    ignoreBuildErrors: true, 
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  webpack: (config) => {
    config.experiments = { ...config.experiments };
    return config;
  },

  reactStrictMode: false,
};

module.exports = nextConfig;