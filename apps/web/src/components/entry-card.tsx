import { Link } from "@tanstack/react-router";
import { cn } from "@sojourn/ui/lib/utils";
import { Clock, MapPin, Pencil, Radio } from "lucide-react";

import { formatCoords, formatDateTime } from "@/lib/format";
import type { EntryView } from "@/lib/types";

export function EntryCard({
  entry,
  journeyTitle,
  selected,
  canEdit,
  onSelect,
}: {
  entry: EntryView;
  journeyTitle?: string;
  selected?: boolean;
  canEdit?: boolean;
  onSelect?: () => void;
}) {
  const status = entry.releaseStatus;
  return (
    <article
      id={`entry-${entry._id}`}
      onClick={onSelect}
      className={cn(
        "ruled border border-border bg-card px-4 py-3 transition-colors",
        onSelect && "cursor-pointer hover:bg-muted/60",
        selected && "border-primary bg-muted/60",
      )}
    >
      <header className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          {entry.author && (
            <Link
              to="/u/$username"
              params={{ username: entry.author.username }}
              className="font-medium hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {entry.author.trailName ?? entry.author.displayName}
            </Link>
          )}
          {journeyTitle && (
            <Link
              to="/journeys/$journeyId"
              params={{ journeyId: entry.journeyId }}
              className="font-serif text-sm italic text-muted-foreground hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {journeyTitle}
            </Link>
          )}
        </div>
        <time className="font-mono text-xs text-muted-foreground">{formatDateTime(entry.recordedAt)}</time>
      </header>

      {entry.body && <p className="whitespace-pre-wrap font-serif text-[15px] leading-relaxed">{entry.body}</p>}

      {entry.photos.length > 0 && (
        <div
          className={cn(
            "mt-3 grid gap-1",
            entry.photos.length === 1 ? "grid-cols-1" : entry.photos.length === 2 ? "grid-cols-2" : "grid-cols-3",
          )}
        >
          {entry.photos.map((photo) => (
            <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
              <img src={photo.url} alt="" loading="lazy" className="aspect-[4/3] w-full border border-border object-cover" />
            </a>
          ))}
        </div>
      )}

      <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin className="size-3.5" /> {formatCoords(entry.location)}
        </span>
        <span className="flex items-center gap-3">
          {status && !status.isPublic && (
            <span className="flex items-center gap-1" title="Only journey members can see this entry right now">
              <Clock className="size-3.5" /> Public {formatDateTime(status.releaseAt)}
            </span>
          )}
          {status && entry.publishNow && (
            <span className="flex items-center gap-1 text-destructive">
              <Radio className="size-3.5" /> published immediately
            </span>
          )}
          {canEdit && (
            <Link
              to="/entries/$entryId/edit"
              params={{ entryId: entry._id }}
              className="flex items-center gap-1 hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <Pencil className="size-3.5" /> Edit
            </Link>
          )}
        </span>
      </footer>
    </article>
  );
}
