import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { api } from "@/lib/api";

export default function SetupProfilePage() {
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { token, refreshUser } = useAuth();
  const { isConnected, address } = useAccount();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return navigate("/login");
    setError("");
    setLoading(true);
    try {
      await api.profile.update(token, { displayName });
      if (isConnected && address) {
        await api.profile.connectWallet(token, address);
      }
      await refreshUser();
      navigate("/my-page");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="app" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-lime/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="flex items-center justify-center min-h-screen px-6 pt-20">
        <form onSubmit={handleSubmit} className="relative w-full max-w-sm flex flex-col items-center">
          <h1 className="text-xl font-semibold text-foreground mb-8">Set up your profile</h1>

          {error && (
            <div className="w-full mb-4 rounded-[var(--radius-md)] bg-tangerine/10 border border-tangerine/30 px-4 py-2 text-sm text-tangerine">
              {error}
            </div>
          )}

          <div className="w-full space-y-4">
            <div className="w-full">
              <label className="block text-xs text-muted mb-1.5">EVM Wallet</label>
              {isConnected && address ? (
                <div className="w-full rounded-[var(--radius-md)] border border-lime/30 bg-lime/5 px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-lime" />
                    <span className="text-sm text-foreground font-mono truncate max-w-[200px]">
                      {address.slice(0, 10)}...{address.slice(-4)}
                    </span>
                  </div>
                  <ConnectButton showBalance={false} chainStatus="none" accountStatus="address" />
                </div>
              ) : (
                <ConnectButton label="Connect Wallet" showBalance={false} />
              )}
            </div>

            <div>
              <label className="block text-xs text-muted mb-1.5">Your Name</label>
              <input type="text" placeholder="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-[var(--radius-md)] border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-lime/50 transition-colors" />
            </div>

            <button type="button"
              className="w-full flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface px-4 py-2.5 text-sm text-muted hover:text-foreground hover:border-lime/30 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Connect X account
              <span className="text-xs text-muted/50">optional</span>
            </button>

            <button type="submit" disabled={loading}
              className="w-full rounded-[var(--radius-md)] bg-foreground py-2.5 text-sm font-semibold text-background hover:bg-foreground/90 transition-colors mt-2 disabled:opacity-50">
              {loading ? "Saving..." : "Continue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
