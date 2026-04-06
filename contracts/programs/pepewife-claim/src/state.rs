use anchor_lang::prelude::*;

/// ─────────────────────────────────────────────
///  CLAIM CONFIG  (one per deployment)
/// ─────────────────────────────────────────────
#[account]
pub struct ClaimConfig {
    /// Admin authority
    pub authority: Pubkey,        // 32
    /// $PWIFE mint address
    pub token_mint: Pubkey,       // 32
    /// Vault ATA that holds the PWIFE supply for claiming
    pub vault_ata: Pubkey,        // 32
    /// The presale program ID (for CPI validation, future use)
    pub presale_program: Pubkey,  // 32

    /// Claim is open
    pub is_open: bool,            // 1
    /// Unix timestamp when claim opens
    pub claim_opens_at: i64,      // 8
    /// TGE unlock percentage (0–100), e.g. 20
    pub tge_percent: u8,          // 1
    /// Vesting duration in months after TGE, e.g. 4
    pub vesting_months: u8,       // 1

    pub bump: u8,                 // 1
    /// Reserved for future extensions (whitelist, NFT gates, etc.)
    pub _reserved: [u8; 64],      // 64
}

impl ClaimConfig {
    pub const LEN: usize = 8
        + 32 + 32 + 32 + 32
        + 1 + 8 + 1 + 1
        + 1
        + 64;
}

/// ─────────────────────────────────────────────
///  CLAIM RECORD  (one PDA per claimer wallet)
/// ─────────────────────────────────────────────
#[account]
pub struct ClaimRecord {
    pub config: Pubkey,           // 32 – which ClaimConfig
    pub wallet: Pubkey,           // 32
    /// Total PWIFE tokens the user is entitled to (whole tokens)
    pub total_tokens: u64,        // 8
    /// TGE tokens already claimed
    pub tge_claimed: u64,         // 8
    /// Monthly vesting tokens already claimed
    pub vesting_claimed: u64,     // 8
    /// Unix timestamp of first claim (TGE moment)
    pub first_claim_at: i64,      // 8
    /// Last time a vesting claim was made
    pub last_vesting_at: i64,     // 8
    /// Months of vesting already claimed
    pub months_claimed: u8,       // 1
    pub bump: u8,                 // 1
    pub _reserved: [u8; 32],      // 32
}

impl ClaimRecord {
    pub const LEN: usize = 8
        + 32 + 32
        + 8 + 8 + 8
        + 8 + 8
        + 1 + 1
        + 32;

    /// How many PWIFE tokens are unlocked at TGE
    pub fn tge_amount(&self, tge_percent: u8) -> u64 {
        self.total_tokens
            .saturating_mul(tge_percent as u64)
            / 100
    }

    /// Remaining tokens subject to vesting
    pub fn vesting_total(&self, tge_percent: u8) -> u64 {
        self.total_tokens.saturating_sub(self.tge_amount(tge_percent))
    }

    /// Tokens unlocked per month
    pub fn monthly_unlock(&self, tge_percent: u8, vesting_months: u8) -> u64 {
        if vesting_months == 0 {
            return self.vesting_total(tge_percent);
        }
        self.vesting_total(tge_percent) / vesting_months as u64
    }

    /// How many months have elapsed since first claim
    pub fn elapsed_months(&self, now: i64) -> u8 {
        if self.first_claim_at == 0 {
            return 0;
        }
        let seconds = now.saturating_sub(self.first_claim_at);
        // 1 month ≈ 30 days (2_592_000 seconds)
        (seconds / 2_592_000) as u8
    }

    /// Vesting tokens available to claim right now
    pub fn claimable_vesting(&self, now: i64, tge_percent: u8, vesting_months: u8) -> u64 {
        let elapsed = self.elapsed_months(now).min(vesting_months);
        let unlocked_months = elapsed.saturating_sub(self.months_claimed);
        if unlocked_months == 0 {
            return 0;
        }
        let per_month = self.monthly_unlock(tge_percent, vesting_months);
        let available = per_month.saturating_mul(unlocked_months as u64);
        // Never exceed remaining vesting balance
        let remaining = self
            .vesting_total(tge_percent)
            .saturating_sub(self.vesting_claimed);
        available.min(remaining)
    }
}
