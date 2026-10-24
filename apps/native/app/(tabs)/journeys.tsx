import { api } from "@sojourn/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Link, router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { AuthGate } from "@/components/auth-gate";
import { JourneyCard } from "@/components/journey-card";
import { Button, Card, Label, Muted } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { type CachedJourney, loadJourneyCache, saveJourneyCache } from "@/lib/journey-cache";
import { useOutbox } from "@/lib/outbox";

export default function JourneysScreen() {
  return (
    <AuthGate>
      <MyJourneys />
    </AuthGate>
  );
}

function MyJourneys() {
  const data = useQuery(api.journeys.listMine);
  const respond = useMutation(api.members.respond);
  const outbox = useOutbox();
  const [cached, setCached] = useState<CachedJourney[]>([]);

  // Remember journeys so entries can be written without signal.
  useEffect(() => {
    if (data) void saveJourneyCache(data.journeys);
    else void loadJourneyCache().then(setCached);
  }, [data]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Button title="New journey" onPress={() => router.push("/journey/new")} />

      {outbox.items.length > 0 && (
        <Card style={styles.outbox}>
          <Label>Waiting for signal ({outbox.items.length})</Label>
          {outbox.items.map((item) => (
            <View key={item.clientId} style={styles.outboxRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.outboxTitle}>{item.journeyTitle}</Text>
                <Muted mono>{formatDateTime(item.recordedAt)}</Muted>
                {item.error ? <Text style={styles.error}>{item.error}</Text> : null}
              </View>
              {item.error ? (
                <Button
                  small
                  variant="outline"
                  title="Discard"
                  onPress={() =>
                    Alert.alert("Discard entry?", "It couldn't be posted and will be deleted from this phone.", [
                      { text: "Keep", style: "cancel" },
                      { text: "Discard", style: "destructive", onPress: () => outbox.discard(item.clientId) },
                    ])
                  }
                />
              ) : null}
            </View>
          ))}
          <Button small variant="outline" title={outbox.syncing ? "Syncing…" : "Try now"} onPress={outbox.sync} />
        </Card>
      )}

      {data?.invites.map(({ journey, invitedBy }) => (
        <Card key={journey._id} style={styles.invite}>
          <Text style={styles.inviteText}>
            {invitedBy?.trailName ?? invitedBy?.displayName} invited you to co-author “{journey.title}”
          </Text>
          <View style={styles.row}>
            <Button small title="Join" onPress={() => respond({ journeyId: journey._id, accept: true })} />
            <Button small variant="outline" title="Decline" onPress={() => respond({ journeyId: journey._id, accept: false })} />
          </View>
        </Card>
      ))}

      {data ? (
        data.journeys.length === 0 ? (
          <Muted>No journeys yet. Start one before you hit the trail.</Muted>
        ) : (
          data.journeys.map((j) => (
            <View key={j._id} style={{ gap: 6 }}>
              <JourneyCard journey={j} />
              <Button
                small
                variant="outline"
                title="Write entry"
                onPress={() => router.push({ pathname: "/compose", params: { journeyId: j._id, journeyTitle: j.title } })}
              />
            </View>
          ))
        )
      ) : (
        // Offline: we can still write entries to journeys we know about.
        <>
          <Muted>Offline — entries you write will post when you have signal.</Muted>
          {cached.map((j) => (
            <Link key={j._id} href={{ pathname: "/compose", params: { journeyId: j._id, journeyTitle: j.title } }}>
              <Text style={styles.cached}>✎ {j.title}</Text>
            </Link>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: { padding: theme.spacing.md, gap: 12 },
  outbox: { gap: 10, borderColor: theme.colors.warning },
  outboxRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  outboxTitle: { fontFamily: theme.fonts.serif, color: theme.colors.foreground },
  error: { color: theme.colors.destructive, fontSize: 12 },
  invite: { gap: 8, borderColor: theme.colors.primary },
  inviteText: { color: theme.colors.foreground },
  row: { flexDirection: "row", gap: 8 },
  cached: { fontFamily: theme.fonts.serif, fontSize: 18, color: theme.colors.foreground, paddingVertical: 8 },
}));
