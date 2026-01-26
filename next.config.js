/** @type {import('next').NextConfig} */

const nextConfig = {
  // שמירה על הגדרות ה-4MB הקיימות שלך
  experimental: {
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