import type { api } from "@sojourn/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { formatCoords, formatDateTime } from "@/lib/format";

export type EntryView = NonNullable<FunctionReturnType<typeof api.entries.listForJourney>>[number];

export function EntryCard({
  entry,
  journeyTitle,
  selected,
  canEdit,
  onPress,
}: {
  entry: EntryView;
  journeyTitle?: string;
  selected?: boolean;
  canEdit?: boolean;
  onPress?: () => void;
}) {
  const status = entry.releaseStatus;
  return (
    <Pressable onPress={onPress} style={[styles.card, selected && styles.selected]}>
      <View style={styles.header}>
        <View style={{ flexShrink: 1 }}>
          {entry.author && (
            <Link href={{ pathname: "/u/[username]", params: { username: entry.author.username } }}>
              <Text style={styles.author}>{entry.author.trailName ?? entry.author.displayName}</Text>
            </Link>
          )}
          {journeyTitle && (
            <Link href={{ pathname: "/journey/[id]", params: { id: entry.journeyId } }}>
              <Text style={styles.journey}>{journeyTitle}</Text>
            </Link>
          )}
        </View>
        <Text style={styles.mono}>{formatDateTime(entry.recordedAt)}</Text>
      </View>
      {entry.body ? <Text style={styles.body}>{entry.body}</Text> : null}
      {entry.photos.length > 0 && (
        <View style={styles.photos}>
          {entry.photos.map((p) => (
            <Image
              key={p.id}
              source={{ uri: p.url }}
              style={[styles.photo, entry.photos.length === 1 && styles.photoSingle]}
              contentFit="cover"
            />
          ))}
        </View>
      )}
      <View style={styles.footer}>
        <Text style={styles.mono}>
          ◆ {formatCoords(entry.location)}
        </Text>
        {status && !status.isPublic && <Text style={styles.mono}>⧗ Public {formatDateTime(status.releaseAt)}</Text>}
        {status && entry.publishNow && <Text style={[styles.mono, styles.live]}>published immediately</Text>}
        {canEdit && (
          <Link href={{ pathname: "/entry/[id]/edit", params: { id: entry._id } }}>
            <Text style={[styles.mono, styles.edit]}>Edit</Text>
          </Link>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderLeftWidth: 4,
    padding: theme.spacing.md,
    gap: 10,
  },
  selected: { borderColor: theme.colors.primary },
  header: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  author: { fontWeight: "600", color: theme.colors.foreground, fontSize: theme.fontSize.base },
  journey: { fontFamily: theme.fonts.serif, fontStyle: "italic", color: theme.colors.mutedForeground },
  body: { fontFamily: theme.fonts.serif, fontSize: 16, lineHeight: 24, color: theme.colors.foreground },
  photos: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  photo: { width: "32%", aspectRatio: 1, borderWidth: 1, borderColor: theme.colors.border },
  photoSingle: { width: "100%", aspectRatio: 4 / 3 },
  footer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8 },
  mono: { fontFamily: theme.fonts.mono, fontSize: 11, color: theme.colors.mutedForeground },
  live: { color: theme.colors.destructive },
  edit: { color: theme.colors.primary, textDecorationLine: "underline" },
}));
