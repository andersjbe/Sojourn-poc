import { type LatLng, PATH_COLORS, buildAuthorPaths } from "@sojourn/backend/convex/lib/paths";
import { useEffect, useMemo, useRef } from "react";
import { Text, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { StyleSheet } from "react-native-unistyles";

import { TopoTiles } from "./map-tiles";

export type MapEntry = { _id: string; authorId: string; recordedAt: number; location: LatLng | null };

/** Entries joined with straight lines in time order, one line per author. */
export function JourneyMap({
  entries,
  selectedId,
  onSelect,
}: {
  entries: MapEntry[];
  selectedId?: string | null;
  onSelect?: (entryId: string) => void;
}) {
  const mapRef = useRef<MapView>(null);
  const paths = useMemo(() => buildAuthorPaths(entries), [entries]);
  const colors = useMemo(
    () => new Map(paths.map((p, i) => [p.authorId, PATH_COLORS[i % PATH_COLORS.length]])),
    [paths],
  );
  const located = entries.filter((e): e is MapEntry & { location: LatLng } => e.location !== null);
  const key = located.map((e) => e._id).join(",");

  useEffect(() => {
    if (located.length === 0) return;
    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(
        located.map((e) => ({ latitude: e.location.lat, longitude: e.location.lng })),
        { edgePadding: { top: 48, right: 48, bottom: 48, left: 48 }, animated: true },
      );
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <View style={styles.container}>
      <MapView ref={mapRef} style={StyleSheet.absoluteFill} mapType="none" toolbarEnabled={false}>
        <TopoTiles />
        {paths.map((p) => (
          <Polyline
            key={p.authorId}
            coordinates={p.coords.map((c) => ({ latitude: c.lat, longitude: c.lng }))}
            strokeColor={colors.get(p.authorId)}
            strokeWidth={3}
            lineDashPattern={[8, 4]}
          />
        ))}
        {located.map((e) => (
          <Marker
            key={e._id}
            coordinate={{ latitude: e.location.lat, longitude: e.location.lng }}
            onPress={() => onSelect?.(e._id)}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View
              style={[
                styles.marker,
                { backgroundColor: colors.get(e.authorId) },
                e._id === selectedId && styles.markerSelected,
              ]}
            />
          </Marker>
        ))}
      </MapView>
      {located.length === 0 && (
        <View style={styles.overlay} pointerEvents="none">
          <Text style={styles.overlayText}>No locations to show yet</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: { height: 300, borderWidth: 1, borderColor: theme.colors.border, overflow: "hidden" },
  marker: {
    width: 14,
    height: 14,
    borderWidth: 2,
    borderColor: "#F2EBDD",
    transform: [{ rotate: "45deg" }],
  },
  markerSelected: { width: 20, height: 20 },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  overlayText: {
    backgroundColor: theme.colors.card,
    color: theme.colors.mutedForeground,
    fontFamily: theme.fonts.mono,
    fontSize: theme.fontSize.xs,
    padding: 8,
  },
}));
