use anchor_lang::prelude::*;

pub mod error;
pub mod state;
pub mod instructions;

use instructions::*;

declare_id!("4KpEeYVW8592GGpcNZLo7CinE1dnV9tJnKYc9JzpQSv7");

#[program]
pub mod pepewife_presale {
    use super::*;

    // ──────────────────────────────────────────
    //  SETUP
    // ──────────────────────────────────────────

    /// Deploy once. Sets up all four stages, prices, limits, timestamps,
    /// and creates the SOL vault PDA + USDT vault ATA.
    pub fn initialize(ctx: Context<Initialize>, args: InitializeArgs) -> Result<()> {
        handle_initialize(ctx, args)
    }

    // ──────────────────────────────────────────
    //  PURCHASES
    // ──────────────────────────────────────────

    /// Buy tokens with native SOL (min 1 SOL, max 50 SOL).
    /// SOL is stored in the sol_vault PDA — NOT in a personal treasury wallet.
    pub fn buy_with_sol(ctx: Context<BuyWithSol>, lamports: u64) -> Result<()> {
        handle_buy_with_sol(ctx, lamports)
    }

    /// Buy tokens with USDT-SPL (min 100 USDT, max 10,000 USDT).
    /// USDT is stored in vault_usdt_ata owned by vault_auth PDA.
    pub fn buy_with_usdt(ctx: Context<BuyWithUsdt>, usdt_raw: u64) -> Result<()> {
        handle_buy_with_usdt(ctx, usdt_raw)
    }

    /// Admin: manually allocate tokens for ERC20 / TRC20 buyers.
    /// Only callable by the authority. Creates or updates a BuyerRecord.
    pub fn manual_allocate(ctx: Context<ManualAllocate>, args: ManualAllocateArgs) -> Result<()> {
        handle_manual_allocate(ctx, args)
    }

    // ──────────────────────────────────────────
    //  WITHDRAWALS  (admin only)
    // ──────────────────────────────────────────

    /// Admin: withdraw all SOL from the sol_vault PDA to admin wallet.
    /// Leaves the rent-exempt minimum in the vault to keep it alive.
    /// Protected: only the `authority` signer can call this.
    pub fn withdraw_sol(ctx: Context<WithdrawSol>) -> Result<()> {
        handle_withdraw_sol(ctx)
    }

    /// Admin: withdraw all USDT from vault_usdt_ata to admin's personal ATA.
    /// Uses PDA-signed CPI (vault_auth signs for the vault's ATA).
    /// Protected: only the `authority` signer can call this.
    pub fn withdraw_usdt(ctx: Context<WithdrawUsdt>) -> Result<()> {
        handle_withdraw_usdt(ctx)
    }

    // ──────────────────────────────────────────
    //  ADMIN CONTROLS
    // ──────────────────────────────────────────

    /// Admin: activate presale (must call before buyers can purchase)
    pub fn activate(ctx: Context<AdminOnly>) -> Result<()> {
        handle_activate(ctx)
    }

    /// Admin: pause — no new purchases while paused
    pub fn pause(ctx: Context<AdminOnly>) -> Result<()> {
        handle_pause(ctx)
    }

    /// Admin: resume after pause
    pub fn resume(ctx: Context<AdminOnly>) -> Result<()> {
        handle_resume(ctx)
    }

    /// Admin: close the presale permanently and stamp end time
    pub fn end_presale(ctx: Context<AdminOnly>) -> Result<()> {
        handle_end_presale(ctx)
    }

    /// Admin: manually move to next stage (in addition to automatic advance on sell-out)
    pub fn advance_stage(ctx: Context<AdminOnly>) -> Result<()> {
        handle_advance_stage(ctx)
    }

    /// Admin: update SOL/USD price used for token calculation.
    /// `new_price_usd_e6` = SOL price × 10^6  (e.g. $180 → 180_000_000)
    pub fn update_sol_price(ctx: Context<UpdateSolPrice>, new_price_usd_e6: u64) -> Result<()> {
        handle_update_sol_price(ctx, new_price_usd_e6)
    }

    /// Admin: set or update the timestamp when the claim contract opens
    pub fn set_claim_time(ctx: Context<UpdateSolPrice>, new_claim_opens_at: i64) -> Result<()> {
        handle_set_claim_time(ctx, new_claim_opens_at)
    }
}
