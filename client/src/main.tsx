import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

const queryClient = new QueryClient();

// Flag to suppress UNAUTHED redirect during intentional logout
// Uses both window flag (in-memory) and sessionStorage (survives page reload)
(window as any).__ventex_logging_out = false;

// Check if we're in the middle of a logout redirect (survives page reload)
if (sessionStorage.getItem('__ventex_logging_out')) {
  (window as any).__ventex_logging_out = true;
  // Clear the flag after a short delay so it doesn't persist forever
  setTimeout(() => {
    sessionStorage.removeItem('__ventex_logging_out');
    (window as any).__ventex_logging_out = false;
  }, 3000);
}

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  // Don't redirect if user is intentionally logging out
  if ((window as any).__ventex_logging_out) return;

  // Don't redirect on public pages (login, legal, invite)
  const path = window.location.pathname;
  const publicPaths = ["/", "/privacy", "/terms", "/invite", "/accept-invite", "/portal", "/sign-out"];
  if (publicPaths.some(p => path === p || path.startsWith(p + "/"))) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
