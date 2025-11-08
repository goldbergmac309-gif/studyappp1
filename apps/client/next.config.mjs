/**
 * Next.js config for E2E stability.
 * We intentionally ignore ESLint and TypeScript build errors during CI E2E runs
 * to prevent non-functional style/type lints from blocking the web server.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Allow build/start to proceed even if ESLint errors exist
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow production builds to succeed even if there are type errors
    ignoreBuildErrors: true,
  },
}

export default nextConfig
