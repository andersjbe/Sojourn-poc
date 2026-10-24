import AsyncStorage from "@react-native-async-storage/async-storage";

/** Last-known list of journeys the user can post to, so composing works offline. */
const KEY = "sojourn.myJourneys.v1";

export type CachedJourney = { _id: string; title: string };

export async function saveJourneyCache(journeys: CachedJourney[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(journeys.map(({ _id, title }) => ({ _id, title }))));
}

export async function loadJourneyCache(): Promise<CachedJourney[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as CachedJourney[]) : [];
}
