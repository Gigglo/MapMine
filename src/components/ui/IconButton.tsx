import { Pressable, StyleSheet } from "react-native";
import type { ReactNode } from "react";
import { tap } from "./primitives";
import { colors } from "../../theme/color";

export default function IconButton({ children, onPress, onLongPress, size = 46, label }: {
  children: ReactNode; onPress: () => void; onLongPress?: () => void; size?: number; label: string;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label}
    onLongPress={onLongPress ? () => { tap(); onLongPress(); } : undefined}
    accessibilityActions={onLongPress ? [{ name: "longpress", label: "Toggle follow location" }] : undefined}
    onAccessibilityAction={event => { if (event.nativeEvent.actionName === "longpress") onLongPress?.(); }}
    style={({ pressed }) => [styles.button, { width: size, height: size }, pressed && { opacity: 0.65 }]}
    onPress={() => { tap(); onPress(); }}>
    {children}
  </Pressable>;
}
const styles = StyleSheet.create({
  button: { backgroundColor: colors.surface, borderRadius: 15, borderWidth: 1,
    borderColor: colors.border, alignItems: "center", justifyContent: "center" },
});
