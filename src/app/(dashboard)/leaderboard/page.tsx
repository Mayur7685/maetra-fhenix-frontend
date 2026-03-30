"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { api, LeaderboardEntry } from "@/lib/api";

const WEIGHT_STYLES: Record<string, string> = {
  Heavyweight: "bg-pomelo/15 text-pomelo",
  Middleweight: "bg-lemon/15 text-lemon",
  Lightweight: "bg-lime/15 text-lime",
};

const TIME_FILTERS = ["24H", "7D", "30D"] as const;

export default function LeaderboardPage() {
  const [timeFilter, setTimeFilter] = useState<string>("30D");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [selected, setSelected] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    api.leaderboard.get(timeFilter)
      .then((data) => {
        setEntries(data.leaderboard);
        if (data.leaderboard.length > 0) setSelected(data.leaderboard[0]);
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [timeFilter]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="app" />

      <div className="flex pt-16">
        {/* Main table */}
        <div className="flex-1 p-4 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Leaderboard</h1>
            <div className="flex rounded-[var(--radius-md)] border border-border overflow-hidden">
              {TIME_FILTERS.map((filter) => (
                <button key={filter} onClick={() => setTimeFilter(filter)}
                  className={`px-3 sm:px-4 py-1.5 text-sm transition-colors ${
                    timeFilter === filter ? "bg-lime text-coal font-medium" : "text-muted hover:text-foreground"
                  } ${filter !== "24H" ? "border-l border-border" : ""}`}>
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden lg:block rounded-[var(--radius-lg)] border border-border bg-surface overflow-hidden">
            <div className="grid grid-cols-[1fr_2fr_1fr_1fr_1fr_1fr_1.5fr] gap-4 text-xs text-muted font-medium px-5 py-3 border-b border-border">
              <span>#</span><span>Name</span><span>Win rate</span><span>Win streak</span><span>Trust score</span><span>30D trades</span><span>Weight class</span>
            </div>

            {loading ? (
              <div className="px-5 py-12 text-center text-muted text-sm">Loading...</div>
            ) : entries.length === 0 ? (
              <div className="px-5 py-12 text-center text-muted text-sm">No traders yet. Be the first to verify your performance!</div>
            ) : (
              entries.map((entry) => (
                <div key={entry.userId} onClick={() => setSelected(entry)}
                  className={`grid grid-cols-[1fr_2fr_1fr_1fr_1fr_1fr_1.5fr] gap-4 items-center px-5 py-3.5 text-sm border-b border-border/50 cursor-pointer transition-colors ${
                    selected?.userId === entry.userId ? "bg-lime/5" : "hover:bg-surface"
                  }`}>
                  <span className="text-muted">{entry.place}</span>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-stone flex items-center justify-center text-xs font-semibold text-foreground">
                      {(entry.username || "?")[0].toUpperCase()}
                    </div>
                    <span className={`text-foreground font-medium ${entry.hasProfile ? "cursor-pointer hover:text-lime" : ""}`} onClick={(e) => { e.stopPropagation(); if (entry.hasProfile) router.push(`/creator/${entry.username}`); }}>
                      {entry.username}
                    </span>
                  </div>
                  <span className="text-lime font-semibold">{entry.winRate}%</span>
                  <span className="text-foreground">{entry.winStreak}</span>
                  <span className="text-foreground">{entry.trustScore}</span>
                  <span className="text-foreground">{entry.tradeCount}</span>
                  <span className={`inline-flex items-center w-fit rounded-full px-2.5 py-0.5 text-xs font-medium ${WEIGHT_STYLES[entry.weightClass] || WEIGHT_STYLES.Lightweight}`}>
                    {entry.weightClass}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {loading ? (
              <div className="py-12 text-center text-muted text-sm">Loading...</div>
            ) : entries.length === 0 ? (
              <div className="py-12 text-center text-muted text-sm">No traders yet. Be the first to verify your performance!</div>
            ) : (
              entries.map((entry) => (
                <div key={entry.userId}
                  onClick={() => entry.hasProfile && router.push(`/creator/${entry.username}`)}
                  className={`rounded-[var(--radius-lg)] border border-border bg-surface p-4 transition-colors ${entry.hasProfile ? "cursor-pointer hover:border-lime/20" : ""}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted w-5">#{entry.place}</span>
                      <div className="h-9 w-9 rounded-full bg-stone flex items-center justify-center text-sm font-semibold text-foreground">
                        {(entry.username || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{entry.username}</p>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${WEIGHT_STYLES[entry.weightClass] || WEIGHT_STYLES.Lightweight}`}>
                          {entry.weightClass}
                        </span>
                      </div>
                    </div>
                    <p className="text-lg font-semibold text-lime">{entry.winRate}%</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div><span className="text-muted">Streak</span><p className="font-semibold text-foreground">{entry.winStreak}</p></div>
                    <div><span className="text-muted">Trust</span><p className="font-semibold text-foreground">{entry.trustScore}</p></div>
                    <div><span className="text-muted">Trades</span><p className="font-semibold text-foreground">{entry.tradeCount}</p></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sidebar - desktop only */}
        {selected && (
          <div className="hidden lg:block w-80 border-l border-border p-6 pt-8 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-12 w-12 rounded-full bg-stone flex items-center justify-center text-lg font-semibold text-foreground">
                {(selected.username || "?")[0].toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{selected.username}</span>
                  <span className="text-xs text-lime font-medium">+{selected.winStreak}</span>
                </div>
                {selected.xHandle && <span className="text-xs text-muted">{selected.xHandle}</span>}
              </div>
            </div>

            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${WEIGHT_STYLES[selected.weightClass] || WEIGHT_STYLES.Lightweight}`}>
              {selected.weightClass}
            </span>

            <div className="mt-6">
              <p className="text-xs text-muted font-medium mb-3">This month:</p>
              <div className="grid grid-cols-3 gap-4">
                <div><p className="text-xs text-muted">Win rate</p><p className="text-sm font-semibold text-lime">{selected.winRate}%</p></div>
                <div><p className="text-xs text-muted">Win streak</p><p className="text-sm font-semibold text-foreground">{selected.winStreak}</p></div>
                <div><p className="text-xs text-muted">Trust score</p><p className="text-sm font-semibold text-foreground">{selected.trustScore}</p></div>
                <div><p className="text-xs text-muted">Trades</p><p className="text-sm font-semibold text-foreground">{selected.tradeCount}</p></div>
                <div><p className="text-xs text-muted">Pos. opened</p><p className="text-sm font-semibold text-foreground">{selected.positionsOpened}</p></div>
                <div><p className="text-xs text-muted">Pos. closed</p><p className="text-sm font-semibold text-foreground">{selected.positionsClosed}</p></div>
              </div>
            </div>

            {selected.hasProfile && (
              <button onClick={() => router.push(`/creator/${selected.username}`)}
                className="mt-6 w-full rounded-[var(--radius-md)] bg-lime px-4 py-2.5 text-sm font-semibold text-coal hover:bg-lime/85 transition-colors">
                View Profile
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
