# Maetra

**Privacy-preserving trading reputation and alpha-sharing platform built on Fhenix / Arbitrum Sepolia.**

Traders prove their performance without revealing raw trade data. Subscribers pay in USDC to access encrypted alpha posts. All sensitive data — trade metrics, subscription status, post content — is encrypted end-to-end. Nothing leaks.

---

## How It Works

```
Trader connects exchange (Hyperliquid / Binance)
  → Backend syncs trade history, computes performance metrics
  → Frontend encrypts metrics client-side using CoFHE SDK
  → MaetraTrust.submitPerformance() stores encrypted euint32 values on-chain
  → Contract computes winRate + trustScore homomorphically (fully on-chain, never decrypted)
  → Trader calls optIntoLeaderboard() → FHE async decryption publishes score publicly
  → Trader sets subscription price → MaetraSubscription.setPrice()
  → Trader creates alpha posts → content AES-256-GCM encrypted in browser → hash timestamped on-chain

Subscriber finds creator on leaderboard
  → Approves USDC → MaetraSubscription.subscribe() → price paid to creator, encrypted ebool stored
  → Backend registers subscription → creator's ECDH-wrapped CEK granted to subscriber's public key
  → Subscriber decrypts posts locally using their ECDH private key
```

---

## Repository Layout

```
fhenix-thon/
  maetra-contracts/        Solidity contracts (Hardhat + CoFHE)
  maetra-backend/          Node.js / Express API server
  maetra-frontend/         Vite + React frontend
  maetra-leo-programs/     Legacy Aleo programs (archived, superseded)
  cofhesdk/                Local CoFHE SDK source (pinned beta)
  selective-disclosure-demo/  CoFHE WASM reference app
```

---

## Smart Contracts

Deployed on **Arbitrum Sepolia** via `@cofhe/hardhat-plugin`. Solidity `^0.8.25`, EVM target `cancun`.

### MaetraTrust

Stores and computes on **encrypted trade performance metrics** using FHE.

**Storage (all encrypted):**

| Mapping | Type | Description |
|---------|------|-------------|
| `trustScores[trader]` | `euint32` | Computed trust score |
| `winRates[trader]` | `euint32` | Win rate in basis points (0–10 000) |
| `tradeCounts[trader]` | `euint32` | Total number of trades |
| `weightClasses[trader]` | `euint8` | 0 = Lightweight, 1 = Mid, 2 = Heavy |
| `winStreaks[trader]` | `euint32` | Current win streak in days |

**Public leaderboard (opt-in plaintext):**

| Mapping | Type |
|---------|------|
| `publicTrustScore[trader]` | `uint32` |
| `publicWinRate[trader]` | `uint32` |
| `publicWeightClass[trader]` | `uint8` |

**Functions:**

| Function | Description |
|----------|-------------|
| `submitPerformance(profitDays, totalDays, tradeCount, avgVolume, streak)` | Accept 5 `InEuint32` ciphertexts, compute winRate and trustScore homomorphically |
| `optIntoLeaderboard()` | Allow global access to encrypted scores, call `FHE.decrypt()` to start async decryption |
| `publishLeaderboardEntry(trader)` | After TaskManager fulfills decryption, store plaintext values on-chain |

**Score formulas (computed in FHE, never decrypted mid-flight):**

```
winRate    = (profitableDays × 10 000) / totalDays        // basis points
trustScore = (winRate × tradeCount) / 10 000
weightClass:
  avgVolume > $500K/day → 2 (Heavyweight)
  avgVolume > $100K/day → 1 (Middleweight)
  else                  → 0 (Lightweight)
```

---

### MaetraSubscription

Stores **encrypted subscription state** per creator–subscriber pair.

**Storage:**

| Mapping | Type | Description |
|---------|------|-------------|
| `subscriptionPrices[creator]` | `uint256` | USDC price (6 decimals; 0 = free) |
| `subscriberCounts[creator]` | `uint256` | Public social proof counter |
| `subscriptionActive[creator][subscriber]` | `ebool` | Encrypted active flag |
| `subscriptionExpiry[creator][subscriber]` | `euint64` | Encrypted Unix timestamp |

