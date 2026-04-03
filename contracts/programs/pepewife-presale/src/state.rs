use anchor_lang::prelude::*;

pub const MAX_STAGES: usize = 4;

/// ─────────────────────────────────────────────
///  PRESALE CONFIG  (one per launch)
/// ─────────────────────────────────────────────
#[account]
pub struct PresaleConfig {
    /// Admin / upgrade authority
    pub authority: Pubkey,         // 32
    /// SOL treasury wallet (receives native SOL)
    pub treasury: Pubkey,          // 32
    /// USDT ATA that receives USDT-SPL payments
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

    pub bump: u8,                  // 1
    /// Reserved for future features (whitelist root, referral config, etc.)
    pub _reserved: [u8; 64],       // 64
}

impl PresaleConfig {
    /// Account size for `init`
    pub const LEN: usize = 8          // discriminator
        + 32 + 32 + 32 + 32           // pubkeys
        + 1 + 1 + 1                   // flags + stage
        + 8 + 8 + 8                   // timestamps
        + 8 + 8 + 8 + 8               // totals
        + 8                           // sol_price_usd_e6
        + MAX_STAGES * Stage::SIZE    // stages
        + 1                           // bump
        + 64;                         // reserved

    /// Compute how many whole tokens a raw-USDT amount buys in `stage`
    pub fn tokens_for_usdt(&self, stage_idx: usize, usdt_raw: u64) -> u64 {
        let s = &self.stages[stage_idx];
        // tokens = usdt_raw * tokens_per_raw_usdt_scaled / SCALE
        usdt_raw
            .saturating_mul(s.tokens_per_raw_usdt_scaled)
            / Stage::PRICE_SCALE
    }

    /// Compute how many whole tokens a lamport amount buys in `stage`
    pub fn tokens_for_sol(&self, stage_idx: usize, lamports: u64) -> u64 {
        if self.sol_price_usd_e6 == 0 {
            return 0;
        }
        // lamports → micro-USD equivalent
        // usdt_e6_equivalent = lamports * sol_price_usd_e6 / 10^9
        let usdt_e6 = lamports
            .saturating_mul(self.sol_price_usd_e6)
            / 1_000_000_000_u64;

        self.tokens_for_usdt(stage_idx, usdt_e6)
    }
}

/// Per-stage configuration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default)]
pub struct Stage {
    /// tokens per 1 raw-USDT unit × PRICE_SCALE  (avoids fractions)
    /// Phase 1: 0.00000001 $/tok → 100 tok/rawUSDT → scaled: 100_000
    /// Phase 2: 0.00000002 $/tok →  50 tok/rawUSDT → scaled:  50_000
    /// Phase 3: 0.00000004 $/tok →  25 tok/rawUSDT → scaled:  25_000
    /// Phase 4: 0.00000006 $/tok →  ~16.67 → scaled: 16_667
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

/// ─────────────────────────────────────────────
///  BUYER RECORD  (one PDA per wallet)
/// ─────────────────────────────────────────────
#[account]
pub struct BuyerRecord {
    /// The PresaleConfig this record belongs to
    pub presale: Pubkey,       // 32
    /// Buyer's wallet (same as PDA seed)
    pub wallet: Pubkey,        // 32
    /// Total whole tokens this buyer is entitled to
    pub total_tokens: u64,     // 8
    /// SOL paid (lamports)
    pub sol_paid: u64,         // 8
    /// USDT paid (raw, 6 dec)
    pub usdt_paid: u64,        // 8
    /// True if last purchase was a manual admin allocation
    pub last_is_manual: bool,  // 1
    /// Unix timestamp of last purchase
    pub last_purchase_at: i64, // 8
    pub bump: u8,              // 1
    /// Reserved
    pub _reserved: [u8; 32],   // 32
}

impl BuyerRecord {
    pub const LEN: usize = 8
        + 32 + 32
        + 8 + 8 + 8
        + 1 + 8 + 1
        + 32;
}
