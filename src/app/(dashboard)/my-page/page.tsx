"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { api, Post, ExchangeConnection, SyncResult } from "@/lib/api";
import { useMaetraContracts } from "@/hooks/useMaetraContracts";
import {
  generateCEK,
  exportKeyToJWK,
  importPublicKey,
  importPrivateKey,
  importCEK,
  aesEncrypt,
  aesDecrypt,
  wrapCEKForSelf,
  unwrapCEKForSelf,
  wrapCEKForSubscriber,
  getLocalKeypair,
  getLocalCEK,
  storeCEKLocally,
} from "@/lib/crypto";
import { parseUnits, formatUnits } from "viem";
import { USDC_DECIMALS } from "@/lib/contracts";

const WEIGHT_STYLES: Record<string, string> = {
  Heavyweight: "bg-pomelo/15 text-pomelo",
  Middleweight: "bg-lemon/15 text-lemon",
  Lightweight: "bg-lime/15 text-lime",
};

const PRESET_PRICES_USDC = [5, 10] as const; // $5, $10 USDC

export default function MyPage() {
  const { user, token, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const {
    submitPerformance,
    setSubscriptionPrice,
    publishContent,
    pending: txPending,
    error: txError,
    lastTxHash,
    connected: walletConnected,
  } = useMaetraContracts();

  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [posting, setPosting] = useState(false);

  // Subscription offering modal
  const [showOffering, setShowOffering] = useState(false);
  const [offeringBio, setOfferingBio] = useState("");
  const [offeringPriceMode, setOfferingPriceMode] = useState<"preset" | "other">("preset");
  const [offeringPreset, setOfferingPreset] = useState<number>(PRESET_PRICES_USDC[0]);
  const [offeringCustomPrice, setOfferingCustomPrice] = useState("");
  const [saving, setSaving] = useState(false);

  // Exchange connection modal
  const [showExchange, setShowExchange] = useState(false);
  const [connections, setConnections] = useState<ExchangeConnection[]>([]);
  const [exchangeType, setExchangeType] = useState<"hyperliquid" | "binance">("hyperliquid");
  const [exchangeKey, setExchangeKey] = useState("");
  const [exchangeSecret, setExchangeSecret] = useState("");
  const [connectingExchange, setConnectingExchange] = useState(false);

  // Proof / sync state
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  // Stats from performance cache
  const [stats, setStats] = useState({
    winRate: 0, winStreak: 0, trustScore: 0, tradeCount: 0,
    positionsOpened: 0, positionsClosed: 0, weightClass: "Lightweight",
  });

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  // Decrypted content cache: postId → plaintext
  const [decryptedContent, setDecryptedContent] = useState<Record<string, string>>({});

  /** Decrypt all posts with the creator's CEK and cache results. */
  const decryptPosts = async (postsToDecrypt: Post[]) => {
    const cek = await getOrCreateCEK();
    if (!cek) return;

    const decrypted: Record<string, string> = {};
    for (const post of postsToDecrypt) {
      if (!post.contentEncrypted) continue;
      try {
        decrypted[post.id] = await aesDecrypt(cek, post.contentEncrypted);
      } catch {
        decrypted[post.id] = post.contentEncrypted;
      }
    }
    setDecryptedContent((prev) => ({ ...prev, ...decrypted }));
  };

  useEffect(() => {
    if (token && user?.username) {
      api.posts.creatorPosts(token, user.username)
        .then((data) => {
          setPosts(data.posts);
          decryptPosts(data.posts);
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.username]);

  // Load connected exchanges and cached proof data
  useEffect(() => {
    if (!token) return;
    api.exchanges.list(token)
      .then((data) => setConnections(data.connections))
      .catch(() => {});
    api.exchanges.proofInputs(token)
      .then((data) => {
        if (data.performance) setStats(data.performance);
      })
      .catch(() => {});
  }, [token]);

  // === Handlers ===

  const openOffering = () => {
    setOfferingBio(user?.bio || "");
    // subscriptionPriceMicrocredits field now stores USDC units (6 decimals) in backend
    const currentUnits = BigInt(user?.subscriptionPriceMicrocredits || "0");
    const currentUsdc = currentUnits > 0n ? parseFloat(formatUnits(currentUnits, USDC_DECIMALS)) : 0;
    const matchPreset = PRESET_PRICES_USDC.find((p) => p === currentUsdc);
    if (matchPreset !== undefined) {
      setOfferingPriceMode("preset"); setOfferingPreset(matchPreset);
    } else if (currentUsdc > 0) {
      setOfferingPriceMode("other"); setOfferingCustomPrice(currentUsdc.toString());
    } else {
      setOfferingPriceMode("preset"); setOfferingPreset(PRESET_PRICES_USDC[0]);
    }
    setShowOffering(true);
  };

  const saveOffering = async () => {
    if (!token) return;
    if (!walletConnected) return;
    setSaving(true);
    const priceUsdc = offeringPriceMode === "other" ? offeringCustomPrice : offeringPreset.toString();
    const priceUnits = parseUnits(priceUsdc || "0", USDC_DECIMALS);
    try {
      if (priceUnits > 0n) {
        const hash = await setSubscriptionPrice(priceUsdc);
        if (!hash) { setSaving(false); return; }
      }
      await api.profile.update(token, { subscriptionPriceMicrocredits: Number(priceUnits), bio: offeringBio });
      await refreshUser();
      setShowOffering(false);
    } catch (err) {
      console.error("[SaveOffering] failed:", err);
    }
    setSaving(false);
  };

  const connectExchange = async () => {
    if (!token || !exchangeKey) return;
    setConnectingExchange(true);
    try {
      await api.exchanges.connect(token, exchangeType, exchangeKey, exchangeSecret || undefined);
      const data = await api.exchanges.list(token);
      setConnections(data.connections);
      setExchangeKey("");
      setExchangeSecret("");
      setShowExchange(false);
    } catch {}
    setConnectingExchange(false);
  };

  const disconnectExchange = async (id: string) => {
    if (!token) return;
    await api.exchanges.disconnect(token, id);
    setConnections(connections.filter((c) => c.id !== id));
  };

  const syncAndProve = async (useMock = false) => {
    if (!token) return;
    if (!walletConnected) return;
    setSyncing(true);
    try {
      const result = useMock
        ? await api.exchanges.mockSync(token)
        : await api.exchanges.sync(token);
      setSyncResult(result);

      // Submit encrypted performance to MaetraTrust contract
      if (result.leoInputs) {
        await submitPerformance({
          profitable_days: parseInt(result.leoInputs.profitable_days),
          total_days:      parseInt(result.leoInputs.total_days),
          trade_count:     parseInt(result.leoInputs.trade_count),
          avg_volume_usd:  parseInt(result.leoInputs.avg_volume_usd),
          current_streak:  parseInt(result.leoInputs.current_streak),
        });
      }

      const proofData = await api.exchanges.proofInputs(token);
      if (proofData.performance) setStats(proofData.performance);
    } catch (err) {
      console.error("[SyncAndProve]", err);
    }
    setSyncing(false);
  };

  /** Get or create the creator's CEK. Returns the CryptoKey. */
  const getOrCreateCEK = async (): Promise<CryptoKey | null> => {
    if (!token || !user) return null;

    const cachedJwk = getLocalCEK(user.id);
    if (cachedJwk) return importCEK(cachedJwk);

    const keypair = getLocalKeypair();
    if (!keypair) return null;

    try {
      const { encryptedCek } = await api.keys.getContentKey(token);
      if (encryptedCek) {
        const pubKey = await importPublicKey(keypair.publicKeyJwk);
        const privKey = await importPrivateKey(keypair.privateKeyJwk);
        const cek = await unwrapCEKForSelf(encryptedCek, pubKey, privKey);
        const jwk = await exportKeyToJWK(cek);
        storeCEKLocally(user.id, jwk);
        return cek;
      }
    } catch {}

    const cek = await generateCEK();
    const cekJwk = await exportKeyToJWK(cek);
    storeCEKLocally(user.id, cekJwk);

    const keypair2 = getLocalKeypair();
    if (keypair2) {
      const pubKey = await importPublicKey(keypair2.publicKeyJwk);
      const privKey = await importPrivateKey(keypair2.privateKeyJwk);
      const wrapped = await wrapCEKForSelf(cek, pubKey, privKey);
      await api.keys.storeContentKey(token, wrapped).catch(() => {});
    }

    return cek;
  };

  /** Auto-grant CEKs to pending subscribers. */
  const grantPendingKeys = async () => {
    if (!token || !user) return;
    try {
      const data = await api.keys.pendingGrants(token);
      const pending = data?.pendingGrants;
      if (!pending || pending.length === 0) return;

      const cek = await getOrCreateCEK();
      if (!cek) return;

      const keypair = getLocalKeypair();
      if (!keypair) return;
      const creatorPrivKey = await importPrivateKey(keypair.privateKeyJwk);

      const grants: { subscriptionId: string; encryptedCek: string }[] = [];
      for (const sub of pending) {
        const subPubKey = await importPublicKey(sub.subscriberPublicKey);
        const encryptedCek = await wrapCEKForSubscriber(cek, creatorPrivKey, subPubKey);
        grants.push({ subscriptionId: sub.subscriptionId, encryptedCek });
      }

      await api.keys.grantBulk(token, grants);
    } catch (err) {
      console.error("[GrantPendingKeys]", err);
    }
  };

  // Auto-grant keys when page loads
  useEffect(() => {
    if (token && user) grantPendingKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.id]);

  const createPost = async () => {
    if (!token || !newPostTitle || !newPostContent) return;
    if (!walletConnected) return;
    setPosting(true);
    try {
      const cek = await getOrCreateCEK();
      let contentToSend = newPostContent;
      if (cek) {
        contentToSend = await aesEncrypt(cek, newPostContent);
      }

      // Publish content hash on-chain
      const result = await publishContent(contentToSend);
      if (!result) { setPosting(false); return; }

      const { post } = await api.posts.create(token, newPostTitle, contentToSend);
      setPosts([post, ...posts]);
      setDecryptedContent((prev) => ({ ...prev, [post.id]: newPostContent }));
      setNewPostTitle(""); setNewPostContent(""); setShowCreatePost(false);
    } catch (err) {
      console.error("[CreatePost] failed:", err);
    }
    setPosting(false);
  };

  if (authLoading || !user) return null;

  const subUnits = BigInt(user.subscriptionPriceMicrocredits || "0");
  const subUsdc = subUnits > 0n ? formatUnits(subUnits, USDC_DECIMALS) : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="app" />

      {/* Subscription Offering Modal */}
      {showOffering && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-coal/80 backdrop-blur-sm" onClick={() => setShowOffering(false)} />
          <div className="relative w-full max-w-lg mx-4">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-lime/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="relative rounded-[var(--radius-lg)] border border-border bg-surface p-8">
              <button onClick={() => setShowOffering(false)} className="absolute top-4 left-4 text-sm text-muted hover:text-foreground transition-colors flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
                Go Back
              </button>
              <h2 className="text-lg font-semibold text-foreground text-center mt-4 mb-8">Subscription offering</h2>
              <div className="mb-6">
                <label className="block text-xs text-muted mb-2">Description of the alpha you provide</label>
                <textarea value={offeringBio} onChange={(e) => setOfferingBio(e.target.value)} placeholder="e.g. $ETH is making a move"
                  className="w-full rounded-[var(--radius-md)] border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-lime/50 transition-colors resize-none h-24" />
              </div>
              <div className="mb-6">
                <label className="block text-xs text-muted mb-2">Subscription price (USDC / month)</label>
                <div className="flex rounded-[var(--radius-md)] border border-border overflow-hidden mb-3">
                  {PRESET_PRICES_USDC.map((price) => (
                    <button key={price} onClick={() => { setOfferingPriceMode("preset"); setOfferingPreset(price); }}
                      className={`flex-1 py-2.5 text-sm transition-colors border-r border-border ${offeringPriceMode === "preset" && offeringPreset === price ? "bg-foreground text-background font-medium" : "text-muted hover:text-foreground"}`}>
                      ${price} USDC
                    </button>
                  ))}
                  <button onClick={() => setOfferingPriceMode("other")}
                    className={`flex-1 py-2.5 text-sm transition-colors ${offeringPriceMode === "other" ? "bg-foreground text-background font-medium" : "text-muted hover:text-foreground"}`}>
                    Other
                  </button>
                </div>
                {offeringPriceMode === "other" && (
                  <input type="number" min="1" step="1" value={offeringCustomPrice} onChange={(e) => setOfferingCustomPrice(e.target.value)} placeholder="e.g. 25 USDC"
                    className="w-full rounded-[var(--radius-md)] border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-lime/50" autoFocus />
                )}
              </div>
              <div className="mb-8">
                <label className="block text-xs text-muted mb-2">Wallet address (subscriptions paid here)</label>
                <div className="rounded-[var(--radius-md)] border border-border bg-background px-4 py-2.5 text-sm text-muted truncate font-mono">
                  {user.evmAddress || "No EVM wallet connected"}
                </div>
              </div>
              <button onClick={saveOffering} disabled={saving || !walletConnected} className="w-full rounded-[var(--radius-md)] bg-foreground py-2.5 text-sm font-semibold text-background hover:bg-foreground/90 transition-colors disabled:opacity-50">
                {!walletConnected ? "Connect wallet to update" : saving ? "Saving..." : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exchange Connection Modal */}
      {showExchange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-coal/80 backdrop-blur-sm" onClick={() => setShowExchange(false)} />
          <div className="relative w-full max-w-lg mx-4">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-lemon/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="relative rounded-[var(--radius-lg)] border border-border bg-surface p-8">
              <button onClick={() => setShowExchange(false)} className="absolute top-4 left-4 text-sm text-muted hover:text-foreground transition-colors flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
                Go Back
              </button>
              <h2 className="text-lg font-semibold text-foreground text-center mt-4 mb-8">Connect Exchange</h2>

              {connections.length > 0 && (
                <div className="mb-6 space-y-2">
                  <p className="text-xs text-muted font-medium mb-2">Connected</p>
                  {connections.map((conn) => (
                    <div key={conn.id} className="flex items-center justify-between rounded-[var(--radius-md)] border border-lime/20 bg-lime/5 px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-lime" />
                        <span className="text-sm text-foreground capitalize">{conn.exchange}</span>
                        {conn.lastSyncedAt && <span className="text-xs text-muted">synced {new Date(conn.lastSyncedAt).toLocaleDateString()}</span>}
                      </div>
                      <button onClick={() => disconnectExchange(conn.id)} className="text-xs text-muted hover:text-tangerine transition-colors">Remove</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mb-6">
                <label className="block text-xs text-muted mb-2">Exchange</label>
                <div className="flex rounded-[var(--radius-md)] border border-border overflow-hidden mb-4">
                  <button onClick={() => setExchangeType("hyperliquid")}
                    className={`flex-1 py-2.5 text-sm transition-colors border-r border-border ${exchangeType === "hyperliquid" ? "bg-foreground text-background font-medium" : "text-muted hover:text-foreground"}`}>
                    Hyperliquid
                  </button>
                  <button onClick={() => setExchangeType("binance")}
                    className={`flex-1 py-2.5 text-sm transition-colors ${exchangeType === "binance" ? "bg-foreground text-background font-medium" : "text-muted hover:text-foreground"}`}>
                    Binance
                  </button>
                </div>

                {exchangeType === "hyperliquid" ? (
                  <div>
                    <label className="block text-xs text-muted mb-2">Your EVM wallet address</label>
                    <input value={exchangeKey} onChange={(e) => setExchangeKey(e.target.value)} placeholder="0x..."
                      className="w-full rounded-[var(--radius-md)] border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-lime/50" />
                    <p className="text-xs text-muted mt-1.5">Read-only access. No API key needed.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-muted mb-2">API Key</label>
                      <input value={exchangeKey} onChange={(e) => setExchangeKey(e.target.value)} placeholder="API key"
                        className="w-full rounded-[var(--radius-md)] border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-lime/50" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted mb-2">API Secret</label>
                      <input type="password" value={exchangeSecret} onChange={(e) => setExchangeSecret(e.target.value)} placeholder="API secret"
                        className="w-full rounded-[var(--radius-md)] border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-lime/50" />
                    </div>
                    <p className="text-xs text-muted">Use a read-only API key. We never execute trades.</p>
                  </div>
                )}
              </div>

              <button onClick={connectExchange} disabled={connectingExchange || !exchangeKey}
                className="w-full rounded-[var(--radius-md)] bg-foreground py-2.5 text-sm font-semibold text-background hover:bg-foreground/90 transition-colors disabled:opacity-50">
                {connectingExchange ? "Connecting..." : "Connect"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync Result Modal */}
      {syncResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-coal/80 backdrop-blur-sm" onClick={() => setSyncResult(null)} />
          <div className="relative w-full max-w-md mx-4">
            <div className="relative rounded-[var(--radius-lg)] border border-lime/20 bg-surface p-8">
              <h2 className="text-lg font-semibold text-foreground text-center mb-6">Performance Submitted</h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="rounded-[var(--radius-md)] bg-background p-3">
                  <p className="text-xs text-muted">Win Rate</p>
                  <p className="text-lg font-semibold text-lime">{((syncResult.metrics.profitableDays / Math.max(syncResult.metrics.totalDays, 1)) * 100).toFixed(1)}%</p>
                </div>
                <div className="rounded-[var(--radius-md)] bg-background p-3">
                  <p className="text-xs text-muted">Total Trades</p>
                  <p className="text-lg font-semibold text-foreground">{syncResult.metrics.totalTrades}</p>
                </div>
                <div className="rounded-[var(--radius-md)] bg-background p-3">
                  <p className="text-xs text-muted">Win Streak</p>
                  <p className="text-lg font-semibold text-foreground">{syncResult.metrics.currentStreak}</p>
                </div>
                <div className="rounded-[var(--radius-md)] bg-background p-3">
                  <p className="text-xs text-muted">Total PnL</p>
                  <p className={`text-lg font-semibold ${syncResult.metrics.totalPnl >= 0 ? "text-lime" : "text-tangerine"}`}>${syncResult.metrics.totalPnl.toFixed(2)}</p>
                </div>
              </div>
              <div className="rounded-[var(--radius-md)] bg-background border border-border p-4 mb-6">
                <p className="text-xs text-muted font-medium mb-2">FHE Inputs (encrypted on-chain)</p>
                <pre className="text-xs font-mono text-lemon leading-relaxed">
{`profitable_days: ${syncResult.leoInputs.profitable_days}
total_days:      ${syncResult.leoInputs.total_days}
trade_count:     ${syncResult.leoInputs.trade_count}
current_streak:  ${syncResult.leoInputs.current_streak}
avg_volume_usd:  ${syncResult.leoInputs.avg_volume_usd}`}
                </pre>
              </div>
              {lastTxHash && (
                <div className="rounded-[var(--radius-md)] bg-lime/5 border border-lime/20 p-3 mb-4">
                  <p className="text-xs text-muted font-medium mb-1">On-chain Transaction</p>
                  <p className="text-xs font-mono text-lime break-all">{lastTxHash}</p>
                </div>
              )}
              {txError && (
                <div className="rounded-[var(--radius-md)] bg-tangerine/10 border border-tangerine/30 p-3 mb-4">
                  <p className="text-xs text-tangerine">{txError}</p>
                </div>
              )}
              <button onClick={() => setSyncResult(null)} className="w-full rounded-[var(--radius-md)] bg-lime py-2.5 text-sm font-semibold text-coal hover:bg-lime/85 transition-colors">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row pt-16">
        {/* Left sidebar */}
        <div className="w-full lg:w-96 lg:border-r border-b lg:border-b-0 border-border p-4 sm:p-6 pt-6 sm:pt-8 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-full bg-stone flex items-center justify-center text-lg font-semibold text-foreground">
              {(user.displayName || user.username || user.email)[0].toUpperCase()}
            </div>
            <div>
              <span className="font-semibold text-foreground">{user.displayName || user.username || "Anonymous"}</span>
              {user.xHandle && <p className="text-xs text-muted">{user.xHandle}</p>}
            </div>
          </div>

          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${WEIGHT_STYLES[stats.weightClass] || WEIGHT_STYLES.Lightweight}`}>
            {stats.weightClass}
          </span>

          {/* Stats */}
          <div className="mt-6">
            <p className="text-xs text-muted font-medium mb-3">This Month:</p>
            <div className="grid grid-cols-3 gap-4">
              <div><p className="text-xs text-muted">Win rate</p><p className="text-sm font-semibold text-lime">{stats.winRate.toFixed(1)}%</p></div>
              <div><p className="text-xs text-muted">Win streak</p><p className="text-sm font-semibold text-foreground">{stats.winStreak}</p></div>
              <div><p className="text-xs text-muted">Trust score</p><p className="text-sm font-semibold text-foreground">{stats.trustScore.toFixed(2)}</p></div>
              <div><p className="text-xs text-muted">Trades</p><p className="text-sm font-semibold text-foreground">{stats.tradeCount}</p></div>
              <div><p className="text-xs text-muted">Pos. open</p><p className="text-sm font-semibold text-foreground">{stats.positionsOpened}</p></div>
              <div><p className="text-xs text-muted">Pos. closed</p><p className="text-sm font-semibold text-foreground">{stats.positionsClosed}</p></div>
            </div>
          </div>

          {/* Exchanges */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted font-medium">Exchanges</p>
              <button onClick={() => setShowExchange(true)} className="text-xs text-lime hover:text-lime/80 transition-colors">
                + Connect
              </button>
            </div>
            {connections.length === 0 ? (
              <p className="text-xs text-muted">No exchanges connected</p>
            ) : (
              <div className="space-y-1.5">
                {connections.map((conn) => (
                  <div key={conn.id} className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-lime" />
                    <span className="text-xs text-foreground capitalize">{conn.exchange}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bio */}
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs text-muted font-medium">Bio</p>
              <button onClick={openOffering} className="text-muted hover:text-foreground transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
              </button>
            </div>
            <p className="text-xs text-muted leading-relaxed whitespace-pre-line">{user.bio || "No bio yet"}</p>
          </div>

          {/* Subscription cost */}
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs font-medium text-foreground">Subscription Cost</p>
              <button onClick={openOffering} className="text-muted hover:text-foreground transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
              </button>
            </div>
            <p className="text-xs text-muted">{subUsdc ? `$${subUsdc} USDC / month` : "Not set"}</p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 mt-8">
            {connections.length > 0 ? (
              <button
                onClick={() => syncAndProve(false)}
                disabled={syncing || txPending}
                className="w-full rounded-[var(--radius-md)] bg-lime py-2.5 text-sm font-semibold text-coal hover:bg-lime/85 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {syncing ? "Syncing trades..." : txPending ? "Signing transaction..." : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v4" /><path d="m16.2 7.8 2.9-2.9" /><path d="M18 12h4" /><path d="m16.2 16.2 2.9 2.9" /><path d="M12 18v4" /><path d="m4.9 19.1 2.9-2.9" /><path d="M2 12h4" /><path d="m4.9 4.9 2.9 2.9" />
                    </svg>
                    Submit FHE Proof
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => syncAndProve(true)}
                disabled={syncing || txPending}
                className="w-full rounded-[var(--radius-md)] bg-lemon py-2.5 text-sm font-semibold text-coal hover:bg-lemon/85 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {syncing ? "Generating demo data..." : txPending ? "Signing transaction..." : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v4" /><path d="m16.2 7.8 2.9-2.9" /><path d="M18 12h4" /><path d="m16.2 16.2 2.9 2.9" /><path d="M12 18v4" /><path d="m4.9 19.1 2.9-2.9" /><path d="M2 12h4" /><path d="m4.9 4.9 2.9 2.9" />
                    </svg>
                    Demo FHE Proof
                  </>
                )}
              </button>
            )}
            <div className="flex gap-2">
              <button onClick={() => setShowCreatePost(true)} className="flex-1 rounded-[var(--radius-md)] bg-foreground py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors">Create Post</button>
            </div>
          </div>

          {/* Status indicators */}
          {txError && (
            <div className="mt-4 rounded-[var(--radius-md)] bg-tangerine/10 border border-tangerine/30 p-3">
              <p className="text-xs text-tangerine font-medium mb-1">On-chain Error</p>
              <p className="text-xs text-tangerine/80">{txError}</p>
            </div>
          )}
          {lastTxHash && !syncResult && (
            <div className="mt-4 rounded-[var(--radius-md)] bg-lime/5 border border-lime/20 p-3">
              <p className="text-xs text-muted font-medium mb-1">Last Transaction</p>
              <p className="text-xs font-mono text-lime break-all">{lastTxHash}</p>
            </div>
          )}
          {txPending && (
            <div className="mt-4 rounded-[var(--radius-md)] bg-lemon/5 border border-lemon/20 p-3">
              <p className="text-xs text-lemon">Signing & broadcasting via MetaMask...</p>
            </div>
          )}
          {!walletConnected && (
            <div className="mt-4 rounded-[var(--radius-md)] bg-tangerine/5 border border-tangerine/20 p-3">
              <p className="text-xs text-tangerine">Connect wallet to submit on-chain transactions</p>
            </div>
          )}
        </div>

        {/* Right content */}
        <div className="flex-1 p-4 sm:p-8">
          {showCreatePost && (
            <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6 mb-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">Create Post</h3>
              <input type="text" placeholder="Post title" value={newPostTitle} onChange={(e) => setNewPostTitle(e.target.value)}
                className="w-full rounded-[var(--radius-md)] border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-lime/50 mb-3" />
              <textarea placeholder="Write your alpha content..." value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)}
                className="w-full rounded-[var(--radius-md)] border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-lime/50 h-32 resize-none mb-4" />
              <div className="flex gap-3">
                <button onClick={() => setShowCreatePost(false)} className="rounded-[var(--radius-md)] border border-border px-5 py-2 text-sm text-muted hover:text-foreground transition-colors">Cancel</button>
                <button onClick={createPost} disabled={posting || !newPostTitle || !newPostContent || !walletConnected}
                  className="rounded-[var(--radius-md)] bg-lime px-5 py-2 text-sm font-semibold text-coal hover:bg-lime/85 transition-colors disabled:opacity-50">
                  {!walletConnected ? "Connect wallet to publish" : posting ? "Publishing..." : "Publish"}
                </button>
              </div>
            </div>
          )}

          {posts.length === 0 && !showCreatePost ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <p className="text-muted mb-4">You have not posted any content yet</p>
              <button onClick={() => setShowCreatePost(true)} className="rounded-[var(--radius-md)] border border-border px-6 py-2 text-sm text-foreground hover:bg-surface transition-colors">Create Post</button>
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map((post) => (
                <article key={post.id} className="rounded-[var(--radius-lg)] border border-border bg-surface p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-stone flex items-center justify-center text-sm font-semibold text-foreground">
                        {(user.displayName || user.username || "A")[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-foreground">{user.displayName || user.username}</span>
                    </div>
                    <span className="text-xs text-muted">Published: {new Date(post.publishedAt).toLocaleDateString()}</span>
                  </div>
                  <h2 className="text-lg font-semibold text-foreground mb-3">{post.title}</h2>
                  <p className="text-sm text-muted leading-relaxed whitespace-pre-line">{decryptedContent[post.id] ?? post.contentEncrypted}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
