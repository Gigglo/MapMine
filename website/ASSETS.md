# MapMine website assets

The website uses the supplied MapMine logo and a locally rendered, monochrome CARTO basemap of Bhubaneswar. Map artwork is credited to [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) and [CARTO](https://carto.com/attributions).

The mobile project did not include app screenshots or screen recordings at implementation time. The site labels its HTML interface previews and uses demonstration data. Adding files with the names below automatically replaces the matching previews at build time.

| Screen | Screenshot in `public/screenshots/` | Video basename in `public/videos/` | Placement |
| --- | --- | --- | --- |
| Explore | `explore.webp` | `hero-demo` | Hero and gallery |
| Fog of war | `fog-of-war.webp` | `exploration` | Territory feature and gallery |
| Saved places | `places.webp` | `saved-places` | Saved-places feature and gallery |
| Heatmap | `heatmap.webp` | `heatmap` | Heatmap feature and gallery |
| Activity | `activity.webp` | `bottom-sheet` | Activity feature and gallery |
| Achievements | `achievements.webp` | `achievements` | Milestones feature and gallery |
| Profile and settings | `profile.webp` | `navigation` | Gallery screenshot and reserved video slot |

- Screenshots may use AVIF instead of WebP. Keep all screenshots at one native portrait aspect ratio, ideally 1080 × 2200 or higher. Keep labels sharp and remove system notification overlays.
- Record at 720 × 1480 or higher, 30 FPS, and aim for a 5–12 second loop. Export muted MP4 (H.264) and WebM (VP9 or AV1). Put the matching WebP poster in `public/posters/`, for example `heatmap.webp`.
- Use the app’s developer walking simulation where relevant. Record one gesture per clip and finish near the initial framing so loops stay smooth. Capture the Explore map, fog reveal, draggable summary, mode switching, saved-place details, heatmap, navigation, and a genuine achievement unlock. Use demonstration locations and make sure private locations and history are outside the recording.
- Brand files live in `public/brand/`. The social sharing image is `share.webp` at 1200 × 630. The map images and their geographic bounds are listed in `config/cartography.ts`. Update the bounds alongside the basemap.
- Signed Android releases can be placed in `public/downloads/` and enabled with `MAPMINE_ANDROID_APK_PATH`. The site includes no placeholder release files.

