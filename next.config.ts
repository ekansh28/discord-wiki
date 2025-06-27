/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable client-side routing for wiki paths
  async rewrites() {
    return [
      // Rewrite all /wiki/* paths to the main page component
      {
        source: '/wiki/:slug*',
        destination: '/',
      },
      // Rewrite category pages to main component as well
      {
        source: '/category/:slug*',
        destination: '/',
      }
    ]
  },
  
  // Handle static file serving
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ]
  },

  // Optimize for performance
  experimental: {
    optimizeCss: true,
  },
  
  // Disable strict mode for compatibility
  reactStrictMode: false,
  
  // Enable SWC minification
  swcMinify: true,
}

module.exports = nextConfig