import type { Id } from "@sojourn/backend/convex/_generated/dataModel";
import { MAX_PHOTOS_PER_ENTRY } from "@sojourn/backend/convex/lib/constants";
import type { LatLng } from "@sojourn/backend/convex/lib/paths";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { Alert, Pressable, Switch, Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { formatDateTime } from "@/lib/format";
import { getCurrentLocation } from "@/lib/location";
import { type PhotoMeta, compressPhoto, readPhotoMeta } from "@/lib/photos";

import { LocationPicker } from "./location-picker";
import { Button, Field, Label } from "./ui";

export type FormPhoto =
  | { kind: "existing"; id: Id<"_storage">; url: string }
  | { kind: "new"; uri: string; meta: PhotoMeta };

export type EntryFormValues = {
  body: string;
  recordedAt: number;
  location: LatLng;
  publishNow: boolean;
  photos: FormPhoto[];
};

export function EntryForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: {
    body: string | null;
    recordedAt: number;
    location: LatLng | null;
    publishNow: boolean;
    photos: { id: Id<"_storage">; url: string }[];
  };
  submitLabel: string;
  onSubmit: (values: EntryFormValues) => Promise<void>;
}) {
  const { theme } = useUnistyles();
  const [body, setBody] = useState(initial?.body ?? "");
  const [recordedAt, setRecordedAt] = useState(initial?.recordedAt ?? Date.now());
  const [location, setLocation] = useState<LatLng | null>(initial?.location ?? null);
  const [publishNow, setPublishNow] = useState(initial?.publishNow ?? false);
  const [photos, setPhotos] = useState<FormPhoto[]>(
    initial?.photos.map((p) => ({ kind: "existing" as const, ...p })) ?? [],
  );
  const [busy, setBusy] = useState(false);

  // New entries start at the current GPS position (works without signal).
  useEffect(() => {
    if (initial) return;
    getCurrentLocation()
      .then((loc) => setLocation((current) => current ?? loc))
      .catch(() => {});
  }, [initial]);

  async function addPhotos(source: "library" | "camera") {
    const room = MAX_PHOTOS_PER_ENTRY - photos.length;
    if (room <= 0) return;
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["images"],
      exif: true,
      quality: 1,
      allowsMultipleSelection: source === "library",
      selectionLimit: room,
    };
    if (source === "camera") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return;
    }
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled) return;
    setBusy(true);
    try {
      const added: FormPhoto[] = [];
      for (const asset of result.assets.slice(0, room)) {
        added.push({ kind: "new", uri: await compressPhoto(asset), meta: readPhotoMeta(asset) });
      }
      setPhotos((prev) => [...prev, ...added]);
      const withGps = added.find((p) => p.kind === "new" && p.meta.location);
      if (!initial && photos.length === 0 && withGps?.kind === "new") applyMeta(withGps.meta);
    } finally {
      setBusy(false);
    }
  }

  function applyMeta(meta: PhotoMeta) {
    if (meta.location) setLocation(meta.location);
    if (meta.takenAt) setRecordedAt(meta.takenAt);
  }

  function togglePublishNow(value: boolean) {
    if (!value) return setPublishNow(false);
    Alert.alert(
      "Publish this entry right away?",
      "Anyone who can see this journey will see this entry immediately — including exactly where you are right now — instead of after the usual delay.\n\nSolo hikers can be put at risk by sharing their live location. Only do this if you're comfortable with that.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Publish now", style: "destructive", onPress: () => setPublishNow(true) },
      ],
    );
  }

  async function submit() {
    if (!location) return Alert.alert("Set a location", "Drop a pin or use your current location.");
    if (!body.trim() && photos.length === 0) return Alert.alert("Empty entry", "Add some text or a photo.");
    setBusy(true);
    try {
      await onSubmit({ body, recordedAt, location, publishNow, photos });
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.form}>
      <Field
        label="Journal"
        multiline
        value={body}
        onChangeText={setBody}
        placeholder="Where did the trail take you today?"
      />

      <View style={styles.section}>
        <Label>
          Photos ({photos.length}/{MAX_PHOTOS_PER_ENTRY})
        </Label>
        <View style={styles.photos}>
          {photos.map((p, i) => (
            <View key={p.kind === "new" ? p.uri : p.id} style={styles.photoWrap}>
              <Image source={{ uri: p.kind === "new" ? p.uri : p.url }} style={styles.photo} contentFit="cover" />
              <Pressable style={styles.remove} onPress={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}>
                <Text style={styles.removeText}>✕</Text>
              </Pressable>
              {p.kind === "new" && (p.meta.location || p.meta.takenAt) ? (
                <Pressable style={styles.useMeta} onPress={() => applyMeta(p.meta)}>
                  <Text style={styles.useMetaText}>Use place/time</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
        {photos.length < MAX_PHOTOS_PER_ENTRY && (
          <View style={styles.row}>
            <Button small variant="outline" title="Camera" onPress={() => addPhotos("camera")} style={{ flex: 1 }} />
            <Button small variant="outline" title="Library" onPress={() => addPhotos("library")} style={{ flex: 1 }} />
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Label>When</Label>
        <Text style={styles.mono}>{formatDateTime(recordedAt)}</Text>
      </View>

      <View style={styles.section}>
        <Label>Where</Label>
        <LocationPicker value={location} onChange={setLocation} />
      </View>

      <View style={styles.shareRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.shareTitle}>Publish this entry now</Text>
          <Text style={styles.shareHint}>
            By default entries are shown to the public only after this journey's safety delay.
          </Text>
        </View>
        <Switch
          value={publishNow}
          onValueChange={togglePublishNow}
          trackColor={{ true: theme.colors.destructive, false: theme.colors.border }}
        />
      </View>

      <Button title={submitLabel} onPress={submit} loading={busy} />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  form: { gap: theme.spacing.lg },
  section: { gap: 8 },
  photos: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  photoWrap: { width: "31%", aspectRatio: 1 },
  photo: { width: "100%", height: "100%", borderWidth: 1, borderColor: theme.colors.border },
  remove: { position: "absolute", top: 2, right: 2, backgroundColor: theme.colors.background, paddingHorizontal: 5 },
  removeText: { color: theme.colors.foreground },
  useMeta: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: theme.colors.primary, padding: 2 },
  useMetaText: { color: theme.colors.primaryForeground, fontSize: 10, textAlign: "center" },
  row: { flexDirection: "row", gap: 8 },
  mono: { fontFamily: theme.fonts.mono, color: theme.colors.foreground },
  shareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.muted,
    padding: 12,
  },
  shareTitle: { fontWeight: "600", color: theme.colors.foreground },
  shareHint: { color: theme.colors.mutedForeground, fontSize: theme.fontSize.xs, marginTop: 2 },
}));
