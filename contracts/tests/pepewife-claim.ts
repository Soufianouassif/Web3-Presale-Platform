import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PepewifeclaimIDL } from "../target/types/pepewife_claim";
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
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { assert } from "chai";

describe("pepewife-claim", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.PepewifeClaimIDL as Program<PepewifeclaimIDL>;

  const authority = provider.wallet as anchor.Wallet;
  const claimer   = Keypair.generate();

  let pwifeMint: PublicKey;
  let vaultAta: PublicKey;
  let claimerAta: PublicKey;
  let configPda: PublicKey;
  let claimRecord: PublicKey;

  const NOW = Math.floor(Date.now() / 1000);

  before(async () => {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(claimer.publicKey, 2 * LAMPORTS_PER_SOL)
    );

    // Create mock PWIFE mint
    pwifeMint = await createMint(provider.connection, authority.payer, authority.publicKey, null, 6);

    [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("claim_config")], program.programId
    );

    // Vault ATA owned by the claim_config PDA
    vaultAta = await createAssociatedTokenAccount(
      provider.connection, authority.payer, pwifeMint, configPda, true
    );

    // Mint 1 trillion PWIFE to the vault (raw units with 6 decimals)
    await mintTo(
      provider.connection, authority.payer, pwifeMint,
      vaultAta, authority.payer,
      BigInt("1000000000000000000") // 10^18 raw
    );

    claimerAta = await createAssociatedTokenAccount(
      provider.connection, authority.payer, pwifeMint, claimer.publicKey
    );

    [claimRecord] = PublicKey.findProgramAddressSync(
      [Buffer.from("claim_record"), configPda.toBuffer(), claimer.publicKey.toBuffer()],
      program.programId
    );
  });

  it("initializes the claim contract", async () => {
    await program.methods.initialize({
      tokenMint:      pwifeMint,
      presaleProgram: program.programId,
      claimOpensAt:   new anchor.BN(NOW - 5), // opens now for testing
      tgePercent:     20,
      vestingMonths:  4,
    })
      .accounts({
        config:        configPda,
        vaultAta,
        authority:     authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const config = await program.account.claimConfig.fetch(configPda);
    assert.equal(config.tgePercent, 20);
    assert.equal(config.vestingMonths, 4);
    console.log("✅ Claim contract initialized");
  });

  it("registers buyer allocation (100B tokens)", async () => {
    await program.methods.addClaimRecord(
      claimer.publicKey,
      new anchor.BN(100_000_000_000) // 100B whole tokens
    )
      .accounts({
        config:      configPda,
        claimRecord: claimRecord,
        authority:   authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const record = await program.account.claimRecord.fetch(claimRecord);
    assert.equal(record.totalTokens.toNumber(), 100_000_000_000);
    console.log("✅ Claim record added: 100B tokens");
  });

  it("opens the claim window", async () => {
    await program.methods.openClaim()
      .accounts({ config: configPda, authority: authority.publicKey })
      .rpc();

    const config = await program.account.claimConfig.fetch(configPda);
    assert.equal(config.isOpen, true);
    console.log("✅ Claim opened");
  });

  it("claims TGE (20% = 20B tokens)", async () => {
    await program.methods.claimTge()
      .accounts({
        config:      configPda,
        vaultAta,
        claimerAta,
        claimRecord,
        claimer:     claimer.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([claimer])
      .rpc();

    const record = await program.account.claimRecord.fetch(claimRecord);
    assert.equal(record.tgeClaimed.toNumber(), 20_000_000_000); // 20% of 100B
    console.log(`✅ TGE claimed: ${record.tgeClaimed.toString()} tokens`);
  });

  it("cannot double-claim TGE", async () => {
    try {
      await program.methods.claimTge()
        .accounts({ config: configPda, vaultAta, claimerAta, claimRecord, claimer: claimer.publicKey, tokenProgram: TOKEN_PROGRAM_ID })
        .signers([claimer])
        .rpc();
      assert.fail("Should have thrown TgeAlreadyClaimed");
    } catch (e: any) {
      assert.include(e.message, "TgeAlreadyClaimed");
      console.log("✅ Double-claim correctly rejected");
    }
  });
});
