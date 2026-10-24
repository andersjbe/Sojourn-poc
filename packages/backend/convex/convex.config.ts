import betterAuth from "@convex-dev/better-auth/convex.config";
import geospatial from "@convex-dev/geospatial/convex.config.js";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(betterAuth);
app.use(geospatial);

export default app;
