import { useEffect } from "react";
import { Platform } from "react-native";
import { isRunningInExpoGo } from "expo";
import { formatArea, formatDistance } from "../../components/ui/primitives";
import { useSession } from "../../store/session";

export type WidgetStats = { day: string; distance: string; area: string };
type WidgetModule = { default: { updateSnapshot: (stats: WidgetStats) => void } };

export function useWidgetStats() {
  const ready = useSession(state => state.ready);
  useEffect(() => {
    if (!ready || isRunningInExpoGo()) return;
    if (Platform.OS !== "ios" && Platform.OS !== "android") return;
    let active = true;
    let lastSnapshot = "";
    const module: Promise<WidgetModule> = Platform.OS === "ios" ?
      import("./ExplorationWidget.ios") : import("./ExplorationWidget.android");
    const publish = async () => {
      const widget = await module;
      if (!active) return;
      const today = useSession.getState().summary?.today;
      if (!today) return;
      const payload = {
        day: new Date(today.day + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        distance: formatDistance(today.meters), area: formatArea(today.area),
      };
      const key = JSON.stringify(payload);
      if (lastSnapshot === key) return;
      widget.default.updateSnapshot(payload);
      lastSnapshot = key;
    };
    const sync = () => void publish().catch(() => undefined);
    sync();
    const timer = setInterval(sync, 15_000);
    return () => { active = false; clearInterval(timer); };
  }, [ready]);
}
