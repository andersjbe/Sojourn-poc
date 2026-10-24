import { api } from "@sojourn/backend/convex/_generated/api";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Stack, useLocalSearchParams } from "expo-router";
import { Alert, ScrollView, Text } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { JourneyCard } from "@/components/journey-card";
import { Button, Label, Loading, Muted } from "@/components/ui";
import { errorMessage } from "@/lib/format";

export default function ProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const data = useQuery(api.profiles.getByUsername, { username });
  const { isAuthenticated } = useConvexAuth();
  const follow = useMutation(api.follows.follow);
  const unfollow = useMutation(api.follows.unfollow);

  if (data === undefined) return <Loading />;
  if (data === null) return <Muted>No hiker named @{username}.</Muted>;
  const { profile } = data;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: `@${profile.username}` }} />
      <Text style={styles.name}>{profile.trailName ?? profile.displayName}</Text>
      <Muted mono>
        @{profile.username} · {data.followerCount} followers · {data.followingCount} following
      </Muted>
      {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
      {!data.isSelf && isAuthenticated && profile.profileVisibility !== "private" && (
        <Button
          variant={data.followStatus ? "outline" : "primary"}
          title={
            data.followStatus === "accepted"
              ? "Following"
              : data.followStatus === "pending"
                ? "Requested"
                : profile.profileVisibility === "approval"
                  ? "Request to follow"
                  : "Follow"
          }
          onPress={async () => {
            try {
              if (data.followStatus) await unfollow({ userId: profile.userId });
              else await follow({ userId: profile.userId });
            } catch (e) {
              Alert.alert("Couldn't follow", errorMessage(e));
            }
          }}
        />
      )}
      <Label>Journeys</Label>
      {data.journeys.length === 0 ? (
        <Muted>Nothing to show yet.</Muted>
      ) : (
        data.journeys.map((j) => <JourneyCard key={j._id} journey={j} />)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: { padding: theme.spacing.md, gap: 12 },
  name: { fontFamily: theme.fonts.serif, fontSize: 34, color: theme.colors.foreground },
  bio: { fontFamily: theme.fonts.serif, color: theme.colors.foreground, lineHeight: 22 },
}));
