import { api } from "@sojourn/backend/convex/_generated/api";
import type { Id } from "@sojourn/backend/convex/_generated/dataModel";
import { MAX_PHOTOS_PER_ENTRY } from "@sojourn/backend/convex/lib/constants";
import type { LatLng } from "@sojourn/backend/convex/lib/paths";
import { Button } from "@sojourn/ui/components/button";
import { Input } from "@sojourn/ui/components/input";
import { Label } from "@sojourn/ui/components/label";
import { Textarea } from "@sojourn/ui/components/textarea";
import { useMutation } from "convex/react";
import { ImagePlus, MapPin, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { errorMessage, toDateTimeLocal } from "@/lib/format";
import { getCurrentLocation } from "@/lib/geolocation";
import { type PhotoMeta, compressPhoto, readPhotoMeta, uploadPhoto } from "@/lib/photos";

import { ConfirmDialog } from "./confirm-dialog";
import { LocationPicker } from "./location-picker";

export type EntryFormValues = {
  body: string;
  recordedAt: number;
  location: LatLng;
  publishNow: boolean;
  photoIds: Id<"_storage">[];
};

type Photo =
  | { kind: "existing"; id: Id<"_storage">; url: string }
  | { kind: "new"; key: string; file: File; preview: string; meta: PhotoMeta };

export function EntryForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: {
    body: string | null;
    recordedAt: number;
    location: LatLng | null;
    publishNow: boolean;
    photos: { id: Id<"_storage">; url: string }[];
  };
  submitLabel: string;
  onSubmit: (values: EntryFormValues) => Promise<void>;
}) {
  const generateUploadUrl = useMutation(api.entries.generateUploadUrl);
  const [body, setBody] = useState(initial?.body ?? "");
  const [recordedAt, setRecordedAt] = useState(initial?.recordedAt ?? Date.now());
  const [location, setLocation] = useState<LatLng | null>(initial?.location ?? null);
  const [shareNow, setShareNow] = useState(initial?.publishNow ?? false);
  const [confirmShare, setConfirmShare] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>(
    initial?.photos.map((p) => ({ kind: "existing" as const, ...p })) ?? [],
  );
  const [submitting, setSubmitting] = useState(false);

  // New entries start at the hiker's current position.
  useEffect(() => {
    if (initial) return;
    getCurrentLocation()
      .then((loc) => setLocation((current) => current ?? loc))
      .catch(() => {});
  }, [initial]);

  async function addFiles(files: FileList | null) {
    if (!files) return;
    const room = MAX_PHOTOS_PER_ENTRY - photos.length;
    const picked = [...files].filter((f) => f.type.startsWith("image/")).slice(0, room);
    if (files.length > room) toast.warning(`Up to ${MAX_PHOTOS_PER_ENTRY} photos per entry.`);
    const added: Photo[] = [];
    for (const file of picked) {
      added.push({
        kind: "new",
        key: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        meta: await readPhotoMeta(file),
      });
    }
    setPhotos((prev) => [...prev, ...added]);
    // Pre-fill from the first photo that carries GPS data, for brand-new entries.
    const withGps = added.find((p) => p.kind === "new" && p.meta.location);
    if (!initial && withGps?.kind === "new" && photos.length === 0) applyPhotoMeta(withGps.meta);
  }

  function applyPhotoMeta(meta: PhotoMeta) {
    if (meta.location) setLocation(meta.location);
    if (meta.takenAt) setRecordedAt(meta.takenAt);
    toast.success("Used the photo's location and time.");
  }

  function removePhoto(photo: Photo) {
    setPhotos((prev) => prev.filter((p) => p !== photo));
    if (photo.kind === "new") URL.revokeObjectURL(photo.preview);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!location) return toast.error("Set a location for this entry.");
    if (!body.trim() && photos.length === 0) return toast.error("Add some text or a photo.");
    setSubmitting(true);
    try {
      const photoIds: Id<"_storage">[] = [];
      for (const photo of photos) {
        if (photo.kind === "existing") {
          photoIds.push(photo.id);
        } else {
          const blob = await compressPhoto(photo.file);
          photoIds.push((await uploadPhoto(await generateUploadUrl(), blob)) as Id<"_storage">);
        }
      }
      await onSubmit({ body, recordedAt, location, publishNow: shareNow, photoIds });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="body">Journal</Label>
        <Textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          placeholder="Where did the trail take you today?"
          className="font-serif text-base leading-relaxed"
        />
      </div>

      <div className="space-y-2">
        <Label>
          Photos ({photos.length}/{MAX_PHOTOS_PER_ENTRY})
        </Label>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {photos.map((photo) => (
            <div key={photo.kind === "new" ? photo.key : photo.id} className="group relative">
              <img
                src={photo.kind === "new" ? photo.preview : photo.url}
                alt=""
                className="aspect-square w-full border border-border object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(photo)}
                className="absolute top-1 right-1 bg-background/90 p-0.5"
                aria-label="Remove photo"
              >
                <X className="size-3.5" />
              </button>
              {photo.kind === "new" && (photo.meta.location || photo.meta.takenAt) && (
                <button
                  type="button"
                  onClick={() => applyPhotoMeta(photo.meta)}
                  className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-primary/90 py-0.5 text-[10px] text-primary-foreground"
                >
                  <MapPin className="size-3" /> Use photo's place/time
                </button>
              )}
            </div>
          ))}
          {photos.length < MAX_PHOTOS_PER_ENTRY && (
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 border border-dashed border-border text-xs text-muted-foreground hover:bg-muted">
              <ImagePlus className="size-5" />
              Add
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => {
                  void addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="recordedAt">When</Label>
        <Input
          id="recordedAt"
          type="datetime-local"
          value={toDateTimeLocal(recordedAt)}
          onChange={(e) => e.target.value && setRecordedAt(new Date(e.target.value).getTime())}
          className="w-auto font-mono"
        />
      </div>

      <div className="space-y-2">
        <Label>Where</Label>
        <LocationPicker value={location} onChange={setLocation} />
      </div>

      <label className="flex items-start gap-3 border border-border bg-muted/40 p-3 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 accent-[var(--destructive)]"
          checked={shareNow}
          onChange={(e) => (e.target.checked ? setConfirmShare(true) : setShareNow(false))}
        />
        <span>
          <span className="font-medium">Publish this entry now</span>
          <span className="block text-muted-foreground">
            By default entries are only shown to the public after this journey's safety delay, so they can't reveal
            where you are right now.
          </span>
        </span>
      </label>

      <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto">
        {submitting ? "Saving…" : submitLabel}
      </Button>

      <ConfirmDialog
        open={confirmShare}
        title="Publish this entry right away?"
        confirmLabel="Publish now"
        destructive
        onCancel={() => setConfirmShare(false)}
        onConfirm={() => {
          setShareNow(true);
          setConfirmShare(false);
        }}
      >
        <p>
          Anyone who can see this journey will see this entry immediately — including{" "}
          <strong>exactly where you are right now</strong> — instead of after the usual delay.
        </p>
        <p className="text-muted-foreground">
          Solo hikers can be put at risk by sharing their live location. Only do this if you're comfortable with
          everyone who can view this journey knowing where you are.
        </p>
      </ConfirmDialog>
    </form>
  );
}
