use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use anchor_spl::associated_token::AssociatedToken;
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
    // Stamp end time so the claim contract can validate
    c.presale_end = Clock::get()?.unix_timestamp;
    msg!("Presale ENDED at {}", c.presale_end);
    Ok(())
}

// ── Manually advance stage ────────────────────────────────
pub fn handle_advance_stage(ctx: Context<AdminOnly>) -> Result<()> {
    let c = &mut ctx.accounts.config;
    let next = c.current_stage + 1;
    require!((next as usize) < 4, PresaleError::AllStagesSoldOut);
    c.current_stage = next;
    msg!("Stage advanced to {}", next);
    Ok(())
}

// ──────────────────────────────────────────────────────────
//  UpdateSolPrice — also shared by set_claim_time
// ──────────────────────────────────────────────────────────
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
    ctx: Context<UpdateSolPrice>,
    new_claim_opens_at: i64,
) -> Result<()> {
    ctx.accounts.config.claim_opens_at = new_claim_opens_at;
    msg!("Claim opens at {}", new_claim_opens_at);
    Ok(())
}

// ──────────────────────────────────────────────────────────
//  UpdateUsdtMint — swap the accepted stablecoin mint
//  (useful for devnet testing or migrating to a new token)
// ──────────────────────────────────────────────────────────
#[derive(Accounts)]
pub struct UpdateUsdtMint<'info> {
    #[account(
        mut,
        seeds = [b"presale_config"],
        bump = config.bump,
        has_one = authority @ PresaleError::Unauthorized,
    )]
    pub config: Account<'info, PresaleConfig>,

    pub authority: Signer<'info>,

    /// The new token mint that will be accepted for USDT purchases
    pub new_mint: Account<'info, Mint>,

    /// vault_auth PDA — owns the treasury ATA (seeds = [b"vault_auth"])
    #[account(seeds = [b"vault_auth"], bump = config.vault_auth_bump)]
    pub vault_auth: SystemAccount<'info>,

    /// New treasury ATA for the new mint, owned by vault_auth PDA
    #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint      = new_mint,
        associated_token::authority = vault_auth,
    )]
    pub new_treasury_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handle_update_usdt_mint(ctx: Context<UpdateUsdtMint>) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let old_mint = config.usdt_mint;
    config.usdt_mint          = ctx.accounts.new_mint.key();
    config.usdt_treasury_ata  = ctx.accounts.new_treasury_ata.key();
    msg!(
        "usdt_mint updated: {} → {}  new_treasury_ata={}",
        old_mint,
        config.usdt_mint,
        config.usdt_treasury_ata,
    );
    Ok(())
}
