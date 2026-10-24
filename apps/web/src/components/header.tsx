import { api } from "@sojourn/backend/convex/_generated/api";
import { Button } from "@sojourn/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@sojourn/ui/components/dropdown-menu";
import { Link, useNavigate } from "@tanstack/react-router";
import { useConvexAuth, useQuery } from "convex/react";
import { Compass } from "lucide-react";

import { authClient } from "@/lib/auth-client";

import { ModeToggle } from "./mode-toggle";

export default function Header() {
  const { isAuthenticated } = useConvexAuth();
  const me = useQuery(api.profiles.me, isAuthenticated ? {} : "skip");
  const requests = useQuery(api.follows.requests, isAuthenticated ? {} : "skip");
  const navigate = useNavigate();

  const links = [
    { to: "/", label: "Feed" },
    { to: "/explore", label: "Explore" },
    ...(isAuthenticated ? [{ to: "/journeys", label: "My journeys" } as const] : []),
  ] as const;

  return (
    <header className="border-b border-border bg-background/95">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <Compass className="size-5 text-primary" />
            <span className="font-serif text-xl tracking-tight">Sojourn</span>
          </Link>
          <nav className="flex gap-4 text-sm">
            {links.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="border-b-2 border-transparent py-1 text-muted-foreground hover:text-foreground data-[status=active]:border-primary data-[status=active]:text-foreground"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ModeToggle />
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" />}>
                {me?.profile?.trailName ?? me?.profile?.displayName ?? "Account"}
                {requests && requests.length > 0 && (
                  <span className="ml-1 bg-destructive px-1 font-mono text-[10px] text-white">{requests.length}</span>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-card" align="end">
                <DropdownMenuGroup>
                  {me?.profile && <DropdownMenuLabel>@{me.profile.username}</DropdownMenuLabel>}
                  <DropdownMenuSeparator />
                  {me?.profile && (
                    <DropdownMenuItem
                      onClick={() => navigate({ to: "/u/$username", params: { username: me.profile!.username } })}
                    >
                      My profile
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
                    Settings{requests && requests.length > 0 ? ` (${requests.length} requests)` : ""}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => navigate({ to: "/" }) } })}
                  >
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button nativeButton={false} render={<Link to="/sign-in" />}>Sign in</Button>
          )}
        </div>
      </div>
    </header>
  );
}
