import type { Doc } from "@sojourn/backend/convex/_generated/dataModel";
import { DEFAULT_DELAY_HOURS, MAX_DELAY_HOURS } from "@sojourn/backend/convex/lib/constants";
import { parseTags } from "@sojourn/backend/convex/lib/tags";
import { Button } from "@sojourn/ui/components/button";
import { Input } from "@sojourn/ui/components/input";
import { Label } from "@sojourn/ui/components/label";
import { Textarea } from "@sojourn/ui/components/textarea";
import { useState } from "react";
import { toast } from "sonner";

import { errorMessage } from "@/lib/format";

import { TagInput } from "./tag-input";

type Journey = Doc<"journeys">;
export type JourneyFormValues = Pick<
  Journey,
  "title" | "tags" | "status" | "visibility" | "delayHours"
> & { description: string; startedOn: string; endedOn: string };

const VISIBILITY: { value: Journey["visibility"]; label: string; hint: string }[] = [
  { value: "public", label: "Public", hint: "Anyone; listed in explore and tags" },
  { value: "followers", label: "Followers", hint: "People you've approved as followers" },
  { value: "unlisted", label: "Unlisted", hint: "Anyone with the link" },
  { value: "private", label: "Private", hint: "Only you and your co-authors" },
];

const selectClass = "h-8 w-full border border-input bg-transparent px-2 text-sm";

export function JourneyForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Journey;
  submitLabel: string;
  onSubmit: (values: JourneyFormValues) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [tags, setTags] = useState(initial?.tags.map((t) => `#${t}`).join(" ") ?? "");
  const [status, setStatus] = useState<Journey["status"]>(initial?.status ?? "active");
  const [visibility, setVisibility] = useState<Journey["visibility"]>(initial?.visibility ?? "public");
  const [delay, setDelay] = useState(initial?.delayHours ?? DEFAULT_DELAY_HOURS);
  const [startedOn, setStartedOn] = useState(initial?.startedOn ?? "");
  const [endedOn, setEndedOn] = useState(initial?.endedOn ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        title,
        description,
        tags: parseTags(tags),
        status,
        visibility,
        delayHours: delay,
        startedOn,
        endedOn,
      });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Springer to Katahdin, 2027" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">About this journey</Label>
        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tags">Tags</Label>
        <TagInput id="tags" value={tags} onChange={setTags} />
        <p className="text-xs text-muted-foreground">Any trail, any route — tags help other hikers find you.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startedOn">Start date</Label>
          <Input id="startedOn" type="date" value={startedOn} onChange={(e) => setStartedOn(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endedOn">End date</Label>
          <Input id="endedOn" type="date" value={endedOn} onChange={(e) => setEndedOn(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select id="status" className={selectClass} value={status} onChange={(e) => setStatus(e.target.value as Journey["status"])}>
            <option value="planned">Planned</option>
            <option value="active">On trail</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="visibility">Who can see it</Label>
          <select
            id="visibility"
            className={selectClass}
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as Journey["visibility"])}
          >
            {VISIBILITY.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label} — {v.hint}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="delay">Safety delay: {delay} hours</Label>
        <input
          id="delay"
          type="range"
          min={0}
          max={MAX_DELAY_HOURS}
          step={1}
          value={delay}
          onChange={(e) => setDelay(Number(e.target.value))}
          className="w-full accent-[var(--primary)]"
        />
        <p className="text-xs text-muted-foreground">
          Entries are hidden from everyone but you and your co-authors until this long after they're written, so
          they never reveal where you are right now. You can publish individual entries immediately.
        </p>
      </div>
      <Button type="submit" size="lg" disabled={submitting}>
        {submitting ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
