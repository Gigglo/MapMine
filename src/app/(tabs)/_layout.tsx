import { Tabs } from "expo-router";
import { colors } from "../../theme/color";

export default function TabLayout() {
  return <Tabs detachInactiveScreens={false} backBehavior="firstRoute"
    tabBar={() => null} screenOptions={{ headerShown: false, animation: "none", sceneStyle: { backgroundColor: colors.background } }}>
    <Tabs.Screen name="index" options={{ title: "Explore" }} />
    <Tabs.Screen name="places" options={{ title: "Places" }} />
    <Tabs.Screen name="activity" options={{ title: "Activity" }} />
    <Tabs.Screen name="achievements" options={{ title: "Achievements" }} />
  </Tabs>;
}
