import { api } from "@sojourn/backend/convex/_generated/api";
import type { Doc } from "@sojourn/backend/convex/_generated/dataModel";
import { Button } from "@sojourn/ui/components/button";
import { Input } from "@sojourn/ui/components/input";
import { Label } from "@sojourn/ui/components/label";
import { Textarea } from "@sojourn/ui/components/textarea";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

import Loader from "@/components/loader";
import { errorMessage } from "@/lib/format";

export const Route = createFileRoute("/_auth/settings")({
  component: SettingsPage,
});

const PRIVACY: { value: Doc<"profiles">["profileVisibility"]; label: string; hint: string }[] = [
  { value: "public", label: "Open", hint: "Anyone can follow you." },
  { value: "approval", label: "Approve followers", hint: "You approve each follow request." },
  { value: "private", label: "Private", hint: "No followers; your profile isn't listed in search or explore." },
];

function SettingsPage() {
  const me = useQuery(api.profiles.me);
  const requests = useQuery(api.follows.requests);
  const respond = useMutation(api.follows.respond);
  if (me?.profile === undefined || requests === undefined) return <Loader />;
  if (!me?.profile) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      <h1 className="text-3xl">Settings</h1>
      {requests.length > 0 && (
        <section className="space-y-2 border border-primary bg-card p-6">
          <h2 className="text-xl">Follow requests</h2>
          {requests.map((r) => (
            <div key={r.userId} className="flex items-center justify-between text-sm">
              <Link to="/u/$username" params={{ username: r.username }} className="hover:underline">
                {r.trailName ?? r.displayName} <span className="font-mono text-xs text-muted-foreground">@{r.username}</span>
              </Link>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => respond({ followerId: r.userId, accept: true })}>
                  Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => respond({ followerId: r.userId, accept: false })}>
                  Decline
                </Button>
              </div>
            </div>
          ))}
        </section>
      )}
      <ProfileSettings profile={me.profile} />
    </div>
  );
}

function ProfileSettings({ profile }: { profile: Doc<"profiles"> }) {
  const update = useMutation(api.profiles.update);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [trailName, setTrailName] = useState(profile.trailName ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [visibility, setVisibility] = useState(profile.profileVisibility);

  return (
    <form
      className="space-y-5 border border-border bg-card p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await update({ displayName, trailName, bio, profileVisibility: visibility });
          toast.success("Saved.");
        } catch (error) {
          toast.error(errorMessage(error));
        }
      }}
    >
      <h2 className="text-xl">Profile</h2>
      <p className="font-mono text-xs text-muted-foreground">@{profile.username}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="displayName">Name</Label>
          <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="trailName">Trail name</Label>
          <Input id="trailName" value={trailName} onChange={(e) => setTrailName(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
      </div>
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">Who can follow you</legend>
        {PRIVACY.map((p) => (
          <label key={p.value} className="flex items-start gap-3 border border-border p-3 text-sm has-checked:border-primary">
            <input
              type="radio"
              name="visibility"
              className="mt-0.5 accent-[var(--primary)]"
              checked={visibility === p.value}
              onChange={() => setVisibility(p.value)}
            />
            <span>
              <span className="font-medium">{p.label}</span>
              <span className="block text-muted-foreground">{p.hint}</span>
            </span>
          </label>
        ))}
        {visibility === "private" && profile.profileVisibility !== "private" && (
          <p className="text-xs text-destructive">Switching to private removes all of your current followers.</p>
        )}
      </fieldset>
      <Button type="submit">Save profile</Button>
    </form>
  );
}
