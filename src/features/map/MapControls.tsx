import { StyleSheet, View } from "react-native";
import { Compass, Layers3, LocateFixed, Minus, Plus } from "lucide-react-native";
import IconButton from "../../components/ui/IconButton";
import { colors } from "../../theme/color";

export default function MapControls({ onZoom, onReset, onLayers, onLocate, onFollow, following, compact }: {
  onZoom: (amount: 1 | -1) => void; onReset: () => void; onLayers: () => void;
  onLocate: () => void; onFollow: () => void; following: boolean; compact: boolean;
}) {
  return <View style={styles.controls}>
    <IconButton label={following ? "Following location" : "Recenter on your location"} onPress={onLocate}
      onLongPress={onFollow}>
      <LocateFixed color={following ? colors.success : colors.text} size={20} />
    </IconButton>
    <IconButton label="Map layers" onPress={onLayers}><Layers3 color={colors.text} size={19} /></IconButton>
    <IconButton label="Reset compass" onPress={onReset}><Compass color={colors.text} size={20} /></IconButton>
    {!compact && <View style={styles.zoom}>
      <IconButton label="Zoom in" onPress={() => onZoom(1)}><Plus color={colors.text} size={20} /></IconButton>
      <IconButton label="Zoom out" onPress={() => onZoom(-1)}><Minus color={colors.text} size={20} /></IconButton>
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  controls: { gap: 7, alignItems: "flex-end" },
  zoom: { gap: 3 },
});