**Functions:**

| Function | Description |
|----------|-------------|
| `setPrice(price)` | Creator sets USDC subscription price |
| `subscribe(creator)` | Transfers USDC, sets `ebool active = true` and 30-day expiry |
| `unsubscribe(creator)` | Sets `ebool active = false`, decrements count |

**Access grants:** `subscriptionActive` and `subscriptionExpiry` are `allow`-ed to the subscriber (can decrypt own status) and the creator (can verify access). Off-chain decryption via CoFHE SDK — no transaction needed to check status.

---

### MaetraContent

Minimal content timestamping — **no FHE**. The encrypted blob lives in PostgreSQL; only its `keccak256` hash is published on-chain.

| Function | Description |
|----------|-------------|
| `publishContent(contentHash)` | Stores hash + owner, emits `ContentPublished` event, returns `postId` |
| `verifyContent(postId, hash)` | View: confirm stored hash matches a given hash |

---

## Privacy Model

```
Layer           What is encrypted / private
──────────────────────────────────────────────────────────────────────────────
FHE (on-chain)  Trade metrics: profitDays, totalDays, tradeCount, volume, streak
                Derived scores: winRate, trustScore, weightClass (euint32/euint8)
                Subscription status: active flag (ebool), expiry (euint64)

E2E (client)    Post content: AES-256-GCM encrypted in browser, never leaves client
                CEK distribution: ECDH P-256 key exchange; server stores only
                  ciphertext, never the raw CEK

Public          Trust scores (after opt-in leaderboard)
                Subscription prices and subscriber counts
                Content hashes (keccak256, timestamp proof only)
                Username, display name, bio
```

---

## Tech Stack

### Contracts (`maetra-contracts/`)

| Package | Version | Purpose |
|---------|---------|---------|
| Solidity | 0.8.25 | Smart contracts |
| Hardhat | 2.x | Compile / deploy / test |
| `@cofhe/hardhat-plugin` | beta | CoFHE mock node for local dev |
| `@fhenixprotocol/cofhe-contracts` | beta | `FHE.sol`, `euint32`, `ebool`, `InEuint32` |
| `@openzeppelin/contracts` | 5.x | `IERC20` |
| hardhat-deploy | 0.12.x | Deterministic deploys with named accounts |

### Backend (`maetra-backend/`)

| Package | Purpose |
|---------|---------|
| Express | HTTP server |
| Prisma + PostgreSQL | ORM and database |
| JWT | Auth tokens |
| viem | Receipt verification (on-chain tx confirmation) |
| Hyperliquid / Binance SDK | Exchange data sync |

### Frontend (`maetra-frontend/`)

| Package | Version | Purpose |
|---------|---------|---------|
| React | 19.x | UI |
| Vite | 6.x | Dev server + bundler |
| vite-plugin-wasm | 3.x | Native WASM support for `tfhe` |
| vite-plugin-top-level-await | 1.x | Required by CoFHE WASM init |
| React Router | 7.x | Client-side routing |
| wagmi | 2.15 | EVM wallet state |
| RainbowKit | 2.2 | Wallet connect UI |
| viem | 2.30 | Contract calls, tx signing |
| `@cofhe/sdk` | `0.0.0-beta-20251103142716` | FHE input encryption + output decryption |
| Tailwind CSS | 4.x | Dark theme styling |
| TanStack Query | 5.x | Async state / cache |
| Web Crypto API | built-in | ECDH key exchange, AES-256-GCM post encryption |

---

## Frontend Structure

