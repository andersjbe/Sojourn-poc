import { api } from "@sojourn/backend/convex/_generated/api";
import type { Doc } from "@sojourn/backend/convex/_generated/dataModel";
import { DEFAULT_DELAY_HOURS } from "@sojourn/backend/convex/lib/constants";
import { parseTags } from "@sojourn/backend/convex/lib/tags";
import { useMutation } from "convex/react";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Button, Field, Label, Muted } from "@/components/ui";
import { errorMessage } from "@/lib/format";

const VISIBILITY: { value: Doc<"journeys">["visibility"]; label: string }[] = [
  { value: "public", label: "Public" },
  { value: "followers", label: "Followers" },
  { value: "unlisted", label: "Link only" },
  { value: "private", label: "Private" },
];
const DELAYS = [0, 12, 24, 48, 72];

export default function NewJourneyScreen() {
  const create = useMutation(api.journeys.create);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState<Doc<"journeys">["visibility"]>("public");
  const [delay, setDelay] = useState(DEFAULT_DELAY_HOURS);
  const [saving, setSaving] = useState(false);

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Field label="Title" value={title} onChangeText={setTitle} placeholder="Springer to Katahdin, 2027" />
      <Field label="About" value={description} onChangeText={setDescription} multiline style={{ minHeight: 80 }} />
      <Field label="Tags" value={tags} onChangeText={setTags} autoCapitalize="none" placeholder="#at #AppalachianTrail #nobo" />
      <Label>Who can see it</Label>
      <Segments options={VISIBILITY} value={visibility} onChange={setVisibility} />
      <Label>Safety delay</Label>
      <Segments options={DELAYS.map((d) => ({ value: d, label: `${d}h` }))} value={delay} onChange={setDelay} />
      <Muted>Entries stay hidden from everyone but you and your co-authors for this long. You can publish individual entries immediately.</Muted>
      <Button
        title="Create journey"
        loading={saving}
        onPress={async () => {
          setSaving(true);
          try {
            const id = await create({
              title,
              description,
              tags: parseTags(tags),
              visibility,
              delayHours: delay,
              status: "active",
            });
            router.replace({ pathname: "/journey/[id]", params: { id } });
          } catch (e) {
            Alert.alert("Couldn't create journey", errorMessage(e));
          } finally {
            setSaving(false);
          }
        }}
      />
    </ScrollView>
  );
}

function Segments<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segments}>
      {options.map((o) => (
        <Pressable
          key={String(o.value)}
          onPress={() => onChange(o.value)}
          style={[styles.segment, o.value === value && styles.segmentActive]}
        >
          <Text style={[styles.segmentText, o.value === value && styles.segmentTextActive]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: { padding: theme.spacing.md, gap: 14 },
  segments: { flexDirection: "row", borderWidth: 1, borderColor: theme.colors.border },
  segment: { flex: 1, paddingVertical: 10, alignItems: "center" },
  segmentActive: { backgroundColor: theme.colors.primary },
  segmentText: { color: theme.colors.foreground, fontSize: 13 },
  segmentTextActive: { color: theme.colors.primaryForeground, fontWeight: "600" },
}));
