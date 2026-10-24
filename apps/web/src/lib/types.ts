import type { api } from "@sojourn/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

export type EntryView = NonNullable<FunctionReturnType<typeof api.entries.listForJourney>>[number];
export type FeedItem = FunctionReturnType<typeof api.feed.get>[number];
export type JourneyListItem = FunctionReturnType<typeof api.journeys.listRecent>[number];