```
maetra-frontend/src/
  main.tsx                  React root mount
  App.tsx                   BrowserRouter + all routes
  index.css                 Tailwind v4 theme (dark mode CSS variables)
  pages/
    Landing.tsx             Public homepage — leaderboard preview, feature tabs
    Login.tsx               Email/password login
    Signup.tsx              Account registration
    SetupProfile.tsx        First-time onboarding (username, bio, price)
    Leaderboard.tsx         Ranked traders with trust scores and weight classes
    MyPage.tsx              Creator dashboard — stats, exchange sync, posts, proof
    MySubscriptions.tsx     Active subscriptions list + cancel
    CreatorProfile.tsx      Public creator page — subscribe to unlock alpha
  components/
    Navbar.tsx              App navigation (react-router-dom Link)
    Logo.tsx                Maetra logotype
    LeaderboardPreview.tsx  Landing page leaderboard snippet
    FeatureTabs.tsx         Landing page feature showcase
  context/
    AuthContext.tsx         JWT auth state, token storage, refreshUser
    WalletContext.tsx       wagmi config, RainbowKit, chain setup
    Providers.tsx           Wraps Auth + Wallet providers
  hooks/
    useMaetraContracts.ts   All on-chain interactions (see below)
  lib/
    api.ts                  Backend REST client + all TypeScript types
    contracts.ts            Contract addresses, ABIs (from VITE_ env vars)
    cofhe-client.ts         Lazy CoFHE SDK singleton (WASM init on first use)
    crypto.ts               ECDH keypair gen, AES-GCM encrypt/decrypt, CEK wrapping
```

---

## `useMaetraContracts` Hook

Central hook for all on-chain operations. All writes include a **20% gas buffer** via `estimateFeesPerGas() × 120n / 100n` to avoid EIP-1559 base-fee races on Arbitrum Sepolia.

| Function | Contract | What it does |
|----------|----------|--------------|
| `submitPerformance(inputs)` | MaetraTrust | Encrypts 5 `euint32` inputs via CoFHE SDK, submits tx, waits for receipt |
| `optIntoLeaderboard()` | MaetraTrust | Calls `optIntoLeaderboard()`, waits for receipt |
| `setSubscriptionPrice(priceUsdc)` | MaetraSubscription | Converts string USDC to wei, calls `setPrice()` |
| `subscribe(creator, priceUsdc)` | MaetraSubscription + USDC | Checks/approves USDC allowance, then calls `subscribe()` |
| `publishContent(contentBlob)` | MaetraContent | keccak256-hashes encrypted blob, calls `publishContent()` |
| `decryptMyTrustScore()` | MaetraTrust (read) | Reads handle, CoFHE-decrypts trustScore + winRate + weightClass off-chain |
| `checkMySubscription(creator)` | MaetraSubscription (read) | Reads `ebool` handle, CoFHE-decrypts subscription status off-chain |

---

## Backend Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Issue JWT |
| GET | `/api/profile/me` | JWT | Get own profile |
| PUT | `/api/profile/me` | JWT | Update profile / subscription price |
| POST | `/api/profile/connect-wallet` | JWT | Link EVM address to account |
| GET | `/api/leaderboard` | — | Get ranked trader list (`?period=30D`) |
| GET | `/api/leaderboard/creator/:username` | — | Get single creator stats |
| GET | `/api/exchanges` | JWT | List connected exchanges |
| POST | `/api/exchanges/connect` | JWT | Add exchange API key |
| DELETE | `/api/exchanges/:id` | JWT | Remove exchange |
| POST | `/api/exchanges/sync` | JWT | Sync real trade history, store metrics |
| POST | `/api/exchanges/mock-sync` | JWT | Generate demo metrics (no exchange required) |
| GET | `/api/exchanges/proof-inputs` | JWT | Return cached metrics for FHE submission |
| POST | `/api/posts` | JWT | Save encrypted post to DB |
| GET | `/api/posts/creator/:username/posts` | JWT | List posts (locked if no subscription) |
| GET | `/api/subscriptions` | JWT | List own subscriptions |
| POST | `/api/subscriptions/subscribe/:creatorId` | JWT | Record subscription + tx hash |
| DELETE | `/api/subscriptions/subscribe/:creatorId` | JWT | Cancel subscription |
| POST | `/api/keys/store` | JWT | Store ECDH public key + encrypted private key backup |
| GET | `/api/keys/my-keys` | JWT | Retrieve key backup |
| POST | `/api/keys/content-key` | JWT | Creator stores self-wrapped CEK |
| GET | `/api/keys/content-key` | JWT | Creator retrieves CEK backup |
| GET | `/api/keys/pending-grants` | JWT | Creator gets subscribers needing CEK grant |
| POST | `/api/keys/grant-bulk` | JWT | Creator grants encrypted CEK to multiple subscribers |
| GET | `/api/keys/subscriber-key/:creatorId` | JWT | Subscriber retrieves their ECDH-wrapped CEK |

