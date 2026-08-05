use anchor_lang::prelude::*;

#[event]
pub struct ProtocolInitialized {
    pub authority: Pubkey,
    pub version: u16,
    pub timestamp: i64,
}

#[event]
pub struct AssetRegistered {
    pub mint: Pubkey,
    pub token_program: Pubkey,
    pub asset_code: [u8; 3],
    pub domain: crate::state::AssetDomain,
    pub decimals: u8,
    pub timestamp: i64,
}

#[event]
pub struct ApplicationRegistered {
    pub application: Pubkey,
    pub authority: Pubkey,
    pub application_id: u64,
    pub name: String,
    pub timestamp: i64,
}

#[event]
pub struct ApplicationAuthorityNominated {
    pub application: Pubkey,
    pub current_authority: Pubkey,
    pub pending_authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct ApplicationAuthorityTransferred {
    pub application: Pubkey,
    pub previous_authority: Pubkey,
    pub new_authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct ApplicationAssetConfigured {
    pub application: Pubkey,
    pub asset_config: Pubkey,
    pub mint: Pubkey,
    pub payment_destination: Pubkey,
    pub payments_enabled: bool,
    pub gating_enabled: bool,
    pub rewards_enabled: bool,
    pub timestamp: i64,
}

#[event]
pub struct PaymentProcessed {
    pub application: Pubkey,
    pub payer: Pubkey,
    pub mint: Pubkey,
    pub destination: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct ApplicationRoleAssigned {
    pub application: Pubkey,
    pub member: Pubkey,
    pub role: crate::state::Role,
    pub timestamp: i64,
}

#[event]
pub struct ApplicationRoleUpdated {
    pub application: Pubkey,
    pub member: Pubkey,
    pub role: crate::state::Role,
    pub active: bool,
    pub timestamp: i64,
}

#[event]
pub struct MembershipRegistered {
    pub application: Pubkey,
    pub member: Pubkey,
    pub asset: Pubkey,
    pub tier: u16,
    pub expires_at: i64,
    pub timestamp: i64,
}

#[event]
pub struct MembershipUpdated {
    pub application: Pubkey,
    pub member: Pubkey,
    pub asset: Pubkey,
    pub tier: u16,
    pub status: crate::state::MembershipStatus,
    pub expires_at: i64,
    pub timestamp: i64,
}

#[event]
pub struct RewardCreated {
    pub application: Pubkey,
    pub beneficiary: Pubkey,
    pub asset: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct RewardClaimed {
    pub application: Pubkey,
    pub beneficiary: Pubkey,
    pub asset: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct TokenGateConfigured {
    pub application: Pubkey,
    pub application_asset: Pubkey,
    pub gate_type: crate::state::GateType,
    pub minimum_amount: u64,
    pub minimum_tier: u16,
    pub enabled: bool,
    pub timestamp: i64,
}

#[event]
pub struct GateAccessVerified {
    pub application: Pubkey,
    pub wallet: Pubkey,
    pub mint: Pubkey,
    pub balance: u64,
    pub minimum_amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct ProtocolPauseChanged {
    pub authority: Pubkey,
    pub paused: bool,
    pub timestamp: i64,
}

#[event]
pub struct ProtocolAuthorityNominated {
    pub current_authority: Pubkey,
    pub pending_authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct ProtocolAuthorityTransferred {
    pub previous_authority: Pubkey,
    pub new_authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct AuditLogRecorded {
    pub audit_log: Pubkey,
    pub authority: Pubkey,
    pub application: Pubkey,
    pub action: crate::state::AuditAction,
    pub reference: Pubkey,
    pub timestamp: i64,
}
