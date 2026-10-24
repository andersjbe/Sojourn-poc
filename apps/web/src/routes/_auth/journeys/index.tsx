import { api } from "@sojourn/backend/convex/_generated/api";
import { Button } from "@sojourn/ui/components/button";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Plus } from "lucide-react";

import { JourneyCard } from "@/components/journey-card";
import Loader from "@/components/loader";

export const Route = createFileRoute("/_auth/journeys/")({
  component: MyJourneys,
});

function MyJourneys() {
  const data = useQuery(api.journeys.listMine);
  const respond = useMutation(api.members.respond);
  if (data === undefined) return <Loader />;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="flex items-end justify-between">
        <h1 className="text-3xl">My journeys</h1>
        <Button nativeButton={false} render={<Link to="/journeys/new" />}>
          <Plus /> New journey
        </Button>
      </div>

      {data.invites.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xl">Invitations</h2>
          {data.invites.map(({ journey, invitedBy }) => (
            <div key={journey._id} className="flex flex-wrap items-center justify-between gap-2 border border-primary bg-card p-3">
              <p className="text-sm">
                <strong>{invitedBy?.trailName ?? invitedBy?.displayName}</strong> invited you to co-author{" "}
                <em className="font-serif">{journey.title}</em>
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => respond({ journeyId: journey._id, accept: true })}>
                  Join
                </Button>
                <Button size="sm" variant="outline" onClick={() => respond({ journeyId: journey._id, accept: false })}>
                  Decline
                </Button>
              </div>
            </div>
          ))}
        </section>
      )}

      {data.journeys.length === 0 ? (
        <div className="border border-dashed border-border bg-card p-10 text-center">
          <p className="font-serif text-lg">No journeys yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">Start one before you hit the trail.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.journeys.map((j) => (
            <JourneyCard key={j._id} journey={j} />
          ))}
        </div>
      )}
    </div>
  );
}