---

## User Flows

### Creator

```
1. Sign up → Setup profile (username, bio)
2. Connect exchange (Hyperliquid / Binance API key)  OR  use Demo Data
3. Click "Sync & Prove":
   a. Backend syncs exchange → returns metrics + leoInputs
   b. Frontend encrypts 5 metrics using CoFHE SDK
   c. Sends submitPerformance() tx → confirmed on-chain
   d. Only after tx confirmed: backend proof-inputs refreshes leaderboard stats
4. Click "Opt into Leaderboard" → optIntoLeaderboard() tx
5. After TaskManager async decryption, publishLeaderboardEntry() can be called
6. Set subscription offering (price + bio description)
   a. setSubscriptionPrice() tx confirmed on-chain
   b. Profile updated in DB
7. Create alpha post:
   a. Content AES-256-GCM encrypted in browser using CEK
   b. keccak256(encryptedBlob) published on-chain via publishContent()
   c. Encrypted blob stored in DB
8. Auto-grant CEK to new subscribers (runs on page load):
   - Fetches pending grants from backend
   - ECDH-wraps CEK for each subscriber's public key
   - Sends grant-bulk to backend
```

### Subscriber

```
1. Browse leaderboard → open creator profile
2. Click "Unlock Alpha":
   a. USDC allowance check → approve if needed
   b. subscribe(creator) tx → USDC transferred to creator, ebool stored encrypted
   c. Backend registers subscription + tx hash
3. Creator's CEK auto-granted on next creator page load
4. Posts decrypt in browser using subscriber's ECDH private key
```

---

## Local Development

### Prerequisites

- Node.js 20+
- PostgreSQL (for backend)
- MetaMask or RainbowKit-compatible wallet

### 1. Contracts

```bash
cd maetra-contracts
npm install
# Start local CoFHE node (includes mock FHE TaskManager)
npx hardhat node
# In a new terminal — deploy all three contracts
npx hardhat deploy --network localhost
```

Deployed addresses are printed to console. Copy them to `maetra-frontend/.env`.

### 2. Backend

```bash
cd maetra-backend
npm install
cp .env.example .env   # set DATABASE_URL, JWT_SECRET
npx prisma migrate dev
npm run dev            # starts on :3001
```

### 3. Frontend

```bash
cd maetra-frontend
npm install
cp .env.example .env
# Edit .env:
# VITE_TRUST_ADDRESS=<from step 1>
# VITE_SUBSCRIPTION_ADDRESS=<from step 1>
# VITE_CONTENT_ADDRESS=<from step 1>
# VITE_WALLETCONNECT_PROJECT_ID=<from cloud.walletconnect.com>
# VITE_BACKEND_URL=http://localhost:3001

npm run dev            # starts on :3000
```

The Vite dev server proxies `/api/*` to the backend and serves the COOP/COEP headers required by `tfhe` (SharedArrayBuffer):

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
```

### 4. Test with demo data

No exchange API key needed. On My Page, click **"Generate Demo ZK Proof"** — calls `/api/exchanges/mock-sync` with realistic synthetic data, then runs the full on-chain proof flow.

---

## Environment Variables

### `maetra-frontend/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_TRUST_ADDRESS` | Yes | Deployed MaetraTrust address |
| `VITE_SUBSCRIPTION_ADDRESS` | Yes | Deployed MaetraSubscription address |
| `VITE_CONTENT_ADDRESS` | Yes | Deployed MaetraContent address |
| `VITE_WALLETCONNECT_PROJECT_ID` | Yes | From cloud.walletconnect.com |
| `VITE_BACKEND_URL` | Prod only | Backend base URL (default: proxied by Vite) |
| `VITE_RPC_URL` | Optional | Custom Arbitrum Sepolia RPC |

### `maetra-backend/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Token signing secret |
| `PORT` | No | HTTP port (default 3001) |

