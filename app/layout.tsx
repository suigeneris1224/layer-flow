import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ServiceWorkerRegistration } from "@/components/offline/service-worker-registration";
import { publicEnv } from "@/lib/config/env";
import "./globals.css";

/*
 * One family, self-hosted at build time by next/font -- no runtime CDN request
 * and no layout shift. Plus Jakarta Sans is clean and neutral, which is what
 * this interface wants; a characterful display face fought the layout.
 */
const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  // Makes canonical, og:image and sitemap-style URLs absolute on the live
  // domain (NEXT_PUBLIC_APP_URL), e.g. https://getlayerflow.com/pricing.
  metadataBase: new URL(publicEnv.appUrl),
  // "./" resolves to each route's own URL: every page is its own canonical,
  // so www, trailing-slash and ?query variants don't compete in search.
  alternates: { canonical: "./" },
  // The share image itself is app/opengraph-image.png (+ twitter-image.png),
  // picked up by file convention for every page.
  openGraph: { siteName: "LayerFlow", locale: "en_PH", type: "website" },
  twitter: { card: "summary_large_image" },
  title: {
    default: "LayerFlow — Know your flock. Know your numbers.",
    template: "%s · LayerFlow",
  },
  description:
    "Simple egg farm management for Philippine layer farmers. Record daily production in seconds and see what your flock actually earns.",
  applicationName: "LayerFlow",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/layerflow-logo.png",
    apple: "/icons/layerflow-logo.png",
  },
  appleWebApp: {
    capable: true,
    title: "LayerFlow",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1220" },
  ],
  width: "device-width",
  initialScale: 1,
  // Farmers zoom to read in bright sun. Never lock this down.
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /*
     * suppressHydrationWarning on <html> and <body> covers extension-injected
     * attributes -- Grammarly, password managers and dark-mode tools add things
     * like data-gr-ext-installed and cz-shortcut-listen before React hydrates,
     * which otherwise reports a mismatch the app cannot fix.
     *
     * It suppresses ONE level only: these two elements' own attributes. Real
     * mismatches anywhere inside the app still surface normally.
     */
    <html lang="en-PH" className={sans.variable} suppressHydrationWarning>
      <body className="min-h-dvh font-sans" suppressHydrationWarning>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
