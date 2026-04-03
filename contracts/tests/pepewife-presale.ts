import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
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
} from "@solana/spl-token";
import { assert } from "chai";

describe("pepewife-presale", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.PepewifePReSale as Program<PepewifepresaleIDL>;

  const authority = provider.wallet as anchor.Wallet;
  const buyer     = Keypair.generate();
  const treasury  = Keypair.generate();

  let usdtMint: PublicKey;
  let usdtTreasuryAta: PublicKey;
  let buyerUsdtAta: PublicKey;
  let configPda: PublicKey;
  let buyerRecordPda: PublicKey;

  const NOW = Math.floor(Date.now() / 1000);

  before(async () => {
    // Airdrop to buyer
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(buyer.publicKey, 10 * LAMPORTS_PER_SOL)
    );

    // Create mock USDT mint (devnet testing)
    usdtMint = await createMint(provider.connection, authority.payer, authority.publicKey, null, 6);

    // Treasury USDT ATA
    usdtTreasuryAta = await createAssociatedTokenAccount(
      provider.connection, authority.payer, usdtMint, treasury.publicKey
    );

    // Buyer USDT ATA – mint 1000 USDT for testing
    buyerUsdtAta = await createAssociatedTokenAccount(
      provider.connection, authority.payer, usdtMint, buyer.publicKey
    );
    await mintTo(
      provider.connection, authority.payer, usdtMint,
      buyerUsdtAta, authority.payer, 1_000_000_000 // 1000 USDT (6 dec)
    );

    // Derive PDAs
    [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("presale_config")], program.programId
    );
    [buyerRecordPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("buyer"), configPda.toBuffer(), buyer.publicKey.toBuffer()],
      program.programId
    );
  });

  it("initializes the presale", async () => {
    await program.methods
      .initialize({
        treasury: treasury.publicKey,
        usdtTreasuryAta,
        usdtMint,
        presaleStart:   new anchor.BN(NOW - 10),
        presaleEnd:     new anchor.BN(NOW + 86400 * 30), // 30 days
        claimOpensAt:   new anchor.BN(NOW + 86400 * 60), // 60 days
        solPriceUsdE6:  new anchor.BN(150_000_000),      // $150/SOL
      })
      .accounts({ config: configPda, authority: authority.publicKey, systemProgram: SystemProgram.programId })
      .rpc();

    const config = await program.account.presaleConfig.fetch(configPda);
    assert.equal(config.currentStage, 0);
    assert.equal(config.isActive, false);
    assert.equal(config.solPriceUsdE6.toNumber(), 150_000_000);
    console.log("✅ Presale initialized");
  });

  it("activates the presale", async () => {
    await program.methods.activate()
      .accounts({ config: configPda, authority: authority.publicKey })
      .rpc();

    const config = await program.account.presaleConfig.fetch(configPda);
    assert.equal(config.isActive, true);
    console.log("✅ Presale activated");
  });

  it("buys with SOL (1 SOL)", async () => {
    const configBefore = await program.account.presaleConfig.fetch(configPda);

    await program.methods.buyWithSol(new anchor.BN(LAMPORTS_PER_SOL))
      .accounts({
        config:       configPda,
        treasury:     treasury.publicKey,
        buyerRecord:  buyerRecordPda,
        buyer:        buyer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    const record = await program.account.buyerRecord.fetch(buyerRecordPda);
    const config = await program.account.presaleConfig.fetch(configPda);
    console.log(`✅ SOL purchase: ${record.totalTokens.toString()} tokens`);
    assert.isTrue(record.totalTokens.gt(new anchor.BN(0)));
    assert.isTrue(config.totalSolRaised.eq(new anchor.BN(LAMPORTS_PER_SOL)));
  });

  it("buys with USDT (200 USDT)", async () => {
    await program.methods.buyWithUsdt(new anchor.BN(200_000_000)) // 200 USDT
      .accounts({
        config:        configPda,
        usdtTreasury:  usdtTreasuryAta,
        buyerUsdtAta:  buyerUsdtAta,
        buyerRecord:   buyerRecordPda,
        buyer:         buyer.publicKey,
        tokenProgram:  TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    const record = await program.account.buyerRecord.fetch(buyerRecordPda);
    console.log(`✅ USDT purchase: total tokens now ${record.totalTokens.toString()}`);
    assert.isTrue(record.usdtPaid.eq(new anchor.BN(200_000_000)));
  });

  it("manually allocates for ERC20/TRC20 buyer", async () => {
    const erc20Buyer = Keypair.generate();
    const [erc20Record] = PublicKey.findProgramAddressSync(
      [Buffer.from("buyer"), configPda.toBuffer(), erc20Buyer.publicKey.toBuffer()],
      program.programId
    );
    const refBytes = Buffer.alloc(64).fill(0);
    Buffer.from("0xabc123_eth_tx").copy(refBytes);

    await program.methods.manualAllocate({
      buyerWallet: erc20Buyer.publicKey,
      tokens:      new anchor.BN(10_000_000_000), // 10B tokens
      reference:   Array.from(refBytes),
    })
      .accounts({
        config:      configPda,
        buyerRecord: erc20Record,
        authority:   authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const record = await program.account.buyerRecord.fetch(erc20Record);
    assert.equal(record.totalTokens.toNumber(), 10_000_000_000);
    assert.equal(record.lastIsManual, true);
    console.log(`✅ Manual allocation: ${record.totalTokens.toString()} tokens`);
  });

  it("pauses and resumes", async () => {
    await program.methods.pause()
      .accounts({ config: configPda, authority: authority.publicKey })
      .rpc();
    let config = await program.account.presaleConfig.fetch(configPda);
    assert.equal(config.isPaused, true);

    await program.methods.resume()
      .accounts({ config: configPda, authority: authority.publicKey })
      .rpc();
    config = await program.account.presaleConfig.fetch(configPda);
    assert.equal(config.isPaused, false);
    console.log("✅ Pause/Resume works");
  });

  it("updates SOL price", async () => {
    await program.methods.updateSolPrice(new anchor.BN(200_000_000)) // $200
      .accounts({ config: configPda, authority: authority.publicKey })
      .rpc();
    const config = await program.account.presaleConfig.fetch(configPda);
    assert.equal(config.solPriceUsdE6.toNumber(), 200_000_000);
    console.log("✅ SOL price updated");
  });
});
