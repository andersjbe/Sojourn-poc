import { api } from "@sojourn/backend/convex/_generated/api";
import type { Id } from "@sojourn/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { File, UploadType } from "expo-file-system";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, ScrollView } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { EntryForm } from "@/components/entry-form";
import { Button, Loading, Muted } from "@/components/ui";
import { errorMessage } from "@/lib/format";

/** Editing needs a connection (unlike creating, which is queued offline). */
export default function EditEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const entryId = id as Id<"entries">;
  const data = useQuery(api.entries.get, { entryId });
  const update = useMutation(api.entries.update);
  const remove = useMutation(api.entries.remove);
  const generateUploadUrl = useMutation(api.entries.generateUploadUrl);

  if (data === undefined) return <Loading />;
  if (!data?.canEdit) return <Muted>You can only edit your own entries.</Muted>;

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <EntryForm
        initial={data.entry}
        submitLabel="Save changes"
        onSubmit={async (values) => {
          try {
            const photoIds: Id<"_storage">[] = [];
            for (const photo of values.photos) {
              if (photo.kind === "existing") {
                photoIds.push(photo.id);
                continue;
              }
              const result = await new File(photo.uri).upload(await generateUploadUrl(), {
                httpMethod: "POST",
                uploadType: UploadType.BINARY_CONTENT,
                headers: { "Content-Type": "image/jpeg" },
              });
              photoIds.push(JSON.parse(result.body).storageId);
            }
            await update({
              entryId,
              body: values.body,
              recordedAt: values.recordedAt,
              location: values.location,
              shareLocationNow: values.shareLocationNow,
              photoIds,
            });
            router.back();
          } catch (e) {
            Alert.alert("Couldn't save", errorMessage(e));
          }
        }}
      />
      <Button
        variant="destructive"
        title="Delete entry"
        onPress={() =>
          Alert.alert("Delete this entry?", "The entry and its photos will be permanently deleted.", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: async () => {
                await remove({ entryId });
                router.back();
              },
            },
          ])
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: { padding: theme.spacing.md, gap: 24 },
}));
