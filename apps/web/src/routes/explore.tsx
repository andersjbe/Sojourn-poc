import { api } from "@sojourn/backend/convex/_generated/api";
import { normalizeTag } from "@sojourn/backend/convex/lib/tags";
import { Input } from "@sojourn/ui/components/input";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { useState } from "react";
import z from "zod";

import { JourneyCard } from "@/components/journey-card";
import Loader from "@/components/loader";

export const Route = createFileRoute("/explore")({
  validateSearch: z.object({ tag: z.string().optional() }),
  component: ExplorePage,
});

function ExplorePage() {
  const { tag } = Route.useSearch();
  const navigate = useNavigate({ from: "/explore" });
  const [input, setInput] = useState(tag ? `#${tag}` : "");
  const [people, setPeople] = useState("");
  const byTag = useQuery(api.journeys.listByTag, tag ? { tag } : "skip");
  const recent = useQuery(api.journeys.listRecent, tag ? "skip" : {});
  const hikers = useQuery(api.profiles.search, people.trim() ? { q: people } : "skip");
  const journeys = tag ? byTag : recent;

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[2fr_1fr]">
      <section className="space-y-4">
        <h1 className="text-3xl">{tag ? `#${tag}` : "Explore journeys"}</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const t = normalizeTag(input);
            void navigate({ search: t ? { tag: t } : {} });
          }}
        >
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search a tag: #at, #pnt, #hayduke…" />
        </form>
        {journeys === undefined ? (
          <Loader />
        ) : journeys.length === 0 ? (
          <p className="text-sm text-muted-foreground">No journeys here yet.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {journeys.map((j) => (
              <JourneyCard key={j._id} journey={j} />
            ))}
          </div>
        )}
      </section>
      <aside className="space-y-3">
        <h2 className="text-xl">Find hikers</h2>
        <Input value={people} onChange={(e) => setPeople(e.target.value)} placeholder="@username" />
        <ul className="divide-y divide-border border border-border bg-card">
          {hikers?.map((h) => (
            <li key={h.userId}>
              <Link to="/u/$username" params={{ username: h.username }} className="block px-3 py-2 hover:bg-muted">
                <span className="font-medium">{h.trailName ?? h.displayName}</span>{" "}
                <span className="font-mono text-xs text-muted-foreground">@{h.username}</span>
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
