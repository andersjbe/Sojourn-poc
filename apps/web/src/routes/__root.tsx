import { Toaster } from "@sojourn/ui/components/sonner";
import { HeadContent, Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import Header from "@/components/header";
import { ThemeProvider } from "@/components/theme-provider";

import "../index.css";

export interface RouterAppContext {}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  head: () => ({
    meta: [
      { title: "Sojourn" },
      { name: "description", content: "Trail journals for long-distance hikers." },
    ],
    links: [{ rel: "icon", href: "/favicon.ico" }],
  }),
});

function RootComponent() {
  return (
    <>
      <HeadContent />
      <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange storageKey="vite-ui-theme">
        <div className="map-grid grid h-svh grid-rows-[auto_1fr]">
          <Header />
          <main className="overflow-y-auto">
            <Outlet />
          </main>
        </div>
        <Toaster />
      </ThemeProvider>
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-left" />}
    </>
  );
}
