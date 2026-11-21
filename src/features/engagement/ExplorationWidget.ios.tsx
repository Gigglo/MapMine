import { Text, VStack } from "@expo/ui/swift-ui";
import { containerBackground, font, foregroundStyle } from "@expo/ui/swift-ui/modifiers";
import { createWidget } from "expo-widgets";
import type { WidgetStats } from "./widgetStats";

function ExplorationWidget(props: WidgetStats) {
  "widget";
  return <VStack alignment="leading" spacing={7} modifiers={[containerBackground("#101010", "widget")]}>
    <Text modifiers={[font({ size: 13, weight: "bold" }), foregroundStyle("#ffffff")]}>MapMine</Text>
    <Text modifiers={[font({ size: 12 }), foregroundStyle("#a0a0a0")]}>{props.day || "Open MapMine to sync"}</Text>
    <Text modifiers={[font({ size: 15, weight: "semibold" }), foregroundStyle("#ffffff")]}>{props.distance} travelled</Text>
    <Text modifiers={[font({ size: 12 }), foregroundStyle("#a0a0a0")]}>{props.area} unlocked</Text>
  </VStack>;
}

export default createWidget("MapMineExploration", ExplorationWidget, { day: "", distance: "0 m", area: "0 km²" });
