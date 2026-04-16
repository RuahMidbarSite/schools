/** @type {import('next').NextConfig} */

const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'pdfjs-dist'],
    
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },

  // התעלמות משגיאות TypeScript ו-ESLint בזמן ה-Build
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