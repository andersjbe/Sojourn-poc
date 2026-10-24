/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as entries from "../entries.js";
import type * as feed from "../feed.js";
import type * as follows from "../follows.js";
import type * as healthCheck from "../healthCheck.js";
import type * as http from "../http.js";
import type * as journeys from "../journeys.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_constants from "../lib/constants.js";
import type * as lib_entryView from "../lib/entryView.js";
import type * as lib_geo from "../lib/geo.js";
import type * as lib_paths from "../lib/paths.js";
import type * as lib_tags from "../lib/tags.js";
import type * as members from "../members.js";
import type * as profiles from "../profiles.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  entries: typeof entries;
  feed: typeof feed;
  follows: typeof follows;
  healthCheck: typeof healthCheck;
  http: typeof http;
  journeys: typeof journeys;
  "lib/access": typeof lib_access;
  "lib/constants": typeof lib_constants;
  "lib/entryView": typeof lib_entryView;
  "lib/geo": typeof lib_geo;
  "lib/paths": typeof lib_paths;
  "lib/tags": typeof lib_tags;
  members: typeof members;
  profiles: typeof profiles;
}>;

export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
  geospatial: import("@convex-dev/geospatial/_generated/component.js").ComponentApi<"geospatial">;
};
