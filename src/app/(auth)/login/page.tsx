"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/leaderboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
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

          <h1 className="text-xl font-semibold text-foreground mb-8">Welcome back</h1>

          {error && (
            <div className="w-full mb-4 rounded-[var(--radius-md)] bg-tangerine/10 border border-tangerine/30 px-4 py-2 text-sm text-tangerine">
              {error}
            </div>
          )}

          <div className="w-full space-y-4">
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
            <button type="submit" disabled={loading}
              className="w-full rounded-[var(--radius-md)] bg-foreground py-2.5 text-sm font-semibold text-background hover:bg-foreground/90 transition-colors mt-2 disabled:opacity-50">
              {loading ? "Logging in..." : "Login"}
            </button>
          </div>

          <p className="mt-6 text-sm text-muted">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-lime hover:underline">Sign up</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
