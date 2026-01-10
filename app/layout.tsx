import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import { SkipNavLink, SkipNavContent } from "@/components/ui/skip-nav";
import "../client/src/index.css";

export const metadata: Metadata = {
  title: "Warehouse Builder",
  description: "Enterprise inventory management and warehouse operations",
  applicationName: "Warehouse Builder",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Warehouse Builder",
  },
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Warehouse Builder" />
      </head>
      <body>
        <SkipNavLink />
        <Providers>
          <SkipNavContent>
            {children}
          </SkipNavContent>
        </Providers>
      </body>
    </html>
  );
}
