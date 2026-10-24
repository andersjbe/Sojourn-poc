import type { LatLng } from "@sojourn/backend/convex/lib/paths";
import { Button } from "@sojourn/ui/components/button";
import { Crosshair } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Map, { type MapRef, Marker, NavigationControl } from "react-map-gl/maplibre";
import { toast } from "sonner";

import { formatCoords } from "@/lib/format";
import { getCurrentLocation } from "@/lib/geolocation";

import { TOPO_STYLE } from "./map-style";

/** Click the map or drag the pin to set/correct an entry's location. */
export function LocationPicker({
  value,
  onChange,
}: {
  value: LatLng | null;
  onChange: (value: LatLng) => void;
}) {
  const mapRef = useRef<MapRef>(null);
  const [locating, setLocating] = useState(false);

  // Follow values set from outside (e.g. a photo's EXIF location).
  useEffect(() => {
    const map = mapRef.current;
    if (!value || !map) return;
    if (!map.getBounds().contains([value.lng, value.lat])) {
      map.flyTo({ center: [value.lng, value.lat], zoom: Math.max(map.getZoom(), 11) });
    }
  }, [value]);

  async function useMyLocation() {
    setLocating(true);
    try {
      const loc = await getCurrentLocation();
      onChange(loc);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't get your location.");
    } finally {
      setLocating(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="h-64 border border-border">
        <Map
          ref={mapRef}
          mapStyle={TOPO_STYLE}
          initialViewState={
            value
              ? { longitude: value.lng, latitude: value.lat, zoom: 11 }
              : { longitude: -98.5, latitude: 39.8, zoom: 3 }
          }
          style={{ width: "100%", height: "100%" }}
          cursor="crosshair"
          onClick={(e) => onChange({ lat: e.lngLat.lat, lng: e.lngLat.lng })}
        >
          <NavigationControl position="top-right" showCompass={false} />
          {value && (
            <Marker
              longitude={value.lng}
              latitude={value.lat}
              draggable
              onDragEnd={(e) => onChange({ lat: e.lngLat.lat, lng: e.lngLat.lng })}
            >
              <div className="size-4 rotate-45 border-2 border-[#f2ebdd] bg-destructive shadow" />
            </Marker>
          )}
        </Map>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-muted-foreground">
          {value ? formatCoords(value) : "Tap the map to drop a pin"}
        </span>
        <Button type="button" variant="outline" size="sm" onClick={useMyLocation} disabled={locating}>
          <Crosshair />
          {locating ? "Locating…" : "Use my location"}
        </Button>
      </div>
    </div>
  );
}
