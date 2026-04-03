/**
 * PEPEWIFE Presale Contract — Browser Integration
 *
 * Program ID : 4KpEeYVW8592GGpcNZLo7CinE1dnV9tJnKYc9JzpQSv7  (Devnet)
 * Config PDA : 7tvmjEGj9k4QV7oVNeAD13CVxdjRPCNfYdtz1mXQ8sDs
 *
 * Uses @solana/web3.js directly (no Anchor runtime needed).
 * Instruction data layout follows Anchor discriminator convention.
 */

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

// ─────────────────────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────────────────────

export const PROGRAM_ID = new PublicKey(
  "4KpEeYVW8592GGpcNZLo7CinE1dnV9tJnKYc9JzpQSv7"
);

export const CONFIG_PDA = new PublicKey(
  "7tvmjEGj9k4QV7oVNeAD13CVxdjRPCNfYdtz1mXQ8sDs"
);

/** Mainnet USDT-SPL mint */
export const USDT_MINT = new PublicKey(
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
);

/** Devnet connection — switch to mainnet-beta for production */
export const SOLANA_ENDPOINT = "https://api.devnet.solana.com";

export const connection = new Connection(SOLANA_ENDPOINT, "confirmed");

// ─────────────────────────────────────────────────────────────
//  DISCRIMINATOR HELPERS
//  Anchor discriminator = sha256("global:{instruction_name}")[0..8]
// ─────────────────────────────────────────────────────────────

