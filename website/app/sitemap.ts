import type { MetadataRoute } from "next";
import { site } from "../config/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = site.url;
  if (!origin) return [];
  return ["/", "/privacy/"].map(path => ({ url: new URL(path, origin).href }));
}
