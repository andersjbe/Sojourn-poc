import "@/unistyles";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useUnistyles } from "react-native-unistyles";

import { authClient } from "@/lib/auth-client";

import { ENV } from "../src/env";

export const unstable_settings = {
  anchor: "(drawer)",
};

const convex = new ConvexReactClient(ENV.EXPO_PUBLIC_CONVEX_URL, {
  unsavedChangesWarning: false,
});

export default function RootLayout() {
  const { theme } = useUnistyles();

  return (
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: theme.colors.background,
            },
            headerTitleStyle: {
              color: theme.colors.foreground,
            },
            headerTintColor: theme.colors.foreground,
          }}
        >
          <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ title: "Modal", presentation: "modal" }} />
        </Stack>
      </GestureHandlerRootView>
    </ConvexBetterAuthProvider>
  );
}
