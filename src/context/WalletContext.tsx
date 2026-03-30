/**
 * WalletContext — EVM wallet + CoFHE SDK provider.
 *
 * Replaces @provablehq Aleo wallet adapter with:
 *   - RainbowKit for wallet picker UI
 *   - wagmi for EVM wallet state
 *   - viem for chain config
 *   - cofhesdkClient.connect() for FHE encryption/decryption readiness
 */

import { ReactNode, useEffect } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { arbitrumSepolia, hardhat } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, connectorsForWallets, darkTheme } from "@rainbow-me/rainbowkit";
import {
  metaMaskWallet,
  coinbaseWallet,
  rabbyWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { usePublicClient, useWalletClient } from "wagmi";
import { getCofheClient } from "@/lib/cofhe-client";
import "@rainbow-me/rainbowkit/styles.css";

// Fall back to a placeholder so RainbowKit doesn't throw during local dev.
// Set VITE_WALLETCONNECT_PROJECT_ID in .env for WalletConnect support.
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "maetra-local-dev";

// ── Wagmi config ─────────────────────────────────────────────────────────────
const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [metaMaskWallet, rabbyWallet, coinbaseWallet],
    },
  ],
  {
    appName: "Maetra — Prove Your Edge. Privately.",
    projectId,
  }
);

const wagmiConfig = createConfig({
  chains: [arbitrumSepolia, hardhat],
  connectors,
  transports: {
    [arbitrumSepolia.id]: http(
      import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC ?? "https://sepolia-rollup.arbitrum.io/rpc"
    ),
    [hardhat.id]: http("http://127.0.0.1:8545"),
  },
});

const queryClient = new QueryClient();

// ── CoFHE connection: auto-connects SDK when wallet is available ──────────────
function CofheConnector({ children }: { children: ReactNode }) {
  const publicClient  = usePublicClient();
  const { data: walletClient } = useWalletClient();

  useEffect(() => {
    if (!publicClient || !walletClient) return;

    getCofheClient().then((client) => client.connect(publicClient, walletClient)).then((result) => {
      if (result.success) {
        console.log("[CoFHE] SDK connected");
      } else {
        console.warn("[CoFHE] SDK connection failed:", result.error?.message);
      }
    });
  }, [publicClient, walletClient]);

  return <>{children}</>;
}

// ── WalletProvider export ─────────────────────────────────────────────────────
export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#4ade80",       // green accent matching Maetra brand
            accentColorForeground: "#000",
            borderRadius: "medium",
          })}
          modalSize="compact"
        >
          <CofheConnector>{children}</CofheConnector>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
