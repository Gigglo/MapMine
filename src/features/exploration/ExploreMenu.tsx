import { Pressable, StyleSheet, Text, View } from "react-native";
import { Activity, MapPin, Trophy } from "lucide-react-native";
import { tap } from "../../components/ui/primitives";
import { colors } from "../../theme/color";

const destinations = [
  { label: "Places", href: "/places", Icon: MapPin },
  { label: "Activity", href: "/activity", Icon: Activity },
  { label: "Achievements", href: "/achievements", Icon: Trophy },
] as const;

export type ExploreDestination = (typeof destinations)[number]["href"];

export default function ExploreMenu({ onSelect }: { onSelect: (destination: ExploreDestination) => void }) {
  return <View style={styles.row}>{destinations.map(({ label, href, Icon }) =>
    <Pressable key={href} accessibilityRole="button" onPress={() => { tap(); onSelect(href); }}
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
      <Icon color={colors.text} size={19} strokeWidth={1.8} />
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.label}>{label}</Text>
    </Pressable>
  )}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10 },
  item: { flex: 1, minHeight: 58, padding: 8, borderRadius: 14,
    alignItems: "center", justifyContent: "center", gap: 5 },
  pressed: { opacity: 0.7, backgroundColor: colors.elevated },
  label: { color: colors.text, fontSize: 11, fontWeight: "600" },
});
