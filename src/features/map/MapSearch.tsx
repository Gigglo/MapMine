import { useEffect, useRef, useState, type ComponentRef } from "react";
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Landmark as LandmarkIcon, MapPin, Search, X } from "lucide-react-native";
import { styles, tap } from "../../components/ui/primitives";
import type { Place } from "../../database/repository";
import { landmarks, type Landmark } from "../landmarks/catalog";
import { searchIndiaLandmarks } from "../landmarks/indiaCatalog";
import { PlaceIcon } from "../places/PlacePanel";
import type { Point } from "../exploration/engine";
import { formatCoordinates, parseCoordinates } from "./coordinates";
import { eggForSearch } from "../easterEggs/catalog";
import { discoverEgg } from "../easterEggs/discovery";
import { colors } from "../../theme/color";

export default function MapSearch({ places, onPlace, onLandmark, onPoint }: {
  places: Place[]; onPlace: (place: Place) => void; onLandmark: (landmark: Landmark) => void; onPoint: (point: Point) => void;
}) {
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<{ query: string; places: Landmark[]; failed: boolean } | null>(null);
  const point = parseCoordinates(query);
  const egg = eggForSearch(query);
  const isCoordinate = Boolean(point);
  const term = query.trim().toLowerCase();
  const saved = places.filter(place => [place.name, place.category].some(text => text.toLowerCase().includes(term))).slice(0, 5);
  const world = term.length >= 2 ? landmarks.filter(place => place.name.toLowerCase().includes(term)).slice(0, 5) : [];
  const india = results?.query === term ? results.places : [];
  const publicResults = [...world, ...india].slice(0, 12);

  useEffect(() => {
    if (!focused || isCoordinate || term.length < 2) return;
    let active = true;
    const timer = setTimeout(() => {
      searchIndiaLandmarks(term).then(places => {
        if (active) setResults({ query: term, places, failed: false });
      }).catch(() => {
        if (active) setResults({ query: term, places: [], failed: true });
      });
    }, 180);
    return () => { active = false; clearTimeout(timer); };
  }, [focused, isCoordinate, term]);

  function select(callback: () => void) {
    tap();
    input.current?.blur();
    setFocused(false);
    Keyboard.dismiss();
    callback();
  }

  function submit() {
    if (point) select(() => onPoint(point));
    else if (saved[0]) select(() => onPlace(saved[0]));
    else if (publicResults[0]) select(() => onLandmark(publicResults[0]));
    else if (egg) select(() => void discoverEgg(egg, true));
  }

  return <View style={local.container}>
    <View style={[local.field, focused && local.focused]}>
      <Search size={17} color={colors.textSecondary} />
      <TextInput ref={input} value={query} onChangeText={setQuery} maxLength={90}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onSubmitEditing={submit}
        submitBehavior="submit" returnKeyType="search" autoCorrect={false} autoCapitalize="none"
        accessibilityLabel="Search places or coordinates" placeholder="Search places or coordinates"
        placeholderTextColor={colors.textSecondary} style={local.input} />
      {query.length > 0 && <Pressable onPress={() => { setQuery(""); input.current?.focus(); }}
        accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={8} style={local.clear}>
        <X color={colors.textSecondary} size={15} />
      </Pressable>}
    </View>
    {focused && (term.length > 0 || saved.length > 0) && <ScrollView style={local.results} keyboardShouldPersistTaps="always">
      {point ? <Pressable accessibilityRole="button" onPress={() => select(() => onPoint(point))} style={local.result}>
        <MapPin size={18} color={colors.text} />
        <View style={styles.flex}><Text style={styles.text}>Show coordinates on map</Text>
          <Text style={styles.secondary}>{formatCoordinates(point)}</Text></View>
      </Pressable> : <>
      {saved.map(place => <Pressable key={"saved-" + place.id} accessibilityRole="button"
        onPress={() => select(() => onPlace(place))} style={local.result}>
        <PlaceIcon icon={place.icon} />
        <View style={styles.flex}><Text numberOfLines={1} style={styles.text}>{place.name}</Text>
          <Text style={styles.secondary}>Saved · {place.category}</Text></View>
      </Pressable>)}
      {publicResults.map(place => <Pressable key={place.id} accessibilityRole="button"
        onPress={() => select(() => onLandmark(place))} style={local.result}>
        <LandmarkIcon size={17} color={colors.textSecondary} />
        <View style={styles.flex}><Text numberOfLines={1} style={styles.text}>{place.name}</Text>
          <Text style={styles.secondary}>{place.category}</Text></View>
      </Pressable>)}
      {egg && <Pressable accessibilityRole="button" onPress={() => select(() => void discoverEgg(egg, true))} style={local.result}>
        <Search size={17} color={colors.textSecondary} />
        <Text style={styles.text}>Follow this lead</Text>
      </Pressable>}
      {!egg && !saved.length && !publicResults.length && <Text style={[styles.secondary, local.message]}>
        {term.length < 2 ? "Enter at least two characters." : results?.query !== term ? "Searching…" :
          results.failed ? "The location catalog could not be opened." : "No matching places."}
      </Text>}
      </>}
    </ScrollView>}
  </View>;
}

const local = StyleSheet.create({
  container: { flex: 1 },
  field: { flexDirection: "row", alignItems: "center", minHeight: 48, gap: 9, paddingHorizontal: 13,
    borderRadius: 15, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surface },
  focused: { borderColor: colors.textSecondary },
  input: { flex: 1, color: colors.text, fontSize: 13, paddingVertical: 0, minHeight: 44 },
  clear: { minWidth: 23, alignItems: "center", justifyContent: "center" },
  results: { marginTop: 6, maxHeight: 239,
    backgroundColor: colors.surface, borderRadius: 15, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth,
    zIndex: 10, elevation: 8 },
  result: { minHeight: 48, flexDirection: "row", alignItems: "center", paddingVertical: 6, paddingHorizontal: 12, gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  message: { padding: 12 },
});
