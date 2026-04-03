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
  treasuryAddress: string
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

  // Sign via window.solana (Phantom / Solflare)
  const provider = getProvider();
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
  usdtTreasuryAta: string
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

  const provider = getProvider();
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
  stages: Array<{
    tokensPerRawUsdtScaled: bigint;
    maxTokens: bigint;
    tokensSold: bigint;
  }>;
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
//  INTERNAL — wallet provider
// ─────────────────────────────────────────────────────────────

interface SolanaSignProvider {
  signTransaction(tx: Transaction): Promise<Transaction>;
}

function getProvider(): SolanaSignProvider {
  const w = window as unknown as {
    solana?: SolanaSignProvider;
    phantom?: { solana?: SolanaSignProvider };
    solflare?: SolanaSignProvider;
  };

  const provider =
    w.phantom?.solana ??
    w.solana ??
    w.solflare;

  if (!provider) {
    throw new Error("No Solana wallet found. Please install Phantom or Solflare.");
  }
  return provider;
}
