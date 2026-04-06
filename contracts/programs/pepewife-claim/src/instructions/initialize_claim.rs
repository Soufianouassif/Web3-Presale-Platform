use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;
use crate::state::ClaimConfig;
use crate::error::ClaimError;

#[derive(Accounts)]
pub struct InitializeClaim<'info> {
    #[account(
        init,
        payer = authority,
        space = ClaimConfig::LEN,
        seeds = [b"claim_config"],
        bump,
    )]
    pub config: Account<'info, ClaimConfig>,

    /// ATA that holds the PWIFE supply for distribution
    pub vault_ata: Account<'info, TokenAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitClaimArgs {
    /// $PWIFE token mint
    pub token_mint: Pubkey,
    /// The presale program ID (for reference / future CPI)
    pub presale_program: Pubkey,
    /// When claim opens (Unix timestamp) – must be >= presale end
    pub claim_opens_at: i64,
    /// TGE unlock percent (0-100). e.g. 20
    pub tge_percent: u8,
    /// Vesting duration in months. e.g. 4
    pub vesting_months: u8,
}

pub fn handle_initialize_claim(
    ctx: Context<InitializeClaim>,
    args: InitClaimArgs,
) -> Result<()> {
    require!(args.tge_percent <= 100, ClaimError::NothingToClaim);

    let config = &mut ctx.accounts.config;

    config.authority       = ctx.accounts.authority.key();
    config.token_mint      = args.token_mint;
    config.vault_ata       = ctx.accounts.vault_ata.key();
    config.presale_program = args.presale_program;
    config.is_open         = false;
    config.claim_opens_at  = args.claim_opens_at;
    config.tge_percent     = args.tge_percent;
    config.vesting_months  = args.vesting_months;
    config.bump            = ctx.bumps.config;
    config._reserved       = [0u8; 64];

    msg!(
        "Claim contract initialized. Opens={} TGE={}% Vest={}mo",
        args.claim_opens_at,
        args.tge_percent,
        args.vesting_months
    );
    Ok(())
}
