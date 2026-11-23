const key = process.env.EXPO_PUBLIC_CARTO_API_KEY;
const landmarkMarkerZoom = 11;
const styleUrl = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json" +
  (key ? "?key=" + encodeURIComponent(key) : "");

export const html = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-mapmine-map' https://unpkg.com; style-src 'unsafe-inline' https://unpkg.com; connect-src https://*.cartocdn.com; img-src data: blob: https://*.cartocdn.com; worker-src blob:; child-src blob:; form-action 'none'; base-uri 'none'">
<script src="https://unpkg.com/maplibre-gl@5.6.0/dist/maplibre-gl.js"
  integrity="sha384-GfxBM9x46BaAFxtCq39Fxir8fNZ4VDnwgfi6Kzi5/F1tAFsm0amuuV8kd+Pxzuf/" crossorigin="anonymous"></script>
<link href="https://unpkg.com/maplibre-gl@5.6.0/dist/maplibre-gl.css" rel="stylesheet"
  integrity="sha384-Nq6PQ+9vJPvw7U/VfDELyrWoGQMsy0gi6QShhaSrGzkpF5KkM40csg2leky+YMTd" crossorigin="anonymous">
<style>
html, body, #map { margin: 0; background: #101010; width: 100%; height: 100%; overflow: hidden; }
.maplibregl-ctrl-top-left { top: 192px; }
.search-pin { width: 26px; height: 26px; border: 2px solid #111; border-radius: 50% 50% 50% 4px;
  background: #fff; box-shadow: 0 2px 5px #000b; z-index: 3; cursor: pointer; }
.search-pin::after { content: ""; display: block; width: 8px; height: 8px; margin: auto; border-radius: 50%; background: #151515; }
.place-photo { width: 38px; height: 38px; box-sizing: border-box; padding: 2px; border: 1px solid #fff;
  border-radius: 7px; background: #111; box-shadow: 0 2px 6px #000b; cursor: pointer; z-index: 2; }
.place-photo.dimmed { opacity: 0.2; }
.place-photo img { display: block; width: 100%; height: 100%; object-fit: cover; border-radius: 4px; pointer-events: none; }
.maplibregl-canvas { filter: grayscale(1); }
.player-marker { z-index: 3; width: 30px; height: 34px; pointer-events: none; filter: drop-shadow(0 2px 3px #000c); }
.player-marker::before, .player-marker::after { content: ""; position: absolute; background: #101010; inset: 0; clip-path: polygon(50% 3%, 96% 91%, 50% 70%, 4% 91%); }
.player-marker::after { background: #f5f5f5; inset: 4px 5px 5px; }
</style>
</head>
<body>
<div id="map"></div>
<script nonce="mapmine-map">
(() => {
  const send = (type, data) => window.ReactNativeWebView?.postMessage(JSON.stringify({ type, ...data }));
  document.addEventListener("click", event => {
    const link = event.target.closest?.(".maplibregl-ctrl-attrib a");
    if (!link) return;
    event.preventDefault();
    send("attribution", { url: link.href });
  });
  try {
    const map = new maplibregl.Map({
      container: "map", style: ${JSON.stringify(styleUrl)}, center: [85.825, 20.263],
      zoom: 12, maxZoom: 20, maxPitch: 0, attributionControl: false
    });
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "top-left");
    const collection = (features = []) => ({ type: "FeatureCollection", features });
    const feature = (type, coordinates, properties = {}) => ({ type: "Feature", geometry: { type, coordinates }, properties });
    const coords = point => [point.longitude, point.latitude];
    let searchPin;
    let marker, markerFrame, ready = false, hold, startedAt, held = false;
    const timeout = setTimeout(() => { if (!ready) send("error"); }, 20000);
    function viewport() {
      const b = map.getBounds();
      send("viewport", { bounds: {
        west: b.getWest(), east: b.getEast(), south: Math.max(-90, b.getSouth()),
        north: Math.min(90, b.getNorth()), zoom: map.getZoom()
      } });
    }
    function fog(polygons, anchor) {
      const wrap = lng => lng + 360 * Math.round((anchor - lng) / 360);
      const rings = polygons.map(polygon => polygon.map(ring => ring.map(([lng, lat]) => [wrap(lng), lat])));
      const shell = [[anchor-180,-85.05],[anchor+180,-85.05],[anchor+180,85.05],[anchor-180,85.05],[anchor-180,-85.05]];
      const inner = rings.flatMap(polygon => polygon.slice(1)).map(ring => feature("Polygon", [ring]));
      map.getSource("fog").setData(collection([feature("Polygon", [shell, ...rings.map(polygon => polygon[0])]), ...inner]));
      map.getSource("frontier").setData(collection(rings.flatMap(polygon => polygon.map(ring => feature("LineString", ring)))));
    }
    function location(point, heading, follow) {
      cancelAnimationFrame(markerFrame);
      if (!point) { marker?.remove(); marker = undefined; updatePhotoOverlap(); return; }
      const [lng, lat] = coords(point);
      const hasHeading = typeof heading === "number" && Number.isFinite(heading) && heading >= 0;
      if (!marker) {
        const element = document.createElement("div");
        element.className = "player-marker";
        marker = new maplibregl.Marker({ element, rotationAlignment: "map" })
          .setLngLat([lng, lat]).setRotation(hasHeading ? heading : 0).addTo(map);
      } else {
        const old = marker.getLngLat();
        const delta = (lng - old.lng + 540) % 360 - 180;
        const rotation = marker.getRotation();
        const turn = hasHeading ? ((heading - rotation) % 360 + 540) % 360 - 180 : 0;
        const destination = map.project([old.lng + delta, lat]);
        const origin = map.project(old);
        if (Math.hypot(destination.x - origin.x, destination.y - origin.y) < 1 && Math.abs(turn) < 2) {
          // Track the latest coordinate without requesting a frame for subpixel movement.
          if (delta || lat !== old.lat || turn) marker.setLngLat([old.lng + delta, lat]).setRotation(rotation + turn);
        } else {
          const start = performance.now();
          const animate = now => {
            const t = Math.min(1, (now - start) / 550);
            const ease = t * t * (3 - 2 * t);
            marker.setLngLat([old.lng + delta * ease, old.lat + (lat - old.lat) * ease])
              .setRotation(rotation + turn * ease);
            updatePhotoOverlap();
            if (t < 1) markerFrame = requestAnimationFrame(animate);
          };
          markerFrame = requestAnimationFrame(animate);
        }
      }
      updatePhotoOverlap();
      if (follow) {
        const center = map.getCenter();
        const target = [lng + 360 * Math.round((center.lng - lng) / 360), lat];
        const from = map.project(center);
        const to = map.project(target);
        if (Math.hypot(from.x - to.x, from.y - to.y) >= 6) map.easeTo({ center: target, duration: 650 });
      }
    }
    function iconImage(name, uri) {
      const image = new Image();
      image.onload = () => { if (!map.hasImage(name)) map.addImage(name, image, { pixelRatio: 2 }); };
      image.src = uri;
    }
    const placePhotos = new Map();
    let landmarkPoints = [];
    function updatePhotoOverlap() {
      if (!placePhotos.size) return;
      const player = marker?.getLngLat();
      const screen = player && map.project(player);
      for (const { marker: photo, element } of placePhotos.values()) {
        const { lng, lat } = photo.getLngLat();
        const position = { lng, lat };
        if (player) position.lng += 360 * Math.round((player.lng - position.lng) / 360);
        const point = map.project(position);
        element.classList.toggle("dimmed", !!screen && Math.abs(screen.x - point.x) < 35 &&
          Math.abs(screen.y - (point.y - 8)) < 36);
      }
    }
    function renderLandmarks() {
      const visiblePhotos = Array.from(placePhotos.values()).filter(entry => !entry.element.hidden);
      const covered = point => !point.discovered && visiblePhotos.some(({ point: photo }) =>
        Math.abs(point.latitude - photo.latitude) < 0.00032 &&
        Math.abs((point.longitude - photo.longitude + 540) % 360 - 180) < 0.00032);
      map.getSource("landmarks").setData(collection(landmarkPoints.filter(point => !covered(point)).map(point =>
        feature("Point", coords(point), { id: point.id, icon: point.discovered ? "landmark-found" : "landmark-mystery" }))));
    }
    function showPlacePhoto(photo) {
      const previous = placePhotos.get(photo.id);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "place-photo";
      button.setAttribute("aria-label", "Open " + photo.name);
      button.addEventListener("click", event => {
        event.stopPropagation();
        send("place", { id: photo.id });
      });
      const image = document.createElement("img");
      image.alt = "";
      image.draggable = false;
      image.onload = () => {
        if (placePhotos.get(photo.id)?.element !== button) return;
        button.hidden = false;
        updatePhotoOverlap();
        renderLandmarks();
      };
      image.onerror = () => {
        if (placePhotos.get(photo.id)?.element !== button) return;
        placePhotos.get(photo.id).marker.remove();
        placePhotos.delete(photo.id);
        renderLandmarks();
      };
      button.hidden = true;
      button.appendChild(image);
      previous?.marker.remove();
      const pin = new maplibregl.Marker({ element: button, offset: [0, -8] }).setLngLat(coords(photo)).addTo(map);
      placePhotos.set(photo.id, { marker: pin, point: photo, element: button });
      image.src = "data:image/jpeg;base64," + photo.jpeg;
    }
    function landmarkBadge(path, ink, border) {
      return "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 28 28">' +
        '<circle cx="14" cy="14" r="12" fill="#1c1c1c" stroke="' + border + '" stroke-width="1.4"/>' +
        '<path d="' + path + '" fill="none" stroke="' + ink + '" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>');
    }
    window.mapmine = { receive(commands) {
      if (!ready) return;
      commands.forEach(command => {
        switch (command.type) {
          case "searchPin": {
            searchPin?.remove();
            searchPin = undefined;
            if (!command.point) break;
            const button = document.createElement("button");
            button.type = "button";
            button.className = "search-pin";
            button.setAttribute("aria-label", "Save this pin");
            button.addEventListener("click", event => { event.stopPropagation(); send("searchPin"); });
            searchPin = new maplibregl.Marker({ element: button, anchor: "bottom" })
              .setLngLat(coords(command.point)).addTo(map);
            break;
          }
          case "zoom": map.easeTo({ zoom: map.getZoom() + command.amount, duration: 260 }); break;
          case "north": map.easeTo({ bearing: 0, duration: 400 }); break;
          case "center": map.flyTo({ center: coords(command.point), zoom: command.zoom ?? map.getZoom(), essential: false }); break;
          case "location": location(command.point, command.heading, command.follow); break;
          case "fog": fog(command.polygons, command.anchor); break;
          case "heat":
            map.getSource("heat").setData(collection(command.points.map(point =>
              feature("Point", coords(point), { weight: point[command.metric] }))));
            break;
          case "places":
            map.getSource("places").setData(collection(command.places.map(place =>
              feature("Point", coords(place), { id: place.id, icon: "place-" + place.icon }))));
            break;
          case "placeGlyphs":
            for (const [name, uri] of Object.entries(command.images)) {
              iconImage("place-" + name, uri);
            }
            break;
          case "placePhoto":
            showPlacePhoto(command.photo);
            break;
          case "visiblePlacePhotos": {
            let removed = false;
            for (const [id, entry] of placePhotos) {
              if (command.ids.includes(id)) continue;
              entry.marker.remove();
              placePhotos.delete(id);
              removed = true;
            }
            if (removed) renderLandmarks();
            break;
          }
          case "landmarks":
            landmarkPoints = command.points;
            renderLandmarks();
            break;
          case "mode":
            ["fog", "frontier", "heat", "places", "place-icons"].forEach(layer => {
              const show = layer === "place-icons" ? command.mode === "places" :
                layer === "places" ? ["explore", "places"].includes(command.mode) :
                layer === "heat" ? command.mode === "heatmap" : command.mode === "explore";
              map.setLayoutProperty(layer, "visibility", show ? "visible" : "none");
            });
            break;
        }
      });
    }};
    map.on("error", () => { if (!ready && !map.isStyleLoaded()) send("error"); });
    map.once("load", () => {
      clearTimeout(timeout);
      for (const layer of map.getStyle().layers) {
        const id = layer.id.toLowerCase();
        if (layer.type !== "line" || !/road|street|highway|motorway|transportation/.test(id)) continue;
        const color = /casing|outline/.test(id) ? "#292929" : /motorway|highway/.test(id) ? "#D0D0D0" :
          /primary|major/.test(id) ? "#AAAAAA" : /secondary/.test(id) ? "#909090" :
          /minor|service/.test(id) ? "#555555" : "#777777";
        map.setPaintProperty(layer.id, "line-color", color);
      }
      for (const name of ["fog", "frontier", "heat", "places", "landmarks"]) {
        map.addSource(name, { type: "geojson", data: collection() });
      }
      map.addLayer({ id: "fog", type: "fill", source: "fog", paint: { "fill-color": "#070707", "fill-opacity": 0.84, "fill-antialias": false } });
      map.addLayer({ id: "frontier", type: "line", source: "frontier", paint: {
        "line-color": "#101010", "line-opacity": 0.75, "line-width": 7, "line-blur": 5
      } });
      map.addLayer({ id: "heat", type: "heatmap", source: "heat", layout: { visibility: "none" }, paint: {
        "heatmap-weight": ["interpolate", ["linear"], ["get", "weight"], 0, 0.1, 10, 0.65, 180, 1],
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 4, 8, 17, 34],
        "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0,"rgba(255,255,255,0)",0.3,"#444444",0.65,"#aaaaaa",1,"#f5f5f5"]
      } });
      map.addLayer({ id: "places", type: "circle", source: "places", paint: {
        "circle-radius": 6, "circle-color": "#f5f5f5", "circle-stroke-color": "#101010", "circle-stroke-width": 3
      } });
      map.addLayer({ id: "place-icons", type: "symbol", source: "places", layout: {
        visibility: "none", "icon-image": ["get", "icon"]
      } });
      iconImage("landmark-mystery", landmarkBadge("M10.5 10.5a3.5 3.5 0 1 1 5.8 2.6c-1.4 1.2-2.3 1.5-2.3 3.3m0 3.6h.01", "#f5f5f5", "#a0a0a0"));
      iconImage("landmark-found", landmarkBadge("m9 14 3.3 3.4 6.7-7", "#ffffff", "#d0d0d0"));
      map.addLayer({ id: "landmark-icons", type: "symbol", source: "landmarks", minzoom: ${landmarkMarkerZoom}, layout: {
        "icon-image": ["get", "icon"], "icon-padding": 4
      } });
      fog([], 0);
      ready = true;
      send("ready");
      viewport();
    });
    map.on("move", updatePhotoOverlap);
    map.on("moveend", () => { if (ready) viewport(); });
    map.on("movestart", event => { if (event.originalEvent) send("gesture"); });
    const canvas = map.getCanvas();
    canvas.addEventListener("pointerdown", event => {
      if (!event.isPrimary) { clearTimeout(hold); return; }
      held = false;
      startedAt = [event.clientX, event.clientY];
      hold = setTimeout(() => {
        const box = canvas.getBoundingClientRect();
        const point = map.unproject([startedAt[0] - box.left, startedAt[1] - box.top]).wrap();
        held = true;
        send("hold", { point: { latitude: point.lat, longitude: point.lng } });
      }, 600);
    });
    canvas.addEventListener("pointermove", event => {
      if (startedAt && Math.hypot(event.clientX - startedAt[0], event.clientY - startedAt[1]) > 9) clearTimeout(hold);
    });
    for (const name of ["pointerup", "pointercancel", "pointerleave"]) {
      canvas.addEventListener(name, () => { clearTimeout(hold); startedAt = undefined; });
    }
    canvas.addEventListener("contextmenu", event => event.preventDefault());
    map.on("click", event => {
      if (!ready || held) return;
      const [landmark] = map.queryRenderedFeatures(event.point, { layers: ["landmark-icons"] });
      if (landmark) { send("landmark", { id: landmark.properties.id }); return; }
      const [place] = map.queryRenderedFeatures(event.point, { layers: ["place-icons", "places"] });
      if (place) send("place", { id: place.properties.id });
    });
  } catch { send("error"); }
})();
</script>
</body>
</html>`;

