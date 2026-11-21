import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { brand } from "../config/assets";
import { site } from "../config/site";
import "./globals.css";

export const viewport: Viewport = { themeColor: "#080808", viewportFit: "cover" };
export const metadata: Metadata = {
  metadataBase: site.url ? new URL(site.url) : undefined,
  title: { default: site.title, template: "%s · MapMine" },
  description: site.description,
  icons: { icon: brand.icon },
  openGraph: {
    type: "website", title: site.title, description: site.description, siteName: site.name,
    ...(site.url ? { url: site.url } : {}),
    images: [{ url: brand.share, width: 1200, height: 630, alt: "MapMine — The world is yours to discover" }],
  },
  twitter: { card: "summary_large_image", title: site.title, description: site.description, images: [brand.share] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={GeistSans.variable}>
    <body><a className="skip-link" href="#main">Skip to content</a>{children}</body>
  </html>;
}
