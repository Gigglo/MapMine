import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { recordLocations } from "./recordLocations";
import { report, useSession } from "../../store/session";

export const locationTask = "mapmine-location";

TaskManager.defineTask<{ locations: Location.LocationObject[] }>(locationTask, async ({ data, error }) => {
  try {
    if (error) throw new Error(error.message);
    if (data) await recordLocations(data.locations, true);
  } catch (error) {
    if (useSession.getState().ready && useSession.getState().preferences.tracking) {
      useSession.setState({ status: "error", fix: null });
      report(error);
    } else {
      console.warn("MapMine location task failed", error);
    }
  }
});
