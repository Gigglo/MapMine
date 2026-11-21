# MapMine

MapMine is a local-first exploration game for iOS and Android. Start with a fogged map and reveal territory by travelling with foreground tracking enabled. Saved places, journeys, heatmap records, and achievements live in SQLite on your device.

## Run locally

1. Install Node.js 24 and run `npm ci`.
2. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_CARTO_API_KEY` to a client-safe map credential. Expo embeds this value in the mobile bundle. Keep server secrets out of `EXPO_PUBLIC_*`.
3. Run `npx expo start` and open the project in Expo Go for SDK 58. On the map, tap **Tracking paused** to opt into recording. Pan freely, tap the target button to recenter, or hold it to toggle follow mode.
4. For a development-only check, open **Map layers → Preview a simulated walk**. The preview animates an H3 reveal near the current map view. It stays in memory, uses its own fog overlay data, and writes no GPS fixes, territory, visits, XP, or statistics.

Long-press the map or choose **Save my location** in the exploration sheet to save a place. Type in the search bar at the top of the map to find saved places and catalog landmarks offline. The heatmap offers time spent and travel density across four date ranges. Open **Profile → Settings** to pause tracking, revise preferences, export a JSON snapshot, or clear local data.

Swipe up on the floating **Exploration** panel to open Places, Activity, or Achievements inside the same sheet. The back arrow returns to the exploration summary. Today shows GPS distance and newly unlocked territory. The live position appears as a white heading arrow, and area is displayed in km². Choose a personal logo in **Profile → Settings → Appearance and feedback** to use it on the in-app opening screen and profile.

At map zoom 11 and closer, question-mark pins mark undiscovered landmarks. India’s smaller settlements appear from zoom 13, with a viewport cap to keep the map readable. Keep foreground tracking on and stay near a pin for about 24 seconds with consistent GPS readings to reveal its name and earn a permanent checkmark. The offline catalog includes 1,271 global UNESCO heritage points, six curated Bhubaneswar landmarks, and 150,000 GeoNames India points. See [DATA-SOURCES.md](DATA-SOURCES.md) for coverage and licensing. Landmark points represent specific reference locations and may differ from public entrances.

Use the bell in **Profile** to see recent unlocks, toggle local discovery and achievement alerts, or send a test notification. The **MapMine Exploration** Android and iOS home-screen widget displays the latest recorded day’s distance and area. Widgets require an installed development or standalone build. Add the widget through the device’s home-screen widget picker. The native project identifiers are set to `com.mapmine.app` on both platforms.

Swipe the entry slider to open the map after launch, or tap it to enter. Tap the share icon beside an earned achievement to preview and share a 9:16 PNG through the device share sheet. The card includes the MapMine logo, badge, reason it was earned, XP, and unlock date. It omits coordinates and saved-place details.

## Implementation

- Expo Router keeps the Explore tab mounted using the tab navigator. React Native sends typed commands to a single MapLibre WebView. Changes to GPS, layers, and statistics leave its source and camera intact.
- CARTO Dark Matter remains a vector basemap with gray and white road styling and provider attribution. A restricted WebView loads a pinned MapLibre script and CARTO map resources. CARTO receives ordinary basemap requests based on the viewed area. Raw GPS history, saved places, and the heatmap are generated locally.
- The location service accepts recent, accurate foreground fixes, checks plausible travel speed, and starts a new journey after an interruption. It interpolates trusted consecutive fixes. H3 resolution 11 and the neighborhood radius are configurable in the exploration engine. Repeated cells count once and area comes from individual H3 cells.
- Fog uses merged H3 outlines and a softened boundary in MapLibre. It queries only the padded viewport and hides street-scale reveals below zoom 11. A local safety cap limits dense viewport queries; zooming in reveals more detail.
- Visits require continuous, accurate fixes in the configured geofence. Signal gaps do not count toward dwell time. Recorded visits remain open until a reliable exit is observed so reopening the app at the same place does not award another visit.
- Raw samples default to 30 days of retention. Clearing location history deletes raw samples, journeys, visits, heatmap records, and any cached export. Resetting exploration also deletes discovered cells, landmark unlocks, daily totals, and earned achievements. Saved places remain until deleted individually. Standalone Android builds opt out of automatic backups. On iOS, app files are subject to device backup settings.

## Checks

```sh
npx expo install --check
npx tsc --noEmit
npx expo lint
npm test
npx expo export --platform android --platform ios --output-dir dist/mapmine-validation
```

Tests cover GPS filtering, distance and antimeridian travel, H3 continuity, visit dwell, streaks, achievement deduplication, and SQLite recording and deletion. See [DEVELOPMENT.md](DEVELOPMENT.md) for validation status and the device checklist.

## Scope

Android and iOS are the supported targets. The basemap requires network access. Recording is foreground-only, including in Expo Go. Background recording would require a development build, platform permissions, and a separate opt-in flow. The map coordinates and H3 geometry support antimeridian travel, while rendering at extreme latitudes is limited by the Web Mercator basemap. Map search does not use a public geocoder. FPS, GPS behavior on a physical device, and device share-sheet behavior require native QA before public release.

