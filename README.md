# Maetra — Prove Your Edge. Privately.

**Live**: https://maetra.vercel.app | **API**: https://maetra-api.onrender.com

---

## What it does

Maetra is a privacy-first trading reputation platform built on the Aleo blockchain. It lets crypto traders prove their performance through zero-knowledge proofs and monetize their insights — without ever revealing their wallets, positions, or trade history.

**For Traders (Creators):**
- Connect an exchange (Hyperliquid, Binance) or use demo data
- Generate a ZK proof of trading performance — raw metrics stay private, only the trust score, win rate, and weight class go public
- Set a subscription price in Aleo credits
- Publish alpha content (trade calls, analysis) — content hash timestamped on-chain so no one can fake hindsight

**For Followers (Subscribers):**
- Browse a leaderboard of ZK-verified traders ranked by trust score
- Subscribe to unlock a creator's alpha content — payment and subscription are private on-chain
- Verify that a creator actually published a call before the market moved, using the immutable on-chain content hash

**The full loop:**
```
Exchange data (private) → ZK proof → Public trust score on leaderboard
                                           ↓
                         Subscriber pays Aleo credits → Private SubscriptionRecord
                                           ↓
                         Alpha content unlocked → Content hash verifiable on-chain
```

---

## The problem it solves

Crypto trading "alpha" is broken. The current ecosystem runs on:

1. **Unverified claims** — Traders post PnL screenshots that are trivially faked. There's no way to verify performance without doxxing your entire wallet.

2. **No privacy for traders** — If a profitable trader shares their wallet publicly for proof, they get frontrun, copied, and targeted. Privacy and proof are treated as mutually exclusive.

3. **No privacy for subscribers** — On public blockchains, everyone can see who subscribes to whom. This leaks trading strategy interests and financial relationships.

4. **No timestamped proof of alpha** — A creator can claim they called a trade after the fact. There's no immutable record of when a call was published.

5. **Centralized trust** — Existing platforms (like Tickr on Nillion) rely on third-party MPC networks to verify data. You're trusting their infrastructure, not math.

**Maetra solves all five:**

| Problem | Maetra's Solution |
|---------|------------------|
| Unverified claims | ZK proofs — mathematically guaranteed correct scores |
| Trader privacy | Private inputs — raw trades never leave the wallet |
| Subscriber privacy | Aleo private records — nobody sees who subscribes to whom |
| Fake hindsight | Content hashes on-chain — immutable timestamp proof |
| Centralized trust | Aleo L1 — fully decentralized, verifiable by anyone |

---

## Challenges I ran into

**Prisma 7 + ESM + Aleo on production:**
Prisma 7's new `prisma-client` generator outputs TypeScript files with extensionless imports (`import from "./internal/class"`). This works locally but breaks on Render's strict Node.js ESM resolution. We solved it by using `tsx` as the production runtime instead of compiling with `tsc` — tsx handles TypeScript natively and resolves Prisma's imports correctly.

**Aleo wallet adapter compatibility with React 19:**
The `@provablehq` wallet packages declare React 18 as a peer dependency. We need `--legacy-peer-deps` for every install. Beyond that, the `DecryptPermission` import differs between `@provablehq/aleo-wallet-standard` and `@provablehq/aleo-wallet-adaptor-core` — we had to trace through the NullPay and alpaca-invoice reference projects to find that the core version is what `WalletProvider` actually expects.

**Shield wallet transaction polling:**
Shield wallet's `transactionStatus()` returns inconsistent formats — sometimes a plain string, sometimes an `{status, transactionId}` object. We had to type the response as `unknown` and handle both formats. We also implemented direct adapter polling (1s intervals, 120 attempts) instead of relying on the hook, following patterns from NullPay's production code.

**ZK-compatible math in Leo:**
Leo doesn't support floating-point arithmetic or standard library functions like `log()`. We implemented a piecewise linear approximation of log base 10 for the trust score formula, using integer math with fixed-point precision (multiply by 10000, divide at the end).

**Content gating timing:**
Initially, subscribing unlocked content immediately — before the on-chain transaction confirmed. A subscriber would see posts even if their transaction later failed. We fixed this by adding `waitForConfirmation()` that polls the transaction status until `accepted` before creating the database subscription record.

**BigInt serialization:**
PostgreSQL `BIGINT` columns (subscription prices) come through Prisma as JavaScript `BigInt`, which `JSON.stringify` can't handle. We added a global Hono middleware that intercepts JSON serialization and converts `BigInt` values to strings.

---

## How Aleo is Used

For a detailed breakdown of how Aleo powers Maetra's privacy architecture — including the three Leo programs, data flow diagrams, privacy boundaries, and what lives on-chain vs off-chain — see [how-aleo-used.md](./how-aleo-used.md).

---

## Technologies I used

### Blockchain
- **Aleo** — L1 blockchain with native zero-knowledge proof support
- **Leo** — Smart contract language that compiles to Aleo Instructions
- **3 Leo programs**: `maetra_trust.aleo`, `maetra_subscription.aleo`, `maetra_content.aleo`

### Frontend
- **Next.js 16** — React framework with App Router
- **React 19** — UI library
- **Tailwind CSS v4** — Styling (custom dark theme)
- **@provablehq/aleo-wallet-adaptor** — Wallet connection (Shield, Leo, Fox, Puzzle, Soter)

### Backend
- **Hono** — Lightweight HTTP framework
- **Prisma 7** — ORM with PostgreSQL adapter
- **PostgreSQL** — Relational database
- **tsx** — TypeScript runtime (dev + production)
- **JWT + bcryptjs** — Authentication

