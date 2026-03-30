"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { api, SubscriptionEntry } from "@/lib/api";

export default function MySubscriptionsPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [subs, setSubs] = useState<SubscriptionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (token) {
      api.subscriptions.list(token)
        .then((data) => setSubs(data.subscriptions))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [token]);

  const handleCancel = async (creatorId: string) => {
    if (!token) return;
    setCancelling(creatorId);
    try {
      await api.subscriptions.cancel(token, creatorId);
      setSubs(subs.filter((s) => s.creatorId !== creatorId));
    } catch {}
    setCancelling(null);
  };

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="app" />

      <div className="max-w-2xl mx-auto px-6 pt-28 pb-16">
        <h1 className="text-2xl font-bold text-foreground text-center mb-8">
          My Subscriptions
        </h1>

        {loading ? (
          <div className="text-center py-16">
            <p className="text-muted text-sm">Loading...</p>
          </div>
        ) : subs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted">No active subscriptions</p>
          </div>
        ) : (
          <div className="space-y-3">
            {subs.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between rounded-[var(--radius-lg)] border border-border bg-surface px-6 py-4"
              >
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 rounded-full bg-stone flex items-center justify-center text-sm font-semibold text-foreground">
                    {(sub.creatorDisplayName || sub.creatorUsername || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p
                      className="text-sm font-semibold text-foreground cursor-pointer hover:text-lime transition-colors"
                      onClick={() => router.push(`/creator/${sub.creatorUsername}`)}
                    >
                      {sub.creatorDisplayName || sub.creatorUsername}
                    </p>
                    <p className="text-xs text-muted">
                      {sub.priceWei ? `$${(Number(BigInt(sub.priceWei)) / 1e6).toFixed(2)} USDC` : "Free"} / month
                      {sub.expiresAt && <> &middot; Expires: {new Date(sub.expiresAt).toLocaleDateString()}</>}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleCancel(sub.creatorId)}
                  disabled={cancelling === sub.creatorId}
                  className="rounded-[var(--radius-md)] border border-border px-5 py-2 text-sm text-muted hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-50"
                >
                  {cancelling === sub.creatorId ? "Cancelling..." : "Cancel"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
