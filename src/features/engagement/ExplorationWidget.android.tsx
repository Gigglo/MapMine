import { Column, Text } from "@expo/ui/jetpack-compose";
import { background, fillMaxSize, paddingAll } from "@expo/ui/jetpack-compose/modifiers";
import { createWidget } from "expo-widgets";
import type { WidgetStats } from "./widgetStats";

function ExplorationWidget(props: WidgetStats) {
  "widget";
  return <Column modifiers={[fillMaxSize(), background("#101010"), paddingAll(14)]}>
    <Text color="#ffffff" style={{ fontSize: 15 }}>MapMine</Text>
    <Text color="#a0a0a0" style={{ fontSize: 11 }}>{props.day || "Open MapMine to sync"}</Text>
    <Text color="#ffffff" style={{ fontSize: 14 }}>{props.distance + " travelled"}</Text>
    <Text color="#a0a0a0" style={{ fontSize: 12 }}>{props.area + " unlocked"}</Text>
  </Column>;
}

export default createWidget("MapMineExploration", ExplorationWidget, { day: "", distance: "0 m", area: "0 km²" });
