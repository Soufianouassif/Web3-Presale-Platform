use anchor_lang::prelude::*;

pub mod error;
pub mod state;
pub mod instructions;

use instructions::*;

declare_id!("CLaim1111111111111111111111111111111111111111");

#[program]
pub mod pepewife_claim {
    use super::*;

    // ──────────────────────────────────────────
    //  SETUP
    // ──────────────────────────────────────────

    /// Deploy once. Configure TGE%, vesting months, and when claim opens.
    pub fn initialize(ctx: Context<InitializeClaim>, args: InitClaimArgs) -> Result<()> {
        handle_initialize_claim(ctx, args)
    }

    /// Admin: register one buyer's token entitlement.
    /// Run this for every buyer after the presale ends (batch script).
    pub fn add_claim_record(
        ctx: Context<AddClaimRecord>,
        buyer_wallet: Pubkey,
        total_tokens: u64,
    ) -> Result<()> {
        handle_add_claim_record(ctx, buyer_wallet, total_tokens)
    }

    // ──────────────────────────────────────────
    //  CLAIMING
    // ──────────────────────────────────────────

    /// Buyer: claim 20% TGE unlock (call once, after claim opens)
    pub fn claim_tge(ctx: Context<ClaimTokens>) -> Result<()> {
        handle_claim_tge(ctx)
    }

    /// Buyer: claim unlocked vesting tokens (can call every month for 4 months)
    pub fn claim_vesting(ctx: Context<ClaimTokens>) -> Result<()> {
        handle_claim_vesting(ctx)
    }

    // ──────────────────────────────────────────
    //  ADMIN CONTROLS
    // ──────────────────────────────────────────

    /// Admin: officially open the claim window
    pub fn open_claim(ctx: Context<ClaimAdmin>) -> Result<()> {
        handle_open_claim(ctx)
    }

    /// Admin: emergency close
    pub fn close_claim(ctx: Context<ClaimAdmin>) -> Result<()> {
        handle_close_claim(ctx)
    }

    /// Admin: update claim open time (before it opens)
    pub fn update_claim_time(ctx: Context<ClaimAdmin>, new_time: i64) -> Result<()> {
        handle_update_claim_time(ctx, new_time)
    }
}
