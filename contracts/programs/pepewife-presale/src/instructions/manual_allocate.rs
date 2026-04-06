use anchor_lang::prelude::*;
use crate::state::{PresaleConfig, BuyerRecord, FLAG_MANUAL};
use crate::error::PresaleError;

/// Admin-only: allocate tokens for a buyer who paid via ERC20/TRC20.
/// This does NOT transfer funds — admin confirms off-chain payment then calls this.
#[derive(Accounts)]
#[instruction(args: ManualAllocateArgs)]
pub struct ManualAllocate<'info> {
    #[account(
        mut,
        seeds = [b"presale_config"],
        bump = config.bump,
        has_one = authority @ PresaleError::Unauthorized,
    )]
    pub config: Account<'info, PresaleConfig>,

    #[account(
        init_if_needed,
        payer = authority,
        space = BuyerRecord::LEN,
        seeds = [b"buyer", config.key().as_ref(), args.buyer_wallet.as_ref()],
        bump,
    )]
    pub buyer_record: Account<'info, BuyerRecord>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ManualAllocateArgs {
    /// The Solana wallet of the buyer (even if they paid from ETH/TRC20)
    pub buyer_wallet: Pubkey,
    /// Whole tokens to allocate
    pub tokens: u64,
    /// Reference ID / tx hash (max 64 bytes, e.g. ETH/TRC20 transaction hash)
    pub reference: [u8; 64],
}

pub fn handle_manual_allocate(
    ctx: Context<ManualAllocate>,
    args: ManualAllocateArgs,
) -> Result<()> {
    require!(args.tokens > 0, PresaleError::ZeroTokens);

    let config = &mut ctx.accounts.config;
    let now = Clock::get()?.unix_timestamp;

    // ── Update global totals ─────────────────────────────────────────
    config.total_tokens_sold = config.total_tokens_sold
        .checked_add(args.tokens)
        .ok_or(PresaleError::MathOverflow)?;
    config.total_manual_tokens = config.total_manual_tokens
        .checked_add(args.tokens)
        .ok_or(PresaleError::MathOverflow)?;

    // ── Buyer record ─────────────────────────────────────────────────
    let record = &mut ctx.accounts.buyer_record;
    let is_new_buyer = record.wallet == Pubkey::default();

    if is_new_buyer {
        record.presale                  = config.key();
        record.wallet                   = args.buyer_wallet;
        record.bump                     = ctx.bumps.buyer_record;
        record.stage_at_first_purchase  = config.current_stage;
        record.payment_flags            = 0;
        record._reserved                = [0u8; 30];

        // Increment unique buyer counter
        config.buyers_count = config.buyers_count
            .checked_add(1)
            .ok_or(PresaleError::MathOverflow)?;
    }

    record.total_tokens = record.total_tokens
        .checked_add(args.tokens)
        .ok_or(PresaleError::MathOverflow)?;
    record.last_is_manual   = true;
    record.last_purchase_at = now;
    record.payment_flags   |= FLAG_MANUAL;

    // ── Emit a log that indexers and admin scripts can parse ──────────
    msg!(
        "MANUAL_ALLOC wallet={} tokens={} stage={} ref={}",
        args.buyer_wallet,
        args.tokens,
        config.current_stage,
        // First 16 bytes of reference as hex-like log (UTF-8 best-effort)
        core::str::from_utf8(&args.reference[..16]).unwrap_or("??")
    );
    Ok(())
}
