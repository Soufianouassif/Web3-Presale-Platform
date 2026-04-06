use anchor_lang::prelude::*;
use crate::state::{ClaimConfig, ClaimRecord};
use crate::error::ClaimError;

/// Admin-only: register a buyer's entitlement in the claim contract.
/// Called after the presale ends for each buyer (batch via CLI script).
#[derive(Accounts)]
#[instruction(buyer_wallet: Pubkey)]
pub struct AddClaimRecord<'info> {
    #[account(
        seeds = [b"claim_config"],
        bump = config.bump,
        has_one = authority @ ClaimError::Unauthorized,
    )]
    pub config: Account<'info, ClaimConfig>,

    #[account(
        init_if_needed,
        payer = authority,
        space = ClaimRecord::LEN,
        seeds = [b"claim_record", config.key().as_ref(), buyer_wallet.as_ref()],
        bump,
    )]
    pub claim_record: Account<'info, ClaimRecord>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handle_add_claim_record(
    ctx: Context<AddClaimRecord>,
    buyer_wallet: Pubkey,
    total_tokens: u64,
) -> Result<()> {
    require!(total_tokens > 0, ClaimError::ZeroAllocation);

    let record = &mut ctx.accounts.claim_record;
    let config = &ctx.accounts.config;

    if record.wallet == Pubkey::default() {
        record.config          = config.key();
        record.wallet          = buyer_wallet;
        record.bump            = ctx.bumps.claim_record;
        record._reserved       = [0u8; 32];
        record.first_claim_at  = 0;
        record.last_vesting_at = 0;
        record.months_claimed  = 0;
        record.tge_claimed     = 0;
        record.vesting_claimed = 0;
    }

    // Allow top-up (e.g. if a manual allocation was added after initial snapshot)
    record.total_tokens = record.total_tokens
        .checked_add(total_tokens)
        .ok_or(ClaimError::MathOverflow)?;

    msg!(
        "Claim record set: wallet={} total_tokens={}",
        buyer_wallet,
        record.total_tokens
    );
    Ok(())
}
