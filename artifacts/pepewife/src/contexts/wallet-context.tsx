import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import {
  type WalletType,
  type NetworkType,
  connectWallet,
  disconnectWallet,
  getWalletNetwork,
  shortenAddress,
  detectWallets,
  getSolanaProvider,
  getEthereumProvider,
  isValidEthAddress,
} from "@/lib/wallet";

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

interface WalletState {
  status: ConnectionStatus;
  walletType: WalletType | null;
  network: NetworkType | null;
  address: string | null;
  shortAddress: string;
  error: string | null;
  installedWallets: Record<WalletType, boolean>;
}

interface WalletContextType extends WalletState {
  connect: (walletType: WalletType) => Promise<boolean>;
  disconnect: () => Promise<void>;
  refreshDetection: () => void;
}

const WalletContext = createContext<WalletContextType>({
  status: "disconnected",
  walletType: null,
  network: null,
  address: null,
  shortAddress: "",
  error: null,
  installedWallets: { phantom: false, solflare: false, metamask: false, okx: false, trust: false },
  connect: async () => false,
  disconnect: async () => {},
  refreshDetection: () => {},
});

const STORAGE_KEY = "pepewife-wallet";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours max session

interface StoredWallet {
  walletType: WalletType;
  address: string;
  network: NetworkType;
  connectedAt: number; // Unix timestamp (ms) — used to enforce TTL
}

async function verifyStoredConnection(data: StoredWallet): Promise<string | null> {
  try {
    // Enforce session TTL — expired sessions always require re-connection
    if (!data.connectedAt || Date.now() - data.connectedAt > SESSION_TTL_MS) return null;

    const walletNetwork = getWalletNetwork(data.walletType);
    if (walletNetwork === "solana") {
      const provider = getSolanaProvider(data.walletType);
      if (!provider || !provider.isConnected || !provider.publicKey) return null;
      const currentAddr = provider.publicKey.toString();
      if (currentAddr !== data.address) return null;
      return currentAddr;
    } else {
      const provider = getEthereumProvider(data.walletType);
      if (!provider) return null;
      const accounts = await provider.request({ method: "eth_accounts" }) as string[];
      if (!accounts || accounts.length === 0) return null;
      const currentAddr = accounts[0].toLowerCase();
      if (currentAddr !== data.address.toLowerCase()) return null;
      return accounts[0];
    }
  } catch {
    return null;
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [walletType, setWalletType] = useState<WalletType | null>(null);
  const [network, setNetwork] = useState<NetworkType | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [installedWallets, setInstalledWallets] = useState<Record<WalletType, boolean>>({
    phantom: false, solflare: false, metamask: false, okx: false, trust: false,
  });
  const connectMutex = useRef(false);

  const shortAddress = address ? shortenAddress(address) : "";

  const refreshDetection = useCallback(() => {
    setInstalledWallets(detectWallets());
  }, []);

  useEffect(() => {
    // Initial detection at 500ms and again at 1500ms (Solflare can inject late)
    const t1 = setTimeout(refreshDetection, 500);
    const t2 = setTimeout(refreshDetection, 1500);

    // Solflare fires this event when it's fully ready
    const onSolflareReady = () => refreshDetection();
    document.addEventListener("solflare#initialized", onSolflareReady);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      document.removeEventListener("solflare#initialized", onSolflareReady);
    };
  }, [refreshDetection]);

  useEffect(() => {
    // Clean up any legacy data stored in localStorage by older versions
    localStorage.removeItem(STORAGE_KEY);

    // Use sessionStorage so the session clears on browser close
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    let data: StoredWallet;
    try {
      data = JSON.parse(stored);
      const validTypes: WalletType[] = ["phantom", "solflare", "metamask", "okx", "trust"];
      const validNetworks: NetworkType[] = ["solana", "ethereum"];
      if (!data.walletType || !data.address || !data.network || !data.connectedAt
          || !validTypes.includes(data.walletType)
          || !validNetworks.includes(data.network)
          || data.network !== getWalletNetwork(data.walletType)) {
        sessionStorage.removeItem(STORAGE_KEY);
        return;
      }
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }

    const timer = setTimeout(async () => {
      const verified = await verifyStoredConnection(data);
      if (verified) {
        setWalletType(data.walletType);
        setAddress(verified);
        setNetwork(data.network);
        setStatus("connected");
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!walletType || status !== "connected") return;

    const walletNetwork = getWalletNetwork(walletType);
    if (walletNetwork === "solana") {
      const provider = getSolanaProvider(walletType);
      if (!provider) return;
      const handleDisconnect = () => {
        setStatus("disconnected");
        setAddress(null);
        setWalletType(null);
        setNetwork(null);
        sessionStorage.removeItem(STORAGE_KEY);
      };
      provider.on("disconnect", handleDisconnect);
      return () => {
        try { provider.off("disconnect", handleDisconnect); } catch {}
      };
    } else {
      const provider = getEthereumProvider(walletType);
      if (!provider) return;
      const handleAccountsChanged = (accounts: unknown) => {
        const accs = accounts as string[];
        if (!accs || accs.length === 0) {
          setStatus("disconnected");
          setAddress(null);
          setWalletType(null);
          setNetwork(null);
          sessionStorage.removeItem(STORAGE_KEY);
        } else {
          const newAddr = accs[0];
          if (!newAddr || !isValidEthAddress(newAddr)) {
            setStatus("disconnected");
            setAddress(null);
            setWalletType(null);
            setNetwork(null);
            sessionStorage.removeItem(STORAGE_KEY);
            return;
          }
          setAddress(newAddr);
          const stored: StoredWallet = { walletType: walletType!, address: newAddr, network: network!, connectedAt: Date.now() };
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
        }
      };
      const handleChainChanged = () => {
        window.location.reload();
      };
      provider.on("accountsChanged", handleAccountsChanged);
      provider.on("chainChanged", handleChainChanged);
      return () => {
        try {
          provider.removeListener("accountsChanged", handleAccountsChanged);
          provider.removeListener("chainChanged", handleChainChanged);
        } catch {}
      };
    }
  }, [walletType, status, network]);

  const connect = useCallback(async (type: WalletType): Promise<boolean> => {
    if (connectMutex.current) return false;
    connectMutex.current = true;

    setError(null);
    setStatus("connecting");
    setWalletType(type);
    setAddress(null);
    const net = getWalletNetwork(type);
    setNetwork(net);

    try {
      const addr = await connectWallet(type);
      setAddress(addr);
      setStatus("connected");

      // Store in sessionStorage — clears automatically on browser/tab close
      const stored: StoredWallet = { walletType: type, address: addr, network: net, connectedAt: Date.now() };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      return true;
    } catch (err: unknown) {
      const message = (err as Error).message || "CONNECTION_FAILED";
      setError(message);
      setStatus("error");
      setAddress(null);
      setWalletType(null);
      setNetwork(null);
      return false;
    } finally {
      connectMutex.current = false;
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (walletType) {
      try {
        await disconnectWallet(walletType);
      } catch {}
    }
    setStatus("disconnected");
    setAddress(null);
    setWalletType(null);
    setNetwork(null);
    setError(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }, [walletType]);

  return (
    <WalletContext.Provider value={{
      status, walletType, network, address, shortAddress, error,
      installedWallets, connect, disconnect, refreshDetection,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
