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

    #[msg("The provided mint is not a canonical Babycowans asset.")]
    UnsupportedMint,

    #[msg("The maximum number of canonical assets has been reached.")]
    MaximumAssetsReached,

    #[msg("The application name is invalid or too long.")]
    InvalidApplicationName,


    #[msg("The application is invalid or inactive.")]
    InvalidApplication,

    #[msg("The asset configuration is invalid or disabled.")]
    InvalidAsset,

    #[msg("The payment destination token account is invalid.")]
    InvalidPaymentDestination,

    #[msg("The token program does not match the registered asset.")]
    InvalidTokenProgram,

    #[msg("Payments are disabled for this application asset.")]
    PaymentsDisabled,

    #[msg("The payment amount must be greater than zero.")]
    InvalidAmount,

    #[msg("The role member public key is invalid.")]
    InvalidRoleMember,

    #[msg("The membership expiration timestamp is invalid.")]
    InvalidExpiration,

    #[msg("The reward status does not allow this operation.")]
    InvalidRewardStatus,

    #[msg("An arithmetic operation overflowed.")]
    ArithmeticOverflow,
}
