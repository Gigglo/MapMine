# MapMine launch film

Both Remotion compositions run for 45 seconds at 60 fps. MapMineLaunch is 1920 × 1080 and MapMineVertical is 1080 × 1920.

Run these commands from this directory with Node.js 22 or newer.

```sh
npm ci
npm run studio
npm run typecheck
npm run render:landscape
npm run render:vertical
```

The exports are saved as `out/mapmine-launch.mp4` and `out/mapmine-vertical.mp4`. To render with an installed Chromium-based browser, pass `--browser-executable` to the CLI. To render a sample, pass `--frames=0-180`.

Scene offsets are in `.production/config/timing.ts`. The scene layouts and content live in `.production/scenes/`, and the shared masked word reveal is in `.production/components/Design.tsx`. The map uses a simulated Bhubaneswar route, and the phone interface uses reconstructed UI with demo data.

The default soundtrack is an original 120 BPM instrumental with three quiet typing cues in the opening. The two place unlocks illustrate discoveries along the simulated route. To regenerate the audio, run `python audio/launch_mix.py` with NumPy installed. To use another track, place it in `public/audio/` and set the `music` input prop.

MapMine supplied the logo, badge, and Bhubaneswar basemap. Basemap © OpenStreetMap contributors and © CARTO, with attribution on screen. Geist is available under the SIL Open Font License.
