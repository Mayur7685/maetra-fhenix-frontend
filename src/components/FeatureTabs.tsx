import { useState } from "react";
import { LeaderboardPreview } from "./LeaderboardPreview";

const TABS = ["Leaderboard", "Post", "Monetize", "Share", "Subscribe", "Learn"] as const;

function PostPreview() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface overflow-hidden">
      {/* App chrome header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-full bg-lime flex items-center justify-center">
              <div className="h-1.5 w-1.5 rounded-full bg-coal" />
            </div>
            <span className="text-sm font-semibold text-foreground">maetra</span>
          </div>
          <span className="text-sm text-muted">Leaderboard</span>
          <span className="text-sm text-muted">My Subscriptions</span>
          <span className="text-sm font-medium text-foreground">My Page</span>
        </div>
        <div className="rounded-[var(--radius-sm)] border border-border px-3 py-1 text-xs text-muted font-mono">
          0x4B3a...nk9f
        </div>
      </div>

      <div className="flex">
        {/* Left sidebar mini */}
        <div className="w-56 border-r border-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-9 w-9 rounded-full bg-stone flex items-center justify-center text-xs font-semibold text-foreground">M</div>
            <div>
              <p className="text-sm font-semibold text-foreground">MrMiyagi</p>
              <p className="text-xs text-muted">@mrmiyagi__</p>
            </div>
          </div>
          <span className="inline-flex rounded-full bg-lemon/15 text-lemon px-2 py-0.5 text-xs font-medium">Middleweight</span>
          <div className="flex gap-1 mt-2">
            <span className="rounded-full bg-lime/15 text-lime px-2 py-0.5 text-[10px] font-medium">AI</span>
            <span className="rounded-full bg-lemon/15 text-lemon px-2 py-0.5 text-[10px] font-medium">DePIN</span>
          </div>
          <div className="mt-4 flex gap-2">
            <div className="flex-1 rounded-[var(--radius-sm)] border border-border py-1.5 text-center text-[10px] text-muted">Generate Image</div>
            <div className="flex-1 rounded-[var(--radius-sm)] bg-foreground py-1.5 text-center text-[10px] font-medium text-background">Create Post</div>
          </div>
        </div>

        {/* Post content */}
        <div className="flex-1 p-6">
          <div className="rounded-[var(--radius-md)] border border-border bg-background/30 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-stone flex items-center justify-center text-[10px] font-semibold text-foreground">M</div>
                <span className="text-sm font-medium text-foreground">MrMiyagi</span>
              </div>
              <span className="text-xs text-muted">Published: 03/05/2025</span>
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2">DeFi Rotation Is Brewing — Watch the OGs</h3>
            <p className="text-xs text-muted leading-relaxed">
              After months of low volume and liquidity thinning out, DeFi protocols are starting to show signs of life again. TVL across the board has been slowly ticking up—nothing parabolic, but steady...
            </p>
            <p className="text-xs text-muted leading-relaxed mt-2">
              $CRV and $AAVE look bottomed out on longer timeframes, and volume is coming back. These are usually first to move in a DeFi rebound.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MonetizePreview() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface overflow-hidden">
      {/* App chrome header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-full bg-lime flex items-center justify-center">
              <div className="h-1.5 w-1.5 rounded-full bg-coal" />
            </div>
            <span className="text-sm font-semibold text-foreground">maetra</span>
          </div>
          <span className="text-sm text-muted">Leaderboard</span>
          <span className="text-sm text-muted">My Subscriptions</span>
          <span className="text-sm font-medium text-foreground">My Page</span>
        </div>
        <div className="rounded-[var(--radius-sm)] border border-border px-3 py-1 text-xs text-muted font-mono">Logout</div>
      </div>

      {/* Subscription offering form */}
      <div className="flex items-center justify-center py-10">
        <div className="w-80">
          <h3 className="text-lg font-semibold text-foreground text-center mb-6">Subscription offering</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-muted mb-1.5">Description of the alpha you provide</label>
              <div className="rounded-[var(--radius-md)] border border-border bg-background/50 px-3 py-2.5 text-xs text-foreground">
                $ETH is making a move
              </div>
            </div>

            <div>
              <label className="block text-xs text-muted mb-1.5">Subscription price (USDC / month)</label>
              <div className="flex gap-2 mb-2">
                <div className="flex-1 rounded-[var(--radius-sm)] border border-border py-2 text-center text-xs text-muted">$5 USDC</div>
                <div className="flex-1 rounded-[var(--radius-sm)] border border-lime/40 bg-lime/10 py-2 text-center text-xs text-lime font-medium">$10 USDC</div>
                <div className="flex-1 rounded-[var(--radius-sm)] border border-border py-2 text-center text-xs text-muted">Other</div>
              </div>
              <div className="rounded-[var(--radius-md)] border border-border bg-background/50 px-3 py-2 text-xs text-foreground font-mono">
                10
              </div>
            </div>

            <div>
              <label className="block text-xs text-muted mb-1.5">EVM wallet address (USDC payments sent here)</label>
              <div className="rounded-[var(--radius-md)] border border-border bg-background/50 px-3 py-2 text-xs text-muted font-mono truncate">
                0x4B3a8f2c91dE7b6F0aA5c3d9e1f874B2cC0d4e5f...
              </div>
            </div>

            <div className="rounded-[var(--radius-md)] bg-foreground py-2.5 text-center text-sm font-semibold text-background">
              Update
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SharePreview() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface overflow-hidden">
      {/* App chrome header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-full bg-lime flex items-center justify-center">
              <div className="h-1.5 w-1.5 rounded-full bg-coal" />
            </div>
            <span className="text-sm font-semibold text-foreground">maetra</span>
          </div>
          <span className="text-sm text-muted">Leaderboard</span>
          <span className="text-sm text-muted">My Subscriptions</span>
          <span className="text-sm font-medium text-foreground">My Page</span>
        </div>
      </div>

      {/* Creator profile card */}
      <div className="flex">
        <div className="w-72 border-r border-border p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-full bg-stone flex items-center justify-center text-lg font-semibold text-foreground">J</div>
            <div>
              <p className="text-sm font-semibold text-foreground">JQK3R</p>
              <p className="text-xs text-muted">@BobyJinda</p>
            </div>
          </div>
          <span className="inline-flex rounded-full bg-lime/15 text-lime px-2.5 py-0.5 text-xs font-medium">Lightweight</span>
          <div className="flex gap-1.5 mt-2">
            <span className="rounded-full bg-lemon/15 text-lemon px-2 py-0.5 text-[10px] font-medium">DePIN</span>
          </div>

          <div className="mt-5">
            <p className="text-[10px] text-muted mb-2">This month:</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] text-muted">Win rate</p>
                <p className="text-xs font-semibold text-lime">37.50%</p>
              </div>
              <div>
                <p className="text-[10px] text-muted">Win streak</p>
                <p className="text-xs font-semibold text-foreground">0</p>
              </div>
              <div>
                <p className="text-[10px] text-muted">Trust score</p>
                <p className="text-xs font-semibold text-foreground">1.17</p>
              </div>
              <div>
                <p className="text-[10px] text-muted">Trades</p>
                <p className="text-xs font-semibold text-foreground">33</p>
              </div>
              <div>
                <p className="text-[10px] text-muted">Positions opened</p>
                <p className="text-xs font-semibold text-foreground">17</p>
              </div>
              <div>
                <p className="text-[10px] text-muted">Positions closed</p>
                <p className="text-xs font-semibold text-foreground">16</p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[10px] text-muted mb-1">Bio</p>
            <p className="text-[10px] text-muted leading-relaxed">Perp trading on Hyperliquid. Sharing high-conviction setups weekly. All performance verified on-chain.</p>
          </div>
        </div>

        {/* Unlock area */}
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="text-center">
            <div className="h-14 w-14 rounded-full bg-stone flex items-center justify-center text-xl font-semibold text-foreground mx-auto mb-3">J</div>
            <p className="text-sm font-semibold text-foreground mb-4">Share your public profile link</p>
            <div className="rounded-[var(--radius-md)] border border-border bg-background/50 px-4 py-2 text-xs text-muted font-mono mb-3">
              maetra.vercel.app/JQK3R
            </div>
            <div className="rounded-[var(--radius-md)] bg-lime px-5 py-2 text-xs font-semibold text-coal inline-block">
              Copy Link
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SubscribePreview() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface overflow-hidden">
      {/* App chrome header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-full bg-lime flex items-center justify-center">
              <div className="h-1.5 w-1.5 rounded-full bg-coal" />
            </div>
            <span className="text-sm font-semibold text-foreground">maetra</span>
          </div>
          <span className="text-sm text-muted">Leaderboard</span>
          <span className="text-sm font-medium text-foreground">My Subscriptions</span>
          <span className="text-sm text-muted">My Page</span>
        </div>
      </div>

      {/* Subscriptions list */}
      <div className="px-8 py-8">
        <h3 className="text-lg font-semibold text-foreground text-center mb-6">My Subscriptions</h3>
        <div className="max-w-lg mx-auto space-y-3">
          {[
            { name: "MrMiyagi", avatar: "M", price: "$15 USDC", date: "Jun 5, 2025" },
            { name: "heycape_", avatar: "H", price: "$10 USDC", date: "July 5, 2025" },
            { name: "akshat", avatar: "A", price: "$5 USDC", date: "Aug 12, 2025" },
          ].map((sub) => (
            <div
              key={sub.name}
              className="flex items-center justify-between rounded-[var(--radius-md)] border border-border bg-background/30 px-5 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-stone flex items-center justify-center text-xs font-semibold text-foreground">
                  {sub.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{sub.name}</p>
                  <p className="text-[10px] text-muted">{sub.price} per month &middot; Next charge: {sub.date}</p>
                </div>
              </div>
              <div className="rounded-[var(--radius-sm)] border border-border px-3 py-1 text-xs text-muted">
                Cancel
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LearnPreview() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface overflow-hidden">
      {/* App chrome header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-full bg-lime flex items-center justify-center">
              <div className="h-1.5 w-1.5 rounded-full bg-coal" />
            </div>
            <span className="text-sm font-semibold text-foreground">maetra</span>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="px-8 py-10">
        <h3 className="text-lg font-semibold text-foreground text-center mb-8">How Maetra Works</h3>
        <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto">
          {[
            {
              step: "1",
              title: "Prove Performance",
              desc: "Connect your exchange. Maetra encrypts your trade metrics using FHE and submits them on-chain — raw data never leaves your browser.",
              color: "bg-lime/15 text-lime",
            },
            {
              step: "2",
              title: "Build Reputation",
              desc: "The contract computes your Win Rate, Trust Score, and Weight Class homomorphically on encrypted inputs. Opt in to publish your score to the leaderboard.",
              color: "bg-lemon/15 text-lemon",
            },
            {
              step: "3",
              title: "Monetize Alpha",
              desc: "Set a subscription price and post gated alpha. Subscribers pay in USDC directly to your wallet. Subscription status is stored as an encrypted boolean — only you and your subscriber can see it.",
              color: "bg-pomelo/15 text-pomelo",
            },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className={`h-10 w-10 rounded-full ${item.color} flex items-center justify-center text-sm font-bold mx-auto mb-3`}>
                {item.step}
              </div>
              <h4 className="text-sm font-semibold text-foreground mb-2">{item.title}</h4>
              <p className="text-xs text-muted leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-[var(--radius-md)] border border-border bg-background/30 p-4 max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-lime">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            </svg>
            <span className="text-xs font-semibold text-foreground">Powered by Fhenix Fully Homomorphic Encryption</span>
          </div>
          <p className="text-xs text-muted leading-relaxed">
            Trade metrics are encrypted client-side and computed on-chain without ever being decrypted. Subscription status is stored as an encrypted boolean. Post content is AES-256 encrypted in your browser — the server stores only ciphertext.
          </p>
        </div>
      </div>
    </div>
  );
}

export function FeatureTabs() {
  const [activeTab, setActiveTab] = useState<string>("Leaderboard");

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Tab buttons */}
      <div className="flex rounded-[var(--radius-lg)] border border-border bg-surface overflow-hidden mb-8">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium transition-all ${
              activeTab === tab
                ? "bg-lime text-coal rounded-[var(--radius-md)] m-1"
                : "text-muted hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "Leaderboard" && <LeaderboardPreview />}
      {activeTab === "Post" && <PostPreview />}
      {activeTab === "Monetize" && <MonetizePreview />}
      {activeTab === "Share" && <SharePreview />}
      {activeTab === "Subscribe" && <SubscribePreview />}
      {activeTab === "Learn" && <LearnPreview />}
    </div>
  );
}
