import { api } from "@sojourn/backend/convex/_generated/api";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";

import { JourneyForm } from "@/components/journey-form";

export const Route = createFileRoute("/_auth/journeys/new")({
  component: NewJourney,
});

function NewJourney() {
  const create = useMutation(api.journeys.create);
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-3xl">New journey</h1>
      <div className="border border-border bg-card p-6">
        <JourneyForm
          submitLabel="Create journey"
          onSubmit={async (values) => {
            const journeyId = await create(values);
            await navigate({ to: "/journeys/$journeyId", params: { journeyId } });
          }}
        />
      </div>
    </div>
  );
}
