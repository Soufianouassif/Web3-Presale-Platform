use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{PresaleConfig, BuyerRecord, FLAG_USDT};
use crate::error::PresaleError;

/// Minimum purchase: 100 USDT (6 decimals)
pub const MIN_USDT_RAW: u64 = 100_000_000;
/// Maximum purchase: 10,000 USDT (6 decimals)
pub const MAX_USDT_RAW: u64 = 10_000_000_000;

#[derive(Accounts)]
pub struct BuyWithUsdt<'info> {
    #[account(
        mut,
        seeds = [b"presale_config"],
        bump = config.bump,
    )]
    pub config: Account<'info, PresaleConfig>,

    /// USDT vault ATA — owned by vault_auth PDA.
    /// Validated against config.usdt_treasury_ata.
    #[account(
        mut,
        constraint = usdt_treasury.key()  == config.usdt_treasury_ata @ PresaleError::WrongTreasuryAta,
        constraint = usdt_treasury.mint   == config.usdt_mint          @ PresaleError::WrongUsdtMint,
    )]
    pub usdt_treasury: Account<'info, TokenAccount>,

    /// Buyer's USDT token account (must match USDT mint)
    #[account(
        mut,
        constraint = buyer_usdt_ata.owner == buyer.key(),
        constraint = buyer_usdt_ata.mint  == config.usdt_mint @ PresaleError::WrongUsdtMint,
    )]
    pub buyer_usdt_ata: Account<'info, TokenAccount>,

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

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handle_buy_with_usdt(ctx: Context<BuyWithUsdt>, usdt_raw: u64) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let now = Clock::get()?.unix_timestamp;

    // ── Guards ──────────────────────────────────────────────────────
    require!(config.is_active,            PresaleError::NotActive);
    require!(!config.is_paused,           PresaleError::Paused);
    require!(now >= config.presale_start, PresaleError::NotStarted);
    require!(now <  config.presale_end,   PresaleError::Ended);
    require!(usdt_raw >= MIN_USDT_RAW,    PresaleError::BelowMinimum);
    require!(usdt_raw <= MAX_USDT_RAW,    PresaleError::ExceedsMaximum);

    let stage_idx = config.current_stage as usize;
    require!(stage_idx < 4, PresaleError::InvalidStage);

    // ── Token calculation ────────────────────────────────────────────
    let tokens = config.tokens_for_usdt(stage_idx, usdt_raw);
    require!(tokens > 0, PresaleError::ZeroTokens);

    require!(
        config.stages[stage_idx].remaining() >= tokens,
        PresaleError::InsufficientStageTokens
    );

    // ── Transfer USDT from buyer → vault_usdt_ata ────────────────────
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from:      ctx.accounts.buyer_usdt_ata.to_account_info(),
            to:        ctx.accounts.usdt_treasury.to_account_info(),
            authority: ctx.accounts.buyer.to_account_info(),
        },
    );
    token::transfer(cpi_ctx, usdt_raw)?;

    // ── Update global state ──────────────────────────────────────────
    config.stages[stage_idx].tokens_sold = config.stages[stage_idx]
        .tokens_sold
        .checked_add(tokens)
        .ok_or(PresaleError::MathOverflow)?;

    config.total_tokens_sold = config.total_tokens_sold
        .checked_add(tokens)
        .ok_or(PresaleError::MathOverflow)?;

    config.total_usdt_raised = config.total_usdt_raised
        .checked_add(usdt_raw)
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
    record.usdt_paid = record.usdt_paid
        .checked_add(usdt_raw)
        .ok_or(PresaleError::MathOverflow)?;
    record.last_is_manual   = false;
    record.last_purchase_at = now;
    record.payment_flags   |= FLAG_USDT;

    // ── Auto-advance stage if sold out ───────────────────────────────
    if config.stages[stage_idx].is_sold_out() && stage_idx < 3 {
        config.current_stage += 1;
        msg!(
            "Stage {} sold out. Auto-advancing to stage {}",
            stage_idx, config.current_stage
        );
    }

    msg!(
        "USDT_BUY wallet={} usdt_raw={} tokens={} stage={} buyers_total={}",
        ctx.accounts.buyer.key(),
        usdt_raw, tokens, stage_idx, config.buyers_count
    );
    Ok(())
}
