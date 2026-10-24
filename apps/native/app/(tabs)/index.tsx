import { api } from "@sojourn/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { FlatList, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { AuthGate } from "@/components/auth-gate";
import { EntryCard } from "@/components/entry-card";
import { Empty, Loading } from "@/components/ui";

export default function FeedScreen() {
  return (
    <AuthGate>
      <Feed />
    </AuthGate>
  );
}

function Feed() {
  const feed = useQuery(api.feed.get, {});
  if (feed === undefined) return <Loading />;
  return (
    <FlatList
      data={feed}
      keyExtractor={(e) => e._id}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      ListEmptyComponent={<Empty title="Your feed is quiet." subtitle="Follow hikers from Explore to see their entries." />}
      renderItem={({ item }) => <EntryCard entry={item} journeyTitle={item.journeyTitle} />}
    />
  );
}

const styles = StyleSheet.create((theme) => ({
  list: { padding: theme.spacing.md },
}));
