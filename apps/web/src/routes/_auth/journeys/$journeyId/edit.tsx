import { api } from "@sojourn/backend/convex/_generated/api";
import type { Id } from "@sojourn/backend/convex/_generated/dataModel";
import { Button } from "@sojourn/ui/components/button";
import { Input } from "@sojourn/ui/components/input";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { JourneyForm } from "@/components/journey-form";
import Loader from "@/components/loader";
import { errorMessage } from "@/lib/format";

export const Route = createFileRoute("/_auth/journeys/$journeyId/edit")({
  component: EditJourney,
});

function EditJourney() {
  const { journeyId } = Route.useParams();
  const id = journeyId as Id<"journeys">;
  const data = useQuery(api.journeys.get, { journeyId: id });
  const update = useMutation(api.journeys.update);
  const remove = useMutation(api.journeys.remove);
  const invite = useMutation(api.members.invite);
  const removeMember = useMutation(api.members.remove);
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (data === undefined) return <Loader />;
  if (data === null || data.access.role !== "owner") {
    return <p className="p-16 text-center">Only the journey's owner can manage it.</p>;
  }
  const { journey, members } = data;

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      <div>
        <Link to="/journeys/$journeyId" params={{ journeyId }} className="font-mono text-xs text-muted-foreground hover:underline">
          ← {journey.title}
        </Link>
        <h1 className="mt-1 text-3xl">Manage journey</h1>
      </div>

      <section className="border border-border bg-card p-6">
        <JourneyForm
          initial={journey}
          submitLabel="Save changes"
          onSubmit={async (values) => {
            await update({ journeyId: id, ...values });
            toast.success("Saved.");
          }}
        />
      </section>

      <section className="space-y-3 border border-border bg-card p-6">
        <h2 className="text-xl">Authors</h2>
        <p className="text-sm text-muted-foreground">
          Hiking with someone? Invite them to post entries to this journey. Their path is drawn in its own color.
        </p>
        <ul className="divide-y divide-border border border-border">
          {members.map((m) => (
            <li key={m.profile?.userId} className="flex items-center justify-between px-3 py-2 text-sm">
              <span>
                {m.profile?.trailName ?? m.profile?.displayName}{" "}
                <span className="font-mono text-xs text-muted-foreground">
                  @{m.profile?.username} · {m.status === "invited" ? "invited" : m.role}
                </span>
              </span>
              {m.role !== "owner" && m.profile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMember({ journeyId: id, userId: m.profile!.userId })}
                >
                  {m.status === "invited" ? "Cancel invite" : "Remove"}
                </Button>
              )}
            </li>
          ))}
        </ul>
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await invite({ journeyId: id, username });
              setUsername("");
              toast.success("Invite sent.");
            } catch (error) {
              toast.error(errorMessage(error));
            }
          }}
        >
          <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@username" />
          <Button type="submit" disabled={!username.trim()}>
            Invite
          </Button>
        </form>
      </section>

      <section className="space-y-3 border border-destructive/50 bg-card p-6">
        <h2 className="text-xl">Delete journey</h2>
        <p className="text-sm text-muted-foreground">Deletes every entry and photo in it. This can't be undone.</p>
        <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
          Delete journey
        </Button>
      </section>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this journey?"
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await remove({ journeyId: id });
          await navigate({ to: "/journeys" });
        }}
      >
        <p>“{journey.title}” and all of its entries and photos will be permanently deleted.</p>
      </ConfirmDialog>
    </div>
  );
}
