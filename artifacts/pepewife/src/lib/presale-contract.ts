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
//  SEND + CONFIRM HELPER
//  If confirmTransaction times out (block height expired),
//  we poll the signature status directly.  The tx may have
//  already landed even though the subscription timed out.
// ─────────────────────────────────────────────────────────────
async function sendAndConfirmTx(
  rawTx: Uint8Array,
  blockhash: string,
  lastValidBlockHeight: number,
): Promise<string> {
  const signature = await connection.sendRawTransaction(rawTx, {
    skipPreflight: true,
    maxRetries: 5,
  });

  try {
    const result = await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      "confirmed",
    );
    if (result.value.err) {
      throw new Error(`Transaction failed on-chain: ${JSON.stringify(result.value.err)}`);
    }
  } catch (timeoutErr) {
    // Timeout / block-height exceeded — check whether the tx actually landed
    const status = await connection.getSignatureStatus(signature, {
      searchTransactionHistory: true,
    });
    const conf = status?.value;
    if (
      conf &&
      !conf.err &&
      (conf.confirmationStatus === "confirmed" || conf.confirmationStatus === "finalized")
    ) {
      // Transaction DID land — treat as success
      return signature;
    }
    // Truly failed
    throw timeoutErr;
  }

  return signature;
}

// ─────────────────────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────────────────────

export const PROGRAM_ID = new PublicKey(
  "AUvWWYPitvKFRBYNQqQGnPD1EaNbNpXSvT4ZFpssH145"
);

export const CONFIG_PDA = new PublicKey(
  "BnHWhbNVB3cjCq7UA1KvBoW8JGe44yspCBSXPTDocuMi"
);

/** Mainnet USDT-SPL mint */
export const USDT_MINT = new PublicKey(
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
);

/** RPC endpoint — routed through our API proxy to avoid CORS issues */
export const SOLANA_ENDPOINT =
  typeof window !== "undefined"
    ? `${window.location.origin}/api/rpc`
    : "https://api.devnet.solana.com";

export const connection = new Connection(SOLANA_ENDPOINT, "confirmed");

// ─────────────────────────────────────────────────────────────
//  VAULT PDAs  (derived deterministically from program ID)
//  sol_vault  : seeds = [b"sol_vault"]  — holds buyer SOL
//  vault_auth : seeds = [b"vault_auth"] — owns the USDT ATA
// ─────────────────────────────────────────────────────────────

export const [SOL_VAULT_PDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("sol_vault")],
  PROGRAM_ID
);

export const [VAULT_AUTH_PDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("vault_auth")],
  PROGRAM_ID
);

/** USDT ATA owned by vault_auth PDA — receives USDT from buyers */
export const VAULT_USDT_ATA = getAssociatedTokenAddressSync(
  USDT_MINT,
  VAULT_AUTH_PDA,
  true // allowOwnerOffCurve — required for PDA owners
);

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
//  Accounts: config, sol_vault, buyer_record, buyer, system_program
// ─────────────────────────────────────────────────────────────

export interface BuyWithSolResult {
  signature: string;
}

/**
 * Build and send a buy_with_sol transaction.
 * SOL goes to the sol_vault PDA — no treasury address needed.
 *
 * @param buyerAddress  Connected wallet public key string
 * @param solAmount     Amount in SOL (e.g. 1.5)
 * @param walletType    "phantom" | "solflare"
 */
export async function buyWithSol(
  buyerAddress: string,
  solAmount: number,
  walletType = "phantom"
): Promise<BuyWithSolResult> {
  const buyer = new PublicKey(buyerAddress);
  const lamports = BigInt(Math.floor(solAmount * LAMPORTS_PER_SOL));

  const [buyerRecord] = await findBuyerRecord(buyer);

  const discriminator = await getDiscriminator("buy_with_sol");

  // Encode args: u64 lamports (little-endian 8 bytes)
  const argsBuf = Buffer.alloc(8);
  argsBuf.writeBigUInt64LE(lamports, 0);

  const data = Buffer.concat([discriminator, argsBuf]);

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: CONFIG_PDA,                isSigner: false, isWritable: true  },
      { pubkey: SOL_VAULT_PDA,             isSigner: false, isWritable: true  },
      { pubkey: buyerRecord,               isSigner: false, isWritable: true  },
      { pubkey: buyer,                     isSigner: true,  isWritable: true  },
      { pubkey: SystemProgram.programId,   isSigner: false, isWritable: false },
    ],
    data,
  });

  const tx = new Transaction();
  tx.feePayer = buyer;
  tx.add(ix);

  // Fetch blockhash as late as possible — right before signing
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;

  const provider = getProvider(walletType);
  const signed = await provider.signTransaction(tx);

  const signature = await sendAndConfirmTx(
    signed.serialize(),
    blockhash,
    lastValidBlockHeight,
  );
  return { signature };
}

