import { Pressable, StyleSheet } from "react-native";
import type { ReactNode } from "react";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { tap } from "./primitives";
import { colors } from "../../theme/color";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const pressSpring = { damping: 24, stiffness: 340, mass: 0.65 };

export default function IconButton({ children, onPress, onLongPress, size = 46, label }: {
  children: ReactNode; onPress: () => void; onLongPress?: () => void; size?: number; label: string;
}) {
  const scale = useSharedValue(1);
  const animation = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return <AnimatedPressable accessibilityRole="button" accessibilityLabel={label}
    onLongPress={onLongPress ? () => { tap(); onLongPress(); } : undefined}
    accessibilityActions={onLongPress ? [{ name: "longpress", label: "Toggle follow location" }] : undefined}
    onAccessibilityAction={event => { if (event.nativeEvent.actionName === "longpress") onLongPress?.(); }}
    style={[styles.button, { width: size, height: size }, animation]}
    onPressIn={() => scale.set(withSpring(0.95, pressSpring))}
    onPressOut={() => scale.set(withSpring(1, pressSpring))}
    onPress={() => { tap(); onPress(); }}>
    {children}
  </AnimatedPressable>;
}
const styles = StyleSheet.create({
  button: { backgroundColor: colors.surface, borderRadius: 15, borderWidth: 1,
    borderColor: colors.border, alignItems: "center", justifyContent: "center" },
});
