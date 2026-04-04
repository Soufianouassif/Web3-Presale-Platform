import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorError } from "@coral-xyz/anchor";
import { PepewifepresaleIDL } from "../target/types/pepewife_presale";
import {
  PublicKey,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
} from "@solana/web3.js";
import {
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
} from "@solana/spl-token";
import { assert } from "chai";

describe("pepewife-presale", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.PepewifePReSale as Program<PepewifepresaleIDL>;

  const authority  = provider.wallet as anchor.Wallet;
  const buyer      = Keypair.generate();
  const erc20Buyer = Keypair.generate();
  const attacker   = Keypair.generate(); // used to test unauthorized access

  let usdtMint: PublicKey;
  let vaultUsdtAta: PublicKey;
  let buyerUsdtAta: PublicKey;
  let adminUsdtAta: PublicKey;

  let configPda:      PublicKey;
  let solVaultPda:    PublicKey;
  let vaultAuthPda:   PublicKey;
  let buyerRecordPda: PublicKey;
  let erc20RecordPda: PublicKey;

  const NOW = Math.floor(Date.now() / 1000);

  // ─── Setup ────────────────────────────────────────────────────────────────
  before(async () => {
    // Airdrop SOL to buyer and attacker for testing
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(buyer.publicKey, 20 * LAMPORTS_PER_SOL)
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(attacker.publicKey, 5 * LAMPORTS_PER_SOL)
    );

    // Create mock USDT mint (6 decimals)
    usdtMint = await createMint(
      provider.connection, authority.payer, authority.publicKey, null, 6
    );

    // Derive PDAs
    [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("presale_config")],
      program.programId
    );
    [solVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("sol_vault")],
      program.programId
    );
    [vaultAuthPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_auth")],
      program.programId
    );
    [buyerRecordPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("buyer"), configPda.toBuffer(), buyer.publicKey.toBuffer()],
      program.programId
    );
    [erc20RecordPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("buyer"), configPda.toBuffer(), erc20Buyer.publicKey.toBuffer()],
      program.programId
    );

    // vault_usdt_ata is the ATA owned by vaultAuthPda
    vaultUsdtAta = await getAssociatedTokenAddress(
      usdtMint, vaultAuthPda, true // allowOwnerOffCurve = true for PDAs
    );

    // Admin USDT ATA (to receive withdrawn USDT)
    adminUsdtAta = await createAssociatedTokenAccount(
      provider.connection, authority.payer, usdtMint, authority.publicKey
    );

    // Buyer USDT ATA — mint 1000 USDT for testing
    buyerUsdtAta = await createAssociatedTokenAccount(
      provider.connection, authority.payer, usdtMint, buyer.publicKey
    );
    await mintTo(
      provider.connection, authority.payer, usdtMint,
      buyerUsdtAta, authority.payer, 1_000_000_000 // 1,000 USDT (6 dec)
    );
  });

  // ─── 1. Initialize ────────────────────────────────────────────────────────
  it("initializes the presale (creates sol_vault + vault_usdt_ata)", async () => {
    await program.methods
      .initialize({
        presaleStart:  new anchor.BN(NOW - 10),
        presaleEnd:    new anchor.BN(NOW + 86400 * 30),  // 30 days
        claimOpensAt:  new anchor.BN(NOW + 86400 * 60),  // 60 days
        solPriceUsdE6: new anchor.BN(150_000_000),        // $150 / SOL
      })
      .accounts({
        config:               configPda,
        solVault:             solVaultPda,
        vaultAuth:            vaultAuthPda,
        vaultUsdtAta:         vaultUsdtAta,
        usdtMint:             usdtMint,
        authority:            authority.publicKey,
        systemProgram:        SystemProgram.programId,
        tokenProgram:         TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();

    const config = await program.account.presaleConfig.fetch(configPda);
    assert.equal(config.currentStage,    0,           "Stage should start at 0");
    assert.equal(config.isActive,        false,        "Should not be active yet");
    assert.equal(config.solPriceUsdE6.toNumber(), 150_000_000);
    assert.equal(config.buyersCount.toNumber(),   0, "Buyers count should be 0");
    assert.equal(config.treasury.toBase58(), solVaultPda.toBase58(), "Treasury must be sol_vault PDA");
    assert.equal(config.usdtTreasuryAta.toBase58(), vaultUsdtAta.toBase58(), "USDT treasury must be vault ATA");
    console.log("✅ Presale initialized");
    console.log(`   SOL vault:    ${solVaultPda.toBase58()}`);
    console.log(`   USDT vault:   ${vaultUsdtAta.toBase58()}`);
    console.log(`   vault_auth:   ${vaultAuthPda.toBase58()}`);
  });

  // ─── 2. Activate ──────────────────────────────────────────────────────────
  it("activates the presale", async () => {
    await program.methods.activate()
      .accounts({ config: configPda, authority: authority.publicKey })
      .rpc();

    const config = await program.account.presaleConfig.fetch(configPda);
    assert.equal(config.isActive, true);
    console.log("✅ Presale activated");
  });

  // ─── 3. Buy with SOL ──────────────────────────────────────────────────────
  it("buys with SOL (1 SOL) and creates BuyerRecord", async () => {
    const solVaultBefore = await provider.connection.getBalance(solVaultPda);

    await program.methods.buyWithSol(new anchor.BN(LAMPORTS_PER_SOL))
      .accounts({
        config:       configPda,
        solVault:     solVaultPda,
        buyerRecord:  buyerRecordPda,
        buyer:        buyer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    const record = await program.account.buyerRecord.fetch(buyerRecordPda);
    const config = await program.account.presaleConfig.fetch(configPda);
    const solVaultAfter = await provider.connection.getBalance(solVaultPda);

    assert.isTrue(record.totalTokens.gt(new anchor.BN(0)), "Tokens should be > 0");
    assert.equal(record.wallet.toBase58(), buyer.publicKey.toBase58());
    assert.equal(record.stageAtFirstPurchase, 0, "First purchase in stage 0");
    assert.equal(record.paymentFlags,         1, "FLAG_SOL = 0b001 = 1");
    assert.equal(config.buyersCount.toNumber(), 1, "Should have 1 unique buyer");
    assert.isTrue(
      solVaultAfter > solVaultBefore,
      "sol_vault balance should increase"
    );

    console.log(`✅ SOL purchase: ${record.totalTokens.toString()} tokens`);
    console.log(`   sol_vault balance: ${solVaultAfter / LAMPORTS_PER_SOL} SOL`);
  });

  // ─── 4. Buy with USDT ─────────────────────────────────────────────────────
  it("buys with USDT (200 USDT) — same buyer, payment_flags updated", async () => {
    const vaultAtaBefore = await getAccount(provider.connection, vaultUsdtAta);

    await program.methods.buyWithUsdt(new anchor.BN(200_000_000)) // 200 USDT
      .accounts({
        config:       configPda,
        usdtTreasury: vaultUsdtAta,
        buyerUsdtAta: buyerUsdtAta,
        buyerRecord:  buyerRecordPda,
        buyer:        buyer.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    const record = await program.account.buyerRecord.fetch(buyerRecordPda);
    const vaultAtaAfter = await getAccount(provider.connection, vaultUsdtAta);
    const config = await program.account.presaleConfig.fetch(configPda);

    assert.equal(record.usdtPaid.toNumber(), 200_000_000, "200 USDT paid");
    assert.equal(record.paymentFlags, 3, "FLAGS_SOL|USDT = 0b011 = 3 (both methods used)");
    assert.equal(config.buyersCount.toNumber(), 1, "Still 1 unique buyer");
    assert.isTrue(
      BigInt(vaultAtaAfter.amount) > BigInt(vaultAtaBefore.amount),
      "Vault USDT balance should increase"
    );

    console.log(`✅ USDT purchase: total tokens ${record.totalTokens.toString()}`);
    console.log(`   vault_usdt_ata balance: ${vaultAtaAfter.amount} raw USDT`);
  });

  // ─── 5. Manual Allocate (ERC20/TRC20) ────────────────────────────────────
  it("manually allocates tokens for an ERC20/TRC20 buyer", async () => {
    const refBytes = Buffer.alloc(64).fill(0);
    Buffer.from("0xabc123_eth_tx").copy(refBytes);

    await program.methods.manualAllocate({
      buyerWallet: erc20Buyer.publicKey,
      tokens:      new anchor.BN(10_000_000_000), // 10B tokens
      reference:   Array.from(refBytes),
    })
      .accounts({
        config:       configPda,
        buyerRecord:  erc20RecordPda,
        authority:    authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const record = await program.account.buyerRecord.fetch(erc20RecordPda);
    const config = await program.account.presaleConfig.fetch(configPda);

    assert.equal(record.totalTokens.toNumber(), 10_000_000_000);
    assert.equal(record.lastIsManual,   true);
    assert.equal(record.paymentFlags,   4, "FLAG_MANUAL = 0b100 = 4");
    assert.equal(config.buyersCount.toNumber(), 2, "2 unique buyers now");

    console.log(`✅ Manual allocation: ${record.totalTokens.toString()} tokens`);
    console.log(`   Buyers count: ${config.buyersCount.toString()}`);
  });

  // ─── 6. Pause / Resume ───────────────────────────────────────────────────
  it("pauses and resumes the presale", async () => {
    await program.methods.pause()
      .accounts({ config: configPda, authority: authority.publicKey })
      .rpc();
    let config = await program.account.presaleConfig.fetch(configPda);
    assert.equal(config.isPaused, true);

    // Verify buying is blocked while paused
    try {
      await program.methods.buyWithSol(new anchor.BN(LAMPORTS_PER_SOL))
        .accounts({
          config: configPda, solVault: solVaultPda,
          buyerRecord: buyerRecordPda, buyer: buyer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([buyer])
        .rpc();
      assert.fail("Should have thrown Paused error");
    } catch (e: any) {
      assert.include(e.message, "Paused", "Expected Paused error");
    }

    await program.methods.resume()
      .accounts({ config: configPda, authority: authority.publicKey })
      .rpc();
    config = await program.account.presaleConfig.fetch(configPda);
    assert.equal(config.isPaused, false);

    console.log("✅ Pause/Resume works — buying blocked during pause");
  });

  // ─── 7. Update SOL price ─────────────────────────────────────────────────
  it("updates SOL price", async () => {
    await program.methods.updateSolPrice(new anchor.BN(200_000_000)) // $200
      .accounts({ config: configPda, authority: authority.publicKey })
      .rpc();
    const config = await program.account.presaleConfig.fetch(configPda);
    assert.equal(config.solPriceUsdE6.toNumber(), 200_000_000);
    console.log("✅ SOL price updated to $200");
  });

  // ─── 8. Advance stage ────────────────────────────────────────────────────
  it("admin advances stage manually", async () => {
    await program.methods.advanceStage()
      .accounts({ config: configPda, authority: authority.publicKey })
      .rpc();
    const config = await program.account.presaleConfig.fetch(configPda);
    assert.equal(config.currentStage, 1, "Should be in stage 1");
    console.log("✅ Stage advanced to 1");

    // Go back to stage 0 for remaining tests
    // (we cannot go backward, so we keep stage 1 for the rest)
  });

  // ─── 9. REJECT: non-admin cannot call admin functions ────────────────────
  it("rejects unauthorized pause from non-admin", async () => {
    try {
      await program.methods.pause()
        .accounts({ config: configPda, authority: attacker.publicKey })
        .signers([attacker])
        .rpc();
      assert.fail("Should have thrown Unauthorized");
    } catch (e: any) {
      assert.include(e.message, "Unauthorized", "Expected Unauthorized error");
    }
    console.log("✅ Non-admin cannot pause presale");
  });

  it("rejects unauthorized manual_allocate from non-admin", async () => {
    const fakeRecord = Keypair.generate();
    try {
      await program.methods.manualAllocate({
        buyerWallet: attacker.publicKey,
        tokens:      new anchor.BN(1_000_000),
        reference:   Array.from(Buffer.alloc(64).fill(0)),
      })
        .accounts({
          config:       configPda,
          buyerRecord:  erc20RecordPda,
          authority:    attacker.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([attacker])
        .rpc();
      assert.fail("Should have thrown Unauthorized");
    } catch (e: any) {
      assert.include(e.message, "Unauthorized", "Expected Unauthorized error");
    }
    console.log("✅ Non-admin cannot manually allocate tokens");
  });

  // ─── 10. REJECT: non-admin cannot withdraw ───────────────────────────────
  it("rejects SOL withdrawal from non-admin", async () => {
    try {
      await program.methods.withdrawSol()
        .accounts({
          config:    configPda,
          solVault:  solVaultPda,
          authority: attacker.publicKey,
        })
        .signers([attacker])
        .rpc();
      assert.fail("Should have thrown Unauthorized");
    } catch (e: any) {
      assert.include(e.message, "Unauthorized", "Expected Unauthorized error");
    }
    console.log("✅ Non-admin cannot withdraw SOL");
  });

  it("rejects USDT withdrawal from non-admin", async () => {
    // attacker needs a USDT ATA for this test
    const attackerUsdtAta = await createAssociatedTokenAccount(
      provider.connection, authority.payer, usdtMint, attacker.publicKey
    );
    try {
      await program.methods.withdrawUsdt()
        .accounts({
          config:       configPda,
          vaultAuth:    vaultAuthPda,
          vaultUsdtAta: vaultUsdtAta,
          adminUsdtAta: attackerUsdtAta,
          authority:    attacker.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([attacker])
        .rpc();
      assert.fail("Should have thrown Unauthorized");
    } catch (e: any) {
      assert.include(e.message, "Unauthorized", "Expected Unauthorized error");
    }
    console.log("✅ Non-admin cannot withdraw USDT");
  });

  // ─── 11. WITHDRAW SOL (admin) ─────────────────────────────────────────────
  it("admin withdraws SOL from sol_vault", async () => {
    const adminBalBefore = await provider.connection.getBalance(authority.publicKey);
    const vaultBalBefore = await provider.connection.getBalance(solVaultPda);
    console.log(`   vault_sol before: ${vaultBalBefore / LAMPORTS_PER_SOL} SOL`);

    await program.methods.withdrawSol()
      .accounts({
        config:    configPda,
        solVault:  solVaultPda,
        authority: authority.publicKey,
      })
      .rpc();

    const vaultBalAfter = await provider.connection.getBalance(solVaultPda);
    const adminBalAfter = await provider.connection.getBalance(authority.publicKey);

    assert.isTrue(
      vaultBalAfter < vaultBalBefore,
      "Vault SOL should decrease after withdrawal"
    );
    console.log(`✅ SOL withdrawn: ${(vaultBalBefore - vaultBalAfter) / LAMPORTS_PER_SOL} SOL`);
    console.log(`   vault_sol after: ${vaultBalAfter / LAMPORTS_PER_SOL} SOL (rent-exempt min)`);
  });

  // ─── 12. WITHDRAW USDT (admin) ────────────────────────────────────────────
  it("admin withdraws USDT from vault_usdt_ata", async () => {
    const vaultBefore = await getAccount(provider.connection, vaultUsdtAta);
    const adminBefore = await getAccount(provider.connection, adminUsdtAta);
    console.log(`   vault_usdt before: ${vaultBefore.amount} raw USDT`);

    await program.methods.withdrawUsdt()
      .accounts({
        config:       configPda,
        vaultAuth:    vaultAuthPda,
        vaultUsdtAta: vaultUsdtAta,
        adminUsdtAta: adminUsdtAta,
        authority:    authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const vaultAfter = await getAccount(provider.connection, vaultUsdtAta);
    const adminAfter = await getAccount(provider.connection, adminUsdtAta);

    assert.equal(vaultAfter.amount.toString(), "0", "Vault USDT should be 0 after withdrawal");
    assert.equal(
      (adminAfter.amount - adminBefore.amount).toString(),
      vaultBefore.amount.toString(),
      "Admin should receive all vault USDT"
    );
    console.log(`✅ USDT withdrawn: ${vaultBefore.amount} raw USDT`);
    console.log(`   admin USDT ATA: ${adminAfter.amount} raw USDT`);
  });

  // ─── 13. End presale ──────────────────────────────────────────────────────
  it("admin ends the presale", async () => {
    await program.methods.endPresale()
      .accounts({ config: configPda, authority: authority.publicKey })
      .rpc();

    const config = await program.account.presaleConfig.fetch(configPda);
    assert.equal(config.isActive, false);
    console.log(`✅ Presale ended at timestamp ${config.presaleEnd.toString()}`);
  });

  // ─── 14. REJECT: buying after presale ends ───────────────────────────────
  it("rejects SOL purchase after presale ends", async () => {
    try {
      await program.methods.buyWithSol(new anchor.BN(LAMPORTS_PER_SOL))
        .accounts({
          config: configPda, solVault: solVaultPda,
          buyerRecord: buyerRecordPda, buyer: buyer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([buyer])
        .rpc();
      assert.fail("Should have thrown NotActive");
    } catch (e: any) {
      // Either NotActive (is_active=false) or Ended (time check)
      assert.isTrue(
        e.message.includes("NotActive") || e.message.includes("Ended"),
        `Expected NotActive or Ended, got: ${e.message}`
      );
    }
    console.log("✅ Buying rejected after presale ends");
  });

  // ─── 15. Claim script enumeration helper ─────────────────────────────────
  it("can enumerate all buyers by fetching all BuyerRecord accounts", async () => {
    // This is how the claim script reads all buyers from the presale
    const allRecords = await program.account.buyerRecord.all([
      {
        memcmp: {
          offset: 8,                      // skip discriminator (8 bytes)
          bytes:  configPda.toBase58(),   // presale field at offset 8
        },
      },
    ]);

    assert.equal(allRecords.length, 2, "Should have 2 buyer records");

    for (const { account: r } of allRecords) {
      console.log(
        `   Buyer: ${r.wallet.toBase58().slice(0, 8)}... | ` +
        `tokens=${r.totalTokens.toString()} | ` +
        `sol_paid=${r.solPaid.toString()} | ` +
        `usdt_paid=${r.usdtPaid.toString()} | ` +
        `stage=${r.stageAtFirstPurchase} | ` +
        `flags=${r.paymentFlags} | ` +
        `manual=${r.lastIsManual}`
      );
    }

    const config = await program.account.presaleConfig.fetch(configPda);
    console.log(`✅ buyers_count on-chain: ${config.buyersCount.toString()}`);
    console.log(`✅ Claim script can enumerate ${allRecords.length} buyers`);
  });
});
