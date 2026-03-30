"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { useMaetraContracts } from "@/hooks/useMaetraContracts";
import { api, CreatorProfile, Post } from "@/lib/api";
import {
  getLocalKeypair,
  importPrivateKey,
  importPublicKey,
  unwrapCEKAsSubscriber,
  aesDecrypt,
  getLocalCEK,
  storeCEKLocally,
  exportKeyToJWK,
  importCEK,
} from "@/lib/crypto";
import type { Hex } from "viem";
import { formatUnits } from "viem";
import { USDC_DECIMALS } from "@/lib/contracts";

const WEIGHT_STYLES: Record<string, string> = {
  Heavyweight: "bg-pomelo/15 text-pomelo",
  Middleweight: "bg-lemon/15 text-lemon",
  Lightweight: "bg-lime/15 text-lime",
};

export default function CreatorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const username = params.username as string;

  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [decryptedContent, setDecryptedContent] = useState<Record<string, string>>({});
  const [subscribeError, setSubscribeError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const { subscribe, pending: txPending, error: txError, connected: walletConnected } = useMaetraContracts();

  /** Decrypt posts using subscriber's CEK (fetched via ECDH key exchange). */
  const decryptSubscriberPosts = async (creatorId: string, postsToDecrypt: Post[]) => {
    if (!token) return;
    const keypair = getLocalKeypair();
    if (!keypair) return;

    let cek: CryptoKey | null = null;

    const cachedJwk = getLocalCEK(creatorId);
    if (cachedJwk) {
      cek = await importCEK(cachedJwk);
    } else {
      try {
        const { encryptedCek, creatorPublicKey } = await api.keys.subscriberKey(token, creatorId);
        if (!encryptedCek || !creatorPublicKey) return;
        const subPrivKey = await importPrivateKey(keypair.privateKeyJwk);
        const creatorPubKey = await importPublicKey(creatorPublicKey);
        cek = await unwrapCEKAsSubscriber(encryptedCek, subPrivKey, creatorPubKey);
        const jwk = await exportKeyToJWK(cek);
        storeCEKLocally(creatorId, jwk);
      } catch {
        return;
      }
    }

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
    if (!username) return;

    const fetchCreator = api.leaderboard.creator(username)
      .then((data) => setCreator(data.creator))
      .catch(() => {});

    const fetchPosts = token
      ? api.posts.creatorPosts(token, username)
          .then((data) => {
            setPosts(data.posts);
            setHasAccess(data.hasAccess);
            if (data.hasAccess && data.posts.length > 0) {
              const creatorId = data.posts[0]?.creatorId;
              if (creatorId) decryptSubscriberPosts(creatorId, data.posts);
            }
          })
          .catch(() => {})
      : Promise.resolve();

    Promise.all([fetchCreator, fetchPosts]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, token]);

  const handleSubscribe = async () => {
    if (!token || !creator) return router.push("/login");
    if (!walletConnected) return;
    setSubscribing(true);
    setSubscribeError(null);
    try {
      const priceWei = BigInt(creator.subscriptionPriceWei || "0");
      let txHash: Hex | undefined;

      if (priceWei > 0n && creator.evmAddress) {
        const hash = await subscribe(creator.evmAddress as Hex, priceWei);
        if (!hash) {
          setSubscribing(false);
          return;
        }
        txHash = hash;
      }

      await api.subscriptions.subscribe(token, creator.id, txHash);
      const data = await api.posts.creatorPosts(token, username);
      setPosts(data.posts);
      setHasAccess(data.hasAccess);
      if (data.hasAccess && data.posts.length > 0) {
        decryptSubscriberPosts(creator.id, data.posts);
      }
    } catch (err) {
      console.error("[Subscribe] Error:", err);
      setSubscribeError(err instanceof Error ? err.message : "Subscription failed");
    }
    setSubscribing(false);
  };

  const handleCancel = async () => {
    if (!token || !creator) return;
    setCancelling(true);
    try {
      await api.subscriptions.cancel(token, creator.id);
      setHasAccess(false);
      setPosts([]);
      setDecryptedContent({});
    } catch (err) {
      console.error("[Cancel] Error:", err);
    }
    setCancelling(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar variant="app" />
        <div className="flex items-center justify-center pt-32">
          <p className="text-muted text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar variant="app" />
        <div className="flex items-center justify-center pt-32">
          <p className="text-muted">Creator not found</p>
        </div>
      </div>
    );
  }

  const priceWei   = BigInt(creator.subscriptionPriceWei || "0");
  const priceUsdc  = priceWei > 0n ? formatUnits(priceWei, USDC_DECIMALS) : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="app" />

      <div className="flex flex-col lg:flex-row pt-16">
        {/* Left sidebar */}
        <div className="w-full lg:w-96 lg:border-r border-b lg:border-b-0 border-border p-4 sm:p-6 pt-6 sm:pt-8 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-full bg-stone flex items-center justify-center text-lg font-semibold text-foreground">
              {(creator.displayName || creator.username || "?")[0].toUpperCase()}
            </div>
            <div>
              <span className="font-semibold text-foreground">{creator.displayName || creator.username}</span>
              {creator.xHandle && (
                <p className="text-xs text-muted flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-muted">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  {creator.xHandle}
                </p>
              )}
            </div>
          </div>

          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${WEIGHT_STYLES[creator.weightClass] || WEIGHT_STYLES.Lightweight}`}>
            {creator.weightClass}
          </span>

          {/* Stats */}
          <div className="mt-6">
            <p className="text-xs text-muted font-medium mb-3">This month:</p>
            <div className="grid grid-cols-3 gap-4">
              <div><p className="text-xs text-muted">Win rate</p><p className="text-sm font-semibold text-lime">{creator.winRate}%</p></div>
              <div><p className="text-xs text-muted">Win streak</p><p className="text-sm font-semibold text-foreground">{creator.winStreak}</p></div>
              <div><p className="text-xs text-muted">Trust score</p><p className="text-sm font-semibold text-foreground">{creator.trustScore}</p></div>
              <div><p className="text-xs text-muted">Trades</p><p className="text-sm font-semibold text-foreground">{creator.tradeCount}</p></div>
              <div><p className="text-xs text-muted">Pos. opened</p><p className="text-sm font-semibold text-foreground">{creator.positionsOpened}</p></div>
              <div><p className="text-xs text-muted">Pos. closed</p><p className="text-sm font-semibold text-foreground">{creator.positionsClosed}</p></div>
            </div>
          </div>

          {/* Bio */}
          <div className="mt-6">
            <p className="text-xs text-muted font-medium mb-2">Bio</p>
            <p className="text-xs text-muted leading-relaxed whitespace-pre-line">{creator.bio || "No bio yet"}</p>
          </div>

          {/* Subscription cost */}
          <div className="mt-6">
            <p className="text-xs font-medium text-foreground mb-1">Subscription Cost</p>
            <p className="text-xs text-muted">{priceUsdc ? `$${priceUsdc} USDC / month` : "Free"}</p>
          </div>

          {/* Cancel subscription */}
          {hasAccess && (
            <div className="mt-6">
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="w-full rounded-[var(--radius-md)] border border-tangerine/30 py-2 text-xs text-tangerine hover:bg-tangerine/10 transition-colors disabled:opacity-50"
              >
                {cancelling ? "Cancelling..." : "Cancel Subscription"}
              </button>
            </div>
          )}
        </div>

        {/* Right content */}
        <div className="flex-1 p-4 sm:p-8">
          {hasAccess ? (
            posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <p className="text-muted">This creator hasn&apos;t posted any content yet</p>
              </div>
            ) : (
              <div className="space-y-6">
                {posts.map((post) => (
                  <article key={post.id} className="rounded-[var(--radius-lg)] border border-border bg-surface p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-stone flex items-center justify-center text-sm font-semibold text-foreground">
                          {(creator.displayName || creator.username || "?")[0].toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-foreground">{creator.displayName || creator.username}</span>
                      </div>
                      <span className="text-xs text-muted">Published: {new Date(post.publishedAt).toLocaleDateString()}</span>
                    </div>
                    <h2 className="text-lg font-semibold text-foreground mb-3">{post.title}</h2>
                    <p className="text-sm text-muted leading-relaxed whitespace-pre-line">{decryptedContent[post.id] ?? post.contentEncrypted}</p>
                  </article>
                ))}
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="h-16 w-16 rounded-full bg-stone flex items-center justify-center text-2xl font-semibold text-foreground mx-auto mb-4">
                  {(creator.displayName || creator.username || "?")[0].toUpperCase()}
                </div>
                <h2 className="text-lg font-semibold text-foreground mb-2">{creator.displayName || creator.username}</h2>
                <p className="text-sm text-muted mb-6 max-w-xs">{creator.bio || "Subscribe to unlock this creator's alpha content"}</p>
                <button
                  onClick={handleSubscribe}
                  disabled={subscribing || txPending || !walletConnected}
                  className="rounded-[var(--radius-lg)] bg-lime px-6 py-3 text-sm font-semibold text-coal hover:bg-lime/85 transition-colors flex items-center gap-2 mx-auto disabled:opacity-50"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  {!walletConnected
                    ? "Connect wallet to subscribe"
                    : txPending
                    ? "Signing transaction..."
                    : subscribing
                    ? "Subscribing..."
                    : `Unlock Alpha${priceUsdc ? ` for $${priceUsdc} USDC` : ""}`}
                </button>
                {(txError || subscribeError) && <p className="text-xs text-tangerine mt-2">{txError || subscribeError}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
