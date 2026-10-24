import { api } from "@sojourn/backend/convex/_generated/api";
import { Button } from "@sojourn/ui/components/button";
import { Input } from "@sojourn/ui/components/input";
import { Label } from "@sojourn/ui/components/label";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

import { errorMessage } from "@/lib/format";

/** First-run step: pick a username (and optionally a trail name). */
export function CreateProfile() {
  const user = useQuery(api.auth.getCurrentUser);
  const create = useMutation(api.profiles.create);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [trailName, setTrailName] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <form
      className="mx-auto mt-10 w-full max-w-md space-y-4 border border-border bg-card p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
          await create({ username, displayName: displayName || user?.name || username, trailName });
        } catch (error) {
          toast.error(errorMessage(error));
        } finally {
          setSaving(false);
        }
      }}
    >
      <h1 className="text-2xl">Set up your trail journal</h1>
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="sunshine_hikes" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="displayName">Name</Label>
        <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={user?.name ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="trailName">Trail name (optional)</Label>
        <Input id="trailName" value={trailName} onChange={(e) => setTrailName(e.target.value)} placeholder="Sunshine" />
      </div>
      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "Saving…" : "Start journaling"}
      </Button>
    </form>
  );
}
