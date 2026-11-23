import { useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Trophy } from "lucide-react-native";
import { colors } from "../../theme/color";
import { badges } from "./badges";
import type { Milestone } from "./milestones";

export default function BadgeImage({ id, size, muted = false, onReady }: {
  id: Milestone["id"]; size: number; muted?: boolean; onReady?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const source = badges[id];
  return <View style={[local.frame, { width: size, height: size, borderRadius: size * 0.23 }, muted && local.muted]}>
    {!source || failed ? <View onLayout={onReady}><Trophy size={size * 0.46} color={colors.text} /></View>
      : <Image source={source} style={local.image} resizeMode="cover" fadeDuration={0} onLoad={onReady}
        accessible={false} onError={() => setFailed(true)} />}
  </View>;
}

const local = StyleSheet.create({
  frame: { backgroundColor: colors.elevated, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  image: { width: "100%", height: "100%" },
  muted: { opacity: 0.65 },
});
