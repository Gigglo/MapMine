import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { ArrowLeft } from "lucide-react-native";
import { colors } from "../../theme/color";
import { useSession } from "../../store/session";

export function tap() {
  if (useSession.getState().preferences.haptics) void Haptics.selectionAsync().catch(() => undefined);
}

export function Page({ title, subtitle, action, onBack, children, embedded = false }: {
  title: string; subtitle?: string; action?: ReactNode; onBack?: () => void; children: ReactNode; embedded?: boolean;
}) {
  const { top } = useSafeAreaInsets();
  const content = <>
      <View style={styles.pageHeader}>
        {onBack && <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => { tap(); onBack(); }}
          style={({ pressed }) => [styles.back, pressed && styles.dim]}>
          <ArrowLeft size={21} color={colors.text} />
        </Pressable>}
        <View style={styles.flex}>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.secondary}>{subtitle}</Text> : null}
        </View>
        {action}
      </View>
      {children}
  </>;
  return embedded ? <View style={styles.embedded}>{content}</View> :
    <ScrollView style={styles.page} contentContainerStyle={[styles.pageContent, { paddingTop: top + 16 }]}
      keyboardShouldPersistTaps="handled">{content}</ScrollView>;
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return <View style={styles.section}><Text accessibilityRole="header" style={styles.heading}>{title}</Text>{children}</View>;
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function Button({ label, onPress, kind = "secondary", disabled = false, icon }: {
  label: string; onPress: () => void; kind?: "primary" | "secondary" | "danger"; disabled?: boolean; icon?: ReactNode;
}) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => [
        styles.button, kind === "primary" && styles.primary, kind === "danger" && styles.danger,
        (disabled || pressed) && styles.dim,
      ]}>
      {icon}
      <Text style={[styles.buttonText, kind === "primary" && styles.primaryText]}>{label}</Text>
    </Pressable>
  );
}

export function Chips<T extends string>({ items, selected, onChange }: {
  items: readonly T[]; selected: T; onChange: (value: T) => void;
}) {
  return <View style={styles.chips}>{items.map(item => (
    <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: item === selected }}
      onPress={() => { tap(); onChange(item); }} style={[styles.chip, item === selected && styles.primary]}>
      <Text style={[styles.buttonText, item === selected && styles.primaryText]}>{item}</Text>
    </Pressable>
  ))}</View>;
}

export function Field(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.textSecondary} selectionColor={colors.location}
    {...props} style={[styles.field, props.style]} />;
}

export function Stat({ value, label }: { value: string | number; label: string }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.secondary}>{label}</Text></View>;
}

export const formatDistance = (meters: number) => meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(2)} km`;
const areaFormat = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
export const formatArea = (squareMeters: number) => `${areaFormat.format(squareMeters / 1_000_000)} km²`;
export const formatTime = (seconds: number) => seconds < 3600 ? `${Math.round(seconds / 60)} min` :
  `${Math.floor(seconds / 3600)} h ${Math.floor(seconds % 3600 / 60)} min`;

export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  pageContent: { paddingHorizontal: 18, paddingBottom: 30, gap: 16 },
  embedded: { gap: 15, paddingTop: 4 },
  pageHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  back: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1 },
  title: { color: colors.text, fontSize: 21, fontWeight: "700", letterSpacing: -0.5 },
  heading: { color: colors.text, fontSize: 14, fontWeight: "700" },
  text: { color: colors.text, fontSize: 13 },
  secondary: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
  section: { gap: 8 },
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 15, gap: 12 },
  button: { backgroundColor: colors.elevated, minHeight: 45, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 13,
    alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  buttonText: { color: colors.text, fontSize: 13, fontWeight: "700" },
  primary: { backgroundColor: colors.text },
  primaryText: { color: colors.background },
  danger: { backgroundColor: "#482020" },
  dim: { opacity: 0.6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: { backgroundColor: colors.elevated, paddingHorizontal: 12, minHeight: 42, justifyContent: "center", borderRadius: 12 },
  field: { backgroundColor: colors.elevated, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 11,
    minHeight: 46, color: colors.text, fontSize: 15 },
  stat: { flexGrow: 1, flexBasis: 86, gap: 3 },
  statValue: { color: colors.text, fontSize: 18, fontWeight: "700", letterSpacing: -0.4, fontVariant: ["tabular-nums"] },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
});
