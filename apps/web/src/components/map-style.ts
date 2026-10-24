import type { StyleSpecification } from "maplibre-gl";

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
