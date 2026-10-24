import { api } from "@sojourn/backend/convex/_generated/api";
import type { Id } from "@sojourn/backend/convex/_generated/dataModel";
import { Button } from "@sojourn/ui/components/button";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { ArrowDownUp, Plus, Settings } from "lucide-react";
import { useState } from "react";

import { EntryCard } from "@/components/entry-card";
import { JourneyMap } from "@/components/journey-map";
import Loader from "@/components/loader";

export const Route = createFileRoute("/journeys/$journeyId")({
  component: JourneyPage,
});

const STATUS_LABEL = { planned: "Planned", active: "On trail", completed: "Completed" } as const;

function JourneyPage() {
  const { journeyId } = Route.useParams();
  const id = journeyId as Id<"journeys">;
  const data = useQuery(api.journeys.get, { journeyId: id });
  const entries = useQuery(api.entries.listForJourney, { journeyId: id });
  const me = useQuery(api.profiles.me);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newestFirst, setNewestFirst] = useState(true);

  if (data === undefined || entries === undefined) return <Loader />;
  if (data === null || entries === null) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl">Journey not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">It may be private, or followers-only.</p>
      </div>
    );
  }

  const { journey, access, members } = data;
  const activeMembers = members.filter((m) => m.status === "active" && m.profile);
  const ordered = newestFirst ? [...entries].reverse() : entries;

  function select(entryId: string) {
    setSelectedId(entryId);
    document.getElementById(`entry-${entryId}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <header className="mb-6 border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
              {STATUS_LABEL[journey.status]}
              {journey.startedOn && ` · ${journey.startedOn}`}
              {journey.endedOn && ` → ${journey.endedOn}`}
              {journey.visibility !== "public" && ` · ${journey.visibility}`}
            </p>
            <h1 className="mt-1 text-4xl">{journey.title}</h1>
            <p className="mt-2 text-sm">
              {activeMembers.map((m, i) => (
                <span key={m.profile!.userId}>
                  {i > 0 && (i === activeMembers.length - 1 ? " & " : ", ")}
                  <Link to="/u/$username" params={{ username: m.profile!.username }} className="underline-offset-2 hover:underline">
                    {m.profile!.trailName ?? m.profile!.displayName}
                  </Link>
                </span>
              ))}
            </p>
          </div>
          <div className="flex gap-2">
            {access.isMember && (
              <Button nativeButton={false} render={<Link to="/journeys/$journeyId/new-entry" params={{ journeyId }} />}>
                <Plus /> New entry
              </Button>
            )}
            {access.role === "owner" && (
              <Button variant="outline" nativeButton={false} render={<Link to="/journeys/$journeyId/edit" params={{ journeyId }} />}>
                <Settings /> Manage
              </Button>
            )}
          </div>
        </div>
        {journey.description && <p className="mt-3 max-w-prose font-serif text-muted-foreground">{journey.description}</p>}
        {journey.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {journey.tags.map((tag) => (
              <Link
                key={tag}
                to="/explore"
                search={{ tag: tag.toLowerCase() }}
                className="bg-secondary px-1.5 py-0.5 font-mono text-xs text-secondary-foreground hover:bg-accent"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}
        {!access.isMember && (
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            For the hikers' safety, entry locations appear on the map {journey.locationDelayHours} hours after they're
            posted.
          </p>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <JourneyMap
          entries={entries}
          selectedId={selectedId}
          onSelect={select}
          className="h-[50vh] lg:sticky lg:top-4 lg:h-[calc(100svh-8rem)]"
        />
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl">
              {entries.length} {entries.length === 1 ? "entry" : "entries"}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setNewestFirst((v) => !v)}>
              <ArrowDownUp /> {newestFirst ? "Newest first" : "Oldest first"}
            </Button>
          </div>
          {ordered.length === 0 && (
            <p className="border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No entries yet.
            </p>
          )}
          {ordered.map((entry) => (
            <EntryCard
              key={entry._id}
              entry={entry}
              selected={entry._id === selectedId}
              canEdit={entry.authorId === me?.userId}
              onSelect={() => setSelectedId(entry._id)}
            />
          ))}
        </section>
      </div>
    </div>
  );
}
