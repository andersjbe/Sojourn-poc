import { UrlTile } from "react-native-maps";

/** OpenTopoMap tiles (contours and trails) for a paper-map look. Attribution: © OpenStreetMap contributors, © OpenTopoMap (CC-BY-SA). */
export function TopoTiles() {
  return (
    <UrlTile
      urlTemplate="https://a.tile.opentopomap.org/{z}/{x}/{y}.png"
      maximumZ={17}
      shouldReplaceMapContent
      tileSize={256}
    />
  );
}
