use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{ClaimConfig, ClaimRecord};
use crate::error::ClaimError;

/// PWIFE token has 6 decimals
pub const TOKEN_DECIMALS: u64 = 1_000_000;

#[derive(Accounts)]
pub struct ClaimTokens<'info> {
    #[account(
        seeds = [b"claim_config"],
        bump = config.bump,
    )]
    pub config: Account<'info, ClaimConfig>,

    /// Vault PDA ATA holding PWIFE supply
    #[account(
        mut,
        constraint = vault_ata.key() == config.vault_ata @ ClaimError::WrongVault,
        constraint = vault_ata.mint  == config.token_mint @ ClaimError::WrongMint,
    )]
    pub vault_ata: Account<'info, TokenAccount>,

    /// Claimer's PWIFE ATA (must exist before calling)
    #[account(
        mut,
        constraint = claimer_ata.owner == claimer.key(),
        constraint = claimer_ata.mint  == config.token_mint @ ClaimError::WrongMint,
    )]
    pub claimer_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"claim_record", config.key().as_ref(), claimer.key().as_ref()],
        bump = claim_record.bump,
        constraint = claim_record.wallet == claimer.key(),
    )]
    pub claim_record: Account<'info, ClaimRecord>,

    pub claimer: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

/// Claim TGE tokens (20% unlock at claim open)
pub fn handle_claim_tge(ctx: Context<ClaimTokens>) -> Result<()> {
    let config = &ctx.accounts.config;
    let now = Clock::get()?.unix_timestamp;

    require!(config.is_open, ClaimError::NotOpen);
    require!(now >= config.claim_opens_at, ClaimError::ClaimNotStarted);

    let record = &mut ctx.accounts.claim_record;
    require!(record.total_tokens > 0, ClaimError::ZeroAllocation);
    require!(record.tge_claimed == 0, ClaimError::TgeAlreadyClaimed);

    let tge_whole = record.tge_amount(config.tge_percent);
    require!(tge_whole > 0, ClaimError::NothingToClaim);

    // Convert whole tokens → raw (6 decimals)
    let tge_raw = tge_whole
        .checked_mul(TOKEN_DECIMALS)
        .ok_or(ClaimError::MathOverflow)?;

    // Transfer from vault to claimer
    transfer_from_vault(ctx.accounts, tge_raw)?;

    // Update record
    let record = &mut ctx.accounts.claim_record;
    record.tge_claimed    = tge_whole;
    record.first_claim_at = now;

    msg!("TGE claimed: {} whole tokens ({}% of {})", tge_whole, config.tge_percent, record.total_tokens);
    Ok(())
}

/// Claim vesting tokens (monthly unlock after TGE)
pub fn handle_claim_vesting(ctx: Context<ClaimTokens>) -> Result<()> {
    let config = &ctx.accounts.config;
    let now = Clock::get()?.unix_timestamp;

    require!(config.is_open, ClaimError::NotOpen);
    require!(now >= config.claim_opens_at, ClaimError::ClaimNotStarted);

    let record = &mut ctx.accounts.claim_record;
    require!(record.total_tokens > 0, ClaimError::ZeroAllocation);
    // Must have claimed TGE first
    require!(record.tge_claimed > 0, ClaimError::TgeAlreadyClaimed);
    require!(
        record.months_claimed < config.vesting_months,
        ClaimError::VestingComplete
    );

    let claimable = record.claimable_vesting(now, config.tge_percent, config.vesting_months);
    require!(claimable > 0, ClaimError::NoVestingUnlocked);

    let elapsed = record.elapsed_months(now).min(config.vesting_months);
    let new_months = elapsed.saturating_sub(record.months_claimed);

    // Convert whole tokens → raw
    let claimable_raw = claimable
        .checked_mul(TOKEN_DECIMALS)
        .ok_or(ClaimError::MathOverflow)?;

    transfer_from_vault(ctx.accounts, claimable_raw)?;

    let record = &mut ctx.accounts.claim_record;
    record.vesting_claimed  = record.vesting_claimed.saturating_add(claimable);
    record.months_claimed  += new_months;
    record.last_vesting_at  = now;

    msg!(
        "Vesting claimed: {} tokens ({} new months, total months={})",
        claimable, new_months, record.months_claimed
    );
    Ok(())
}

fn transfer_from_vault(
    accounts: &ClaimTokens,
    amount_raw: u64,
) -> Result<()> {
    // Vault ATA is owned by the claim_config PDA – use PDA signer seeds
    let config_key = accounts.config.key();
    let bump = accounts.config.bump;
    let seeds: &[&[u8]] = &[b"claim_config", &[bump]];
    let signer_seeds = &[seeds];

    let cpi_ctx = CpiContext::new_with_signer(
        accounts.token_program.to_account_info(),
        Transfer {
            from:      accounts.vault_ata.to_account_info(),
            to:        accounts.claimer_ata.to_account_info(),
            authority: accounts.config.to_account_info(),
        },
        signer_seeds,
    );
    token::transfer(cpi_ctx, amount_raw)?;
    let _ = config_key; // suppress unused warning
    Ok(())
}
