import type { LatLng } from "@sojourn/backend/convex/lib/paths";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { StyleSheet } from "react-native-unistyles";

import { formatCoords } from "@/lib/format";
import { getCurrentLocation } from "@/lib/location";

import { TopoTiles } from "./map-tiles";
import { Button } from "./ui";

/** Tap the map or drag the pin to set/correct an entry's location. */
export function LocationPicker({ value, onChange }: { value: LatLng | null; onChange: (v: LatLng) => void }) {
  const mapRef = useRef<MapView>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (value) {
      mapRef.current?.animateCamera({ center: { latitude: value.lat, longitude: value.lng } }, { duration: 400 });
    }
  }, [value]);

  async function useMyLocation() {
    setLocating(true);
    setError(null);
    try {
      onChange(await getCurrentLocation());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't get your location.");
    } finally {
      setLocating(false);
    }
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.map}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          mapType="none"
          initialRegion={
            value
              ? { latitude: value.lat, longitude: value.lng, latitudeDelta: 0.1, longitudeDelta: 0.1 }
              : { latitude: 39.8, longitude: -98.5, latitudeDelta: 40, longitudeDelta: 40 }
          }
          onPress={(e) => onChange({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude })}
        >
          <TopoTiles />
          {value && (
            <Marker
              draggable
              coordinate={{ latitude: value.lat, longitude: value.lng }}
              onDragEnd={(e) =>
                onChange({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude })
              }
              pinColor="#A4532B"
            />
          )}
        </MapView>
      </View>
      <View style={styles.row}>
        <Text style={styles.coords}>{value ? formatCoords(value) : "Tap the map to drop a pin"}</Text>
        <Button small variant="outline" title={locating ? "Locating…" : "Use my location"} onPress={useMyLocation} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  wrapper: { gap: 8 },
  map: { height: 220, borderWidth: 1, borderColor: theme.colors.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  coords: { fontFamily: theme.fonts.mono, fontSize: theme.fontSize.xs, color: theme.colors.mutedForeground },
  error: { color: theme.colors.destructive, fontSize: theme.fontSize.sm },
}));
