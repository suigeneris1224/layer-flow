import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * `next build` and `next dev` share `.next` by default, so building while a
   * dev server is running silently corrupts it -- the page keeps serving but
   * its stylesheet 404s, and the app renders completely unstyled.
   *
   * `npm run build:check` sets NEXT_DIST_DIR so a verification build never
   * touches a running dev server's output.
   */
  distDir: process.env.NEXT_DIST_DIR || ".next",
  typedRoutes: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
        ]
      }
    ];
  }
};

export default nextConfig;
