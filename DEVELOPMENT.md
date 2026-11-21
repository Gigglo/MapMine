# MapMine development

The starting app had a working CARTO/MapLibre WebView, animated zoom and compass controls, and a standalone location hook. The implementation keeps the vector map and road styling, extends the existing screen, and builds persistence and the foreground tracking pipeline around it.

## Implementation checklist

- [x] Foundation — SDK 58 dependencies, shared dark theme, pinned vector renderer, typed map commands and events.
- [x] Interface — safe-area map overlays, three-position Gorhom overview, persistent tab navigation, profile and settings.
- [x] Location — opt-in foreground tracking, fix validation, blue marker, camera follow and recenter, journeys, isolated walking simulation.
- [x] Exploration — SQLite migrations, idempotent H3 unlocks, cell-specific areas, viewport-scoped merged fog, and restoration.
- [x] Personal geography — local place editor and search, visit dwell and history, date-filtered heatmap, and four map modes.
- [x] Statistics — today and lifetime totals, seven-day trends, streaks, journeys, milestone progress, animations, and XP.
- [x] Privacy — tracking pause, raw sample retention, JSON export, and confirmation before deletion or reset.
- [x] Automated checks — TypeScript, Expo lint, SDK dependency validation, and Node test suite.
- [x] Map rendering — headless MapLibre and CARTO smoke check for H3 fog, antimeridian reveal, marker images, heatmap mode, and camera preservation.
- [x] Export Hermes bundles for Android and iOS.
- [x] Branded splash, replaceable local logo, floating navigation, heading arrow, and advanced milestones.
- [x] Worldwide zoom-gated landmark catalog, verified local visits, and persistent one-time discovery rewards.
- [x] Embedded floating sheet panels, movement-based daily summary, native widget configuration, local alerts, and indexed India catalog.
- [x] Logo-only splash animation, meme badges and achievement names, and earned-achievement story exports.
- [ ] Physical-device QA and release sign-off.

## Native QA checklist

- [ ] Open in Expo Go on Android and iOS. Check startup, vector attribution, permissions, GPS disabled states, and app resume.
- [ ] Run a simulated walk. Confirm progressive fog reveal, mode changes without a WebView reload, and unchanged personal totals.
- [ ] Walk a short route with tracking enabled. Confirm fix quality, camera gestures, distance, fog restoration on restart, and no recording in the background.
- [ ] Save and edit a place. Test repeated dwell, departure and re-entry, heatmap ranges, retention, export, and history deletion.
- [ ] Test sheet snapping, small screens, screen readers, large text, and Android gesture navigation.
- [ ] Verify the native splash in a standalone build, photo selection, navigation from the floating sheet, and physical unlock at a known landmark.
- [ ] Add the widget on Android and iOS and confirm it refreshes after a walk. Verify opt-in alerts on an actual unlock.
- [ ] Share an achievement PNG on Android and iOS and check the native share-sheet destinations and exported resolution.
- [ ] Profile map interaction and fix ingestion on a mid-range Android device with a large local history.