async function getDiscriminator(instructionName: string): Promise<Buffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`global:${instructionName}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Buffer.from(hashBuffer).slice(0, 8);
}

// ─────────────────────────────────────────────────────────────
//  PDA DERIVATION
// ─────────────────────────────────────────────────────────────

export async function findBuyerRecord(
  buyerPubkey: PublicKey
): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddress(
    [
      Buffer.from("buyer"),
      CONFIG_PDA.toBuffer(),
      buyerPubkey.toBuffer(),
    ],
    PROGRAM_ID
  );
}

// ─────────────────────────────────────────────────────────────
//  BUY WITH SOL
// ─────────────────────────────────────────────────────────────

export interface BuyWithSolResult {
  signature: string;
}

/**
 * Build and send a buy_with_sol transaction.
 *
 * @param buyerAddress  Connected wallet public key string
 * @param solAmount     Amount in SOL (e.g. 1.5)
 * @param treasuryAddress  Treasury wallet from PresaleConfig
 * @param sendTransaction  Wallet adapter send function (from context / window.solana)
 */
export async function buyWithSol(
  buyerAddress: string,
  solAmount: number,
  treasuryAddress: string,
  walletType = "phantom"
): Promise<BuyWithSolResult> {
  const buyer = new PublicKey(buyerAddress);
  const treasury = new PublicKey(treasuryAddress);
  const lamports = BigInt(Math.floor(solAmount * LAMPORTS_PER_SOL));

  const [buyerRecord] = await findBuyerRecord(buyer);

  // Instruction discriminator
  const discriminator = await getDiscriminator("buy_with_sol");

  // Encode args: u64 lamports (little-endian 8 bytes)
  const argsBuf = Buffer.alloc(8);
  argsBuf.writeBigUInt64LE(lamports, 0);

  const data = Buffer.concat([discriminator, argsBuf]);

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: CONFIG_PDA,   isSigner: false, isWritable: true  },
      { pubkey: treasury,     isSigner: false, isWritable: true  },
      { pubkey: buyerRecord,  isSigner: false, isWritable: true  },
      { pubkey: buyer,        isSigner: true,  isWritable: true  },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });

  const tx = new Transaction();
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.feePayer = buyer;
  tx.add(ix);

  // Sign with the wallet the user actually connected
  const provider = getProvider(walletType);
  const signed = await provider.signTransaction(tx);
  const signature = await connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
  return { signature };
}

// ─────────────────────────────────────────────────────────────
//  BUY WITH USDT-SPL
// ─────────────────────────────────────────────────────────────

/**
 * Build and send a buy_with_usdt transaction.
 *
 * @param buyerAddress       Connected wallet public key string
 * @param usdtAmount         Amount in USDT (e.g. 500)
 * @param usdtTreasuryAta    Treasury ATA from PresaleConfig
 */
export async function buyWithUsdt(
  buyerAddress: string,
  usdtAmount: number,
  usdtTreasuryAta: string,
  walletType = "phantom"
): Promise<BuyWithSolResult> {
  const buyer = new PublicKey(buyerAddress);
  const treasuryAta = new PublicKey(usdtTreasuryAta);

  // USDT has 6 decimals
  const usdtRaw = BigInt(Math.floor(usdtAmount * 1_000_000));

  const [buyerRecord] = await findBuyerRecord(buyer);

  // Buyer's USDT ATA (must exist and be funded)
  const buyerUsdtAta = getAssociatedTokenAddressSync(USDT_MINT, buyer);

  const discriminator = await getDiscriminator("buy_with_usdt");

  const argsBuf = Buffer.alloc(8);
  argsBuf.writeBigUInt64LE(usdtRaw, 0);

  const data = Buffer.concat([discriminator, argsBuf]);

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: CONFIG_PDA,     isSigner: false, isWritable: true  },
      { pubkey: treasuryAta,    isSigner: false, isWritable: true  },
      { pubkey: buyerUsdtAta,   isSigner: false, isWritable: true  },
      { pubkey: buyerRecord,    isSigner: false, isWritable: true  },
      { pubkey: buyer,          isSigner: true,  isWritable: true  },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });

  const tx = new Transaction();
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.feePayer = buyer;
  tx.add(ix);

  const provider = getProvider(walletType);
  const signed = await provider.signTransaction(tx);
  const signature = await connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
  return { signature };
}

// ─────────────────────────────────────────────────────────────
//  FETCH PRESALE STATE  (for live progress bar / stage data)
// ─────────────────────────────────────────────────────────────

export interface PresaleState {
  currentStage: number;
  isActive: boolean;
  isPaused: boolean;
  totalTokensSold: bigint;
  totalSolRaised: bigint;
  totalUsdtRaised: bigint;
  solPriceUsdE6: bigint;
  treasury: string;
  usdtTreasuryAta: string;
  /** Unix timestamp (seconds) — 0 if not set on-chain */
  presaleStart: bigint;
  /** Unix timestamp (seconds) — 0 if not set on-chain */
  presaleEnd: bigint;
  /** Unix timestamp (seconds) — 0 if not set on-chain */
  claimOpensAt: bigint;
  stages: Array<{
    tokensPerRawUsdtScaled: bigint;
    maxTokens: bigint;
    tokensSold: bigint;
  }>;
}

// ─────────────────────────────────────────────────────────────
//  PRICE HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Convert tokensPerRawUsdtScaled → USD price per token.
 *
 * Contract stores: N tokens per 1 raw USDT (1 USDT = 1,000,000 raw USDT).
 * ∴  price_per_token = 1 / (N × 1,000,000)
 *
 * Returns 0 if the value is zero (unset or invalid).
 */
export function stageTokenPriceUsd(tokensPerRawUsdtScaled: bigint): number {
  if (tokensPerRawUsdtScaled === 0n) return 0;
  return 1 / (Number(tokensPerRawUsdtScaled) * 1_000_000);
}

/**
 * Format a stage price as a dollar string (e.g. "$0.00000001").
 * Falls back to the provided static string if the value is zero.
 */
export function formatStagePriceUsd(
  tokensPerRawUsdtScaled: bigint,
  fallback: string
): string {
  const price = stageTokenPriceUsd(tokensPerRawUsdtScaled);
  if (price === 0) return fallback;
  return `$${price.toFixed(10).replace(/\.?0+$/, "")}`;
}

/**
 * Read presale config from-chain. Returns null on error.
 * Discriminator (first 8 bytes) is skipped; data parsed manually.
 */
export async function fetchPresaleState(): Promise<PresaleState | null> {
  try {
    const info = await connection.getAccountInfo(CONFIG_PDA);
    if (!info) return null;

    const buf = Buffer.from(info.data);
    let offset = 8; // skip 8-byte discriminator

    const readPubkey  = () => { const pk = new PublicKey(buf.slice(offset, offset + 32)).toString(); offset += 32; return pk; };
    const readU8      = () => { const v = buf.readUInt8(offset); offset += 1; return v; };
    const readBool    = () => { const v = buf.readUInt8(offset) !== 0; offset += 1; return v; };
    const readI64     = () => { const v = buf.readBigInt64LE(offset); offset += 8; return v; };
    const readU64     = () => { const v = buf.readBigUInt64LE(offset); offset += 8; return v; };

    const authority          = readPubkey();
    const treasury           = readPubkey();
    const usdtTreasuryAta    = readPubkey();
    const _usdtMint          = readPubkey();
    const currentStage       = readU8();
    const isActive           = readBool();
    const isPaused           = readBool();
    const _presaleStart      = readI64();
    const _presaleEnd        = readI64();
    const _claimOpensAt      = readI64();
    const totalTokensSold    = readU64();
    const totalSolRaised     = readU64();
    const totalUsdtRaised    = readU64();
    const _totalManualTokens = readU64();
    const solPriceUsdE6      = readU64();

    void authority;

    const stages: PresaleState["stages"] = [];
    for (let i = 0; i < 4; i++) {
      stages.push({
        tokensPerRawUsdtScaled: readU64(),
        maxTokens:              readU64(),
        tokensSold:             readU64(),
      });
    }

    return {
      currentStage,
      isActive,
      isPaused,
      totalTokensSold,
      totalSolRaised,
      totalUsdtRaised,
      solPriceUsdE6,
      treasury,
      usdtTreasuryAta,
      presaleStart: _presaleStart,
      presaleEnd:   _presaleEnd,
      claimOpensAt: _claimOpensAt,
      stages,
    };
  } catch (err) {
    console.error("[PresaleContract] fetchPresaleState error:", err);
    return null;
  }
}

/**
 * Fetch the buyer record for a given wallet. Returns null if not found.
 */
export interface BuyerState {
  totalTokens: bigint;
  solPaid: bigint;
  usdtPaid: bigint;
  lastPurchaseAt: bigint;
}

export async function fetchBuyerState(buyerAddress: string): Promise<BuyerState | null> {
  try {
    const buyer = new PublicKey(buyerAddress);
    const [pda] = await findBuyerRecord(buyer);
    const info = await connection.getAccountInfo(pda);
    if (!info) return null;

    const buf = Buffer.from(info.data);
    let offset = 8 + 32 + 32; // skip discriminator + presale pubkey + wallet pubkey

    const totalTokens   = buf.readBigUInt64LE(offset); offset += 8;
    const solPaid       = buf.readBigUInt64LE(offset); offset += 8;
    const usdtPaid      = buf.readBigUInt64LE(offset); offset += 8;
    offset += 1; // last_is_manual bool
    const lastPurchaseAt = buf.readBigInt64LE(offset);

    return { totalTokens, solPaid, usdtPaid, lastPurchaseAt };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
//  FETCH BUYER TRANSACTIONS  (on-chain history)
// ─────────────────────────────────────────────────────────────

export interface BuyerTx {
  signature: string;
  blockTime: number | null;
  slot: number;
}

/**
 * Return up to 20 most recent presale transactions for a wallet.
 * We query signatures on the buyer's PDA so we only get presale txs.
 */
export async function fetchBuyerTransactions(buyerAddress: string): Promise<BuyerTx[]> {
  try {
    const buyer = new PublicKey(buyerAddress);
    const [pda] = await findBuyerRecord(buyer);
    const sigs = await connection.getSignaturesForAddress(pda, { limit: 20 });
    return sigs.map(s => ({
      signature: s.signature,
      blockTime: s.blockTime ?? null,
      slot: s.slot,
    }));
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
//  INTERNAL — wallet provider
// ─────────────────────────────────────────────────────────────

interface SolanaSignProvider {
  signTransaction(tx: Transaction): Promise<Transaction>;
}

function getProvider(walletType = "phantom"): SolanaSignProvider {
  const w = window as unknown as {
    solana?: SolanaSignProvider;
    phantom?: { solana?: SolanaSignProvider };
    solflare?: SolanaSignProvider;
  };

  if (walletType === "solflare") {
    if (w.solflare) return w.solflare;
    throw new Error("Solflare wallet not found. Is it installed?");
  }

  // phantom or any other Solana wallet
  const provider = w.phantom?.solana ?? w.solana;
  if (provider) return provider;

  // last resort — try solflare
  if (w.solflare) return w.solflare;

  throw new Error("No Solana wallet found. Please install Phantom or Solflare.");
}
