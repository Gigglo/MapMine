import { useEffect, useState } from "react";
import { Alert, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { Bookmark, Briefcase, Camera, ChevronDown, Coffee, Dumbbell, GraduationCap, House, MapPin, Pencil, Share2, ShoppingBag, SlidersHorizontal, Utensils, X } from "lucide-react-native";
import { usePostHog } from "posthog-react-native";
import Panel from "../../components/ui/Panel";
import { Button, Chips, Field, formatTime, styles, tap } from "../../components/ui/primitives";
import { deletePlace, maxPlacePhotos, readPlacePhotos, readVisits, savePlace, type Place, type Visit } from "../../database/repository";
import MemoryImage from "./MemoryImage";
import { choosePlacePhoto } from "./placePhoto";
import { formatCoordinates } from "../map/coordinates";
import type { Point } from "../exploration/engine";
import { refresh } from "../../store/session";
import { colors } from "../../theme/color";

export const categories = ["Home", "Work", "School", "Fitness", "Food", "Shopping", "Favourite", "Other"] as const;
const icons = { Pin: MapPin, House, Briefcase, Coffee, Dumbbell, GraduationCap, ShoppingBag, Utensils };
const iconNames = Object.keys(icons) as (keyof typeof icons)[];
export type PlaceSelection = { point: Point; place?: Place };
export function PlaceIcon({ icon, size = 19, color = colors.text }: { icon: string; size?: number; color?: string }) {
  const Icon = Object.hasOwn(icons, icon) ? icons[icon as keyof typeof icons] : MapPin;
  return <Icon size={size} color={color} />;
}

export default function PlacePanel({ selection, onClose, onMap, onSaved }: {
  selection: PlaceSelection; onClose: () => void; onMap?: (place: Place) => void; onSaved?: () => void;
}) {
  const posthog = usePostHog();
  const { point, place } = selection;
  const [editing, setEditing] = useState(!place);
  const [name, setName] = useState(place?.name ?? "");
  const [category, setCategory] = useState(place?.category ?? "Other");
  const [icon, setIcon] = useState(place?.icon ?? "Pin");
  const [notes, setNotes] = useState(place?.notes ?? "");
  const [radius, setRadius] = useState(String(place?.radius ?? 65));
  const [dwell, setDwell] = useState(String(place?.dwell ?? 90));
  const [photos, setPhotos] = useState<string[]>([]);
  const [photosReady, setPhotosReady] = useState(!place);
  const [photosChanged, setPhotosChanged] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [expandedPhoto, setExpandedPhoto] = useState<number | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!place) return;
    let live = true;
    void readPlacePhotos(place.id).then(value => {
      if (live) { setPhotos(value); setPhotosReady(true); }
    }).catch(() => { if (live) setError("Photos could not be loaded."); });
    readVisits(place.id).then(value => { if (live) setVisits(value); })
      .catch(() => { if (live) setError("Visit history could not be loaded."); });
    return () => { live = false; };
  }, [place]);

  async function addPhoto() {
    setBusy(true);
    setError("");
    try {
      const photo = await choosePlacePhoto();
      if (photo) {
        setPhotos(current => [...current, photo].slice(0, maxPlacePhotos));
        setPhotosChanged(true);
      }
    } catch {
      setError("Could not add that photo. Try another image.");
    } finally { setBusy(false); }
  }

  const photoGallery = photos.length > 0 && <View style={local.gallery}>
    {photos.map((photo, index) => <View key={index} style={local.photo}>
      <Pressable accessibilityRole="button" accessibilityLabel={`View memory photo ${index + 1}`}
        accessibilityState={{ selected: expandedPhoto === index }} disabled={editing}
        onPress={() => setExpandedPhoto(expandedPhoto === index ? null : index)}>
        <MemoryImage jpeg={photo} style={local.image} resizeMode="cover" fallback={<View style={local.image} />} />
      </Pressable>
      {index === 0 && <View pointerEvents="none" style={local.cover}><MapPin size={12} color={colors.text} /></View>}
      {editing && <Pressable accessibilityRole="button" accessibilityLabel={`Remove photo ${index + 1}`}
        disabled={busy} style={local.remove} onPress={() => {
          setPhotos(current => current.filter((_, i) => i !== index));
          setPhotosChanged(true);
        }}><X size={14} color={colors.text} /></Pressable>}
    </View>)}
  </View>;

  async function submit() {
    const meters = Number(radius);
    const seconds = Number(dwell);
    if (!name.trim() || !Number.isInteger(meters) || meters < 25 || meters > 300 ||
      !Number.isInteger(seconds) || seconds < 15 || seconds > 900) {
      if (name.trim()) setAdvanced(true);
      setError("Enter a name, a radius of 25–300 m, and a dwell time of 15–900 seconds.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await savePlace({ ...point, name, category, icon, notes, radius: meters, dwell: seconds }, place?.id, photosChanged ? photos : undefined);
      await refresh(true);
      if (!place) posthog.capture("place_saved");
      onSaved?.();
      onClose();
    } catch {
      setError("Could not save this place. Try again.");
    } finally { setBusy(false); }
  }

  function remove() {
    if (!place) return;
    Alert.alert("Delete saved place?", "This also deletes its memory, photos, and recorded visits.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => {
        setBusy(true);
        deletePlace(place.id).then(() => refresh(true)).then(onClose)
          .catch(() => setError("Could not delete this place. Try again.")).finally(() => setBusy(false));
      } },
    ]);
  }

  return <Panel title={editing ? (place ? "Edit place" : "Save a place") : name} onClose={onClose}>
    <View style={styles.row}><MapPin size={14} color={colors.textSecondary} />
      <Text style={styles.secondary}>{point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}</Text></View>
    {editing ? <>
      <Field value={name} onChangeText={setName} placeholder="Place name" accessibilityLabel="Place name" maxLength={70} />
      <Text style={styles.heading}>Category</Text>
      <Chips items={categories} selected={category} onChange={setCategory} />
      <Text style={styles.heading}>Marker icon</Text>
      <View style={local.icons}>{iconNames.map(value => {
        const selected = value === icon;
        return <Pressable key={value} accessibilityRole="button" accessibilityLabel={value + " marker"}
          accessibilityState={{ selected }} disabled={busy}
          style={[local.icon, selected && local.selectedIcon]} onPress={() => { tap(); setIcon(value); }}>
          <PlaceIcon icon={value} size={17} color={selected ? colors.background : colors.text} />
        </Pressable>;
      })}</View>
      <Text style={styles.heading}>Memory</Text>
      <Field value={notes} onChangeText={setNotes} placeholder="A short description" accessibilityLabel="Memory description"
        maxLength={Math.max(280, place?.notes.length ?? 0)} multiline />
      {photoGallery}
      {photosReady && photos.length < maxPlacePhotos && <Button label={`Add photo (${photos.length}/${maxPlacePhotos})`}
        icon={<Camera size={15} color={colors.text} />} disabled={busy} onPress={() => void addPhoto()} />}
      {photos.length > 0 && <Text style={styles.secondary}>The first photo appears on the map.</Text>}
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: advanced }} style={local.advanced}
        onPress={() => setAdvanced(value => !value)}>
        <SlidersHorizontal size={15} color={colors.textSecondary} />
        <Text style={[styles.text, styles.flex]}>Visit settings</Text>
        <ChevronDown size={16} color={colors.textSecondary} style={advanced ? { transform: [{ rotate: "180deg" }] } : undefined} />
      </Pressable>
      {advanced && <View style={styles.wrap}>
        <View style={styles.stat}><Text style={styles.secondary}>Visit radius (m)</Text><Field value={radius} onChangeText={setRadius} keyboardType="number-pad" accessibilityLabel="Visit radius in meters" maxLength={3} /></View>
        <View style={styles.stat}><Text style={styles.secondary}>Dwell (seconds)</Text><Field value={dwell} onChangeText={setDwell} keyboardType="number-pad" accessibilityLabel="Dwell in seconds" maxLength={3} /></View>
      </View>}
      <Button label="Save place" kind="primary" icon={<Bookmark size={16} color={colors.background} />}
        onPress={() => void submit()} disabled={busy || !name.trim()} />
    </> : <>
      <View style={styles.row}><PlaceIcon icon={icon} /><Text style={styles.text}>{category}</Text></View>
      {(notes || photos.length > 0) && <Text style={styles.heading}>Memory</Text>}
      {notes ? <Text style={styles.text}>{notes}</Text> : null}
      {photoGallery}
      {expandedPhoto !== null && photos[expandedPhoto] && <MemoryImage style={local.largePhoto}
        jpeg={photos[expandedPhoto]} resizeMode="contain"
        accessibilityLabel={`Memory photo ${expandedPhoto + 1}, enlarged`} />}
      <Button label="Share coordinates" icon={<Share2 size={15} color={colors.text} />} onPress={() => {
        setError("");
        posthog.capture("button_pressed", { button_name: "share_coordinates" });
        void Share.share({ message: formatCoordinates(point) })
          .catch(() => setError("Could not share these coordinates."));
      }} />
      {place && onMap && <Button label="Show on map" icon={<MapPin size={15} color={colors.text} />} onPress={() => onMap(place)} />}
      <Button label="Edit place" icon={<Pencil size={15} color={colors.text} />} onPress={() => { setExpandedPhoto(null); setEditing(true); }} />
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

const local = StyleSheet.create({
  icons: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  icon: { width: 44, height: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    backgroundColor: colors.surface, justifyContent: "center", alignItems: "center" },
  selectedIcon: { backgroundColor: colors.text, borderColor: colors.text },
  advanced: { ...styles.row, minHeight: 44, paddingHorizontal: 4, borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border },
  gallery: { flexDirection: "row", gap: 8 },
  photo: { flex: 1, maxWidth: "50%", gap: 6 },
  cover: { position: "absolute", left: 5, bottom: 5, width: 24, height: 24, backgroundColor: "#111",
    borderRadius: 5, alignItems: "center", justifyContent: "center" },
  remove: { position: "absolute", right: 3, top: 3, width: 44, height: 44, backgroundColor: "#171717dd",
    borderRadius: 12, alignItems: "center", justifyContent: "center" },
  largePhoto: { width: "100%", height: 260, borderRadius: 12, backgroundColor: colors.elevated },
  image: { width: "100%", aspectRatio: 1, borderRadius: 12, backgroundColor: colors.elevated },
});
