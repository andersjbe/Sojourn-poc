import { Navigate, createFileRoute } from "@tanstack/react-router";
import { Authenticated, Unauthenticated } from "convex/react";

import { AuthForms } from "@/components/auth-forms";

export const Route = createFileRoute("/sign-in")({
  component: SignInPage,
});

function SignInPage() {
  return (
    <>
      <Authenticated>
        <Navigate to="/" />
      </Authenticated>
      <Unauthenticated>
        <AuthForms />
      </Unauthenticated>
    </>
  );
}
