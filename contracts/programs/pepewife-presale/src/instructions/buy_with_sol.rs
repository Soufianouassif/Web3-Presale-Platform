use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{PresaleConfig, SolVault, BuyerRecord, FLAG_SOL};
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

    /// SOL vault PDA — program-controlled. Validated against config.treasury.
    #[account(
        mut,
        seeds = [b"sol_vault"],
        bump = config.sol_vault_bump,
        constraint = sol_vault.key() == config.treasury @ PresaleError::WrongSolVault,
    )]
    pub sol_vault: Account<'info, SolVault>,

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

    // ── Guards ──────────────────────────────────────────────────────
    require!(config.is_active,              PresaleError::NotActive);
    require!(!config.is_paused,             PresaleError::Paused);
    require!(now >= config.presale_start,   PresaleError::NotStarted);
    require!(now <  config.presale_end,     PresaleError::Ended);
    require!(lamports >= MIN_SOL_LAMPORTS,  PresaleError::BelowMinimum);
    require!(lamports <= MAX_SOL_LAMPORTS,  PresaleError::ExceedsMaximum);
    require!(config.sol_price_usd_e6 > 0,  PresaleError::SolPriceNotSet);

    let stage_idx = config.current_stage as usize;
    require!(stage_idx < 4, PresaleError::InvalidStage);

    // ── Token calculation ────────────────────────────────────────────
    let tokens = config.tokens_for_sol(stage_idx, lamports);
    require!(tokens > 0, PresaleError::ZeroTokens);

    require!(
        config.stages[stage_idx].remaining() >= tokens,
        PresaleError::InsufficientStageTokens
    );

    // ── Transfer SOL from buyer to sol_vault PDA ─────────────────────
    let cpi_ctx = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        system_program::Transfer {
            from: ctx.accounts.buyer.to_account_info(),
            to:   ctx.accounts.sol_vault.to_account_info(),
        },
    );
    system_program::transfer(cpi_ctx, lamports)?;

    // ── Update global state ──────────────────────────────────────────
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

    // ── Buyer record ─────────────────────────────────────────────────
    let record = &mut ctx.accounts.buyer_record;
    let is_new_buyer = record.wallet == Pubkey::default();

    if is_new_buyer {
        record.presale                  = config.key();
        record.wallet                   = ctx.accounts.buyer.key();
        record.bump                     = ctx.bumps.buyer_record;
        record.stage_at_first_purchase  = stage_idx as u8;
        record.payment_flags            = 0;
        record._reserved                = [0u8; 30];

        // Increment unique buyer counter
        config.buyers_count = config.buyers_count
            .checked_add(1)
            .ok_or(PresaleError::MathOverflow)?;
    }

    record.total_tokens = record.total_tokens
        .checked_add(tokens)
        .ok_or(PresaleError::MathOverflow)?;
    record.sol_paid = record.sol_paid
        .checked_add(lamports)
        .ok_or(PresaleError::MathOverflow)?;
    record.last_is_manual   = false;
    record.last_purchase_at = now;
    record.payment_flags   |= FLAG_SOL;

    // ── Auto-advance stage if sold out ───────────────────────────────
    if config.stages[stage_idx].is_sold_out() && stage_idx < 3 {
        config.current_stage += 1;
        msg!(
            "Stage {} sold out. Auto-advancing to stage {}",
            stage_idx, config.current_stage
        );
    }

    msg!(
        "SOL_BUY wallet={} lamports={} tokens={} stage={} buyers_total={}",
        ctx.accounts.buyer.key(),
        lamports, tokens, stage_idx, config.buyers_count
    );
    Ok(())
}
