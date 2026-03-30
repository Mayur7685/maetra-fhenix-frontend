import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";

export default function SignupPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (!username.trim()) {
      setError("Username is required");
      return;
    }

    setLoading(true);
    try {
      await register(email, password, username.trim());
      navigate("/setup-profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="auth" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-lime/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="flex items-center justify-center min-h-screen px-6 pt-20">
        <form onSubmit={handleSubmit} className="relative w-full max-w-sm flex flex-col items-center">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="h-8 w-8 rounded-full bg-lime flex items-center justify-center">
              <div className="h-3 w-3 rounded-full bg-coal" />
            </div>
            <span className="text-xl font-semibold text-foreground">maetra</span>
          </div>

          <h1 className="text-xl font-semibold text-foreground mb-8">Start creating on Maetra</h1>

          {error && (
            <div className="w-full mb-4 rounded-[var(--radius-md)] bg-tangerine/10 border border-tangerine/30 px-4 py-2 text-sm text-tangerine">
              {error}
            </div>
          )}

          <div className="w-full space-y-4">
            <div>
              <label className="block text-xs text-muted mb-1.5">Username</label>
              <div className="flex rounded-[var(--radius-md)] border border-border bg-surface overflow-hidden focus-within:border-lime/50 transition-colors">
                <span className="flex items-center px-3 text-sm text-muted border-r border-border bg-background/50">maetra.app/</span>
                <input type="text" placeholder="username" value={username} onChange={(e) => setUsername(e.target.value)}
                  className="flex-1 bg-transparent px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 outline-none" required />
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1.5">Email</label>
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-[var(--radius-md)] border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-lime/50 transition-colors" required />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1.5">Password</label>
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-[var(--radius-md)] border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-lime/50 transition-colors" required />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1.5">Confirm Password</label>
              <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-[var(--radius-md)] border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-lime/50 transition-colors" required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full rounded-[var(--radius-md)] bg-foreground py-2.5 text-sm font-semibold text-background hover:bg-foreground/90 transition-colors mt-2 disabled:opacity-50">
              {loading ? "Creating account..." : "Sign up"}
            </button>
          </div>

          <p className="mt-6 text-sm text-muted">
            Already have an account?{" "}
            <Link to="/login" className="text-lime hover:underline">Login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
