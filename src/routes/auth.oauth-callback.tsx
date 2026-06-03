import { createFileRoute, redirect, isRedirect } from "@tanstack/react-router";
import { verifyGoogleCallbackFn } from "@/lib/oauth-server";

export const Route = createFileRoute("/auth/oauth-callback")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { code?: string; state?: string; error?: string } => ({
    code: search.code as string | undefined,
    state: search.state as string | undefined,
    error: search.error as string | undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    if (deps.error) {
      throw redirect({
        to: "/auth",
        search: {
          error: `Google OAuth error: ${deps.error}`,
        } as any,
      });
    }

    if (!deps.code || !deps.state) {
      throw redirect({ to: "/auth" });
    }

    try {
      const result = await verifyGoogleCallbackFn({
        data: {
          code: deps.code,
          state: deps.state,
        },
      });

      const role = result.profile.role;
      const target = role === "tenant" ? "/tenant" : "/admin";

      throw redirect({ to: target });
    } catch (err: any) {
      if (isRedirect(err)) {
        throw err;
      }
      // Redirect back to auth page with error message
      throw redirect({
        to: "/auth",
        search: {
          error: err.message || "Google Authentication failed",
        } as any,
      });
    }
  },
  component: OAuthCallbackComponent,
});

function OAuthCallbackComponent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent"></div>
      <p className="mt-4 text-sm text-muted-foreground font-medium animate-pulse">
        Completing Google Sign In...
      </p>
    </div>
  );
}
