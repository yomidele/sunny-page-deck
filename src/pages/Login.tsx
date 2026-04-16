import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BookOpen, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type Mode = "login" | "first-time";

const Login = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [generalPassword, setGeneralPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  if (user) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Check whitelist first
      const { data: rawData, error: whitelistError } = await supabase.rpc(
        "check_email_whitelist",
        { check_email: email.trim() },
      );

      if (whitelistError) throw whitelistError;

      const whitelistData = rawData as unknown as {
        exists: boolean;
        is_used: boolean;
        linked_user_id: string | null;
      };

      if (!whitelistData?.exists) {
        setError("You are not registered for this lesson program.");
        setLoading(false);
        return;
      }

      if (!whitelistData.is_used) {
        setError(
          'You have not set up your account yet. Please use "First Time Access" below.',
        );
        setLoading(false);
        return;
      }

      // Normal login
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError("Invalid email or password.");
        setLoading(false);
        return;
      }

      navigate("/dashboard", { replace: true });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFirstTimeAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Check whitelist
      const { data: rawData2, error: whitelistError } = await supabase.rpc(
        "check_email_whitelist",
        { check_email: email.trim() },
      );

      if (whitelistError) throw whitelistError;

      const whitelistData = rawData2 as unknown as {
        exists: boolean;
        is_used: boolean;
        linked_user_id: string | null;
      };

      if (!whitelistData?.exists) {
        setError("You are not registered for this lesson program.");
        setLoading(false);
        return;
      }

      if (whitelistData.is_used) {
        setError(
          "This email already has an account. Please use the login form instead.",
        );
        setLoading(false);
        return;
      }

      // Verify general password
      const { data: passwordValid, error: pwError } = await supabase.rpc(
        "verify_general_password",
        { input_password: generalPassword },
      );

      if (pwError) throw pwError;

      if (!passwordValid) {
        setError("Invalid access password. Please contact your instructor.");
        setLoading(false);
        return;
      }

      // Proceed to account setup
      navigate("/setup", { state: { email: email.trim() } });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto flex items-center px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span
              className="text-lg font-bold text-foreground"
              style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
            >
              MEEKAH
            </span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle
              className="text-2xl"
              style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
            >
              {mode === "login" ? "Welcome Back" : "First Time Access"}
            </CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Sign in with your personal credentials"
                : "Enter your email and the access password provided by your instructor"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {mode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
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
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Your personal password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in…" : "Sign In"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleFirstTimeAccess} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ft-email">Email</Label>
                  <Input
                    id="ft-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="general-password">Access Password</Label>
                  <Input
                    id="general-password"
                    type="password"
                    placeholder="Provided by your instructor"
                    value={generalPassword}
                    onChange={(e) => setGeneralPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Verifying…" : "Continue"}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center">
              <button
                type="button"
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                onClick={() => {
                  setMode(mode === "login" ? "first-time" : "login");
                  setError("");
                }}
              >
                {mode === "login"
                  ? "First time? Set up your account"
                  : "Already have an account? Sign in"}
              </button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Login;
