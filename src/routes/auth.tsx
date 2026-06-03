import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Building2, ShieldCheck, Wrench, User } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  signInFn,
  requestSignUpOtpFn,
  verifyOtpAndSignUpFn,
  requestPasswordResetOtpFn,
  resetPasswordWithOtpFn,
} from "@/lib/auth-server";
import { getGoogleAuthUrlFn } from "@/lib/oauth-server";
import { getInviteDetailsFn } from "@/lib/property-server";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { invite?: string; error?: string } => ({
    invite: search.invite as string | undefined,
    error: search.error as string | undefined,
  }),
  loader: async ({ deps }: { deps: { invite?: string } }) => {
    if (deps.invite) {
      try {
        const details = await getInviteDetailsFn({ data: { inviteToken: deps.invite } });
        return { inviteDetails: details };
      } catch (err: any) {
        return { inviteError: err.message };
      }
    }
    return { inviteDetails: null };
  },
  loaderDeps: ({ search: { invite } }) => ({ invite }),
  component: AuthPage,
});

const roles = [
  {
    id: "landlord",
    label: "Property Owner",
    desc: "Full access to all features",
    icon: Building2,
    to: "/admin",
  },
  {
    id: "manager",
    label: "Manager",
    desc: "All except billing & settings",
    icon: ShieldCheck,
    to: "/admin",
  },
  {
    id: "maintenance",
    label: "Maintenance Staff",
    desc: "Assigned requests only",
    icon: Wrench,
    to: "/admin/maintenance",
  },
  { id: "tenant", label: "Tenant", desc: "Pay rent, submit requests", icon: User, to: "/tenant" },
] as const;

