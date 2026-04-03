use anchor_lang::prelude::*;

#[error_code]
pub enum PresaleError {
    #[msg("Presale is not active")]
    NotActive,

    #[msg("Presale is paused")]
    Paused,

    #[msg("Presale has not started yet")]
    NotStarted,

    #[msg("Presale has ended")]
    Ended,

    #[msg("Payment amount is below the minimum")]
    BelowMinimum,

    #[msg("Payment amount exceeds the maximum")]
    ExceedsMaximum,

    #[msg("Not enough tokens remaining in this stage")]
    InsufficientStageTokens,

    #[msg("Invalid stage index")]
    InvalidStage,

    #[msg("All stages are sold out")]
    AllStagesSoldOut,

    #[msg("Unauthorized: caller is not the authority")]
    Unauthorized,

    #[msg("SOL price is not set")]
    SolPriceNotSet,

    #[msg("Token amount cannot be zero")]
    ZeroTokens,

    #[msg("Overflow in arithmetic")]
    MathOverflow,

    #[msg("Presale is already ended")]
    AlreadyEnded,

    #[msg("Presale is already active")]
    AlreadyActive,

    #[msg("Invalid time configuration")]
    InvalidTime,

    #[msg("USDT mint does not match configured mint")]
    WrongUsdtMint,

    #[msg("Treasury ATA does not match configured ATA")]
    WrongTreasuryAta,
}
