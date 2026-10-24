import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "@sojourn/backend/convex/_generated/api";
import type { Id } from "@sojourn/backend/convex/_generated/dataModel";
import type { LatLng } from "@sojourn/backend/convex/lib/paths";
import { ConvexError } from "convex/values";
import { useConvex, useConvexAuth } from "convex/react";
import * as Crypto from "expo-crypto";
import { Directory, File, Paths, UploadType } from "expo-file-system";
import * as Network from "expo-network";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

/**
 * Offline-first entry creation. Every new entry is written here first (with
 * its compressed photos copied into app storage) and uploaded when there's
 * signal. `entries.create` is idempotent on `clientId`, so retries are safe.
 */

const STORAGE_KEY = "sojourn.outbox.v1";
const NETWORK_TIMEOUT_MS = 60_000;

export type OutboxItem = {
  clientId: string;
  journeyId: Id<"journeys">;
  journeyTitle: string;
  recordedAt: number;
  location: LatLng;
  body?: string;
  publishNow: boolean;
  /** Local photo files, and their storage ids once uploaded. */
  photos: { uri: string; storageId?: Id<"_storage"> }[];
  /** Set when the server rejected the entry; it stays until the user discards it. */
  error?: string;
  createdAt: number;
};

export type NewEntry = Omit<OutboxItem, "clientId" | "photos" | "createdAt" | "error"> & {
  photoUris: string[];
};

type OutboxContextValue = {
  items: OutboxItem[];
  syncing: boolean;
  add: (entry: NewEntry) => Promise<void>;
  discard: (clientId: string) => Promise<void>;
  sync: () => Promise<void>;
};

const OutboxContext = createContext<OutboxContextValue | null>(null);

function outboxDir() {
  const dir = new Directory(Paths.document, "outbox");
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Network timeout")), NETWORK_TIMEOUT_MS)),
  ]);
}

export function OutboxProvider({ children }: { children: React.ReactNode }) {
  const convex = useConvex();
  const { isAuthenticated } = useConvexAuth();
  const [items, setItems] = useState<OutboxItem[]>([]);
  const [syncing, setSyncing] = useState(false);
  const itemsRef = useRef<OutboxItem[]>([]);
  const syncingRef = useRef(false);
  const loaded = useRef(false);

  const save = useCallback(async (next: OutboxItem[]) => {
    itemsRef.current = next;
    setItems(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const update = useCallback(
    (clientId: string, patch: Partial<OutboxItem>) =>
      save(itemsRef.current.map((i) => (i.clientId === clientId ? { ...i, ...patch } : i))),
    [save],
  );

  const removeItem = useCallback(
    async (clientId: string) => {
      const item = itemsRef.current.find((i) => i.clientId === clientId);
      for (const photo of item?.photos ?? []) {
        const file = new File(photo.uri);
        if (file.exists) file.delete();
      }
      await save(itemsRef.current.filter((i) => i.clientId !== clientId));
    },
    [save],
  );

  const sync = useCallback(async () => {
    if (syncingRef.current || !isAuthenticated || !loaded.current) return;
    const state = await Network.getNetworkStateAsync();
    if (!state.isConnected || state.isInternetReachable === false) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      for (const item of [...itemsRef.current]) {
        if (item.error) continue;
        try {
          const photos = [...item.photos];
          for (let i = 0; i < photos.length; i++) {
            if (photos[i].storageId) continue;
            const uploadUrl = await withTimeout(convex.mutation(api.entries.generateUploadUrl, {}));
            const result = await withTimeout(
              new File(photos[i].uri).upload(uploadUrl, {
                httpMethod: "POST",
                uploadType: UploadType.BINARY_CONTENT,
                headers: { "Content-Type": "image/jpeg" },
              }),
            );
            if (result.status >= 300) throw new Error(`Photo upload failed (${result.status})`);
            photos[i] = { ...photos[i], storageId: JSON.parse(result.body).storageId };
            await update(item.clientId, { photos });
          }
          await withTimeout(
            convex.mutation(api.entries.create, {
              journeyId: item.journeyId,
              clientId: item.clientId,
              recordedAt: item.recordedAt,
              location: item.location,
              body: item.body,
              publishNow: item.publishNow,
              photoIds: photos.map((p) => p.storageId!),
            }),
          );
          await removeItem(item.clientId);
        } catch (error) {
          if (error instanceof ConvexError) {
            // The server said no (e.g. removed from the journey): keep it for the user.
            await update(item.clientId, { error: String(error.data) });
          } else {
            break; // Connectivity problem: try again later.
          }
        }
      }
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [convex, isAuthenticated, removeItem, update]);

  const add = useCallback(
    async (entry: NewEntry) => {
      const clientId = Crypto.randomUUID();
      const dir = outboxDir();
      const photos = entry.photoUris.map((uri, i) => {
        const dest = new File(dir, `${clientId}-${i}.jpg`);
        new File(uri).copySync(dest);
        return { uri: dest.uri };
      });
      const { photoUris: _, ...rest } = entry;
      await save([...itemsRef.current, { ...rest, clientId, photos, createdAt: Date.now() }]);
      void sync();
    },
    [save, sync],
  );

  // Load persisted items once.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      const stored = raw ? (JSON.parse(raw) as OutboxItem[]) : [];
      itemsRef.current = stored;
      setItems(stored);
      loaded.current = true;
      void sync();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Retry when signed in, when signal returns, and when the app comes to the foreground.
  useEffect(() => {
    void sync();
    const net = Network.addNetworkStateListener((s) => s.isConnected && void sync());
    const app = AppState.addEventListener("change", (s) => s === "active" && void sync());
    return () => {
      net.remove();
      app.remove();
    };
  }, [sync]);

  return (
    <OutboxContext.Provider value={{ items, syncing, add, discard: removeItem, sync }}>
      {children}
    </OutboxContext.Provider>
  );
}

export function useOutbox() {
  const value = useContext(OutboxContext);
  if (!value) throw new Error("useOutbox must be used inside OutboxProvider");
  return value;
}
