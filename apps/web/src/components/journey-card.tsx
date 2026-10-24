import { Link } from "@tanstack/react-router";

import { formatDate } from "@/lib/format";

const STATUS_LABEL = { planned: "Planned", active: "On trail", completed: "Completed" } as const;

export function JourneyCard({
  journey,
}: {
  journey: {
    _id: string;
    _creationTime: number;
    title: string;
    description?: string;
    tags: string[];
    status: keyof typeof STATUS_LABEL;
    visibility: string;
    startedOn?: string;
    owner?: { username: string; displayName: string; trailName: string | null } | null;
    role?: string;
  };
}) {
  return (
    <Link
      to="/journeys/$journeyId"
      params={{ journeyId: journey._id }}
      className="block border border-border bg-card p-4 transition-colors hover:border-primary"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg leading-tight">{journey.title}</h3>
        <span className="shrink-0 border border-border px-1.5 py-0.5 font-mono text-[10px] tracking-wide uppercase">
          {STATUS_LABEL[journey.status]}
        </span>
      </div>
      <p className="mt-1 font-mono text-xs text-muted-foreground">
        {journey.owner && <>by {journey.owner.trailName ?? journey.owner.displayName} · </>}
        {journey.startedOn ? `from ${journey.startedOn}` : `started ${formatDate(journey._creationTime)}`}
        {journey.role === "author" && " · co-author"}
        {journey.visibility !== "public" && ` · ${journey.visibility}`}
      </p>
      {journey.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{journey.description}</p>}
      {journey.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {journey.tags.map((tag) => (
            <span key={tag} className="bg-secondary px-1.5 py-0.5 font-mono text-xs text-secondary-foreground">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