// ─────────────────────────────────────────────────────────────
//  BUY WITH USDT-SPL
//  Accounts: config, vault_usdt_ata, buyer_usdt_ata,
//            buyer_record, buyer, token_program, system_program
// ─────────────────────────────────────────────────────────────

/**
 * Build and send a buy_with_usdt transaction.
 * USDT goes to the vault_auth's ATA — no treasury ATA address needed.
 *
 * @param buyerAddress  Connected wallet public key string
 * @param usdtAmount    Amount in USDT (e.g. 500)
 * @param walletType    "phantom" | "solflare"
 */
export async function buyWithUsdt(
  buyerAddress: string,
  usdtAmount: number,
  walletType = "phantom"
): Promise<BuyWithSolResult> {
  const buyer = new PublicKey(buyerAddress);

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
      { pubkey: CONFIG_PDA,              isSigner: false, isWritable: true  },
      { pubkey: VAULT_USDT_ATA,          isSigner: false, isWritable: true  },
      { pubkey: buyerUsdtAta,            isSigner: false, isWritable: true  },
      { pubkey: buyerRecord,             isSigner: false, isWritable: true  },
      { pubkey: buyer,                   isSigner: true,  isWritable: true  },
      { pubkey: TOKEN_PROGRAM_ID,        isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });

  const tx = new Transaction();
  tx.feePayer = buyer;
  tx.add(ix);

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;

  const provider = getProvider(walletType);
  const signed = await provider.signTransaction(tx);

  const signature = await sendAndConfirmTx(
    signed.serialize(),
    blockhash,
    lastValidBlockHeight,
  );
  return { signature };
}

// ─────────────────────────────────────────────────────────────
//  ADMIN: WITHDRAW SOL FROM VAULT
//  Accounts: config (read), sol_vault (mut), authority (signer+mut)
//  The authority MUST match config.authority — only admin can call.
// ─────────────────────────────────────────────────────────────

