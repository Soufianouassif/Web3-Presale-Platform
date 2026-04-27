/**
 * initialize-presale.mjs
 *
 * يقوم هذا السكريبت بـ:
 * 1. تهيئة عقد البيع المسبق (initialize)
 * 2. تفعيله (activate)
 *
 * الاستخدام:
 *   ADMIN_KEYPAIR_JSON='[1,2,3,...]' node scripts/initialize-presale.mjs
 *
 * ADMIN_KEYPAIR_JSON = مصفوفة الأرقام من ملف keypair.json الخاص بك
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { createHash } from "crypto";

// ─── الإعدادات ────────────────────────────────────────────────────────────────
const PROGRAM_ID     = new PublicKey("CEJkgJRaMPuzm3CkHxRULfptCGFC8ahvmWnkiRPC8vDi");
const USDT_MINT      = new PublicKey("8PieQJ43S4PpVWQaBZp4TaHFZGoAA9FsDzYbPftVfo6X"); // devnet
const RPC_URL        = "https://api.devnet.solana.com";

// أوقات البيع (يمكنك تغييرها)
const NOW            = Math.floor(Date.now() / 1000);
const PRESALE_START  = NOW - 60;                   // بدأ منذ دقيقة
const PRESALE_END    = NOW + 86400 * 90;           // ينتهي بعد 90 يوم
const CLAIM_OPENS_AT = NOW + 86400 * 120;          // الاستلام بعد 120 يوم
const SOL_PRICE      = 150_000_000n;               // $150 per SOL (بيغيّره السيرفر تلقائياً)

// ─── دوال مساعدة ─────────────────────────────────────────────────────────────
function discriminator(name) {
  return createHash("sha256").update(`global:${name}`).digest().slice(0, 8);
}

function writeI64LE(buf, value, offset) {
  const bigVal = BigInt(value);
  buf.writeBigInt64LE(bigVal, offset);
}

function writeU64LE(buf, value, offset) {
  buf.writeBigUInt64LE(BigInt(value), offset);
}

// ─── PDAs ────────────────────────────────────────────────────────────────────
const [configPda]   = PublicKey.findProgramAddressSync([Buffer.from("presale_config")], PROGRAM_ID);
const [solVaultPda] = PublicKey.findProgramAddressSync([Buffer.from("sol_vault")],      PROGRAM_ID);
const [vaultAuthPda]= PublicKey.findProgramAddressSync([Buffer.from("vault_auth")],     PROGRAM_ID);
const vaultUsdtAta  = getAssociatedTokenAddressSync(USDT_MINT, vaultAuthPda, true);

console.log("📋 العناوين المُشتقة:");
console.log("   CONFIG_PDA   :", configPda.toString());
console.log("   SOL_VAULT    :", solVaultPda.toString());
console.log("   VAULT_AUTH   :", vaultAuthPda.toString());
console.log("   VAULT_USDT_ATA:", vaultUsdtAta.toString());
console.log("");

// ─── قراءة المفتاح الخاص ─────────────────────────────────────────────────────
const keypairJson = process.env.ADMIN_KEYPAIR_JSON;
if (!keypairJson) {
  console.error("❌ يجب ضبط متغير البيئة ADMIN_KEYPAIR_JSON");
  console.error("   مثال: ADMIN_KEYPAIR_JSON='[1,2,3,...]' node scripts/initialize-presale.mjs");
  process.exit(1);
}

let authority;
try {
  authority = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(keypairJson)));
} catch (e) {
  console.error("❌ فشل قراءة ADMIN_KEYPAIR_JSON:", e.message);
  process.exit(1);
}

console.log("🔑 المحفظة:", authority.publicKey.toString());

const connection = new Connection(RPC_URL, "confirmed");

// ─── فحص الرصيد ──────────────────────────────────────────────────────────────
const balance = await connection.getBalance(authority.publicKey);
console.log("💰 الرصيد:", balance / 1_000_000_000, "SOL");
if (balance < 10_000_000) {
  console.error("❌ الرصيد غير كافٍ. تحتاج على الأقل 0.01 SOL على devnet.");
  console.error("   استخدم: solana airdrop 1 " + authority.publicKey.toString() + " --url devnet");
  process.exit(1);
}

// ─── فحص إذا كان العقد مُهيَّأ مسبقاً ───────────────────────────────────────
const existing = await connection.getAccountInfo(configPda);
if (existing) {
  console.log("ℹ️  العقد مُهيَّأ مسبقاً على العنوان:", configPda.toString());
  console.log("   جارٍ التحقق من حالة التفعيل...");
  // نتابع لمحاولة التفعيل فقط
} else {
  // ─── 1. بناء تعليمة initialize ─────────────────────────────────────────────
  console.log("\n🔧 جارٍ تهيئة العقد (initialize)...");

  // بيانات التعليمة: discriminator(8) + presale_start(8) + presale_end(8) + claim_opens_at(8) + sol_price_usd_e6(8)
  const initData = Buffer.alloc(8 + 8 + 8 + 8 + 8);
  discriminator("initialize").copy(initData, 0);
  writeI64LE(initData, PRESALE_START,  8);
  writeI64LE(initData, PRESALE_END,    16);
  writeI64LE(initData, CLAIM_OPENS_AT, 24);
  writeU64LE(initData, SOL_PRICE,      32);

  const initIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: configPda,                    isSigner: false, isWritable: true  },
      { pubkey: solVaultPda,                  isSigner: false, isWritable: true  },
      { pubkey: vaultAuthPda,                 isSigner: false, isWritable: false },
      { pubkey: vaultUsdtAta,                 isSigner: false, isWritable: true  },
      { pubkey: USDT_MINT,                    isSigner: false, isWritable: false },
      { pubkey: authority.publicKey,          isSigner: true,  isWritable: true  },
      { pubkey: SystemProgram.programId,      isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID,             isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,  isSigner: false, isWritable: false },
    ],
    data: initData,
  });

  const initTx = new Transaction().add(initIx);
  const initSig = await sendAndConfirmTransaction(connection, initTx, [authority], {
    commitment: "confirmed",
  });
  console.log("✅ تم التهيئة بنجاح!");
  console.log("   التوقيع:", initSig);
  console.log("   Explorer: https://explorer.solana.com/tx/" + initSig + "?cluster=devnet");
}

// ─── 2. بناء تعليمة activate ─────────────────────────────────────────────────
console.log("\n🚀 جارٍ تفعيل البيع المسبق (activate)...");

const activateData = Buffer.from(discriminator("activate"));

const activateIx = new TransactionInstruction({
  programId: PROGRAM_ID,
  keys: [
    { pubkey: configPda,           isSigner: false, isWritable: true },
    { pubkey: authority.publicKey, isSigner: true,  isWritable: false },
  ],
  data: activateData,
});

try {
  const activateTx = new Transaction().add(activateIx);
  const activateSig = await sendAndConfirmTransaction(connection, activateTx, [authority], {
    commitment: "confirmed",
  });
  console.log("✅ تم التفعيل بنجاح!");
  console.log("   التوقيع:", activateSig);
  console.log("   Explorer: https://explorer.solana.com/tx/" + activateSig + "?cluster=devnet");
} catch (e) {
  if (e.message?.includes("AlreadyActive") || e.message?.includes("already")) {
    console.log("ℹ️  البيع المسبق مُفعَّل مسبقاً.");
  } else {
    throw e;
  }
}

// ─── التحقق النهائي ───────────────────────────────────────────────────────────
console.log("\n🔍 التحقق من الحالة على السلسلة...");
const info = await connection.getAccountInfo(configPda);
if (info) {
  const buf = info.data;
  const isActive = buf[8 + 32 + 32 + 32 + 32 + 1] !== 0;
  console.log("✅ CONFIG_PDA موجود | الحجم:", info.data.length, "بايت");
  console.log("   is_active:", isActive ? "نعم ✅" : "لا ❌");
  console.log("\n🎉 جاهز! يمكنك الآن تجربة عملية الشراء من الواجهة.");
} else {
  console.log("❌ CONFIG_PDA غير موجود — ربما فشلت المعاملة.");
}
