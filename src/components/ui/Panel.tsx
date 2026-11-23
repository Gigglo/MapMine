import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { colors } from "../../theme/color";
import { styles } from "./primitives";

export default function Panel({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const { bottom, top } = useSafeAreaInsets();
  return <Modal transparent animationType="none" onRequestClose={onClose} statusBarTranslucent visible>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={panel.root}>
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss panel" onPress={onClose} style={StyleSheet.absoluteFill} />
      <View accessibilityViewIsModal style={[panel.surface, { paddingBottom: Math.max(14, bottom), marginTop: top + 12 }]}>
        <View style={panel.header}>
          <Text accessibilityRole="header" style={styles.heading}>{title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={panel.close}>
            <X size={20} color={colors.text} />
          </Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={panel.content}>{children}</ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

const panel = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0008", justifyContent: "flex-end" },
  surface: { backgroundColor: colors.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, maxHeight: "88%" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 8 },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  content: { padding: 20, paddingTop: 8, gap: 12 },
});
