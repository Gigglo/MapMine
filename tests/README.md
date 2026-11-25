# Testing MapMine

Run `npm test` with Node.js 24 for unit and SQLite integration tests. These cover activity periods and replay geometry, GPS validation and journey recording, map messages, exploration and heatmap data, saved places and photos, achievements, landmarks, preferences, migrations, and data deletion.

Run `maestro test tests/e2e/app.yaml` on an Android test device or iOS simulator with a standalone MapMine build installed. Use a disposable test install because the flow clears MapMine's local data. The flow exercises onboarding, map layers, saving and deleting a place, all four Activity periods, achievements, and saving a profile name across relaunch.

## Device checks with a recorded route

- Enable precise location and walk far enough to record a journey. Check that Daily shows distance, moving time, territory, and the route. Confirm Weekly includes that day and the 30- and 90-day totals include the journey once.
- Play the route and check that the tiles align with the trace. Pause and resume, seek near the end, and reset. Repeat offline and reconnect to exercise the map retry.
- Enable background location, lock the phone during a walk, and check that the journey continues. Pause tracking and verify new locations stop appearing.
- Visit a saved place or landmark and check that the visit or unlock appears once. Test the achievement story, photo picker, share sheet, and personal data export on both mobile platforms.
- Check notification permission and reminder delivery. On supported builds, add the home-screen widget and verify that it updates after recording.
