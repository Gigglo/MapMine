import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight, MapPin, Plus, Search, X } from "lucide-react-native";
import { router } from "expo-router";
import { Button, Chips, Field, Page, styles, tap } from "../components/ui/primitives";
import PlacePanel, { categories, PlaceIcon, type PlaceSelection } from "../features/places/PlacePanel";
import { report, updatePreferences, useSession } from "../store/session";
import { colors } from "../theme/color";

const filters = ["All", ...categories] as const;

export default function PlacesScreen({ onSheetBack, onShowMap }: { onSheetBack?: () => void; onShowMap?: () => void } = {}) {
  const back = onSheetBack ?? (() => router.navigate("/"));
  const showMap = onShowMap ?? back;
  const places = useSession(state => state.places);
  const fix = useSession(state => state.fix);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof filters)[number]>("All");
  const [selection, setSelection] = useState<PlaceSelection | null>(null);
  const filtered = places.filter(place => (category === "All" || place.category === category) &&
    [place.name, place.category, place.notes].join(" ").toLowerCase().includes(query.trim().toLowerCase()));

  return <Page title="Places" embedded={Boolean(onSheetBack)} onBack={back}
    action={<Button label="Add" onPress={() => fix ? setSelection({ point: fix }) : showMap()}
      icon={<Plus size={15} color={colors.text} />} />}>
    <View style={local.search}>
      <Search size={17} color={colors.textSecondary} />
      <Field value={query} onChangeText={setQuery} placeholder="Search places" accessibilityLabel="Search places"
        returnKeyType="search" style={local.searchInput} />
      {query.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Clear search"
        onPress={() => setQuery("")} style={local.clear}><X size={17} color={colors.textSecondary} /></Pressable>}
    </View>
    <Chips items={filters} selected={category} onChange={setCategory} />
    {filtered.length ? <View style={local.list}>{filtered.map((place, index) => <Pressable key={place.id} accessibilityRole="button"
      style={({ pressed }) => [local.place, index > 0 && local.divider, pressed && styles.dim]}
      onPress={() => { tap(); setSelection({ point: place, place }); }}>
      <View style={local.icon}><PlaceIcon icon={place.icon} /></View>
      <View style={styles.flex}><Text style={styles.text}>{place.name}</Text><Text style={styles.secondary}>{place.category}</Text></View>
      <ChevronRight color={colors.textSecondary} size={16} />
    </Pressable>)}</View> : <View style={local.empty}>
      <MapPin size={25} color={colors.textSecondary} />
      <Text style={styles.heading}>{places.length ? "No matching places" : "Make the map yours"}</Text>
      <Text style={styles.secondary}>{places.length ? "Try a different search or category." : "Long-press a point on the map or save your current location."}</Text>
      {!places.length && <Button label="Open map" onPress={showMap} />}
    </View>}
    {selection && <PlacePanel selection={selection} onClose={() => setSelection(null)} onMap={place => {
      setSelection(null);
      useSession.setState({ target: place, following: false });
      const mode = useSession.getState().preferences.mode;
      if (mode === "heatmap" || mode === "normal") void updatePreferences({ mode: "places" }).catch(report);
      showMap();
    }} />}
  </Page>;
}

const local = StyleSheet.create({
  search: { flexDirection: "row", alignItems: "center", paddingLeft: 13, backgroundColor: colors.surface, borderRadius: 13 },
  searchInput: { ...styles.flex, backgroundColor: "transparent", paddingHorizontal: 10, fontSize: 14 },
  clear: { width: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  list: { backgroundColor: colors.surface, borderRadius: 15, paddingHorizontal: 12 },
  place: { flexDirection: "row", minHeight: 62, alignItems: "center", gap: 12, paddingVertical: 8 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  icon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.elevated, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "flex-start", gap: 10, backgroundColor: colors.surface, borderRadius: 18, padding: 18 },
});
