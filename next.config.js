/** @type {import('next').NextConfig} */

const nextConfig = {
  // תיקון למגבלת ה-1MB
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
   
  webpack: (config) => {
    config.experiments = { ...config.experiments };
    return config;
  },
  reactStrictMode: false,
};
 
module.exports = nextConfig