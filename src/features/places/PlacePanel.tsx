import { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import { Briefcase, Coffee, Dumbbell, GraduationCap, House, MapPin, ShoppingBag, Utensils } from "lucide-react-native";
import Panel from "../../components/ui/Panel";
import { Button, Chips, Field, formatTime, styles } from "../../components/ui/primitives";
import { deletePlace, readVisits, savePlace, type Place, type Visit } from "../../database/repository";
import type { Point } from "../exploration/engine";
import { refresh } from "../../store/session";
import { colors } from "../../theme/color";

export const categories = ["Home", "Work", "School", "Fitness", "Food", "Shopping", "Favourite", "Other"] as const;
const icons = { Pin: MapPin, House, Briefcase, Coffee, Dumbbell, GraduationCap, ShoppingBag, Utensils };
const iconNames = Object.keys(icons) as (keyof typeof icons)[];
export type PlaceSelection = { point: Point; place?: Place };
export function PlaceIcon({ icon }: { icon: string }) {
  const Icon = Object.hasOwn(icons, icon) ? icons[icon as keyof typeof icons] : MapPin;
  return <Icon size={19} color={colors.text} />;
}

export default function PlacePanel({ selection, onClose, onMap }: {
  selection: PlaceSelection; onClose: () => void; onMap?: (place: Place) => void;
}) {
  const { point, place } = selection;
  const [editing, setEditing] = useState(!place);
  const [name, setName] = useState(place?.name ?? "");
  const [category, setCategory] = useState(place?.category ?? "Other");
  const [icon, setIcon] = useState(place?.icon ?? "Pin");
  const [notes, setNotes] = useState(place?.notes ?? "");
  const [radius, setRadius] = useState(String(place?.radius ?? 65));
  const [dwell, setDwell] = useState(String(place?.dwell ?? 90));
  const [visits, setVisits] = useState<Visit[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!place) return;
    let live = true;
    readVisits(place.id).then(value => { if (live) setVisits(value); })
      .catch(() => { if (live) setError("Visit history could not be loaded."); });
    return () => { live = false; };
  }, [place]);

  async function submit() {
    const meters = Number(radius);
    const seconds = Number(dwell);
    if (!name.trim() || !Number.isInteger(meters) || meters < 25 || meters > 300 ||
      !Number.isInteger(seconds) || seconds < 15 || seconds > 900) {
      setError("Enter a name, a radius of 25–300 m, and a dwell time of 15–900 seconds.");
      return;
    }
    setBusy(true);
    try {
      await savePlace({ ...point, name, category, icon, notes, radius: meters, dwell: seconds }, place?.id);
      await refresh(true);
      onClose();
    } catch {
      setError("Could not save this place. Try again.");
    } finally { setBusy(false); }
  }

  function remove() {
    if (!place) return;
    Alert.alert("Delete saved place?", "This also deletes its recorded visits.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => {
        setBusy(true);
        deletePlace(place.id).then(() => refresh(true)).then(onClose)
          .catch(() => setError("Could not delete this place. Try again.")).finally(() => setBusy(false));
      } },
    ]);
  }

  return <Panel title={editing ? (place ? "Edit place" : "Save a place") : name} onClose={onClose}>
    <Text style={styles.secondary}>{point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}</Text>
    {editing ? <>
      <Field value={name} onChangeText={setName} placeholder="Place name" accessibilityLabel="Place name" maxLength={70} />
      <Text style={styles.heading}>Category</Text>
      <Chips items={categories} selected={category} onChange={setCategory} />
      <Text style={styles.heading}>Marker icon</Text>
      <Chips items={iconNames} selected={icon} onChange={setIcon} />
      <Field value={notes} onChangeText={setNotes} placeholder="Private notes" accessibilityLabel="Private notes" maxLength={800} multiline />
      <View style={styles.wrap}>
        <View style={styles.stat}><Text style={styles.secondary}>Visit radius (m)</Text><Field value={radius} onChangeText={setRadius} keyboardType="number-pad" accessibilityLabel="Visit radius in meters" maxLength={3} /></View>
        <View style={styles.stat}><Text style={styles.secondary}>Dwell (seconds)</Text><Field value={dwell} onChangeText={setDwell} keyboardType="number-pad" accessibilityLabel="Dwell in seconds" maxLength={3} /></View>
      </View>
      <Button label="Save place" kind="primary" onPress={() => void submit()} disabled={busy} />
    </> : <>
      <View style={styles.row}><PlaceIcon icon={icon} /><Text style={styles.text}>{category}</Text></View>
      {notes ? <Text style={styles.text}>{notes}</Text> : null}
      {place && onMap && <Button label="Show on map" onPress={() => onMap(place)} />}
      <Button label="Edit place" onPress={() => setEditing(true)} />
      <Text style={styles.heading}>Recent visits</Text>
      {visits.length ? visits.map(visit => <View key={visit.entered} style={styles.row}>
        <Text style={[styles.text, styles.flex]}>{new Date(visit.entered).toLocaleString()}</Text>
        <Text style={styles.secondary}>{formatTime(visit.seconds)}</Text>
      </View>) : <Text style={styles.secondary}>Visits appear after you spend time here while tracking.</Text>}
      <Button label="Delete place" kind="danger" disabled={busy} onPress={remove} />
    </>}
    {error ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text> : null}
  </Panel>;
}
