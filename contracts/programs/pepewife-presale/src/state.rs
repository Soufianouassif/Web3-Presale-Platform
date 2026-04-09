use anchor_lang::prelude::*;

pub const MAX_STAGES: usize = 4;

// ─────────────────────────────────────────────
//  PAYMENT FLAGS  (bit-field stored in BuyerRecord)
// ─────────────────────────────────────────────
pub const FLAG_SOL:    u8 = 0b001; // buyer paid with SOL
pub const FLAG_USDT:   u8 = 0b010; // buyer paid with USDT-SPL
pub const FLAG_MANUAL: u8 = 0b100; // admin manually allocated

// ─────────────────────────────────────────────
//  PRESALE CONFIG  (one per launch, PDA seeds = [b"presale_config"])
// ─────────────────────────────────────────────
#[account]
pub struct PresaleConfig {
    /// Admin / upgrade authority
    pub authority: Pubkey,         // 32

    /// SOL vault PDA (seeds = [b"sol_vault"]) — receives native SOL from buyers
    pub treasury: Pubkey,          // 32

    /// USDT vault ATA — owned by vault_auth PDA — receives USDT-SPL from buyers
    pub usdt_treasury_ata: Pubkey, // 32

    /// USDT-SPL mint  (mainnet: Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB)
    pub usdt_mint: Pubkey,         // 32

    /// Which stage index is currently active (0-3)
    pub current_stage: u8,         // 1

    /// Presale is accepting payments
    pub is_active: bool,           // 1

    /// Emergency pause – blocks new purchases even while active
    pub is_paused: bool,           // 1

    /// Unix timestamps (seconds)
    pub presale_start: i64,        // 8
    pub presale_end: i64,          // 8

    /// When claim contract is allowed to open
    pub claim_opens_at: i64,       // 8

    /// Running totals
    pub total_tokens_sold: u64,    // 8  (whole tokens, no decimals)
    pub total_sol_raised: u64,     // 8  (lamports)
    pub total_usdt_raised: u64,    // 8  (raw USDT, 6 dec)
    pub total_manual_tokens: u64,  // 8  (tokens added by admin for ERC20/TRC20)

    /// SOL/USD price set by admin (in micro-USD, 6 decimals)
    /// Example: if SOL = $150 → sol_price_usd_e6 = 150_000_000
    pub sol_price_usd_e6: u64,     // 8

    /// Four presale stages
    pub stages: [Stage; MAX_STAGES], // 4 × 24 = 96

    /// Number of unique buyers (incremented on first BuyerRecord creation)
    pub buyers_count: u64,         // 8  (NEW)

    /// PDA bump for sol_vault (seeds = [b"sol_vault"])
    pub sol_vault_bump: u8,        // 1  (NEW)

    /// PDA bump for vault_auth (seeds = [b"vault_auth"]) – owns USDT ATA
    pub vault_auth_bump: u8,       // 1  (NEW)

    pub bump: u8,                  // 1

    /// Reserved for future features (whitelist root, referral config, etc.)
    pub _reserved: [u8; 54],       // 54  (was 64, gave 10 to new fields)
}

impl PresaleConfig {
    /// Account size for `init`
    pub const LEN: usize = 8          // discriminator
        + 32 + 32 + 32 + 32           // pubkeys
        + 1 + 1 + 1                   // flags + stage
        + 8 + 8 + 8                   // timestamps
        + 8 + 8 + 8 + 8               // totals
        + 8                           // sol_price_usd_e6
        + MAX_STAGES * Stage::SIZE    // stages  (96)
        + 8                           // buyers_count (NEW)
        + 1 + 1                       // sol_vault_bump + vault_auth_bump (NEW)
        + 1                           // bump
        + 54;                         // reserved

    /// Compute how many whole tokens a raw-USDT amount buys in `stage`.
    /// Returns 0 on overflow (checked arithmetic — never silently overflows).
    pub fn tokens_for_usdt(&self, stage_idx: usize, usdt_raw: u64) -> u64 {
        let s = &self.stages[stage_idx];
        usdt_raw
            .checked_mul(s.tokens_per_raw_usdt_scaled)
            .unwrap_or(0)
            / Stage::PRICE_SCALE
    }

