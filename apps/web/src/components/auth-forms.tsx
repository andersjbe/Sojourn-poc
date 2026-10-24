import { useState } from "react";

import SignInForm from "./sign-in-form";
import SignUpForm from "./sign-up-form";

export function AuthForms({ defaultSignIn = true }: { defaultSignIn?: boolean }) {
  const [showSignIn, setShowSignIn] = useState(defaultSignIn);
  return showSignIn ? (
    <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
  ) : (
    <SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
  );
}
