import { type LatLng, PATH_COLORS, boundsOf, buildPath } from "@sojourn/backend/convex/lib/paths";
import { cn } from "@sojourn/ui/lib/utils";
import { useEffect, useMemo, useRef } from "react";
import Map, { Layer, type MapRef, Marker, NavigationControl, Source } from "react-map-gl/maplibre";

import { TOPO_STYLE } from "./map-style";

export type MapEntry = {
  _id: string;
  authorId: string;
  recordedAt: number;
  location: LatLng | null;
};

/** All entries joined with one straight-segment line in time order; markers colored by author. */
export function JourneyMap({
  entries,
  selectedId,
  onSelect,
  className,
}: {
  entries: MapEntry[];
  selectedId?: string | null;
  onSelect?: (entryId: string) => void;
  className?: string;
}) {
  const mapRef = useRef<MapRef>(null);
  const path = useMemo(() => buildPath(entries), [entries]);
  const colorFor = useMemo(() => {
    const authors = [...new Set(entries.map((e) => e.authorId))];
    const colors = new globalThis.Map(authors.map((id, i) => [id, PATH_COLORS[i % PATH_COLORS.length]]));
    return (authorId: string) => colors.get(authorId) ?? PATH_COLORS[0];
  }, [entries]);
  const located = entries.filter((e): e is MapEntry & { location: LatLng } => e.location !== null);
  const bounds = boundsOf(located.map((e) => e.location));

  const geojson = useMemo(
    () => ({
      type: "Feature" as const,
      properties: {},
      geometry: { type: "LineString" as const, coordinates: path.map((c) => [c.lng, c.lat]) },
    }),
    [path],
  );

  // Fit to the whole route whenever the set of points changes.
  const boundsKey = bounds?.join(",");
  useEffect(() => {
    if (bounds) mapRef.current?.fitBounds(bounds, { padding: 48, maxZoom: 13, duration: 600 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundsKey]);

  // Pan to the selected entry.
  useEffect(() => {
    const entry = located.find((e) => e._id === selectedId);
    if (entry) mapRef.current?.easeTo({ center: [entry.location.lng, entry.location.lat], duration: 500 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return (
    <div className={cn("relative overflow-hidden border border-border", className)}>
      <Map
        ref={mapRef}
        mapStyle={TOPO_STYLE}
        initialViewState={
          bounds
            ? { bounds, fitBoundsOptions: { padding: 48, maxZoom: 13 } }
            : { longitude: -98.5, latitude: 39.8, zoom: 3 }
        }
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="top-right" showCompass={false} />
        <Source id="paths" type="geojson" data={geojson}>
          <Layer
            id="paths-casing"
            type="line"
            paint={{ "line-color": "#f2ebdd", "line-width": 6 }}
            layout={{ "line-join": "miter", "line-cap": "butt" }}
          />
          <Layer
            id="paths-line"
            type="line"
            paint={{ "line-color": PATH_COLORS[0], "line-width": 3, "line-dasharray": [2, 1] }}
            layout={{ "line-join": "miter", "line-cap": "butt" }}
          />
        </Source>
        {located.map((entry) => (
          <Marker
            key={entry._id}
            longitude={entry.location.lng}
            latitude={entry.location.lat}
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onSelect?.(entry._id);
            }}
          >
            <button
              type="button"
              aria-label="Show entry"
              className={cn(
                "block size-3.5 rotate-45 border-2 border-[#f2ebdd] shadow-sm transition-transform",
                entry._id === selectedId && "scale-150",
              )}
              style={{ backgroundColor: colorFor(entry.authorId) }}
            />
          </Marker>
        ))}
      </Map>
      {located.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="bg-card/90 px-3 py-2 font-mono text-xs text-muted-foreground">
            No locations to show yet
          </p>
        </div>
      )}
    </div>
  );
}
