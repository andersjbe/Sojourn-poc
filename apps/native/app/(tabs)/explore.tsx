import { api } from "@sojourn/backend/convex/_generated/api";
import { normalizeTag } from "@sojourn/backend/convex/lib/tags";
import { useQuery } from "convex/react";
import { Link } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { JourneyCard } from "@/components/journey-card";
import { Field, Label, Loading, Muted } from "@/components/ui";

export default function ExploreScreen() {
  const [tagInput, setTagInput] = useState("");
  const [tag, setTag] = useState("");
  const [people, setPeople] = useState("");
  const byTag = useQuery(api.journeys.listByTag, tag ? { tag } : "skip");
  const recent = useQuery(api.journeys.listRecent, tag ? "skip" : {});
  const hikers = useQuery(api.profiles.search, people.trim() ? { q: people } : "skip");
  const journeys = tag ? byTag : recent;

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Field
        label="Search a tag"
        value={tagInput}
        onChangeText={setTagInput}
        onSubmitEditing={() => setTag(normalizeTag(tagInput))}
        returnKeyType="search"
        autoCapitalize="none"
        placeholder="#at, #pnt, #hayduke…"
      />
      <Label>{tag ? `#${tag}` : "Recently started"}</Label>
      {journeys === undefined ? (
        <Loading />
      ) : journeys.length === 0 ? (
        <Muted>No journeys here yet.</Muted>
      ) : (
        journeys.map((j) => <JourneyCard key={j._id} journey={j} />)
      )}

      <View style={styles.divider} />
      <Field label="Find hikers" value={people} onChangeText={setPeople} autoCapitalize="none" placeholder="@username" />
      {hikers?.map((h) => (
        <Link key={h.userId} href={{ pathname: "/u/[username]", params: { username: h.username } }}>
          <Text style={styles.hiker}>
            {h.trailName ?? h.displayName} <Text style={styles.handle}>@{h.username}</Text>
          </Text>
        </Link>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: { padding: theme.spacing.md, gap: 12 },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 8 },
  hiker: { color: theme.colors.foreground, fontSize: theme.fontSize.base, paddingVertical: 6 },
  handle: { fontFamily: theme.fonts.mono, fontSize: 12, color: theme.colors.mutedForeground },
}));
