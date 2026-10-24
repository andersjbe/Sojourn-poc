import { type StyleSpecification, setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";

// MapLibre resolves its worker relative to its own module, which breaks once
// bundled; point it at the (self-contained) worker file emitted by Vite.
setWorkerUrl(workerUrl);

/** OpenTopoMap raster tiles: contour lines and trails, a paper-map look. */
export const TOPO_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    topo: {
      type: "raster",
      tiles: ["a", "b", "c"].map((s) => `https://${s}.tile.opentopomap.org/{z}/{x}/{y}.png`),
      tileSize: 256,
      maxzoom: 17,
      attribution:
        'Map data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Style © <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    },
  },
  layers: [{ id: "topo", type: "raster", source: "topo", paint: { "raster-saturation": -0.35 } }],
};
