export type WalletType = "phantom" | "metamask" | "binance" | "trust";
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
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on(event: string, cb: (...args: unknown[]) => void): void;
  removeListener(event: string, cb: (...args: unknown[]) => void): void;
}

declare global {
  interface Window {
    solana?: SolanaProvider;
    phantom?: { solana?: SolanaProvider };
    ethereum?: EthereumProvider;
    BinanceChain?: EthereumProvider;
    trustwallet?: { ethereum?: EthereumProvider };
  }
}

export function getSolanaProvider(): SolanaProvider | null {
  if (typeof window === "undefined") return null;
  const provider = window.phantom?.solana || window.solana;
  if (provider?.isPhantom) return provider;
  return null;
}

export function getEthereumProvider(walletType: WalletType): EthereumProvider | null {
  if (typeof window === "undefined") return null;

  if (walletType === "binance" && window.BinanceChain) {
    return window.BinanceChain;
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
    return { phantom: false, metamask: false, binance: false, trust: false };
  }
  return {
    phantom: !!(window.phantom?.solana?.isPhantom || window.solana?.isPhantom),
    metamask: !!window.ethereum?.isMetaMask,
    binance: !!window.BinanceChain,
    trust: !!(window.trustwallet?.ethereum || window.ethereum?.isTrust),
  };
}

export function getWalletNetwork(walletType: WalletType): NetworkType {
  if (walletType === "phantom") return "solana";
  return "ethereum";
}

export function shortenAddress(address: string, chars = 4): string {
  if (!address) return "";
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

const ETH_MAINNET_CHAIN_ID = "0x1";

export async function connectSolanaWallet(): Promise<string> {
  const provider = getSolanaProvider();
  if (!provider) {
    throw new Error("PHANTOM_NOT_INSTALLED");
  }
  try {
    const response = await provider.connect();
    const address = response.publicKey.toString();
    if (!address || address.length < 32) {
      throw new Error("INVALID_ADDRESS");
    }
    return address;
  } catch (err: unknown) {
    const error = err as { code?: number; message?: string };
    if (error.code === 4001 || error.message?.includes("rejected")) {
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
    if (!address || !address.startsWith("0x") || address.length !== 42) {
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
    return connectSolanaWallet();
  }
  return connectEthereumWallet(walletType);
}

export async function disconnectWallet(walletType: WalletType): Promise<void> {
  const network = getWalletNetwork(walletType);
  if (network === "solana") {
    const provider = getSolanaProvider();
    if (provider) {
      await provider.disconnect();
    }
  }
}

export function getInstallUrl(walletType: WalletType): string {
  const urls: Record<WalletType, string> = {
    phantom: "https://phantom.app/download",
    metamask: "https://metamask.io/download/",
    binance: "https://www.binance.com/en/web3wallet",
    trust: "https://trustwallet.com/download",
  };
  return urls[walletType];
}
