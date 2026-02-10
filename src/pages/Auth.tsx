import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Building2, Mail, Lock, User, HardHat } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");

  const isLogin = mode === "login";
  const isReset = mode === "reset";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
    } else {
      navigate("/");
    }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName,
          org_name: orgName,
        },
      },
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Account created! Please check your email to verify.");
    }
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password reset link sent! Check your email.");
      setMode("login");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Apple-style gradient branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary to-primary/80 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="flex items-center gap-3 mb-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <HardHat className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-semibold tracking-tight">BuildFlow</span>
          </div>
          <h1 className="text-4xl font-semibold mb-5 tracking-tight leading-tight">
            Build Smarter,<br />Manage Better
          </h1>
          <p className="text-lg text-white/70 max-w-md leading-relaxed">
            The complete construction management platform trusted by thousands of contractors and builders worldwide.
          </p>
          <div className="mt-14 grid grid-cols-3 gap-10">
            <div>
              <div className="text-4xl font-semibold tracking-tight">500+</div>
              <div className="text-sm text-white/60 mt-1">Active Projects</div>
            </div>
            <div>
              <div className="text-4xl font-semibold tracking-tight">10K+</div>
              <div className="text-sm text-white/60 mt-1">Users</div>
            </div>
            <div>
              <div className="text-4xl font-semibold tracking-tight">99%</div>
              <div className="text-sm text-white/60 mt-1">Uptime</div>
            </div>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full -mr-64 -mb-64 blur-3xl" />
        <div className="absolute top-20 right-20 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
      </div>

      {/* Right Panel - Apple-style clean form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <div className="flex items-center justify-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
                <HardHat className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-semibold tracking-tight">BuildFlow</span>
            </div>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-semibold text-foreground tracking-tight">
              {isReset ? "Reset Password" : isLogin ? "Welcome back" : "Create an account"}
            </h2>
            <p className="text-muted-foreground mt-3 text-base">
              {isReset
                ? "Enter your email to receive a reset link"
                : isLogin
                ? "Enter your credentials to access your account"
                : "Get started with your free account today"}
            </p>
          </div>

          {isReset ? (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="pl-11"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={isLogin ? handleLogin : handleSignup} className="space-y-5">
              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        className="pl-11"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orgName" className="text-sm font-medium">Organization Name</Label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="orgName"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="ABC Constructions"
                        className="pl-11"
                        required
                      />
                    </div>
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="pl-11"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => setMode("reset")}
                      className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-11"
                    required
                    minLength={8}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
              </Button>
            </form>
          )}

          {!isReset && (
            <>
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-3 text-muted-foreground font-medium">or</span>
                </div>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => setMode(isLogin ? "signup" : "login")}
                  className="font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  {isLogin ? "Sign up for free" : "Sign in"}
                </button>
              </p>
            </>
          )}

          <p className="mt-10 text-center text-xs text-muted-foreground">
            By continuing, you agree to our{" "}
            <a href="#" className="text-foreground/70 hover:text-foreground transition-colors">Terms of Service</a>
            {" "}and{" "}
            <a href="#" className="text-foreground/70 hover:text-foreground transition-colors">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}
