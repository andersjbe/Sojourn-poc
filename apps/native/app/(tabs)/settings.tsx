import { api } from "@sojourn/backend/convex/_generated/api";
import type { Doc } from "@sojourn/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { AuthGate } from "@/components/auth-gate";
import { Button, Card, Field, Label, Loading, Muted } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { errorMessage } from "@/lib/format";

export default function SettingsScreen() {
  return (
    <AuthGate>
      <Settings />
    </AuthGate>
  );
}

const PRIVACY: { value: Doc<"profiles">["profileVisibility"]; label: string; hint: string }[] = [
  { value: "public", label: "Open", hint: "Anyone can follow you." },
  { value: "approval", label: "Approve followers", hint: "You approve each follow request." },
  { value: "private", label: "Private", hint: "No followers; not listed in search." },
];

function Settings() {
  const me = useQuery(api.profiles.me);
  const requests = useQuery(api.follows.requests);
  const respond = useMutation(api.follows.respond);
  if (!me?.profile || requests === undefined) return <Loading />;
  const profile = me.profile;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Button
        variant="outline"
        title={`View @${profile.username}`}
        onPress={() => router.push({ pathname: "/u/[username]", params: { username: profile.username } })}
      />
      {requests.length > 0 && (
        <Card style={{ gap: 8 }}>
          <Label>Follow requests</Label>
          {requests.map((r) => (
            <View key={r.userId} style={styles.row}>
              <Text style={styles.text}>{r.trailName ?? r.displayName}</Text>
              <View style={styles.row}>
                <Button small title="Approve" onPress={() => respond({ followerId: r.userId, accept: true })} />
                <Button small variant="outline" title="Decline" onPress={() => respond({ followerId: r.userId, accept: false })} />
              </View>
            </View>
          ))}
        </Card>
      )}
      <ProfileForm profile={profile} />
      <Button variant="ghost" title="Sign out" onPress={() => authClient.signOut()} />
    </ScrollView>
  );
}

function ProfileForm({ profile }: { profile: Doc<"profiles"> }) {
  const update = useMutation(api.profiles.update);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [trailName, setTrailName] = useState(profile.trailName ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [visibility, setVisibility] = useState(profile.profileVisibility);
  const [saving, setSaving] = useState(false);

  return (
    <Card style={{ gap: 14 }}>
      <Field label="Name" value={displayName} onChangeText={setDisplayName} />
      <Field label="Trail name" value={trailName} onChangeText={setTrailName} />
      <Field label="Bio" value={bio} onChangeText={setBio} multiline style={{ minHeight: 80 }} />
      <Label>Who can follow you</Label>
      {PRIVACY.map((p) => (
        <Pressable
          key={p.value}
          onPress={() => setVisibility(p.value)}
          style={[styles.option, visibility === p.value && styles.optionActive]}
        >
          <Text style={styles.text}>{p.label}</Text>
          <Muted>{p.hint}</Muted>
        </Pressable>
      ))}
      <Button
        title="Save profile"
        loading={saving}
        onPress={async () => {
          setSaving(true);
          try {
            await update({ displayName, trailName, bio, profileVisibility: visibility });
          } catch (e) {
            Alert.alert("Couldn't save", errorMessage(e));
          } finally {
            setSaving(false);
          }
        }}
      />
    </Card>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: { padding: theme.spacing.md, gap: 12 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  text: { color: theme.colors.foreground, fontWeight: "600" },
  option: { borderWidth: 1, borderColor: theme.colors.border, padding: 10, gap: 2 },
  optionActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.muted },
}));
