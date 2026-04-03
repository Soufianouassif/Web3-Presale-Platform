use anchor_lang::prelude::*;
use crate::state::PresaleConfig;
use crate::error::PresaleError;

// ──────────────────────────────────────────────────────────
//  Shared accounts struct for all simple admin instructions
// ──────────────────────────────────────────────────────────
#[derive(Accounts)]
pub struct AdminOnly<'info> {
    #[account(
        mut,
        seeds = [b"presale_config"],
        bump = config.bump,
        has_one = authority @ PresaleError::Unauthorized,
    )]
    pub config: Account<'info, PresaleConfig>,

    pub authority: Signer<'info>,
}

// ── Activate presale ──────────────────────────────────────
pub fn handle_activate(ctx: Context<AdminOnly>) -> Result<()> {
    let c = &mut ctx.accounts.config;
    require!(!c.is_active, PresaleError::AlreadyActive);
    c.is_active = true;
    msg!("Presale ACTIVATED");
    Ok(())
}

// ── Pause presale ─────────────────────────────────────────
pub fn handle_pause(ctx: Context<AdminOnly>) -> Result<()> {
    ctx.accounts.config.is_paused = true;
    msg!("Presale PAUSED");
    Ok(())
}

// ── Resume presale ────────────────────────────────────────
pub fn handle_resume(ctx: Context<AdminOnly>) -> Result<()> {
    ctx.accounts.config.is_paused = false;
    msg!("Presale RESUMED");
    Ok(())
}

// ── End presale ───────────────────────────────────────────
pub fn handle_end_presale(ctx: Context<AdminOnly>) -> Result<()> {
    let c = &mut ctx.accounts.config;
    require!(c.is_active, PresaleError::NotActive);
    c.is_active = false;
    // Set end time to now so claim contract can validate
    c.presale_end = Clock::get()?.unix_timestamp;
    msg!("Presale ENDED at {}", c.presale_end);
    Ok(())
}

// ── Manually advance stage ────────────────────────────────
pub fn handle_advance_stage(ctx: Context<AdminOnly>) -> Result<()> {
    let c = &mut ctx.accounts.config;
    let next = c.current_stage + 1;
    require!(next < 4, PresaleError::AllStagesSoldOut);
    c.current_stage = next;
    msg!("Stage advanced to {}", next);
    Ok(())
}

// ── Update SOL price ──────────────────────────────────────
#[derive(Accounts)]
pub struct UpdateSolPrice<'info> {
    #[account(
        mut,
        seeds = [b"presale_config"],
        bump = config.bump,
        has_one = authority @ PresaleError::Unauthorized,
    )]
    pub config: Account<'info, PresaleConfig>,

    pub authority: Signer<'info>,
}

/// `new_price_usd_e6` = SOL price in micro-USD  (e.g. $180 → 180_000_000)
pub fn handle_update_sol_price(
    ctx: Context<UpdateSolPrice>,
    new_price_usd_e6: u64,
) -> Result<()> {
    ctx.accounts.config.sol_price_usd_e6 = new_price_usd_e6;
    msg!("SOL price updated to {} micro-USD", new_price_usd_e6);
    Ok(())
}

// ── Update claim open time ────────────────────────────────
pub fn handle_set_claim_time(
    ctx: Context<UpdateSolPrice>,  // same accounts
    new_claim_opens_at: i64,
) -> Result<()> {
    ctx.accounts.config.claim_opens_at = new_claim_opens_at;
    msg!("Claim opens at {}", new_claim_opens_at);
    Ok(())
}
