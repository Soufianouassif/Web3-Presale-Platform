use anchor_lang::prelude::*;
use crate::state::{PresaleConfig, BuyerRecord};
use crate::error::PresaleError;

/// Admin-only: allocate tokens for a buyer who paid via ERC20/TRC20
/// This does NOT transfer funds – admin confirms off-chain payment then calls this.
#[derive(Accounts)]
#[instruction(buyer_wallet: Pubkey)]
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
        seeds = [b"buyer", config.key().as_ref(), buyer_wallet.as_ref()],
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
    /// Optional: reference ID / tx hash as a short note (max 64 bytes)
    pub reference: [u8; 64],
}

pub fn handle_manual_allocate(
    ctx: Context<ManualAllocate>,
    args: ManualAllocateArgs,
) -> Result<()> {
    require!(args.tokens > 0, PresaleError::ZeroTokens);

    let config = &mut ctx.accounts.config;

    // Update config totals
    config.total_tokens_sold = config.total_tokens_sold
        .checked_add(args.tokens)
        .ok_or(PresaleError::MathOverflow)?;
    config.total_manual_tokens = config.total_manual_tokens
        .checked_add(args.tokens)
        .ok_or(PresaleError::MathOverflow)?;

    // Update or create buyer record
    let record = &mut ctx.accounts.buyer_record;
    let now = Clock::get()?.unix_timestamp;

    if record.wallet == Pubkey::default() {
        record.presale   = config.key();
        record.wallet    = args.buyer_wallet;
        record.bump      = ctx.bumps.buyer_record;
        record._reserved = [0u8; 32];
    }
    record.total_tokens = record.total_tokens
        .checked_add(args.tokens)
        .ok_or(PresaleError::MathOverflow)?;
    record.last_is_manual   = true;
    record.last_purchase_at = now;

    // Emit the reference so indexers / the admin dashboard can correlate it
    msg!(
        "MANUAL_ALLOC wallet={} tokens={} ref={:?}",
        args.buyer_wallet,
        args.tokens,
        &args.reference[..16]  // first 16 bytes for brevity
    );
    Ok(())
}
