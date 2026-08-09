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

    #[msg("The requested application status transition is invalid.")]
    InvalidApplicationStatusTransition,

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

    #[msg("The payment policy configuration is invalid.")]
    InvalidPaymentPolicy,

    #[msg("The payment amount is below the configured minimum.")]
    PaymentBelowMinimum,

    #[msg("The payment amount exceeds the configured maximum.")]
    PaymentAboveMaximum,

    #[msg("The role member public key is invalid.")]
    InvalidRoleMember,

    #[msg("The membership expiration timestamp is invalid.")]
    InvalidExpiration,

    #[msg("The reward status does not allow this operation.")]
    InvalidRewardStatus,

    #[msg("The reward schedule is invalid.")]
    InvalidRewardSchedule,

    #[msg("The reward expiration timestamp is invalid.")]
    InvalidRewardExpiration,

    #[msg("The reward is not claimable yet.")]
    RewardNotYetClaimable,

    #[msg("The reward has expired.")]
    RewardExpired,

    #[msg("The reward reason exceeds the maximum allowed length.")]
    RewardReasonTooLong,

    #[msg("Token gating is disabled for this application asset.")]
    GatingDisabled,

    #[msg("The token gate is invalid.")]
    InvalidGate,

    #[msg("The token gate is disabled.")]
    GateDisabled,

    #[msg("This gate type is not supported by Version 1.")]
    UnsupportedGateType,

    #[msg("The wallet token balance is insufficient.")]
    InsufficientTokenBalance,

    #[msg("The audit reference public key is invalid.")]
    InvalidAuditReference,
    #[msg("The audit metadata exceeds the maximum allowed length.")]
    AuditMetadataTooLong,

    #[msg("An arithmetic operation overflowed.")]
    ArithmeticOverflow,
}
