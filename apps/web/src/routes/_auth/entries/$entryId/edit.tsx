import { api } from "@sojourn/backend/convex/_generated/api";
import type { Id } from "@sojourn/backend/convex/_generated/dataModel";
import { Button } from "@sojourn/ui/components/button";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { EntryForm } from "@/components/entry-form";
import Loader from "@/components/loader";

export const Route = createFileRoute("/_auth/entries/$entryId/edit")({
  component: EditEntry,
});

function EditEntry() {
  const { entryId } = Route.useParams();
  const id = entryId as Id<"entries">;
  const data = useQuery(api.entries.get, { entryId: id });
  const update = useMutation(api.entries.update);
  const remove = useMutation(api.entries.remove);
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (data === undefined) return <Loader />;
  if (!data?.canEdit) return <p className="p-16 text-center">You can only edit your own entries.</p>;
  const { entry, journey } = data;
  const backToJourney = () => navigate({ to: "/journeys/$journeyId", params: { journeyId: journey._id } });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        to="/journeys/$journeyId"
        params={{ journeyId: journey._id }}
        className="font-mono text-xs text-muted-foreground hover:underline"
      >
        ← {journey.title}
      </Link>
      <h1 className="mt-1 mb-6 text-3xl">Edit entry</h1>
      <div className="border border-border bg-card p-6">
        <EntryForm
          initial={entry}
          submitLabel="Save entry"
          onSubmit={async (values) => {
            await update({ entryId: id, ...values });
            await backToJourney();
          }}
        />
      </div>
      <Button variant="destructive" className="mt-6" onClick={() => setConfirmDelete(true)}>
        Delete entry
      </Button>
      <ConfirmDialog
        open={confirmDelete}
        title="Delete this entry?"
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await remove({ entryId: id });
          await backToJourney();
        }}
      >
        <p>The entry and its photos will be permanently deleted.</p>
      </ConfirmDialog>
    </div>
  );
}
