use anchor_lang::prelude::*;

#[error_code]
pub enum BabycowansError {
    #[msg("The provided authority is invalid.")]
    InvalidAuthority,

    #[msg("The provided PDA is invalid.")]
    InvalidPda,

    #[msg("The account version is invalid.")]
    InvalidVersion,

    #[msg("The protocol is currently paused.")]
    ProtocolPaused,

    #[msg("An arithmetic operation overflowed.")]
    ArithmeticOverflow,
}
