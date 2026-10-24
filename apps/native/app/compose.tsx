import type { Id } from "@sojourn/backend/convex/_generated/dataModel";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, Text } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { EntryForm } from "@/components/entry-form";
import { useOutbox } from "@/lib/outbox";

/** New entries always go through the outbox, so they work with or without signal. */
export default function ComposeScreen() {
  const { journeyId, journeyTitle } = useLocalSearchParams<{ journeyId: string; journeyTitle: string }>();
  const outbox = useOutbox();

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.journey}>{journeyTitle}</Text>
      <EntryForm
        submitLabel="Save entry"
        onSubmit={async (values) => {
          await outbox.add({
            journeyId: journeyId as Id<"journeys">,
            journeyTitle,
            recordedAt: values.recordedAt,
            location: values.location,
            body: values.body.trim() || undefined,
            publishNow: values.publishNow,
            photoUris: values.photos.flatMap((p) => (p.kind === "new" ? [p.uri] : [])),
          });
          router.back();
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: { padding: theme.spacing.md, gap: 12 },
  journey: { fontFamily: theme.fonts.serif, fontStyle: "italic", fontSize: 18, color: theme.colors.mutedForeground },
}));
