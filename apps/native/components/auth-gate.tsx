import { api } from "@sojourn/backend/convex/_generated/api";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { errorMessage } from "@/lib/format";

import { SignIn } from "./sign-in";
import { SignUp } from "./sign-up";
import { Button, Field, Loading } from "./ui";

/** Shows sign-in / onboarding until the user is signed in with a profile. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.profiles.me, isAuthenticated ? {} : "skip");
  const [showSignUp, setShowSignUp] = useState(false);

  if (isLoading) return <Loading />;
  if (!isAuthenticated) {
    return (
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.kicker}>TRAIL JOURNALS</Text>
        <Text style={styles.hero}>Every mile, written down.</Text>
        {showSignUp ? <SignUp /> : <SignIn />}
        <Button
          variant="ghost"
          title={showSignUp ? "Have an account? Sign in" : "New here? Create an account"}
          onPress={() => setShowSignUp((v) => !v)}
        />
      </ScrollView>
    );
  }
  if (me === undefined) return <Loading />;
  if (!me?.profile) return <CreateProfile />;
  return <>{children}</>;
}

function CreateProfile() {
  const create = useMutation(api.profiles.create);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [trailName, setTrailName] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.hero}>Set up your trail journal</Text>
      <View style={styles.form}>
        <Field label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" placeholder="sunshine_hikes" />
        <Field label="Name" value={displayName} onChangeText={setDisplayName} />
        <Field label="Trail name (optional)" value={trailName} onChangeText={setTrailName} placeholder="Sunshine" />
        <Button
          title="Start journaling"
          loading={saving}
          onPress={async () => {
            setSaving(true);
            try {
              await create({ username, displayName: displayName || username, trailName });
            } catch (e) {
              Alert.alert("Couldn't save", errorMessage(e));
            } finally {
              setSaving(false);
            }
          }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: { padding: theme.spacing.md, gap: theme.spacing.md },
  kicker: { fontFamily: theme.fonts.mono, fontSize: 11, letterSpacing: 2, color: theme.colors.mutedForeground, marginTop: 24 },
  hero: { fontFamily: theme.fonts.serif, fontSize: 34, lineHeight: 40, color: theme.colors.foreground },
  form: { gap: theme.spacing.md },
}));
