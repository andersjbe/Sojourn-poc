import { api } from "@sojourn/backend/convex/_generated/api";
import type { Id } from "@sojourn/backend/convex/_generated/dataModel";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";

import { EntryForm } from "@/components/entry-form";
import Loader from "@/components/loader";

export const Route = createFileRoute("/_auth/journeys/$journeyId/new-entry")({
  component: NewEntry,
});

function NewEntry() {
  const { journeyId } = Route.useParams();
  const id = journeyId as Id<"journeys">;
  const data = useQuery(api.journeys.get, { journeyId: id });
  const create = useMutation(api.entries.create);
  const navigate = useNavigate();

  if (data === undefined) return <Loader />;
  if (!data?.access.isMember) return <p className="p-16 text-center">You're not an author on this journey.</p>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link to="/journeys/$journeyId" params={{ journeyId }} className="font-mono text-xs text-muted-foreground hover:underline">
        ← {data.journey.title}
      </Link>
      <h1 className="mt-1 mb-6 text-3xl">New entry</h1>
      <div className="border border-border bg-card p-6">
        <EntryForm
          submitLabel="Post entry"
          onSubmit={async (values) => {
            await create({ journeyId: id, clientId: crypto.randomUUID(), ...values });
            await navigate({ to: "/journeys/$journeyId", params: { journeyId } });
          }}
        />
      </div>
    </div>
  );
}
