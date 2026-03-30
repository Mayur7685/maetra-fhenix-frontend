/**
 * Contract addresses and ABIs for deployed Maetra contracts.
 *
 * After deploying with `npx hardhat deploy --network arbitrumSepolia`
 * in maetra-contracts/, update the addresses below.
 *
 * ABIs include only the functions the frontend needs. Full ABIs are in
 * maetra-contracts/artifacts/ after compilation.
 */

// ── Addresses ────────────────────────────────────────────────────────────────
// Update after deployment. Use VITE_ prefix to expose to client.
export const CONTRACT_ADDRESSES = {
  MaetraTrust:        import.meta.env.VITE_TRUST_ADDRESS        ?? "0x0000000000000000000000000000000000000000",
  MaetraSubscription: import.meta.env.VITE_SUBSCRIPTION_ADDRESS ?? "0x0000000000000000000000000000000000000000",
  MaetraContent:      import.meta.env.VITE_CONTENT_ADDRESS      ?? "0x0000000000000000000000000000000000000000",
} as const;

// Arbitrum Sepolia USDC (Circle official)
export const USDC_ADDRESS = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d" as const;
export const USDC_DECIMALS = 6;

// ── MaetraTrust ABI ───────────────────────────────────────────────────────────
export const MAETRA_TRUST_ABI = [
  {
    name: "submitPerformance",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_profitDays",  type: "tuple", components: [{ name: "ctHash", type: "uint256" }, { name: "securityZone", type: "uint8" }, { name: "utype", type: "uint8" }, { name: "signature", type: "bytes" }] },
      { name: "_totalDays",   type: "tuple", components: [{ name: "ctHash", type: "uint256" }, { name: "securityZone", type: "uint8" }, { name: "utype", type: "uint8" }, { name: "signature", type: "bytes" }] },
      { name: "_tradeCount",  type: "tuple", components: [{ name: "ctHash", type: "uint256" }, { name: "securityZone", type: "uint8" }, { name: "utype", type: "uint8" }, { name: "signature", type: "bytes" }] },
      { name: "_avgVolume",   type: "tuple", components: [{ name: "ctHash", type: "uint256" }, { name: "securityZone", type: "uint8" }, { name: "utype", type: "uint8" }, { name: "signature", type: "bytes" }] },
      { name: "_streak",      type: "tuple", components: [{ name: "ctHash", type: "uint256" }, { name: "securityZone", type: "uint8" }, { name: "utype", type: "uint8" }, { name: "signature", type: "bytes" }] },
    ],
    outputs: [],
  },
  {
    name: "optIntoLeaderboard",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "publishLeaderboardEntry",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "trader",       type: "address" },
      { name: "ctHashScore",  type: "bytes32" },
      { name: "score",        type: "uint32" },
      { name: "scoreSig",     type: "bytes" },
      { name: "ctHashRate",   type: "bytes32" },
      { name: "winRate",      type: "uint32" },
      { name: "rateSig",      type: "bytes" },
      { name: "ctHashWeight", type: "bytes32" },
      { name: "weight",       type: "uint8" },
      { name: "weightSig",    type: "bytes" },
    ],
    outputs: [],
  },
  { name: "trustScores",      type: "function", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ type: "bytes32" }] },
  { name: "winRates",         type: "function", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ type: "bytes32" }] },
  { name: "weightClasses",    type: "function", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ type: "bytes32" }] },
  { name: "tradeCounts",      type: "function", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ type: "bytes32" }] },
  { name: "winStreaks",       type: "function", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ type: "bytes32" }] },
  { name: "leaderboardOptIn", type: "function", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ type: "bool" }] },
  { name: "publicTrustScore", type: "function", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ type: "uint32" }] },
  { name: "publicWinRate",    type: "function", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ type: "uint32" }] },
  { name: "publicWeightClass",type: "function", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ type: "uint8" }] },
  {
    name: "PerformanceSubmitted",
    type: "event",
    inputs: [{ name: "trader", type: "address", indexed: true }],
  },
  {
    name: "LeaderboardEntry",
    type: "event",
    inputs: [
      { name: "trader",      type: "address", indexed: true },
      { name: "trustScore",  type: "uint32",  indexed: false },
      { name: "winRate",     type: "uint32",  indexed: false },
      { name: "weightClass", type: "uint8",   indexed: false },
    ],
  },
] as const;

// ── ERC20 ABI (minimal — for USDC approve) ────────────────────────────────────
export const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

// ── MaetraSubscription ABI ────────────────────────────────────────────────────
export const MAETRA_SUBSCRIPTION_ABI = [
  {
    name: "setPrice",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_price", type: "uint256" }],
    outputs: [],
  },
  {
    name: "subscribe",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_creator", type: "address" }],
    outputs: [],
  },
  {
    name: "unsubscribe",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_creator", type: "address" }],
    outputs: [],
  },
  { name: "subscriptionPrices",  type: "function", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "subscriberCounts",    type: "function", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "subscriptionActive",  type: "function", stateMutability: "view", inputs: [{ name: "", type: "address" }, { name: "", type: "address" }], outputs: [{ type: "bytes32" }] },
  { name: "subscriptionExpiry",  type: "function", stateMutability: "view", inputs: [{ name: "", type: "address" }, { name: "", type: "address" }], outputs: [{ type: "bytes32" }] },
  {
    name: "Subscribed",
    type: "event",
    inputs: [
      { name: "creator",    type: "address", indexed: true },
      { name: "subscriber", type: "address", indexed: true },
      { name: "newCount",   type: "uint256", indexed: false },
    ],
  },
] as const;

// ── MaetraContent ABI ─────────────────────────────────────────────────────────
export const MAETRA_CONTENT_ABI = [
  {
    name: "publishContent",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_contentHash", type: "bytes32" }],
    outputs: [{ name: "postId", type: "uint256" }],
  },
  {
    name: "verifyContent",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_postId", type: "uint256" }, { name: "_hash", type: "bytes32" }],
    outputs: [{ type: "bool" }],
  },
  { name: "contentHashes", type: "function", stateMutability: "view", inputs: [{ name: "", type: "uint256" }], outputs: [{ type: "bytes32" }] },
  { name: "contentOwners", type: "function", stateMutability: "view", inputs: [{ name: "", type: "uint256" }], outputs: [{ type: "address" }] },
  { name: "postCounts",    type: "function", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ type: "uint256" }] },
  {
    name: "ContentPublished",
    type: "event",
    inputs: [
      { name: "postId",      type: "uint256", indexed: true },
      { name: "creator",     type: "address", indexed: true },
      { name: "contentHash", type: "bytes32", indexed: false },
      { name: "timestamp",   type: "uint256", indexed: false },
    ],
  },
] as const;
