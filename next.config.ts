import type { NextConfig } from "next";

// Baseline security headers on every response. No other site may frame ours (clickjacking of the admin and offer
// screens). The CSP only covers framing, <base>, plugins and form targets for now; the full nonce-based policy
// (scripts, styles) needs a proxy and dynamic rendering — see node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "X-Content-Type-Options", value: "nosniff" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      // The installable app (README, "Installable app"); a later rule wins for the same header. The service worker is
      // fetched fresh every time, so a fix or the kill switch reaches every phone at once, and may load nothing but our
      // own scripts. The offline page and the manifests are checked on every use too.
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
      { source: "/offline.html", headers: [{ key: "Cache-Control", value: "no-cache" }] },
      { source: "/manifest/:file", headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }] },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  serverExternalPackages: ["pg"],
};

export default nextConfig;
