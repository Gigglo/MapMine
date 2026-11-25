import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";

const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL?.endsWith(".ts") && /^\.{1,2}\//.test(specifier) && !specifier.endsWith(".ts")) {
      return next(specifier + ".ts", context);
    }
    return next(specifier, context);
  },
});
let bridge, simulation;
try {
  bridge = await import("../src/features/map/mapBridge.ts");
  simulation = await import("../src/features/exploration/simulation.ts");
} finally {
  hooks.deregister();
}

test("map bridge accepts valid map actions and bounds across the antimeridian", () => {
  const events = [
    { type: "ready" }, { type: "gesture" }, { type: "error" }, { type: "searchPin" },
    { type: "hold", point: { latitude: 20, longitude: 85 } },
    { type: "viewport", bounds: { south: -2, north: 2, west: 177, east: 183, zoom: 14 } },
    { type: "landmark", id: "bbi-state-museum" },
    { type: "place", id: 1 },
    { type: "attribution", url: "https://www.openstreetmap.org/copyright" },
  ];
  for (const event of events) assert.deepEqual(bridge.parseEvent(JSON.stringify(event)), event);
});

test("map bridge ignores malformed messages, invalid coordinates and unlisted links", () => {
  for (const message of ["{", "null", "[]", JSON.stringify({ type: "ready", padding: "x".repeat(2048) })]) {
    assert.equal(bridge.parseEvent(message), null);
  }
  const events = [
    { type: "unknown" },
    { type: "hold", point: { latitude: 91, longitude: 0 } },
    { type: "viewport", bounds: { south: 2, north: -2, west: 0, east: 1, zoom: 14 } },
    { type: "viewport", bounds: { south: -2, north: 2, west: 1, east: 0, zoom: 14 } },
    { type: "landmark", id: "bad id" },
    { type: "place", id: 1.5 },
    { type: "attribution", url: "https://example.com" },
  ];
  for (const event of events) assert.equal(bridge.parseEvent(JSON.stringify(event)), null);
});

test("simulated walks wrap longitude and produce unique cells", () => {
  const route = simulation.walkingRoute({ latitude: 89, longitude: 179.9999 });
  assert.equal(route.length, 42);
  assert.equal(route[0].latitude, 84);
  assert.ok(route.some(({ longitude }) => longitude < -179));
  const cells = simulation.simulatedCells(route);
  assert.ok(cells.length > 1);
  assert.equal(new Set(cells).size, cells.length);
  assert.deepEqual(simulation.simulatedCells([]), []);
});
