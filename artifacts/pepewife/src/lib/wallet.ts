export type WalletType = "phantom" | "solflare" | "metamask" | "okx" | "trust";
export type NetworkType = "solana" | "ethereum";

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
  publicKey?: { toString(): string };
  isConnected?: boolean;
  connect(opts?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toString(): string } }>;
  disconnect(): Promise<void>;
  on(event: string, cb: (...args: unknown[]) => void): void;
  off(event: string, cb: (...args: unknown[]) => void): void;
}

interface EthereumProvider {
  isMetaMask?: boolean;
  isTrust?: boolean;
  isOkxWallet?: boolean;
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on(event: string, cb: (...args: unknown[]) => void): void;
  removeListener(event: string, cb: (...args: unknown[]) => void): void;
}

declare global {
  interface Window {
    solana?: SolanaProvider;
    phantom?: { solana?: SolanaProvider };
    solflare?: SolanaProvider;
    ethereum?: EthereumProvider;
    okxwallet?: EthereumProvider;
    trustwallet?: { ethereum?: EthereumProvider };
  }
}

export function getSolanaProvider(walletType: WalletType = "phantom"): SolanaProvider | null {
  if (typeof window === "undefined") return null;

  if (walletType === "solflare") {
    // Solflare injects window.solflare — accept it with or without isSolflare flag
    // because some versions set the flag asynchronously
    const provider = window.solflare;
    if (provider) return provider;
    return null;
  }

  const provider = window.phantom?.solana || window.solana;
  if (provider?.isPhantom) return provider;
  return null;
}

export function getEthereumProvider(walletType: WalletType): EthereumProvider | null {
  if (typeof window === "undefined") return null;

  if (walletType === "okx") {
    if (window.okxwallet) return window.okxwallet;
    return null;
  }

  if (walletType === "trust") {
    if (window.trustwallet?.ethereum) return window.trustwallet.ethereum;
    if (window.ethereum?.isTrust) return window.ethereum;
    return null;
  }

  if (walletType === "metamask") {
    if (window.ethereum?.isMetaMask) return window.ethereum;
    return null;
  }

  return null;
}

export function detectWallets(): Record<WalletType, boolean> {
  if (typeof window === "undefined") {
    return { phantom: false, solflare: false, metamask: false, okx: false, trust: false };
  }
  return {
    phantom: !!(window.phantom?.solana?.isPhantom || window.solana?.isPhantom),
    // Solflare may inject window.solflare before isSolflare is set, accept both
    solflare: !!(window.solflare?.isSolflare || window.solflare),
    metamask: !!window.ethereum?.isMetaMask,
    okx: !!window.okxwallet,
    trust: !!(window.trustwallet?.ethereum || window.ethereum?.isTrust),
  };
}

export function getWalletNetwork(walletType: WalletType): NetworkType {
  if (walletType === "phantom" || walletType === "solflare") return "solana";
  return "ethereum";
}

export function shortenAddress(address: string, chars = 4): string {
  if (!address) return "";
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

const ETH_MAINNET_CHAIN_ID = "0x1";

const ETH_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;
const SOL_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function isValidEthAddress(addr: string): boolean {
  return ETH_ADDRESS_REGEX.test(addr);
}

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

    // Phantom  → returns { publicKey }
    // Solflare → may return void/undefined in newer versions; publicKey lives on provider
    const pk = response?.publicKey ?? provider.publicKey;
    if (!pk) throw new Error("CONNECTION_FAILED");

    const address = pk.toString();
    if (!address || !isValidSolAddress(address)) {
      throw new Error("INVALID_ADDRESS");
    }
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

export async function connectEthereumWallet(walletType: WalletType): Promise<string> {
  const provider = getEthereumProvider(walletType);
  if (!provider) {
    throw new Error(`${walletType.toUpperCase()}_NOT_INSTALLED`);
  }

  try {
    const chainId = await provider.request({ method: "eth_chainId" }) as string;
    if (chainId !== ETH_MAINNET_CHAIN_ID) {
      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: ETH_MAINNET_CHAIN_ID }],
        });
      } catch {
        throw new Error("WRONG_NETWORK");
      }
    }

    const accounts = await provider.request({ method: "eth_requestAccounts" }) as string[];
    if (!accounts || accounts.length === 0) {
      throw new Error("NO_ACCOUNTS");
    }

    const address = accounts[0];
    if (!address || !isValidEthAddress(address)) {
      throw new Error("INVALID_ADDRESS");
    }
    return address;
  } catch (err: unknown) {
    const error = err as { code?: number; message?: string };
    if (error.message === "WRONG_NETWORK") throw err as Error;
    if (error.code === 4001 || error.message?.includes("rejected")) {
      throw new Error("USER_REJECTED");
    }
    throw new Error("CONNECTION_FAILED");
  }
}

export async function connectWallet(walletType: WalletType): Promise<string> {
  const network = getWalletNetwork(walletType);
  if (network === "solana") {
    return connectSolanaWallet(walletType);
  }
  return connectEthereumWallet(walletType);
}

export async function disconnectWallet(walletType: WalletType): Promise<void> {
  const network = getWalletNetwork(walletType);
  if (network === "solana") {
    const provider = getSolanaProvider(walletType);
    if (provider) {
      await provider.disconnect();
    }
  }
}

export function getInstallUrl(walletType: WalletType): string {
  const urls: Record<WalletType, string> = {
    phantom: "https://phantom.app/download",
    solflare: "https://solflare.com/download",
    metamask: "https://metamask.io/download/",
    okx: "https://www.okx.com/download",
    trust: "https://trustwallet.com/download",
  };
  return urls[walletType];
}
