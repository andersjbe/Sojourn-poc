import "@/unistyles";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useUnistyles } from "react-native-unistyles";

import { authClient } from "@/lib/auth-client";
import { OutboxProvider } from "@/lib/outbox";

import { ENV } from "../src/env";

export const unstable_settings = {
  anchor: "(tabs)",
};

const convex = new ConvexReactClient(ENV.EXPO_PUBLIC_CONVEX_URL, {
  unsavedChangesWarning: false,
});

export default function RootLayout() {
  const { theme, rt } = useUnistyles();

  return (
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      <OutboxProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <StatusBar style={rt.themeName === "dark" ? "light" : "dark"} />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: theme.colors.background },
              headerTitleStyle: { color: theme.colors.foreground, fontFamily: theme.fonts.serif },
              headerTintColor: theme.colors.foreground,
              headerShadowVisible: false,
              contentStyle: { backgroundColor: theme.colors.background },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="journey/[id]" options={{ title: "" }} />
            <Stack.Screen name="journey/new" options={{ title: "New journey", presentation: "modal" }} />
            <Stack.Screen name="compose" options={{ title: "New entry", presentation: "modal" }} />
            <Stack.Screen name="entry/[id]/edit" options={{ title: "Edit entry" }} />
            <Stack.Screen name="u/[username]" options={{ title: "" }} />
          </Stack>
        </GestureHandlerRootView>
      </OutboxProvider>
    </ConvexBetterAuthProvider>
  );
}
