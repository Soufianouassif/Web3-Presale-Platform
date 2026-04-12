export type WalletType = "phantom" | "solflare" | "backpack" | "okx";
export type NetworkType = "solana";

export interface WalletInfo {
  id: WalletType;
  name: string;
  network: NetworkType;
  installed: boolean;
  iconSrc: string;
  installUrl: string;
}

interface SolanaProvider {
  isPhantom?: boolean;
  isSolflare?: boolean;
  isBackpack?: boolean;
  publicKey?: { toString(): string };
  isConnected?: boolean;
  connect(opts?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toString(): string } }>;
  disconnect(): Promise<void>;
  on(event: string, cb: (...args: unknown[]) => void): void;
  off(event: string, cb: (...args: unknown[]) => void): void;
}

declare global {
  interface Window {
    solana?: SolanaProvider;
    phantom?: { solana?: SolanaProvider };
    solflare?: SolanaProvider;
    backpack?: SolanaProvider;
    xnft?: { solana?: SolanaProvider };
    okxwallet?: { solana?: SolanaProvider };
  }
}

export function getSolanaProvider(walletType: WalletType = "phantom"): SolanaProvider | null {
  if (typeof window === "undefined") return null;

  if (walletType === "solflare") {
    const provider = window.solflare;
    if (provider) return provider;
    return null;
  }

  if (walletType === "backpack") {
    const provider = window.backpack ?? window.xnft?.solana;
    if (provider) return provider;
    return null;
  }

  if (walletType === "okx") {
    const provider = window.okxwallet?.solana;
    if (provider) return provider;
    return null;
  }

  // phantom
  const provider = window.phantom?.solana || window.solana;
  if (provider?.isPhantom) return provider;
  return null;
}

export function detectWallets(): Record<WalletType, boolean> {
  if (typeof window === "undefined") {
    return { phantom: false, solflare: false, backpack: false, okx: false };
  }
  return {
    phantom: !!(window.phantom?.solana?.isPhantom || window.solana?.isPhantom),
    solflare: !!(window.solflare?.isSolflare || window.solflare),
    backpack: !!(window.backpack ?? window.xnft?.solana),
    okx: !!window.okxwallet?.solana,
  };
}

export function getWalletNetwork(_walletType: WalletType): NetworkType {
  return "solana";
}

export function shortenAddress(address: string, chars = 4): string {
  if (!address) return "";
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

const SOL_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function isValidSolAddress(addr: string): boolean {
  return SOL_ADDRESS_REGEX.test(addr);
}

export async function connectSolanaWallet(walletType: WalletType = "phantom"): Promise<string> {
  const provider = getSolanaProvider(walletType);
  if (!provider) {
    throw new Error(`${walletType.toUpperCase()}_NOT_INSTALLED`);
  }
  try {
    const response = await provider.connect();

    let pk: { toString(): string } | undefined = response?.publicKey ?? provider.publicKey;
    if (!pk && (walletType === "solflare" || walletType === "backpack")) {
      for (let i = 0; i < 6; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        pk = provider.publicKey;
        if (pk) break;
      }
    }

    if (!pk) throw new Error("CONNECTION_FAILED");

    const address = pk.toString();
    if (!address || !isValidSolAddress(address)) throw new Error("INVALID_ADDRESS");
    return address;
  } catch (err: unknown) {
    const error = err as { code?: number; message?: string };
    if (error.message?.includes("NOT_INSTALLED")) throw err as Error;
    if (error.message === "CONNECTION_FAILED" || error.message === "INVALID_ADDRESS") throw err as Error;
    if (
      error.code === 4001 ||
      error.message?.toLowerCase().includes("rejected") ||
      error.message?.toLowerCase().includes("cancelled") ||
      error.message?.toLowerCase().includes("user denied")
    ) {
      throw new Error("USER_REJECTED");
    }
    throw new Error("CONNECTION_FAILED");
  }
}

export async function connectWallet(walletType: WalletType): Promise<string> {
  return connectSolanaWallet(walletType);
}

export async function disconnectWallet(walletType: WalletType): Promise<void> {
  const provider = getSolanaProvider(walletType);
  if (provider) {
    try { await provider.disconnect(); } catch {}
  }
}

export function getInstallUrl(walletType: WalletType): string {
  const urls: Record<WalletType, string> = {
    phantom:  "https://phantom.app/download",
    solflare: "https://solflare.com/download",
    backpack: "https://www.backpack.app/downloads",
    okx:      "https://www.okx.com/web3",
  };
  return urls[walletType];
}
