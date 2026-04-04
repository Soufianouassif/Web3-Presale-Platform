use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::Mint;
use crate::state::{PresaleConfig, SolVault, Stage, MAX_STAGES};
use crate::error::PresaleError;

/// 5 trillion tokens per stage
pub const TOKENS_PER_STAGE: u64 = 5_000_000_000_000;

/// Scaled prices per stage (tokens per 1 raw-USDT × 1_000)
/// Phase 1: $0.00000001/tok → 100 tok/rawUSDT → 100_000
/// Phase 2: $0.00000002/tok →  50 tok/rawUSDT →  50_000
/// Phase 3: $0.00000004/tok →  25 tok/rawUSDT →  25_000
/// Phase 4: $0.00000006/tok → 16.667 tok/rawUSDT → 16_667
pub const STAGE_PRICES: [u64; MAX_STAGES] = [100_000, 50_000, 25_000, 16_667];

#[derive(Accounts)]
pub struct Initialize<'info> {
    // ── PresaleConfig PDA ─────────────────────────────────────────
    #[account(
        init,
        payer = authority,
        space = PresaleConfig::LEN,
        seeds = [b"presale_config"],
        bump,
    )]
    pub config: Account<'info, PresaleConfig>,

    // ── SOL Vault PDA ─────────────────────────────────────────────
    // This PDA receives all native SOL from buyers.
    // Only the admin can withdraw via withdraw_sol.
    #[account(
        init,
        payer = authority,
        space = SolVault::LEN,
        seeds = [b"sol_vault"],
        bump,
    )]
    pub sol_vault: Account<'info, SolVault>,

    // ── Vault Authority PDA ───────────────────────────────────────
    // This PDA is the authority (owner) of the USDT vault ATA.
    // It has no data — only used for PDA-signing USDT withdrawals.
    /// CHECK: PDA-only authority account, no data needed
    #[account(
        seeds = [b"vault_auth"],
        bump,
    )]
    pub vault_auth: UncheckedAccount<'info>,

    // ── USDT Vault ATA ────────────────────────────────────────────
    // Owned by vault_auth PDA. Receives all USDT-SPL from buyers.
    // Only the admin can withdraw via withdraw_usdt (PDA-signed CPI).
    #[account(
        init,
        payer = authority,
        associated_token::mint = usdt_mint,
        associated_token::authority = vault_auth,
    )]
    pub vault_usdt_ata: Account<'info, TokenAccount>,

    /// USDT mint (mainnet: Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB)
    pub usdt_mint: Account<'info, Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitializeArgs {
    /// Presale start Unix timestamp
    pub presale_start: i64,
    /// Presale end Unix timestamp
    pub presale_end: i64,
    /// When claim contract opens (must be >= presale_end)
    pub claim_opens_at: i64,
    /// SOL price in micro-USD (6 decimals). E.g. $150 → 150_000_000
    pub sol_price_usd_e6: u64,
}

pub fn handle_initialize(ctx: Context<Initialize>, args: InitializeArgs) -> Result<()> {
    require!(
        args.presale_start < args.presale_end,
        PresaleError::InvalidTime
    );
    require!(
        args.claim_opens_at >= args.presale_end,
        PresaleError::InvalidTime
    );

    let config          = &mut ctx.accounts.config;
    let config_bump     = ctx.bumps.config;
    let sol_vault_bump  = ctx.bumps.sol_vault;
    let vault_auth_bump = ctx.bumps.vault_auth;

    // ── Populate PresaleConfig ─────────────────────────────────────
    config.authority         = ctx.accounts.authority.key();
    // treasury points to the sol_vault PDA — buyers send SOL here
    config.treasury          = ctx.accounts.sol_vault.key();
    // usdt_treasury_ata points to the vault's USDT ATA
    config.usdt_treasury_ata = ctx.accounts.vault_usdt_ata.key();
    config.usdt_mint         = ctx.accounts.usdt_mint.key();
    config.current_stage     = 0;
    config.is_active         = false; // must be explicitly activated
    config.is_paused         = false;
    config.presale_start     = args.presale_start;
    config.presale_end       = args.presale_end;
    config.claim_opens_at    = args.claim_opens_at;
    config.total_tokens_sold = 0;
    config.total_sol_raised  = 0;
    config.total_usdt_raised = 0;
    config.total_manual_tokens = 0;
    config.sol_price_usd_e6  = args.sol_price_usd_e6;
    config.buyers_count      = 0;
    config.sol_vault_bump    = sol_vault_bump;
    config.vault_auth_bump   = vault_auth_bump;
    config.bump              = config_bump;
    config._reserved         = [0u8; 54];

    // Set the four stages
    for i in 0..MAX_STAGES {
        config.stages[i] = Stage {
            tokens_per_raw_usdt_scaled: STAGE_PRICES[i],
            max_tokens:  TOKENS_PER_STAGE,
            tokens_sold: 0,
        };
    }

    msg!(
        "PEPEWIFE Presale initialized. Start={} End={} ClaimAt={}",
        args.presale_start, args.presale_end, args.claim_opens_at
    );
    msg!(
        "SOL vault: {} | USDT vault ATA: {} | vault_auth: {}",
        ctx.accounts.sol_vault.key(),
        ctx.accounts.vault_usdt_ata.key(),
        ctx.accounts.vault_auth.key(),
    );
    Ok(())
}
