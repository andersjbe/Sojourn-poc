import { api } from "@sojourn/backend/convex/_generated/api";
import { Button } from "@sojourn/ui/components/button";
import { Link, createFileRoute } from "@tanstack/react-router";
import { AuthLoading, Authenticated, Unauthenticated, useQuery } from "convex/react";

import { CreateProfile } from "@/components/create-profile";
import { EntryCard } from "@/components/entry-card";
import { JourneyCard } from "@/components/journey-card";
import Loader from "@/components/loader";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  return (
    <>
      <Authenticated>
        <Feed />
      </Authenticated>
      <Unauthenticated>
        <Landing />
      </Unauthenticated>
      <AuthLoading>
        <Loader />
      </AuthLoading>
    </>
  );
}

function Feed() {
  const me = useQuery(api.profiles.me);
  const feed = useQuery(api.feed.get, me?.profile ? {} : "skip");
  if (me === undefined) return <Loader />;
  if (!me?.profile) return <CreateProfile />;

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <div className="flex items-end justify-between">
        <h1 className="text-3xl">From the trail</h1>
        <Button variant="outline" render={<Link to="/journeys/new" />}>
          New journey
        </Button>
      </div>
      {feed === undefined ? (
        <Loader />
      ) : feed.length === 0 ? (
        <div className="border border-dashed border-border bg-card p-8 text-center">
          <p className="font-serif text-lg">Your feed is quiet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Follow hikers to see their entries here.{" "}
            <Link to="/explore" className="underline">
              Explore journeys
            </Link>
          </p>
        </div>
      ) : (
        feed.map((entry) => <EntryCard key={entry._id} entry={entry} journeyTitle={entry.journeyTitle} />)
      )}
    </div>
  );
}

function Landing() {
  const recent = useQuery(api.journeys.listRecent);
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <section className="grid gap-8 border border-border bg-card p-8 md:grid-cols-[3fr_2fr]">
        <div>
          <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">Trail journals</p>
          <h1 className="mt-2 text-5xl leading-[1.05]">Every mile, written down.</h1>
          <p className="mt-4 max-w-prose text-muted-foreground">
            Sojourn is a journal for long-distance hikers. Post entries with words and photos from the trail — each
            one pinned to the map — and share the whole line of your journey with the people following along.
          </p>
          <div className="mt-6 flex gap-2">
            <Button size="lg" render={<Link to="/sign-in" />}>
              Start your journal
            </Button>
            <Button size="lg" variant="outline" render={<Link to="/explore" />}>
              Explore journeys
            </Button>
          </div>
        </div>
        <ul className="space-y-3 self-center font-mono text-xs text-muted-foreground">
          <li>◆ Any trail — tag it #at, #pct, #pnt or your own</li>
          <li>◆ Locations delayed by default to keep you safe</li>
          <li>◆ Hike with partners: co-authored journeys</li>
          <li>◆ Write offline on the phone, sync in town</li>
        </ul>
      </section>
      {recent && recent.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-2xl">Recently started</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {recent.slice(0, 6).map((j) => (
              <JourneyCard key={j._id} journey={j} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
