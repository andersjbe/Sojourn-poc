import { api } from "@sojourn/backend/convex/_generated/api";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import { AuthLoading, Authenticated, Unauthenticated, useQuery } from "convex/react";

import { AuthForms } from "@/components/auth-forms";
import { CreateProfile } from "@/components/create-profile";
import Loader from "@/components/loader";

export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <>
      <Authenticated>
        <ProfileGate />
      </Authenticated>
      <Unauthenticated>
        <AuthForms />
      </Unauthenticated>
      <AuthLoading>
        <Loader />
      </AuthLoading>
    </>
  );
}

function ProfileGate() {
  const me = useQuery(api.profiles.me);
  if (me === undefined) return <Loader />;
  if (me && !me.profile) return <CreateProfile />;
  return <Outlet />;
}
