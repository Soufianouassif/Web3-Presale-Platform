use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{PresaleConfig, BuyerRecord};
use crate::error::PresaleError;

/// Minimum purchase: 1 SOL
pub const MIN_SOL_LAMPORTS: u64 = 1_000_000_000;
/// Maximum purchase: 50 SOL
pub const MAX_SOL_LAMPORTS: u64 = 50_000_000_000;

#[derive(Accounts)]
pub struct BuyWithSol<'info> {
    #[account(
        mut,
        seeds = [b"presale_config"],
        bump = config.bump,
    )]
    pub config: Account<'info, PresaleConfig>,

    /// CHECK: treasury wallet that receives SOL – validated against config
    #[account(
        mut,
        constraint = treasury.key() == config.treasury @ PresaleError::Unauthorized
    )]
    pub treasury: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = buyer,
        space = BuyerRecord::LEN,
        seeds = [b"buyer", config.key().as_ref(), buyer.key().as_ref()],
        bump,
    )]
    pub buyer_record: Account<'info, BuyerRecord>,

    #[account(mut)]
    pub buyer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handle_buy_with_sol(ctx: Context<BuyWithSol>, lamports: u64) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let now = Clock::get()?.unix_timestamp;

    // ── Guards ──────────────────────────────────────────────
    require!(config.is_active, PresaleError::NotActive);
    require!(!config.is_paused, PresaleError::Paused);
    require!(now >= config.presale_start, PresaleError::NotStarted);
    require!(now < config.presale_end, PresaleError::Ended);
    require!(lamports >= MIN_SOL_LAMPORTS, PresaleError::BelowMinimum);
    require!(lamports <= MAX_SOL_LAMPORTS, PresaleError::ExceedsMaximum);
    require!(config.sol_price_usd_e6 > 0, PresaleError::SolPriceNotSet);

    let stage_idx = config.current_stage as usize;
    require!(stage_idx < 4, PresaleError::InvalidStage);

    // ── Token calculation ────────────────────────────────────
    let tokens = config.tokens_for_sol(stage_idx, lamports);
    require!(tokens > 0, PresaleError::ZeroTokens);

    let stage = &mut config.stages[stage_idx];
    require!(stage.remaining() >= tokens, PresaleError::InsufficientStageTokens);

    // ── Transfer SOL to treasury ─────────────────────────────
    let cpi_ctx = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        system_program::Transfer {
            from: ctx.accounts.buyer.to_account_info(),
            to:   ctx.accounts.treasury.to_account_info(),
        },
    );
    system_program::transfer(cpi_ctx, lamports)?;

    // ── Update state ─────────────────────────────────────────
    config.stages[stage_idx].tokens_sold = config.stages[stage_idx]
        .tokens_sold
        .checked_add(tokens)
        .ok_or(PresaleError::MathOverflow)?;

    config.total_tokens_sold = config.total_tokens_sold
        .checked_add(tokens)
        .ok_or(PresaleError::MathOverflow)?;

    config.total_sol_raised = config.total_sol_raised
        .checked_add(lamports)
        .ok_or(PresaleError::MathOverflow)?;

    // ── Buyer record ─────────────────────────────────────────
    let record = &mut ctx.accounts.buyer_record;
    if record.wallet == Pubkey::default() {
        record.presale          = config.key();
        record.wallet           = ctx.accounts.buyer.key();
        record.bump             = ctx.bumps.buyer_record;
        record._reserved        = [0u8; 32];
    }
    record.total_tokens = record.total_tokens
        .checked_add(tokens)
        .ok_or(PresaleError::MathOverflow)?;
    record.sol_paid     = record.sol_paid
        .checked_add(lamports)
        .ok_or(PresaleError::MathOverflow)?;
    record.last_is_manual    = false;
    record.last_purchase_at  = now;

    // Auto-advance stage if sold out
    if config.stages[stage_idx].is_sold_out() && stage_idx < 3 {
        config.current_stage += 1;
        msg!("Stage {} sold out. Advancing to stage {}", stage_idx, config.current_stage);
    }

    msg!(
        "SOL purchase: {} lamports → {} tokens (stage {})",
        lamports, tokens, stage_idx
    );
    Ok(())
}
