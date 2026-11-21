# MapMine download website

This standalone Next.js App Router project lives in `website/`. Its dependencies, configuration, and build are separate from the Expo app.

```sh
cd website
npm ci
npm run dev
npm run lint
npm run typecheck
npm run build
```

The production build exports a static site to `website/out/`. On Vercel, import the repository, set **Root Directory** to `website`, and use the Next.js framework preset with `npm run build`. For other static hosts, publish `out/` with directory-index serving enabled.

Copy `.env.example` to `.env.local` for local development, or set the equivalent build-time environment variables on the host. Set `NEXT_PUBLIC_SITE_URL` to the canonical HTTPS origin for metadata and sitemap generation. Vercel’s production domain is used when available. Set download URLs only after release artifacts or store listings are public. A direct APK may also be placed in `public/downloads/` and enabled with `MAPMINE_ANDROID_APK_PATH`. Unconfigured downloads appear as Coming soon. Terms, GitHub, and contact links appear only when their destinations are configured.

The version shown by default is the version in the mobile app’s `app.json`. Update `MAPMINE_VERSION` for a different release. See [ASSETS.md](ASSETS.md) for real screenshot and video replacement.

The fog demo uses a local map image as a fallback and progressively enhances it with MapLibre. Its marker and reveal history stay in the browser session. The site requests no location permission and includes no analytics integration.

