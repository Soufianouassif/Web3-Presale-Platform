use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{PresaleConfig, SolVault};
use crate::error::PresaleError;

// ─────────────────────────────────────────────────────────────────────────────
//  WITHDRAW SOL
//  Drains all available SOL from the sol_vault PDA to the admin wallet.
//  The vault keeps its rent-exempt minimum (≈ 0.001 SOL for 8-byte account).
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct WithdrawSol<'info> {
    #[account(
        seeds = [b"presale_config"],
        bump = config.bump,
        has_one = authority @ PresaleError::Unauthorized,
    )]
    pub config: Account<'info, PresaleConfig>,

    /// SOL vault PDA — program owns this, so we can move lamports directly.
    #[account(
        mut,
        seeds = [b"sol_vault"],
        bump = config.sol_vault_bump,
        constraint = sol_vault.key() == config.treasury @ PresaleError::WrongSolVault,
    )]
    pub sol_vault: Account<'info, SolVault>,

    /// Admin wallet — receives the withdrawn SOL.
    #[account(mut)]
    pub authority: Signer<'info>,
}

/// Withdraw ALL available SOL from the sol_vault to the admin.
///
/// The vault retains its rent-exempt lamport minimum to remain valid on-chain.
/// Call this after the presale ends (or at any time as admin).
pub fn handle_withdraw_sol(ctx: Context<WithdrawSol>) -> Result<()> {
    let vault_info = ctx.accounts.sol_vault.to_account_info();
    let admin_info = ctx.accounts.authority.to_account_info();

    // Compute rent-exempt minimum so the account stays alive
    let rent_min = Rent::get()?.minimum_balance(SolVault::LEN);
    let available = vault_info.lamports();

    require!(available > rent_min, PresaleError::InsufficientFunds);

    let withdraw_amount = available
        .checked_sub(rent_min)
        .ok_or(PresaleError::MathOverflow)?;

    require!(withdraw_amount > 0, PresaleError::ZeroWithdrawAmount);

    // Direct lamport manipulation — safe because our program owns sol_vault
    **vault_info.try_borrow_mut_lamports()? -= withdraw_amount;
    **admin_info.try_borrow_mut_lamports()? += withdraw_amount;

    msg!(
        "WITHDRAW_SOL admin={} amount_lamports={} remaining_in_vault={}",
        ctx.accounts.authority.key(),
        withdraw_amount,
        rent_min
    );
    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
//  WITHDRAW USDT
//  Transfers all USDT from vault_usdt_ata to the admin's USDT ATA.
//  Uses a PDA-signed CPI because vault_usdt_ata is owned by vault_auth PDA.
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct WithdrawUsdt<'info> {
    #[account(
        seeds = [b"presale_config"],
        bump = config.bump,
        has_one = authority @ PresaleError::Unauthorized,
    )]
    pub config: Account<'info, PresaleConfig>,

    /// vault_auth PDA — authority over vault_usdt_ata.
    /// Used as a PDA signer for the token::transfer CPI.
    /// CHECK: only used as a PDA signer — no data read
    #[account(
        seeds = [b"vault_auth"],
        bump = config.vault_auth_bump,
    )]
    pub vault_auth: UncheckedAccount<'info>,

    /// USDT vault ATA — owned by vault_auth PDA. Funds are drained from here.
    #[account(
        mut,
        constraint = vault_usdt_ata.key()  == config.usdt_treasury_ata @ PresaleError::WrongTreasuryAta,
        constraint = vault_usdt_ata.mint   == config.usdt_mint          @ PresaleError::WrongUsdtMint,
    )]
    pub vault_usdt_ata: Account<'info, TokenAccount>,

    /// Admin's personal USDT ATA — receives the withdrawn USDT.
    #[account(
        mut,
        constraint = admin_usdt_ata.owner == authority.key(),
        constraint = admin_usdt_ata.mint  == config.usdt_mint @ PresaleError::WrongUsdtMint,
    )]
    pub admin_usdt_ata: Account<'info, TokenAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

/// Withdraw ALL USDT from the vault_usdt_ata to the admin's ATA.
///
/// The function drains the full balance. Call this after the presale ends
/// (or at any time as admin).
pub fn handle_withdraw_usdt(ctx: Context<WithdrawUsdt>) -> Result<()> {
    let amount = ctx.accounts.vault_usdt_ata.amount;
    require!(amount > 0, PresaleError::InsufficientFunds);

    // Build PDA signer seeds for vault_auth
    let vault_auth_bump = ctx.accounts.config.vault_auth_bump;
    let signer_seeds: &[&[&[u8]]] = &[&[b"vault_auth", &[vault_auth_bump]]];

    // CPI: token::transfer signed by vault_auth PDA
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from:      ctx.accounts.vault_usdt_ata.to_account_info(),
            to:        ctx.accounts.admin_usdt_ata.to_account_info(),
            authority: ctx.accounts.vault_auth.to_account_info(),
        },
        signer_seeds,
    );
    token::transfer(cpi_ctx, amount)?;

    msg!(
        "WITHDRAW_USDT admin={} amount_raw={} (decimals=6)",
        ctx.accounts.authority.key(),
        amount
    );
    Ok(())
}
