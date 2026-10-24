import { api } from "@sojourn/backend/convex/_generated/api";
import { Button } from "@sojourn/ui/components/button";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import { JourneyCard } from "@/components/journey-card";
import Loader from "@/components/loader";
import { errorMessage } from "@/lib/format";

export const Route = createFileRoute("/u/$username")({
  component: ProfilePage,
});

function ProfilePage() {
  const { username } = Route.useParams();
  const data = useQuery(api.profiles.getByUsername, { username });
  const { isAuthenticated } = useConvexAuth();
  const follow = useMutation(api.follows.follow);
  const unfollow = useMutation(api.follows.unfollow);

  if (data === undefined) return <Loader />;
  if (data === null) return <p className="p-16 text-center">No hiker named @{username}.</p>;
  const { profile } = data;

  async function toggleFollow() {
    try {
      if (data!.followStatus) {
        await unfollow({ userId: profile.userId });
      } else {
        const status = await follow({ userId: profile.userId });
        if (status === "pending") toast.success("Follow request sent.");
      }
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border border-border bg-card p-6">
        <div>
          <h1 className="text-4xl">{profile.trailName ?? profile.displayName}</h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            @{profile.username}
            {profile.trailName && ` · ${profile.displayName}`} · {data.followerCount} followers ·{" "}
            {data.followingCount} following
          </p>
          {profile.bio && <p className="mt-3 max-w-prose font-serif">{profile.bio}</p>}
        </div>
        {data.isSelf ? (
          <Button variant="outline" render={<Link to="/settings" />}>
            Edit profile
          </Button>
        ) : isAuthenticated && profile.profileVisibility !== "private" ? (
          <Button variant={data.followStatus ? "outline" : "default"} onClick={toggleFollow}>
            {data.followStatus === "accepted"
              ? "Following"
              : data.followStatus === "pending"
                ? "Requested"
                : profile.profileVisibility === "approval"
                  ? "Request to follow"
                  : "Follow"}
          </Button>
        ) : null}
      </header>
      <h2 className="mt-8 mb-3 text-2xl">Journeys</h2>
      {data.journeys.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing to show yet.</p>
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
