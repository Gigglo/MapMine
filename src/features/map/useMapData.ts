import { useEffect, useRef, useState } from "react";
import { cellsToMultiPolygon } from "h3-js";
import { visibleCells, visibleHeat, visiblePlacePhotos, type PlacePhotoMarker, type Bounds, type Range } from "../../database/repository";
import { report, useSession } from "../../store/session";
import type { MapHandle } from "./MapView";
import { placeThumbnail } from "../places/placeThumbnail";
import { placeGlyphs } from "./placeGlyphs";
import { landmarksInView } from "../landmarks/catalog";
import { indiaLandmarksInView } from "../landmarks/indiaCatalog";

export function useMapData(map: React.RefObject<MapHandle | null>, ready: boolean, bounds: Bounds | null,
  range: Range, metric: "seconds" | "samples", preview: string[] | null) {
  const places = useSession(state => state.places);
  const unlocked = useSession(state => state.unlockedLandmarks);
  const preference = useSession(state => state.preferences.mode);
  const mode = preview ? "explore" : preference;
  const revision = useSession(state => mode === "explore" ? state.fogRevision : mode === "heatmap" ? state.sampleRevision : 0);
  const sentPhotos = useRef(new Map<number, PlacePhotoMarker>());
  const lastFog = useRef("");
  const [lastView, setLastView] = useState<Bounds | null>(null);

  useEffect(() => {
    if (!ready) { lastFog.current = ""; sentPhotos.current.clear(); return; }
    map.current?.send({ type: "placeGlyphs", images: placeGlyphs });
  }, [map, ready]);

  useEffect(() => {
    if (!ready) return;
    map.current?.send({ type: "mode", mode });
  }, [map, ready, mode]);

  useEffect(() => {
    if (!ready) return;
    map.current?.send({ type: "places", places: places.map(({ id, latitude, longitude, icon }) =>
      ({ id, latitude, longitude, icon: Object.hasOwn(placeGlyphs, icon) ? icon : "Pin" })) });
  }, [map, ready, places]);

  useEffect(() => {
    if (!bounds) return;
    const timer = setTimeout(() => setLastView(previous =>
      previous && previous.zoom === bounds.zoom && previous.north === bounds.north &&
        previous.south === bounds.south && previous.east === bounds.east && previous.west === bounds.west
        ? previous : bounds), 150);
    return () => clearTimeout(timer);
  }, [bounds]);

  useEffect(() => {
    if (!ready || !lastView) return;
    let active = true;
    if (!places.some(place => place.hasPhoto)) {
      if (sentPhotos.current.size) {
        map.current?.send({ type: "visiblePlacePhotos", ids: [] });
        sentPhotos.current.clear();
      }
      return;
    }
    void visiblePlacePhotos(lastView).then(async photos => {
      if (!active) return;
      const target = map.current;
      if (!target) return;
      target.send({ type: "visiblePlacePhotos", ids: photos.map(photo => photo.id) });
      const visible = new Set(photos.map(photo => photo.id));
      for (const id of sentPhotos.current.keys()) {
        if (!visible.has(id)) sentPhotos.current.delete(id);
      }
      for (const photo of photos) {
        const previous = sentPhotos.current.get(photo.id);
        if (!previous || previous.name !== photo.name || previous.latitude !== photo.latitude ||
          previous.longitude !== photo.longitude || previous.jpeg !== photo.jpeg) {
          const jpeg = await placeThumbnail(photo.jpeg).catch(() => photo.jpeg);
          if (!active) return;
          target.send({ type: "placePhoto", photo: { ...photo, jpeg } });
        }
        sentPhotos.current.set(photo.id, photo);
      }
    }).catch(report);
    return () => { active = false; };
  }, [map, ready, lastView, places]);

  useEffect(() => {
    if (!ready || !lastView) return;
    let active = true;
    const render = (local: ReturnType<typeof landmarksInView>) => {
      if (active) map.current?.send({ type: "landmarks", points: [...landmarksInView(lastView), ...local]
        .map(({ id, latitude, longitude }) => ({ id, latitude, longitude, discovered: Boolean(unlocked[id]) })) });
    };
    indiaLandmarksInView(lastView).then(render).catch(() => render([]));
    return () => { active = false; };
  }, [map, ready, lastView, unlocked]);

  useEffect(() => {
    if (!ready || !lastView || (mode !== "explore" && mode !== "heatmap")) return;
    let active = true;
    if (mode === "explore") {
      (preview ? Promise.resolve(lastView.zoom >= 11 ? preview : []) : visibleCells(lastView))
        .then(cells => {
          if (!active) return;
          const center = (lastView.east + lastView.west) / 2;
          const anchor = Math.abs((center + 540) % 360 - 180) > 135 ? 180 : 0;
          const signature = anchor + ":" + cells.sort().join(",");
          if (lastFog.current === signature) return;
          const polygons = cells.length ? cellsToMultiPolygon(cells, true) : [];
          map.current?.send({ type: "fog", polygons, anchor });
          lastFog.current = signature;
        }).catch(report);
    } else {
      visibleHeat(lastView, range).then(points => {
        if (active) map.current?.send({ type: "heat", points, metric });
      }).catch(report);
    }
    return () => { active = false; };
  }, [map, ready, lastView, mode, range, metric, preview, revision]);
}
