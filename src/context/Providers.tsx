import { ReactNode, useEffect } from "react";
import { WalletProvider } from "@/context/WalletContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { useAccount } from "wagmi";
import { api } from "@/lib/api";

/** Auto-syncs connected EVM wallet address to the backend on connect. */
function WalletSync({ children }: { children: ReactNode }) {
  const { token, user, refreshUser } = useAuth();
  const { address, isConnected }     = useAccount();

  useEffect(() => {
    if (isConnected && address && token && user && user.evmAddress !== address) {
      api.profile.connectWallet(token, address)
        .then(() => refreshUser())
        .catch(() => {});
    }
  }, [isConnected, address, token, user, refreshUser]);

  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WalletProvider>
      <AuthProvider>
        <WalletSync>{children}</WalletSync>
      </AuthProvider>
    </WalletProvider>
  );
}
