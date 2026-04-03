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

    /// Deploy once. Sets up all four stages, prices, limits, and timestamps.
    pub fn initialize(ctx: Context<Initialize>, args: InitializeArgs) -> Result<()> {
        handle_initialize(ctx, args)
    }

    // ──────────────────────────────────────────
    //  PURCHASES
    // ──────────────────────────────────────────

    /// Buy tokens with native SOL (min 1 SOL, max 50 SOL)
    pub fn buy_with_sol(ctx: Context<BuyWithSol>, lamports: u64) -> Result<()> {
        handle_buy_with_sol(ctx, lamports)
    }

    /// Buy tokens with USDT-SPL (min 100 USDT, max 10,000 USDT)
    pub fn buy_with_usdt(ctx: Context<BuyWithUsdt>, usdt_raw: u64) -> Result<()> {
        handle_buy_with_usdt(ctx, usdt_raw)
    }

    /// Admin: manually allocate tokens (for ERC20 / TRC20 buyers)
    pub fn manual_allocate(ctx: Context<ManualAllocate>, args: ManualAllocateArgs) -> Result<()> {
        handle_manual_allocate(ctx, args)
    }

    // ──────────────────────────────────────────
    //  ADMIN CONTROLS
    // ──────────────────────────────────────────

    /// Admin: activate presale (must call before buyers can purchase)
    pub fn activate(ctx: Context<AdminOnly>) -> Result<()> {
        handle_activate(ctx)
    }

    /// Admin: pause (no new purchases while paused)
    pub fn pause(ctx: Context<AdminOnly>) -> Result<()> {
        handle_pause(ctx)
    }

    /// Admin: resume after pause
    pub fn resume(ctx: Context<AdminOnly>) -> Result<()> {
        handle_resume(ctx)
    }

    /// Admin: close the presale permanently
    pub fn end_presale(ctx: Context<AdminOnly>) -> Result<()> {
        handle_end_presale(ctx)
    }

    /// Admin: manually move to next stage (in addition to automatic advance)
    pub fn advance_stage(ctx: Context<AdminOnly>) -> Result<()> {
        handle_advance_stage(ctx)
    }

    /// Admin: update SOL/USD price used for token calculation
    /// Call this whenever the SOL price changes significantly.
    pub fn update_sol_price(ctx: Context<UpdateSolPrice>, new_price_usd_e6: u64) -> Result<()> {
        handle_update_sol_price(ctx, new_price_usd_e6)
    }

    /// Admin: set or update the claim open timestamp
    pub fn set_claim_time(ctx: Context<UpdateSolPrice>, new_claim_opens_at: i64) -> Result<()> {
        handle_set_claim_time(ctx, new_claim_opens_at)
    }
}