export async function withdrawSol(
  adminAddress: string,
  walletType = "phantom",
): Promise<{ signature: string; withdrawnLamports: bigint }> {
  const admin = new PublicKey(adminAddress);
  const discriminator = await getDiscriminator("withdraw_sol");

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: CONFIG_PDA,    isSigner: false, isWritable: false },
      { pubkey: SOL_VAULT_PDA, isSigner: false, isWritable: true  },
      { pubkey: admin,         isSigner: true,  isWritable: true  },
    ],
    data: discriminator,
  });

  // Check how much is in the vault before withdrawing
  const vaultLamports = await connection.getBalance(SOL_VAULT_PDA);

  const tx = new Transaction();
  tx.feePayer = admin;
  tx.add(ix);

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;

  const provider = getProvider(walletType);
  const signed = await provider.signTransaction(tx);

  const signature = await sendAndConfirmTx(
    signed.serialize(),
    blockhash,
    lastValidBlockHeight,
  );

  // Rent-exempt minimum that stays in vault (~0.001 SOL for 8-byte account)
  const rentMin = BigInt(890880); // ~0.00089 SOL
  const withdrawnLamports = BigInt(vaultLamports) - rentMin;

  return { signature, withdrawnLamports };
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
  /** buyers_count — total unique buyers so far */
  buyersCount: bigint;
  /** @deprecated — vault PDA is now used instead. Kept for backward compat. */
  treasury: string;
  /** @deprecated — vault_auth ATA is now used instead. Kept for backward compat. */
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
 *
 * PresaleConfig on-chain layout (after 8-byte discriminator):
 *   authority         : 32
 *   treasury          : 32  (now = sol_vault PDA, field kept for compat)
 *   usdt_treasury_ata : 32  (now = vault_auth ATA, field kept for compat)
 *   usdt_mint         : 32
 *   current_stage     : 1
 *   is_active         : 1
 *   is_paused         : 1
 *   presale_start     : 8
 *   presale_end       : 8
 *   claim_opens_at    : 8
 *   total_tokens_sold : 8
 *   total_sol_raised  : 8
 *   total_usdt_raised : 8
 *   total_manual_tokens: 8
 *   sol_price_usd_e6  : 8
 *   stages[4]         : 4 × 24 = 96
 *   buyers_count      : 8   (NEW)
 *   sol_vault_bump    : 1   (NEW)
 *   vault_auth_bump   : 1   (NEW)
 *   bump              : 1
 *   _reserved         : 54
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

    const _authority         = readPubkey();
    const treasury           = readPubkey();
    const usdtTreasuryAta    = readPubkey();
    const _usdtMint          = readPubkey();
    const currentStage       = readU8();
    const isActive           = readBool();
    const isPaused           = readBool();
    const presaleStart       = readI64();
    const presaleEnd         = readI64();
    const claimOpensAt       = readI64();
    const totalTokensSold    = readU64();
    const totalSolRaised     = readU64();
    const totalUsdtRaised    = readU64();
    const _totalManualTokens = readU64();
    const solPriceUsdE6      = readU64();

    void _authority;
    void _usdtMint;
    void _totalManualTokens;

    const stages: PresaleState["stages"] = [];
    for (let i = 0; i < 4; i++) {
      stages.push({
        tokensPerRawUsdtScaled: readU64(),
        maxTokens:              readU64(),
        tokensSold:             readU64(),
      });
    }

    // NEW fields
    const buyersCount    = readU64();
    const _solVaultBump  = readU8();
    const _vaultAuthBump = readU8();
    // remaining: bump(1) + _reserved(54) — not needed in UI

    void _solVaultBump;
    void _vaultAuthBump;

    return {
      currentStage,
      isActive,
      isPaused,
      totalTokensSold,
      totalSolRaised,
      totalUsdtRaised,
      solPriceUsdE6,
      buyersCount,
      treasury,
      usdtTreasuryAta,
      presaleStart,
      presaleEnd,
      claimOpensAt,
      stages,
    };
  } catch (err) {
    console.error("[PresaleContract] fetchPresaleState error:", err);
    return null;
  }
}

/**
 * Fetch the buyer record for a given wallet. Returns null if not found.
 *
 * BuyerRecord on-chain layout (after 8-byte discriminator):
 *   presale               : 32
 *   wallet                : 32
 *   total_tokens          : 8
 *   sol_paid              : 8
 *   usdt_paid             : 8
 *   last_is_manual        : 1
 *   last_purchase_at      : 8
 *   stage_at_first_purchase: 1  (NEW)
 *   payment_flags         : 1   (NEW)
 *   bump                  : 1
 *   _reserved             : 30
 */
export interface BuyerState {
  totalTokens: bigint;
  solPaid: bigint;
  usdtPaid: bigint;
  lastPurchaseAt: bigint;
  /** Stage index (0-3) at the time of first purchase */
  stageAtFirstPurchase: number;
  /**
   * Bit-field: bit0 = paid SOL, bit1 = paid USDT, bit2 = manual allocation
   * Use FLAG_SOL / FLAG_USDT / FLAG_MANUAL constants to test bits.
   */
  paymentFlags: number;
}

/** Bit flags for BuyerState.paymentFlags */
export const FLAG_SOL    = 0b001;
export const FLAG_USDT   = 0b010;
export const FLAG_MANUAL = 0b100;

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
    offset += 1; // last_is_manual (bool)
    const lastPurchaseAt = buf.readBigInt64LE(offset); offset += 8;
    // NEW fields
    const stageAtFirstPurchase = buf.readUInt8(offset); offset += 1;
    const paymentFlags         = buf.readUInt8(offset); offset += 1;
    // remaining: bump(1) + _reserved(30) — not needed in UI

    return { totalTokens, solPaid, usdtPaid, lastPurchaseAt, stageAtFirstPurchase, paymentFlags };
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
