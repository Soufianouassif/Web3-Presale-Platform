use anchor_lang::prelude::*;
use crate::state::ClaimConfig;
use crate::error::ClaimError;

#[derive(Accounts)]
pub struct ClaimAdmin<'info> {
    #[account(
        mut,
        seeds = [b"claim_config"],
        bump = config.bump,
        has_one = authority @ ClaimError::Unauthorized,
    )]
    pub config: Account<'info, ClaimConfig>,

    pub authority: Signer<'info>,
}

/// Open the claim window
pub fn handle_open_claim(ctx: Context<ClaimAdmin>) -> Result<()> {
    let c = &mut ctx.accounts.config;
    let now = Clock::get()?.unix_timestamp;
    require!(now >= c.claim_opens_at, ClaimError::ClaimNotStarted);
    c.is_open = true;
    msg!("Claim OPENED");
    Ok(())
}

/// Force-close (emergency)
pub fn handle_close_claim(ctx: Context<ClaimAdmin>) -> Result<()> {
    ctx.accounts.config.is_open = false;
    msg!("Claim CLOSED (emergency)");
    Ok(())
}

/// Update claim open timestamp before it has been opened
pub fn handle_update_claim_time(ctx: Context<ClaimAdmin>, new_time: i64) -> Result<()> {
    let c = &mut ctx.accounts.config;
    require!(!c.is_open, ClaimError::NothingToClaim); // can't update after opened
    c.claim_opens_at = new_time;
    msg!("Claim opens updated to {}", new_time);
    Ok(())
}
