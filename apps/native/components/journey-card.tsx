import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Tag } from "./ui";

const STATUS_LABEL = { planned: "PLANNED", active: "ON TRAIL", completed: "COMPLETED" } as const;

export function JourneyCard({
  journey,
}: {
  journey: {
    _id: string;
    title: string;
    tags: string[];
    status: keyof typeof STATUS_LABEL;
    visibility: string;
    startedOn?: string;
    owner?: { displayName: string; trailName: string | null } | null;
    role?: string;
  };
}) {
  return (
    <Link href={{ pathname: "/journey/[id]", params: { id: journey._id } }} asChild>
      <Pressable style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.title}>{journey.title}</Text>
          <Text style={styles.status}>{STATUS_LABEL[journey.status]}</Text>
        </View>
        <Text style={styles.meta}>
          {journey.owner ? `by ${journey.owner.trailName ?? journey.owner.displayName}` : ""}
          {journey.startedOn ? ` · from ${journey.startedOn}` : ""}
          {journey.role === "author" ? " · co-author" : ""}
          {journey.visibility !== "public" ? ` · ${journey.visibility}` : ""}
        </Text>
        {journey.tags.length > 0 && (
          <View style={styles.tags}>
            {journey.tags.map((t) => (
              <Tag key={t} label={t} />
            ))}
          </View>
        )}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border, padding: 14, gap: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  title: { fontFamily: theme.fonts.serif, fontSize: theme.fontSize.lg, color: theme.colors.foreground, flexShrink: 1 },
  status: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 4,
    paddingVertical: 1,
    color: theme.colors.foreground,
  },
  meta: { fontFamily: theme.fonts.mono, fontSize: 11, color: theme.colors.mutedForeground },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
}));
