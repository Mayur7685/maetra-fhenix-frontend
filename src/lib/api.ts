const API_BASE = import.meta.env.VITE_BACKEND_URL
  ? `${import.meta.env.VITE_BACKEND_URL}/api`
  : "/api";

interface FetchOptions extends RequestInit {
  token?: string | null;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Something went wrong");
  }

  return data as T;
}

// Auth
export const api = {
  auth: {
    register: (email: string, password: string, username: string) =>
      apiFetch<{ token: string; user: User }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, username }),
      }),
    login: (email: string, password: string) =>
      apiFetch<{ token: string; user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
  },

  profile: {
    me: (token: string) =>
      apiFetch<{ user: User }>("/profile/me", { token }),
    update: (token: string, data: Partial<ProfileUpdate>) =>
      apiFetch<{ user: User }>("/profile/me", {
        method: "PUT",
        token,
        body: JSON.stringify(data),
      }),
    connectWallet: (token: string, evmAddress: string) =>
      apiFetch<{ user: { id: string; evmAddress: string } }>("/profile/connect-wallet", {
        method: "POST",
        token,
        body: JSON.stringify({ evmAddress }),
      }),
    connectEvm: (token: string, evmWallet: string) =>
      apiFetch("/profile/connect-evm", {
        method: "POST",
        token,
        body: JSON.stringify({ evmWallet }),
      }),
  },

  leaderboard: {
    get: (period: string = "30D") =>
      apiFetch<{ leaderboard: LeaderboardEntry[]; period: string }>(`/leaderboard?period=${period}`),
    creator: (username: string) =>
      apiFetch<{ creator: CreatorProfile }>(`/leaderboard/creator/${username}`),
  },

  posts: {
    create: (token: string, title: string, content: string) =>
      apiFetch<{ post: Post }>("/posts", {
        method: "POST",
        token,
        body: JSON.stringify({ title, content }),
      }),
    get: (token: string, id: string) =>
      apiFetch<{ post: Post }>(`/posts/${id}`, { token }),
    creatorPosts: (token: string, username: string) =>
      apiFetch<{ posts: Post[]; hasAccess: boolean }>(`/posts/creator/${username}/posts`, { token }),
  },

  exchanges: {
    list: (token: string) =>
      apiFetch<{ connections: ExchangeConnection[] }>("/exchanges", { token }),
    connect: (token: string, exchange: string, apiKey: string, apiSecret?: string) =>
      apiFetch<{ connection: ExchangeConnection; message: string }>("/exchanges/connect", {
        method: "POST",
        token,
        body: JSON.stringify({ exchange, apiKey, apiSecret }),
      }),
    disconnect: (token: string, id: string) =>
      apiFetch<{ message: string }>(`/exchanges/${id}`, {
        method: "DELETE",
        token,
      }),
    sync: (token: string, period: string = "30D") =>
      apiFetch<SyncResult>("/exchanges/sync", {
        method: "POST",
        token,
        body: JSON.stringify({ period }),
      }),
    proofInputs: (token: string, period: string = "30D") =>
      apiFetch<ProofInputsResult>(`/exchanges/proof-inputs?period=${period}`, { token }),
    mockSync: (token: string) =>
      apiFetch<SyncResult>("/exchanges/mock-sync", {
        method: "POST",
        token,
      }),
  },

  subscriptions: {
    list: (token: string) =>
      apiFetch<{ subscriptions: SubscriptionEntry[] }>("/subscriptions", { token }),
    subscribe: (token: string, creatorId: string, txHash?: string) =>
      apiFetch("/subscriptions/subscribe/" + creatorId, {
        method: "POST",
        token,
        body: JSON.stringify({ txHash }),
      }),
    cancel: (token: string, creatorId: string) =>
      apiFetch("/subscriptions/subscribe/" + creatorId, {
        method: "DELETE",
        token,
      }),
  },

  keys: {
    /** Store ECDH public key + password-encrypted private key backup on server */
    storeKeys: (token: string, publicKey: string, encryptedPrivateKey: string) =>
      apiFetch<{ message: string }>("/keys/store", {
        method: "POST",
        token,
        body: JSON.stringify({ publicKey, encryptedPrivateKey }),
      }),
    /** Fetch encrypted private key backup (for cross-device recovery) */
    myKeys: (token: string) =>
      apiFetch<{ encryptedPrivateKey: string | null; publicKey: string | null }>("/keys/my-keys", { token }),
    /** Creator stores their self-encrypted CEK backup */
    storeContentKey: (token: string, encryptedCek: string) =>
      apiFetch<{ message: string }>("/keys/content-key", {
        method: "POST",
        token,
        body: JSON.stringify({ encryptedCek }),
      }),
    /** Creator fetches their self-encrypted CEK backup */
    getContentKey: (token: string) =>
      apiFetch<{ encryptedCek: string | null }>("/keys/content-key", { token }),
    /** Creator gets subscribers needing key grants */
    pendingGrants: (token: string) =>
      apiFetch<{ pendingGrants: { subscriptionId: string; subscriberId: string; subscriberUsername: string | null; subscriberPublicKey: string }[] }>("/keys/pending-grants", { token }),
    /** Creator grants encrypted CEK to a single subscriber */
    grant: (token: string, subscriptionId: string, encryptedCek: string) =>
      apiFetch<{ message: string }>("/keys/grant", {
        method: "POST",
        token,
        body: JSON.stringify({ subscriptionId, encryptedCek }),
      }),
    /** Creator grants encrypted CEKs to multiple subscribers at once */
    grantBulk: (token: string, grants: { subscriptionId: string; encryptedCek: string }[]) =>
      apiFetch<{ message: string }>("/keys/grant-bulk", {
        method: "POST",
        token,
        body: JSON.stringify({ grants }),
      }),
    /** Subscriber fetches their encrypted CEK + creator's public key */
    subscriberKey: (token: string, creatorId: string) =>
      apiFetch<{ encryptedCek: string | null; creatorPublicKey: string | null }>(`/keys/subscriber-key/${creatorId}`, { token }),
  },

};
// NOTE: api.aleo removed — all on-chain interactions now happen client-side
// via useMaetraContracts hook (MetaMask signs, backend only verifies receipts).