### `maetra-contracts/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `DEPLOYER_PRIVATE_KEY` | Yes (prod) | Deployer wallet private key |
| `ARBITRUM_SEPOLIA_RPC` | Yes (prod) | RPC endpoint |
| `ARBISCAN_API_KEY` | Optional | Contract verification |

---

## Deployment

### Contracts

```bash
cd maetra-contracts
npx hardhat deploy --network arbitrumSepolia
npx hardhat verify --network arbitrumSepolia <address>
```

### Frontend (Vite)

```bash
cd maetra-frontend
npm run build        # outputs to dist/
# deploy dist/ to any static host (Vercel, Cloudflare Pages, Netlify)
```

Static hosts need to forward COOP/COEP headers for `tfhe` WASM to work:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
```

**Vercel** — add to `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy",   "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "credentialless" }
      ]
    }
  ]
}
```

---

## Content Encryption (E2E Detail)

```
Creator side:
  generateKeyPair()            → ECDH P-256 keypair (stored in localStorage)
  generateCEK()                → AES-256-GCM key (Content Encryption Key)
  wrapCEKForSelf(cek, pub, priv)  → ECDH-derive shared secret, AES-wrap CEK
  api.keys.storeContentKey()   → stores wrapped CEK on server (server sees only ciphertext)
  aesEncrypt(cek, content)     → encrypt post body → store in DB

  On new subscriber:
  wrapCEKForSubscriber(cek, creatorPriv, subPub)  → ECDH-derived wrap for subscriber
  api.keys.grantBulk()         → batch-store wrapped CEKs

Subscriber side:
  api.keys.subscriberKey()     → fetch creator's wrapped CEK + creator public key
  unwrapCEKAsSubscriber(wrapped, subPriv, creatorPub) → recover CEK
  aesDecrypt(cek, ciphertext)  → decrypt post body in browser
```

The server stores:
- ECDH public keys (by design — needed for key exchange)
- ECDH-wrapped CEKs (encrypted, server cannot recover plaintext)
- AES-GCM ciphertext of posts (encrypted, server cannot read)

The server never sees: raw trade metrics, CEKs, post plaintext, or private keys.

---

## Scripts Reference

### Contracts

| Command | Description |
|---------|-------------|
| `npx hardhat compile` | Compile contracts + generate TypeChain types |
| `npx hardhat test` | Run unit tests |
| `npx hardhat node` | Start local CoFHE + Hardhat node |
| `npx hardhat deploy --network <net>` | Deploy all contracts |
| `npx hardhat coverage` | Coverage report |

### Frontend

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server on :3000 with hot reload |
| `npm run build` | TypeScript check + Vite production build |
| `npm run preview` | Preview production build locally |

### Backend

| Command | Description |
|---------|-------------|
| `npm run dev` | ts-node-dev with hot reload |
| `npx prisma migrate dev` | Apply DB migrations |
| `npx prisma studio` | Visual DB browser |

---

## Key Design Decisions

**Why Fhenix / CoFHE instead of ZK proofs?**
FHE allows the smart contract to compute on encrypted inputs directly — no circuit compilation, no trusted setup, no prover infrastructure. The entire `winRate` and `trustScore` calculation runs in Solidity on ciphertext. ZK would require off-chain proving and on-chain verification, adding latency and complexity.

**Why is subscription status stored as FHE `ebool` instead of a plaintext flag?**
Nobody — not the creator, the protocol, or a chain explorer — can determine who is subscribed to whom. Only the subscriber (and creator) can decrypt their own `subscriptionActive` handle. The subscriber count is public (social proof) but individual identities are hidden.

**Why is post content in PostgreSQL and not on-chain?**
Content can be large and changes frequently. Storing AES-GCM ciphertext off-chain (DB) and only the `keccak256` hash on-chain gives tamper-proof timestamping without block gas costs or calldata bloat.

**Why Vite instead of Next.js?**
The `tfhe` WASM module (3.3 MB) requires `SharedArrayBuffer` (COOP/COEP headers) and needs to be excluded from the JS bundler entirely. Vite's `vite-plugin-wasm` handles this natively. Turbopack (Next.js) did not support the CoFHE WASM bundle reliably at the time of build.
