use anchor_lang::prelude::*;

#[error_code]
pub enum ClaimError {
    #[msg("Claim is not open yet")]
    NotOpen,

    #[msg("No tokens to claim right now")]
    NothingToClaim,

    #[msg("TGE already claimed")]
    TgeAlreadyClaimed,

    #[msg("TGE must be claimed before vesting")]
    TgeNotYetClaimed,

    #[msg("No new vesting months unlocked")]
    NoVestingUnlocked,

    #[msg("All vesting months already claimed")]
    VestingComplete,

    #[msg("Unauthorized: caller is not the authority")]
    Unauthorized,

    #[msg("Claim record has no allocated tokens")]
    ZeroAllocation,

    #[msg("Claim opens in the future")]
    ClaimNotStarted,

    #[msg("Token mint does not match")]
    WrongMint,

    #[msg("Vault ATA does not match configured vault")]
    WrongVault,

    #[msg("Math overflow")]
    MathOverflow,
}