    /// Compute how many whole tokens a lamport amount buys in `stage`.
    /// Returns 0 on overflow (checked arithmetic — never silently overflows).
    pub fn tokens_for_sol(&self, stage_idx: usize, lamports: u64) -> u64 {
        if self.sol_price_usd_e6 == 0 {
            return 0;
        }
        // lamports → micro-USD equivalent (checked to prevent silent overflow)
        let usdt_e6 = lamports
            .checked_mul(self.sol_price_usd_e6)
            .unwrap_or(0)
            / 1_000_000_000_u64;

        self.tokens_for_usdt(stage_idx, usdt_e6)
    }
}

// ─────────────────────────────────────────────
//  SOL VAULT  (PDA seeds = [b"sol_vault"])
//  Holds SOL from all buy_with_sol purchases.
//  Only the admin can withdraw via withdraw_sol.
// ─────────────────────────────────────────────
#[account]
pub struct SolVault {
    // Intentionally empty — only holds SOL lamports.
    // Discriminator (8 bytes) is the only on-chain data.
}

impl SolVault {
    pub const LEN: usize = 8; // discriminator only
}

/// Per-stage configuration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default)]
pub struct Stage {
    /// tokens per 1 raw-USDT unit × PRICE_SCALE  (avoids fractions)
    /// Phase 1: $0.00000001/tok → 100 tok/rawUSDT → scaled: 100_000
    /// Phase 2: $0.00000002/tok →  50 tok/rawUSDT → scaled:  50_000
    /// Phase 3: $0.00000004/tok →  25 tok/rawUSDT → scaled:  25_000
    /// Phase 4: $0.00000006/tok → ~16.67 → scaled: 16_667
    pub tokens_per_raw_usdt_scaled: u64, // 8
    /// Cap for this stage (whole tokens)  = 5_000_000_000_000
    pub max_tokens: u64,                 // 8
    /// Tokens sold in this stage so far
    pub tokens_sold: u64,                // 8
}

impl Stage {
    pub const SIZE: usize = 8 + 8 + 8; // 24 bytes
    pub const PRICE_SCALE: u64 = 1_000;

    /// Remaining allocatable tokens in this stage
    pub fn remaining(&self) -> u64 {
        self.max_tokens.saturating_sub(self.tokens_sold)
    }

    pub fn is_sold_out(&self) -> bool {
        self.tokens_sold >= self.max_tokens
    }
}

// ─────────────────────────────────────────────
//  BUYER RECORD  (PDA per wallet)
//  Seeds = [b"buyer", presale_config.key(), buyer_wallet.key()]
//
//  Used by the claim script to enumerate all buyers and
//  transfer their tokens after the presale ends.
// ─────────────────────────────────────────────
#[account]
pub struct BuyerRecord {
    /// The PresaleConfig this record belongs to
    pub presale: Pubkey,              // 32

    /// Buyer's wallet (same as PDA seed)
    pub wallet: Pubkey,               // 32

    /// Total whole tokens this buyer is entitled to claim
    pub total_tokens: u64,            // 8

    /// SOL paid (lamports)
    pub sol_paid: u64,                // 8

    /// USDT paid (raw, 6 dec)
    pub usdt_paid: u64,               // 8

    /// True if the LAST operation was a manual admin allocation
    pub last_is_manual: bool,         // 1

    /// Unix timestamp of last purchase
    pub last_purchase_at: i64,        // 8

    /// Stage index (0-3) at the time of FIRST purchase
    pub stage_at_first_purchase: u8,  // 1  (NEW – was _reserved[0])

    /// Bit-field recording which payment types were used:
    ///   bit 0 (FLAG_SOL)    = paid with SOL at least once
    ///   bit 1 (FLAG_USDT)   = paid with USDT at least once
    ///   bit 2 (FLAG_MANUAL) = received manual allocation
    pub payment_flags: u8,            // 1  (NEW – was _reserved[1])

    pub bump: u8,                     // 1

    /// Reserved for future use (buyer index in sequential list, etc.)
    pub _reserved: [u8; 30],          // 30  (was 32, gave 2 to new fields)
}

impl BuyerRecord {
    pub const LEN: usize = 8
        + 32 + 32       // presale + wallet
        + 8 + 8 + 8     // total_tokens + sol_paid + usdt_paid
        + 1 + 8         // last_is_manual + last_purchase_at
        + 1 + 1         // stage_at_first_purchase + payment_flags
        + 1             // bump
        + 30;           // _reserved
    // Total: 138 bytes (same as before — accounts on-chain are unchanged)
}
