import { api } from "@sojourn/backend/convex/_generated/api";
import type { Id } from "@sojourn/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Alert, FlatList, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { EntryCard } from "@/components/entry-card";
import { JourneyMap } from "@/components/journey-map";
import { Button, Card, Field, Loading, Muted, Tag } from "@/components/ui";
import { errorMessage, formatDateTime } from "@/lib/format";
import { useOutbox } from "@/lib/outbox";

export default function JourneyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const journeyId = id as Id<"journeys">;
  const data = useQuery(api.journeys.get, { journeyId });
  const entries = useQuery(api.entries.listForJourney, { journeyId });
  const me = useQuery(api.profiles.me);
  const invite = useMutation(api.members.invite);
  const outbox = useOutbox();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const listRef = useRef<FlatList>(null);

  if (data === undefined || entries === undefined) return <Loading />;
  if (data === null || entries === null) {
    return <Muted>This journey is private or doesn't exist.</Muted>;
  }
  const { journey, access, members } = data;
  const newestFirst = [...entries].reverse();
  const pending = outbox.items.filter((i) => i.journeyId === journeyId);
  const authors = members.filter((m) => m.status === "active" && m.profile);

  return (
    <>
      <Stack.Screen options={{ title: journey.title }} />
      <FlatList
        ref={listRef}
        data={newestFirst}
        keyExtractor={(e) => e._id}
        contentContainerStyle={styles.container}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>{journey.title}</Text>
            <Muted mono>
              {authors.map((m) => m.profile!.trailName ?? m.profile!.displayName).join(" & ")}
              {journey.startedOn ? ` · from ${journey.startedOn}` : ""}
            </Muted>
            {journey.description ? <Text style={styles.description}>{journey.description}</Text> : null}
            {journey.tags.length > 0 && (
              <View style={styles.tags}>
                {journey.tags.map((t) => (
                  <Tag key={t} label={t} />
                ))}
              </View>
            )}
            <JourneyMap
              entries={entries}
              selectedId={selectedId}
              onSelect={(entryId) => {
                setSelectedId(entryId);
                const index = newestFirst.findIndex((e) => e._id === entryId);
                if (index >= 0) listRef.current?.scrollToIndex({ index, viewPosition: 0.3 });
              }}
            />
            {!access.isMember && (
              <Muted mono>Locations appear {journey.locationDelayHours}h after posting, for the hikers' safety.</Muted>
            )}
            {access.isMember && (
              <Button
                title="Write an entry"
                onPress={() => router.push({ pathname: "/compose", params: { journeyId, journeyTitle: journey.title } })}
              />
            )}
            {access.role === "owner" && (
              <Card style={{ gap: 8 }}>
                <Muted>Hiking with someone? Invite them as a co-author.</Muted>
                <Field value={username} onChangeText={setUsername} placeholder="@username" autoCapitalize="none" />
                <Button
                  small
                  variant="outline"
                  title="Invite"
                  onPress={async () => {
                    try {
                      await invite({ journeyId, username });
                      setUsername("");
                      Alert.alert("Invite sent");
                    } catch (e) {
                      Alert.alert("Couldn't invite", errorMessage(e));
                    }
                  }}
                />
              </Card>
            )}
            {pending.map((p) => (
              <Card key={p.clientId} style={styles.pending}>
                <Muted mono>⧗ Waiting for signal · {formatDateTime(p.recordedAt)}</Muted>
                {p.body ? <Text style={styles.description} numberOfLines={3}>{p.body}</Text> : null}
              </Card>
            ))}
          </View>
        }
        ListEmptyComponent={<Muted>No entries yet.</Muted>}
        onScrollToIndexFailed={() => {}}
        renderItem={({ item }) => (
          <EntryCard
            entry={item}
            selected={item._id === selectedId}
            canEdit={item.authorId === me?.userId}
            onPress={() => setSelectedId(item._id)}
          />
        )}
      />
    </>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: { padding: theme.spacing.md },
  header: { gap: 12, marginBottom: 16 },
  title: { fontFamily: theme.fonts.serif, fontSize: 30, color: theme.colors.foreground },
  description: { fontFamily: theme.fonts.serif, color: theme.colors.foreground, lineHeight: 22 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  pending: { gap: 4, borderStyle: "dashed", borderColor: theme.colors.warning },
}));
