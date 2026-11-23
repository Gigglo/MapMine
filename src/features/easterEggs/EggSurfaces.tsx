import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Compass } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "../../components/ui/primitives";
import Panel from "../../components/ui/Panel";
import { readEasterEggs } from "../../database/repository";
import { colors } from "../../theme/color";
import { eggs, interfaceEggs } from "./catalog";
import { discoverEgg, useEggToast } from "./discovery";

export function EggToast() {
  const egg = useEggToast(state => state.egg);
  const { top } = useSafeAreaInsets();
  useEffect(() => {
    if (!egg) return;
    const timer = setTimeout(() => useEggToast.setState({ egg: null }), 6500);
    return () => clearTimeout(timer);
  }, [egg]);
  if (!egg) return null;
  return <View pointerEvents="none" accessibilityLiveRegion="polite" style={[local.toast, { top: top + 10 }]}>
    <Compass size={20} color={colors.text} />
    <View style={styles.flex}>
      <Text style={styles.heading}>{egg.title}</Text>
      <Text style={styles.secondary}>{egg.text}</Text>
    </View>
  </View>;
}

export function EggJournal({ onClose }: { onClose: () => void }) {
  const [found, setFound] = useState<string[]>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    void discoverEgg(interfaceEggs.journal).then(readEasterEggs).then(rows => {
      if (active) setFound(rows.map(row => row.id));
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);

  return <Panel title="Field journal" onClose={onClose}>
    {failed ? <Text style={styles.secondary}>Could not open the journal.</Text> : !found
      ? <Text style={styles.secondary}>Opening the journal...</Text> : <>
        <Text style={styles.secondary}>{found.length} of {eggs.length} discoveries</Text>
        {found.map(id => {
          const egg = eggs.find(item => item.id === id);
          return egg && <View key={id} style={local.entry}>
            <Text style={styles.heading}>{egg.title}</Text><Text style={styles.secondary}>{egg.text}</Text>
          </View>;
        })}
      </>}
  </Panel>;
}

const local = StyleSheet.create({
  toast: { position: "absolute", left: 16, right: 16, zIndex: 30, elevation: 12, flexDirection: "row",
    gap: 12, alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1,
    backgroundColor: colors.surface, borderColor: colors.textSecondary },
  entry: { paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, gap: 3 },
});
