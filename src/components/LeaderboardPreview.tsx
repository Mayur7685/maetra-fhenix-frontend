const MOCK_TRADERS = [
  { place: 1, name: "@3Lstay", avatar: "3", winRate: "78.4%", winStreak: 7, trustScore: 9.8, weightClass: "Heavyweight" },
  { place: 2, name: "@Pons_ETH", avatar: "P", winRate: "57%", winStreak: 3, trustScore: 9.5, weightClass: "Heavyweight" },
  { place: 3, name: "@mrjasonchoi", avatar: "M", winRate: "55.3%", winStreak: 4, trustScore: 8.0, weightClass: "Heavyweight" },
  { place: 4, name: "@grandcanto", avatar: "G", winRate: "50.1%", winStreak: 2, trustScore: 8.0, weightClass: "Heavyweight" },
];

const WEIGHT_STYLES: Record<string, string> = {
  Heavyweight: "bg-pomelo/15 text-pomelo",
  Middleweight: "bg-lemon/15 text-lemon",
  Lightweight: "bg-lime/15 text-lime",
};

function WeightBadge({ weight }: { weight: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${WEIGHT_STYLES[weight] || "bg-lime/15 text-lime"}`}>
      {weight}
    </span>
  );
}

export function LeaderboardPreview() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-full bg-lime flex items-center justify-center">
              <div className="h-1.5 w-1.5 rounded-full bg-coal" />
            </div>
            <span className="text-sm font-semibold text-foreground">maetra</span>
          </div>
          <span className="text-sm font-medium text-foreground">Leaderboard</span>
          <span className="text-sm text-muted">My Subscriptions</span>
        </div>
        <div className="rounded-[var(--radius-sm)] border border-border px-3 py-1 text-xs text-muted font-mono">
          aleo1x4B...nkg
        </div>
      </div>

      {/* Leaderboard content */}
      <div className="flex">
        {/* Table */}
        <div className="flex-1 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Leaderboard</h2>
            <div className="flex rounded-[var(--radius-md)] border border-border overflow-hidden">
              <button className="px-3 py-1.5 text-xs text-muted hover:text-foreground transition-colors">24HR</button>
              <button className="px-3 py-1.5 text-xs text-muted hover:text-foreground transition-colors">7D</button>
              <button className="px-3 py-1.5 text-xs font-medium text-coal bg-lime border-l border-border">30D</button>
              <button className="px-3 py-1.5 text-xs text-muted hover:text-foreground transition-colors border-l border-border">All time</button>
            </div>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-6 gap-4 text-xs text-muted font-medium px-3 py-2 border-b border-border">
            <span>Place</span>
            <span>Username</span>
            <span>Win rate</span>
            <span>Win streak</span>
            <span>Trust score</span>
            <span>Weight Class</span>
          </div>

          {/* Table rows */}
          {MOCK_TRADERS.map((trader) => (
            <div
              key={trader.place}
              className="grid grid-cols-6 gap-4 items-center px-3 py-3 text-sm border-b border-border/50 hover:bg-background/50 transition-colors"
            >
              <span className="text-muted">{trader.place}</span>
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-stone flex items-center justify-center text-xs font-medium text-foreground">
                  {trader.avatar}
                </div>
                <span className="text-foreground font-medium">{trader.name}</span>
              </div>
              <span className="text-lime font-semibold">{trader.winRate}</span>
              <span className="text-foreground">{trader.winStreak}</span>
              <span className="text-foreground">{trader.trustScore}</span>
              <WeightBadge weight={trader.weightClass} />
            </div>
          ))}
        </div>

        {/* Sidebar preview */}
        <div className="w-64 border-l border-border p-5 bg-background/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-lemon/20 flex items-center justify-center text-sm font-semibold text-lemon">
              T
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">Tma_420</span>
                <span className="text-xs font-medium text-lime">+7</span>
              </div>
              <span className="text-xs text-muted">@Tma_420</span>
            </div>
          </div>
          <WeightBadge weight="Middleweight" />
          <div className="flex flex-wrap gap-1.5 mt-3">
            {[
              { tag: "AI", color: "bg-lime/15 text-lime" },
              { tag: "DePIN", color: "bg-lemon/15 text-lemon" },
              { tag: "Altcoins", color: "bg-pomelo/15 text-pomelo" },
              { tag: "Small Caps", color: "bg-cloudberry/15 text-cloudberry" },
            ].map(({ tag, color }) => (
              <span
                key={tag}
                className={`rounded-full ${color} px-2.5 py-0.5 text-xs font-medium`}
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="mt-4 text-xs text-muted font-medium">This Month:</div>
        </div>
      </div>
    </div>
  );
}