// Types
export interface User {
  id: string;
  email: string;
  username: string | null;
  displayName: string | null;
  bio: string | null;
  xHandle: string | null;
  aleoAddress: string | null;
  evmAddress: string | null;
  subscriptionPriceMicrocredits: string;
}

export interface ProfileUpdate {
  username: string;
  displayName: string;
  bio: string;
  xHandle: string;
  subscriptionPriceMicrocredits: number;
}

export interface LeaderboardEntry {
  place: number;
  userId: string;
  username: string;
  displayName: string | null;
  xHandle: string | null;
  winRate: number;
  winStreak: number;
  trustScore: number;
  tradeCount: number;
  positionsOpened: number;
  positionsClosed: number;
  weightClass: string;
  hasAlpha: boolean;
  hasProfile: boolean;
}

export interface CreatorProfile {
  id: string;
  username: string | null;
  displayName: string | null;
  bio: string | null;
  xHandle: string | null;
  evmAddress: string | null;
  subscriptionPriceWei: string;
  winRate: number;
  winStreak: number;
  trustScore: number;
  tradeCount: number;
  positionsOpened: number;
  positionsClosed: number;
  weightClass: string;
}

export interface Post {
  id: string;
  title: string | null;
  contentEncrypted: string | null;
  creatorId: string;
  publishedAt: string;
  locked?: boolean;
  creator?: { id: string; username: string | null; displayName: string | null };
}

export interface ExchangeConnection {
  id: string;
  exchange: string;
  lastSyncedAt: string | null;
  createdAt: string;
}

export interface SyncResult {
  metrics: {
    totalTrades: number;
    profitableTrades: number;
    profitableDays: number;
    totalDays: number;
    currentStreak: number;
    avgVolumeUsd: number;
    totalPnl: number;
    positionsOpened: number;
    positionsClosed: number;
  };
  leoInputs: {
    profitable_days: string;
    total_days: string;
    trade_count: string;
    current_streak: string;
    avg_volume_usd: string;
  };
  period: string;
}

export interface ProofInputsResult {
  cached: boolean;
  leoInputs?: SyncResult["leoInputs"];
  metrics?: SyncResult["metrics"];
  performance?: {
    winRate: number;
    winStreak: number;
    trustScore: number;
    tradeCount: number;
    positionsOpened: number;
    positionsClosed: number;
    weightClass: string;
  };
  lastVerifiedAt?: string;
}

export interface SubscriptionEntry {
  id: string;
  creatorId: string;
  creatorUsername: string | null;
  creatorDisplayName: string | null;
  status: string;
  priceWei: string | null;
  startedAt: string;
  expiresAt: string | null;
}
