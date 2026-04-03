use anchor_lang::prelude::*;
use crate::state::{PresaleConfig, Stage, MAX_STAGES};
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
    #[account(
        init,
        payer = authority,
        space = PresaleConfig::LEN,
        seeds = [b"presale_config"],
        bump,
    )]
    pub config: Account<'info, PresaleConfig>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitializeArgs {
    /// SOL treasury wallet (receives native SOL)
    pub treasury: Pubkey,
    /// USDT ATA that receives USDT-SPL
    pub usdt_treasury_ata: Pubkey,
    /// USDT mint (mainnet: Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB)
    pub usdt_mint: Pubkey,
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

    let config = &mut ctx.accounts.config;
    let bump = ctx.bumps.config;

    config.authority         = ctx.accounts.authority.key();
    config.treasury          = args.treasury;
    config.usdt_treasury_ata = args.usdt_treasury_ata;
    config.usdt_mint         = args.usdt_mint;
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
    config.bump              = bump;
    config._reserved         = [0u8; 64];

    // Set the four stages
    for i in 0..MAX_STAGES {
        config.stages[i] = Stage {
            tokens_per_raw_usdt_scaled: STAGE_PRICES[i],
            max_tokens: TOKENS_PER_STAGE,
            tokens_sold: 0,
        };
    }

    msg!("PEPEWIFE Presale initialized. Start={} End={}", args.presale_start, args.presale_end);
    Ok(())
}
