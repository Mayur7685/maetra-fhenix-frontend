import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { api, User } from "@/lib/api";
import {
  generateKeyPair,
  exportKeyToJWK,
  encryptPrivateKey,
  decryptPrivateKey,
  storeKeypairLocally,
  getLocalKeypair,
  clearCryptoStorage,
} from "@/lib/crypto";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const stored = localStorage.getItem("maetra_token");
    if (!stored) {
      setLoading(false);
      return;
    }
    try {
      const { user: userData } = await api.profile.me(stored);
      setUser(userData);
      setToken(stored);
    } catch {
      localStorage.removeItem("maetra_token");
      setToken(null);
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  /**
   * Ensure ECDH keypair exists locally. If not, try to restore from server
   * backup (using password). If no backup exists, generate fresh keypair.
   */
  const ensureKeypair = async (authToken: string, password: string) => {
    // Already have keys locally?
    if (getLocalKeypair()) return;

    // Try to restore from server backup
    try {
      const { encryptedPrivateKey, publicKey } = await api.keys.myKeys(authToken);
      if (encryptedPrivateKey && publicKey) {
        const privateKeyJwk = await decryptPrivateKey(encryptedPrivateKey, password);
        storeKeypairLocally(publicKey, privateKeyJwk);
        return;
      }
    } catch {
      // No backup or decrypt failed — generate fresh
    }

    // Generate new keypair
    const keyPair = await generateKeyPair();
    const publicKeyJwk = await exportKeyToJWK(keyPair.publicKey);
    const privateKeyJwk = await exportKeyToJWK(keyPair.privateKey);

    // Store locally
    storeKeypairLocally(publicKeyJwk, privateKeyJwk);

    // Backup to server (public key in plain, private key encrypted with password)
    const encryptedPriv = await encryptPrivateKey(privateKeyJwk, password);
    await api.keys.storeKeys(authToken, publicKeyJwk, encryptedPriv).catch(() => {});
  };

  const login = async (email: string, password: string) => {
    const data = await api.auth.login(email, password);
    localStorage.setItem("maetra_token", data.token);
    setToken(data.token);
    setUser(data.user);
    // Restore or generate keypair (non-blocking)
    ensureKeypair(data.token, password).catch(console.error);
  };

  const register = async (email: string, password: string, username: string) => {
    const data = await api.auth.register(email, password, username);
    localStorage.setItem("maetra_token", data.token);
    setToken(data.token);
    setUser(data.user);
    // Generate fresh keypair for new user (non-blocking)
    ensureKeypair(data.token, password).catch(console.error);
  };

  const logout = () => {
    localStorage.removeItem("maetra_token");
    clearCryptoStorage();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