function AuthPage() {
  const navigate = useNavigate();
  const { inviteDetails, inviteError } = Route.useLoaderData() as any;
  const search = Route.useSearch();
  const inviteToken = search.invite;

  // If invited, force role to tenant (or maintenance if inviteType is maintenance), otherwise remove tenant from roles array
  const displayRoles = inviteDetails
    ? inviteDetails.invite.inviteType === "maintenance"
      ? roles.filter((r) => r.id === "maintenance")
      : roles.filter((r) => r.id === "tenant")
    : roles.filter((r) => r.id !== "tenant");
  const defaultRole = inviteDetails
    ? inviteDetails.invite.inviteType === "maintenance"
      ? "maintenance"
      : "tenant"
    : "landlord";

  const [role, setRole] = useState<(typeof roles)[number]["id"]>(defaultRole);
  const [email, setEmail] = useState(inviteDetails?.invite?.email || "");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState(search.error || inviteError || "");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [isVerifying, setIsVerifying] = useState(false);
  const [otp, setOtp] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isResetCodeSent, setIsResetCodeSent] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const defaultTab = inviteDetails ? (inviteDetails.emailExists ? "signin" : "signup") : "signin";
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    if (search.error) {
      setError(search.error);
    }
  }, [search.error]);

  const handleGoogleSignIn = async () => {
    setError("");
    setSuccessMessage("");
    setIsLoading(true);
    try {
      const result = await getGoogleAuthUrlFn({ data: { inviteToken } });
      window.location.href = result.authUrl;
    } catch (err: any) {
      setError(err.message || "Failed to initialize Google Sign In.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsLoading(true);
    try {
      const result = await signInFn({ data: { email, password, inviteToken } });
      // Route based on the actual role from the database, not the picker
      const dbRole = result.profile.role;
      const target = dbRole === "tenant" ? "/tenant" : "/admin";
      navigate({ to: target });
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!email.toLowerCase().endsWith("@gmail.com")) {
      setError("Currently, we only accept @gmail.com email addresses.");
      return;
    }

    setIsLoading(true);
    try {
      await requestSignUpOtpFn({
        data: { email, password, firstName, lastName, role, inviteToken },
      });
      setIsVerifying(true);
    } catch (err: any) {
      setError(err.message || "Error creating account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsLoading(true);
    try {
      const result = await verifyOtpAndSignUpFn({ data: { email, code: otp } });
      const dbRole = result.profile.role;
      const target = dbRole === "tenant" ? "/tenant" : "/admin";
      navigate({ to: target });
    } catch (err: any) {
      setError(err.message || "Invalid verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsLoading(true);
    try {
      await requestPasswordResetOtpFn({ data: { email } });
      setIsResetCodeSent(true);
      setSuccessMessage("If your account exists, a reset code has been sent to your email.");
    } catch (err: any) {
      setError(err.message || "Failed to send reset code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsLoading(true);
    try {
      await resetPasswordWithOtpFn({ data: { email, code: resetCode, newPassword } });
      setSuccessMessage("Password reset successful. You can now sign in.");
      setIsResettingPassword(false);
      setIsResetCodeSent(false);
      setResetCode("");
      setNewPassword("");
      setPassword("");
      setActiveTab("signin");
    } catch (err: any) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div
        className="relative hidden flex-col justify-between p-10 text-primary-foreground lg:flex"
        style={{ background: "var(--gradient-hero)" }}
      >
        <Logo className="text-primary-foreground" />
        <div>
          <h2 className="text-3xl font-bold leading-tight">Run your portfolio with ease.</h2>
          <p className="mt-3 max-w-md text-sm text-primary-foreground/80">
            PropEase brings tenants, rent, and maintenance into one beautiful, fast workspace —
            built for the way modern landlords actually work.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              ["94%", "Occupancy"],
              ["$132k", "Rent / mo"],
              ["4.2h", "Avg response"],
            ].map(([v, l]) => (
              <div key={l} className="rounded-xl bg-white/10 p-3 backdrop-blur">
                <p className="text-xl font-semibold">{v}</p>
                <p className="text-xs text-primary-foreground/70">{l}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-primary-foreground/60">© PropEase</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col bg-background">
        <header className="flex items-center justify-between p-6">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back
          </Link>
          <ThemeToggle />
        </header>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-12">
          {isVerifying ? (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Verify your email</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  We've sent a 6-digit verification code to{" "}
                  <strong className="text-foreground">{email}</strong>.
                </p>
                <p className="mt-2 rounded-md border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-600 dark:text-amber-500 font-medium">
                  Check your terminal console where the npm dev server is running to find the code.
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                {error && (
                  <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
                <div className="space-y-2 flex flex-col items-center">
                  <Label htmlFor="otp" className="self-start">
                    Verification Code
                  </Label>
                  <InputOTP maxLength={6} value={otp} onChange={(val) => setOtp(val)}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="h-12 w-12 text-lg" />
                      <InputOTPSlot index={1} className="h-12 w-12 text-lg" />
                      <InputOTPSlot index={2} className="h-12 w-12 text-lg" />
                      <InputOTPSlot index={3} className="h-12 w-12 text-lg" />
                      <InputOTPSlot index={4} className="h-12 w-12 text-lg" />
                      <InputOTPSlot index={5} className="h-12 w-12 text-lg" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full text-base"
                  disabled={isLoading || otp.length < 6}
                >
                  {isLoading ? "Verifying..." : "Verify & Create Account"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-sm text-muted-foreground"
                  onClick={() => {
                    setIsVerifying(false);
                    setOtp("");
                    setError("");
                  }}
                >
                  ← Back to Sign Up
                </Button>
              </form>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold tracking-tight">Welcome to PropEase</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Sign in or create an account to continue.
              </p>

              <Tabs
                value={activeTab}
                onValueChange={(val: any) => setActiveTab(val)}
                className="mt-6"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Sign up</TabsTrigger>
                </TabsList>

                <TabsContent value="signin" className="mt-6">
                  <form
                    className="space-y-4"
                    onSubmit={
                      isResettingPassword
                        ? isResetCodeSent
                          ? handleResetPassword
                          : handleRequestPasswordReset
                        : handleSignIn
                    }
                  >
                    {error && (
                      <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                        {error}
                      </div>
                    )}
                    {successMessage && (
                      <div className="rounded-md bg-green-500/15 p-3 text-sm text-green-700 dark:text-green-400">
                        {successMessage}
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    {!isResettingPassword ? (
                      <>
                        <div className="space-y-1.5">
                          <Label htmlFor="password">Password</Label>
                          <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                          />
                        </div>
                        <button
                          type="button"
                          className="text-sm text-accent hover:underline"
                          onClick={() => {
                            setError("");
                            setSuccessMessage("");
                            setIsResettingPassword(true);
                            setIsResetCodeSent(false);
                            setResetCode("");
                            setNewPassword("");
                          }}
                        >
                          Forgot password?
                        </button>
                        <Button
                          type="submit"
                          className="h-11 w-full text-base"
                          disabled={isLoading}
                        >
                          {isLoading ? "Signing in..." : "Sign in"}
                        </Button>

                        <div className="relative my-4">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                              Or continue with
                            </span>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 w-full text-base"
                          disabled={isLoading}
                          onClick={handleGoogleSignIn}
                        >
                          <svg
                            className="mr-2 h-4 w-4"
                            aria-hidden="true"
                            focusable="false"
                            data-prefix="fab"
                            data-icon="google"
                            role="img"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 488 512"
                          >
                            <path
                              fill="currentColor"
                              d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
                            ></path>
                          </svg>
                          Google
                        </Button>
                      </>
                    ) : (
                      <>
                        {isResetCodeSent && (
                          <>
                            <div className="space-y-1.5">
                              <Label htmlFor="reset-code">Verification code</Label>
                              <Input
                                id="reset-code"
                                value={resetCode}
                                onChange={(e) => setResetCode(e.target.value)}
                                required
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="new-password">New password</Label>
                              <Input
                                id="new-password"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                              />
                            </div>
                          </>
                        )}
                        <Button
                          type="submit"
                          className="h-11 w-full text-base"
                          disabled={isLoading}
                        >
                          {isLoading
                            ? "Please wait..."
                            : isResetCodeSent
                              ? "Reset password"
                              : "Send reset code"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full text-sm text-muted-foreground"
                          onClick={() => {
                            setError("");
                            setSuccessMessage("");
                            setIsResettingPassword(false);
                            setIsResetCodeSent(false);
                            setResetCode("");
                            setNewPassword("");
                          }}
                        >
                          ← Back to sign in
                        </Button>
                      </>
                    )}
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="mt-6">
                  <form className="space-y-4" onSubmit={handleSignUp}>
                    {inviteDetails && (
                      <div className="rounded-md border border-accent/20 bg-accent/5 p-4">
                        <h3 className="text-sm font-semibold text-accent">You've been invited!</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {inviteDetails.invite.inviteType === "maintenance" ? (
                            <span>
                              {inviteDetails.landlordName} invited you to join{" "}
                              <strong>{inviteDetails.propertyName}</strong> as a Maintenance Worker.
                            </span>
                          ) : (
                            <span>
                              {inviteDetails.landlordName} invited you to join{" "}
                              <strong>{inviteDetails.propertyName}</strong> · Apt{" "}
                              {inviteDetails.unitNumber}.
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                    {error && (
                      <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                        {error}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="fn">First name</Label>
                        <Input
                          id="fn"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="ln">Last name</Label>
                        <Input
                          id="ln"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email2">Email</Label>
                      <Input
                        id="email2"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={!!inviteDetails?.invite?.email}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="password2">Password</Label>
                      <Input
                        id="password2"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <RolePicker role={role} setRole={setRole} availableRoles={displayRoles} />
                    <Button type="submit" className="h-11 w-full text-base" disabled={isLoading}>
                      {isLoading ? "Creating account..." : "Create account"}
                    </Button>

                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          Or continue with
                        </span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-full text-base"
                      disabled={isLoading}
                      onClick={handleGoogleSignIn}
                    >
                      <svg
                        className="mr-2 h-4 w-4"
                        aria-hidden="true"
                        focusable="false"
                        data-prefix="fab"
                        data-icon="google"
                        role="img"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 488 512"
                      >
                        <path
                          fill="currentColor"
                          d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
                        ></path>
                      </svg>
                      Google
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RolePicker({
  role,
  setRole,
  availableRoles,
}: {
  role: string;
  setRole: (id: any) => void;
  availableRoles: (typeof roles)[number][];
}) {
  if (availableRoles.length === 1) return null; // Hide if locked to one role
  return (
    <div className="space-y-2">
      <Label>I am a...</Label>
      <div className="grid grid-cols-2 gap-2">
        {availableRoles.map((r) => {
          const Icon = r.icon;
          const active = role === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setRole(r.id)}
              className={`flex items-start gap-2.5 rounded-lg border p-3 text-left transition ${
                active
                  ? "border-accent bg-accent/5 ring-2 ring-accent/30"
                  : "border-border hover:border-accent/50 hover:bg-muted/40"
              }`}
            >
              <Icon
                className={`mt-0.5 h-4 w-4 shrink-0 ${active ? "text-accent" : "text-muted-foreground"}`}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">{r.label}</p>
                <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{r.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
