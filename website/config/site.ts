const httpUrl = (value?: string) => {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
};

const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL;
export const site = {
  name: "MapMine",
  title: "MapMine — The World Is Yours to Discover",
  description: "Turn real-world journeys into an adventure. Unlock unexplored territory, discover your personal geography, and build a map that belongs only to you.",
  tagline: "Make the familiar unfamiliar.",
  url: httpUrl(process.env.NEXT_PUBLIC_SITE_URL ?? (vercelDomain ? "https://" + vercelDomain : undefined)),
  contact: process.env.MAPMINE_CONTACT_EMAIL,
  terms: httpUrl(process.env.MAPMINE_TERMS_URL),
  github: httpUrl(process.env.MAPMINE_GITHUB_URL) ?? "https://github.com/cynicalmindset/MapMine",
  productHunt: {
    url: "https://www.producthunt.com/products/mapmine?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-mapmine",
    badge: "https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1325957&theme=dark&t=1795328322553",
  },
  version: process.env.MAPMINE_VERSION ?? "1.0.0",
};

export { httpUrl };
