import { create } from "zustand";
import * as data from "../database/repository";
import type { Fix, Point } from "../features/exploration/engine";

type Status = "paused" | "checking" | "denied" | "blocked" | "off" | "searching" | "weak" | "live" | "error";
export type Permission = "Unknown" | "Granted" | "Denied" | "Blocked";
type Session = {
  ready: boolean; error: string | null; status: Status; fix: Fix | null; permission: Permission;
  preferences: data.Preferences; summary: data.Summary | null; places: data.Place[];
  revision: number; fogRevision: number; trackingAttempt: number; target: Point | null; award: data.Unlock | null;
  following: boolean;
  unlockedLandmarks: Record<string, number>; recentLandmark: data.LandmarkUnlock | null;
};
export const useSession = create<Session>(() => ({
  ready: false, error: null, status: "paused", fix: null, permission: "Unknown",
  preferences: { name: "Explorer", tracking: 0, haptics: 1, retention: 30, mode: "explore", notifications: 0 },
  summary: null, places: [], revision: 0, fogRevision: 0, trackingAttempt: 0, target: null, award: null, following: false,
  unlockedLandmarks: {}, recentLandmark: null,
}));

export function report(error: unknown) {
  useSession.setState({ error: error instanceof Error ? error.message : "Something went wrong. Please try again." });
}

export async function initialize() {
  const [preferences, places, summary, unlockedLandmarks] = await Promise.all([
    data.readPreferences(), data.readPlaces(), data.summary(), data.readLandmarkUnlocks(),
  ]);
  await data.pruneHistory(preferences.retention);
  useSession.setState({ ready: true, preferences, places, summary, unlockedLandmarks, error: null });
}

export async function updatePreferences(preferences: Partial<data.Preferences>) {
  if (preferences.tracking === 0) useSession.setState(state => ({
    preferences: { ...state.preferences, tracking: 0 }, fix: null, status: "paused", following: false,
  }));
  await data.setPreferences(preferences);
  useSession.setState(state => ({ preferences: { ...state.preferences, ...preferences } }));
}

export async function refresh(savedPlaces = false) {
  const summary = await data.summary();
  const places = savedPlaces ? await data.readPlaces() : useSession.getState().places;
  useSession.setState(state => ({ summary, places, revision: state.revision + 1, fogRevision: state.fogRevision + 1 }));
}

export async function enableTracking() {
  await updatePreferences({ tracking: 1 });
  useSession.setState(state => ({ trackingAttempt: state.trackingAttempt + 1 }));
}

export const statusText: Record<Status, string> = {
  paused: "Tracking paused", checking: "Checking location", denied: "Location access needed",
  blocked: "Location access is blocked", off: "Location services are off", searching: "Finding your location",
  weak: "Waiting for a more accurate GPS fix", live: "Tracking in foreground", error: "Location unavailable",
};

