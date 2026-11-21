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
  github: httpUrl(process.env.MAPMINE_GITHUB_URL),
  version: process.env.MAPMINE_VERSION ?? "1.0.0",
};

export { httpUrl };