### Infrastructure
- **Vercel** — Frontend hosting (https://maetra.vercel.app)
- **Render** — Backend hosting + PostgreSQL (https://maetra-api.onrender.com)

---

## How we built it

### Phase 1: Foundation
Set up the Next.js 16 frontend with React 19, Tailwind v4 dark theme, and Aleo wallet integration using `@provablehq` adapters. Built the Hono backend with Prisma 7, PostgreSQL, JWT auth, and wallet connection sync. Established the API proxy pattern where Next.js rewrites `/api/*` to the backend.

### Phase 2: Leo Smart Contracts
Wrote three Leo programs in Leo:

- **`maetra_trust.aleo`** — Takes private trade metrics (profitable days, total days, trade count, volume, streak), computes win rate, trust score, and weight class inside a ZK circuit, then writes only the derived public scores to on-chain mappings. The trust score formula: `win_rate * log_approx(trade_count + 1) / 10000`.

- **`maetra_subscription.aleo`** — Creators set a public price. Subscribers call `subscribe()` which mints a private `SubscriptionRecord` (encrypted, only the subscriber can decrypt). On-chain, only the creator's subscriber count increments — the subscriber's identity is hidden.

- **`maetra_content.aleo`** — When a creator publishes a post, the content hash is registered on-chain with the creator's address. This creates an immutable timestamp proof that the content existed at that block height.

### Phase 3: Leaderboard and Profiles
Built the leaderboard page that reads cached performance data (mirrored from on-chain mappings). Created the creator profile page with stats, bio, and subscription pricing. Built the creator dashboard (My Page) with exchange connections, ZK proof generation, and post creation.

### Phase 4: Subscriptions and Content Gating
Wired the subscription flow end-to-end: subscriber clicks "Unlock Alpha" → wallet executes `maetra_subscription::subscribe` → polls for on-chain confirmation → backend creates DB subscription → content API returns decrypted posts. Added content gating logic that checks subscription status before serving post content.

### Phase 5: On-chain Subscription Payments
Deployed `maetra_subscription_v3.aleo` which uses `credits.aleo/transfer_public_as_signer` to transfer Aleo credits from subscriber to creator on-chain. The backend verifies the Aleo transaction via the explorer API before creating the DB subscription. Prices are stored in microcredits (1 Aleo credit = 1,000,000 microcredits) and converted to human-readable Aleo credits in the UI.

### Phase 6: End-to-End Content Encryption
Built a true E2E encryption layer where even the server cannot read gated content. Each creator has a Content Encryption Key (CEK) generated client-side using Web Crypto API (AES-256-GCM). Posts are encrypted in the browser before being sent to the server — the backend stores and serves only ciphertext. When a subscriber pays, the creator's client wraps the CEK using an ECDH shared secret (creator private key + subscriber public key) and stores the encrypted key on the server. Subscribers unwrap the CEK client-side to decrypt posts. Private keys are backed up to the server encrypted with PBKDF2 (600,000 iterations), so the server never has access to plaintext keys or content.

### Phase 7: Testing and Deployment
Added a mock-sync endpoint that generates realistic demo trading data so the full flow (trust score → leaderboard → subscription → content) can be tested without real exchange connections. Deployed the backend to Render and frontend to Vercel, solving the Prisma ESM resolution issue by switching to tsx as the production runtime.

---

## What we learned

**Aleo's privacy model is genuinely different from public blockchains.** Private inputs to a Leo transition are never visible to anyone — not even validators. The ZK proof guarantees correctness without revealing the underlying data. This isn't just "encrypted data" — it's mathematically impossible to extract the private inputs from the proof.

**Private records are Aleo's killer feature for subscriptions.** On Ethereum, if you subscribe to someone, that relationship is permanently public on-chain. On Aleo, the `SubscriptionRecord` is encrypted and only the owner can decrypt it. The on-chain state only shows aggregate counts, not individual relationships.

**Leo's constraints force simpler, more correct code.** No floating point means you think harder about precision. No dynamic arrays means you design for fixed-size inputs. No external calls within transitions means clear separation of concerns. These constraints actually led to cleaner architecture.

**ZK proof generation is slow but the UX can hide it.** Generating a ZK proof takes time (wallet-dependent, 10-60 seconds). We built the UI to show clear status progression: "Signing transaction..." → "Confirming on Aleo..." → "Done". The user stays informed without needing to understand the underlying cryptography.

**The hybrid on-chain/off-chain architecture is the right pattern.** Storing full post content on-chain would be expensive and slow. Instead, only the content hash goes on-chain (for timestamp proof), while the actual content lives in PostgreSQL (for fast delivery). The database is a cache/access-control layer; the blockchain is the source of truth for reputation.

---

## What's next for Maetra

**Exchange API integration** — Connect to real Hyperliquid and Binance APIs to fetch actual trade data. The mock-sync endpoint proves the pipeline works; replacing it with real exchange adapters is a straightforward swap.

**Prediction market alpha (Polymarket)** — Expand beyond perpetuals trading to prediction markets. Creators can prove their Polymarket track record via ZK proofs — win rate on event contracts, ROI across markets, streak of correct predictions — and monetize prediction alpha through the same subscription model.

**Aleo mainnet deployment** — Deploy the three Leo programs (`maetra_trust`, `maetra_subscription_v3`, `maetra_content`) to Aleo mainnet. Currently deployed on testnet; mainnet requires funded accounts and a production deployment pipeline.

**Multi-period leaderboards** — Support 24H, 7D, 30D, and All Time periods with separate on-chain proof submissions per period, so traders can showcase consistency across timeframes.

**Mobile-responsive design** — The current UI works on desktop. Tailwind responsive classes are partially in place; a full mobile pass is needed for the leaderboard table, modals, and wallet connection flow.

**Security audit** — The Leo programs need a formal audit before mainnet deployment. Key areas: input validation bounds, integer overflow in trust score calculation, and subscription expiry enforcement.
