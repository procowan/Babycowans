use anchor_lang::prelude::*;

use crate::canonical_ecosystems::CanonicalEcosystem;

#[account]
pub struct ProtocolConfig {
    pub version: u16,
    pub authority: Pubkey,
    pub pending_authority: Option<Pubkey>,
    pub paused: bool,
    pub application_count: u64,
    pub asset_count: u16,
    pub bump: u8,
}

impl ProtocolConfig {
    pub const SPACE: usize = 8 +  // Anchor discriminator
        2 +  // version
        32 + // authority
        33 + // pending_authority
        1 +  // paused
        8 +  // application_count
        2 +  // asset_count
        1; // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum AssetDomain {
    ArtificialIntelligenceAndIoT,
    HealthcareAndInsurance,
    IntellectualPropertyAndLuxury,
    TradeAndLogistics,
    EntertainmentAndExperiences,
    ManufacturingAndSupplyChain,
}

impl AssetDomain {
    pub const SPACE: usize = 1;
}

#[account]
pub struct AssetConfig {
    pub version: u16,
    pub mint: Pubkey,
    pub token_program: Pubkey,
    pub asset_code: [u8; 3],
    pub domain: AssetDomain,
    pub decimals: u8,
    pub enabled: bool,
    pub registered_at: i64,
    pub bump: u8,
}

impl AssetConfig {
    pub const SPACE: usize = 8 +                    // Anchor discriminator
        2 +                    // version
        32 +                   // mint
        32 +                   // token_program
        3 +                    // asset_code
        AssetDomain::SPACE +   // domain
        1 +                    // decimals
        1 +                    // enabled
        8 +                    // registered_at
        1; // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum ApplicationStatus {
    Pending,
    Active,
    Suspended,
    Disabled,
}

impl ApplicationStatus {
    pub const SPACE: usize = 1;
}

#[account]
pub struct Application {
    pub version: u16,
    pub application_id: u64,
    pub authority: Pubkey,
    pub pending_authority: Option<Pubkey>,
    pub selected_ecosystem: CanonicalEcosystem,
    pub status: ApplicationStatus,
    pub name: String,
    pub bump: u8,
}

impl Application {
    pub const MAX_NAME_LENGTH: usize = 64;

    pub const SPACE: usize = 8 +                     // discriminator
        2 +                     // version
        8 +                     // application_id
        32 +                    // authority
        33 +                    // pending_authority
        CanonicalEcosystem::SPACE +
        ApplicationStatus::SPACE +
        4 + Self::MAX_NAME_LENGTH +
        1; // bump
}

#[account]
pub struct ApplicationConfig {
    pub version: u16,
    pub application: Pubkey,
    pub website_uri: String,
    pub logo_uri: String,
    pub support_uri: String,
    pub description: String,
    pub metadata_uri: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

impl ApplicationConfig {
    pub const MAX_WEBSITE_URI_LENGTH: usize = 256;
    pub const MAX_LOGO_URI_LENGTH: usize = 256;
    pub const MAX_SUPPORT_URI_LENGTH: usize = 256;
    pub const MAX_DESCRIPTION_LENGTH: usize = 512;
    pub const MAX_METADATA_URI_LENGTH: usize = 256;

    pub const SPACE: usize = 8 + // discriminator
        2 + // version
        32 + // application
        4 + Self::MAX_WEBSITE_URI_LENGTH +
        4 + Self::MAX_LOGO_URI_LENGTH +
        4 + Self::MAX_SUPPORT_URI_LENGTH +
        4 + Self::MAX_DESCRIPTION_LENGTH +
        4 + Self::MAX_METADATA_URI_LENGTH +
        8 + // created_at
        8 + // updated_at
        1; // bump
}

#[account]
pub struct ApplicationAsset {
    pub version: u16,
    pub application: Pubkey,
    pub asset_config: Pubkey,
    pub mint: Pubkey,
    pub token_program: Pubkey,
    pub payment_destination: Pubkey,
    pub payments_enabled: bool,
    pub gating_enabled: bool,
    pub rewards_enabled: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

impl ApplicationAsset {
    pub const SPACE: usize = 8 +  // discriminator
        2 +  // version
        32 + // application
        32 + // asset_config
        32 + // mint
        32 + // token_program
        32 + // payment_destination
        1 +  // payments_enabled
        1 +  // gating_enabled
        1 +  // rewards_enabled
        8 +  // created_at
        8 +  // updated_at
        1; // bump
}

#[account]
pub struct ApplicationPaymentPolicy {
    pub version: u16,
    pub application: Pubkey,
    pub application_asset: Pubkey,
    pub minimum_amount: u64,
    pub maximum_amount: u64,
    pub payments_enabled: bool,
    pub protocol_fee_bps: u16,
    pub application_fee_bps: u16,
    pub treasury: Pubkey,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

impl ApplicationPaymentPolicy {
    pub const SPACE: usize = 8 +  // discriminator
        2 +  // version
        32 + // application
        32 + // application_asset
        8 +  // minimum_amount
        8 +  // maximum_amount
        1 +  // payments_enabled
        2 +  // protocol_fee_bps
        2 +  // application_fee_bps
        32 + // treasury
        8 +  // created_at
        8 +  // updated_at
        1; // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum Role {
    Owner,
    Admin,
    Operator,
    Auditor,
}

impl Role {
    pub const SPACE: usize = 1;

    pub fn can_manage(self) -> bool {
        matches!(self, Self::Owner | Self::Admin)
    }

    pub fn can_operate(self) -> bool {
        matches!(self, Self::Owner | Self::Admin | Self::Operator)
    }

    pub fn can_audit(self) -> bool {
        true
    }
}

#[account]
pub struct ApplicationRole {
    pub version: u16,
    pub application: Pubkey,
    pub member: Pubkey,
    pub role: Role,
    pub active: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

impl ApplicationRole {
    pub const SPACE: usize = 8 +  // discriminator
        2 +  // version
        32 + // application
        32 + // member
        Role::SPACE +
        1 +  // active
        8 +  // created_at
        8 +  // updated_at
        1; // bump

    pub fn can_manage(&self) -> bool {
        self.active && self.role.can_manage()
    }

    pub fn can_operate(&self) -> bool {
        self.active && self.role.can_operate()
    }

    pub fn can_audit(&self) -> bool {
        self.active && self.role.can_audit()
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum MembershipStatus {
    Active,
    Expired,
    Suspended,
}

impl MembershipStatus {
    pub const SPACE: usize = 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum MembershipKind {
    Standard,
    Nft,
}

impl MembershipKind {
    pub const SPACE: usize = 1;
}

#[account]
pub struct Membership {
    pub version: u16,
    pub application: Pubkey,
    pub member: Pubkey,
    pub tier: u16,
    pub status: MembershipStatus,
    pub membership_kind: MembershipKind,
    pub nft_mint: Pubkey,
    pub nft_verified: bool,
    pub expires_at: i64,
    pub renewable: bool,
    pub auto_extend: bool,
    pub renewal_duration: i64,
    pub renewal_count: u32,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

impl Membership {
    pub const SPACE: usize = 8 +                     // discriminator
        2 +                     // version
        32 +                    // application
        32 +                    // member
        2 +                     // tier
        MembershipStatus::SPACE +
        MembershipKind::SPACE +
        32 +                    // nft_mint
        1 +                     // nft_verified
        8 +                     // expires_at
        1 +                     // renewable
        1 +                     // auto_extend
        8 +                     // renewal_duration
        4 +                     // renewal_count
        8 +                     // created_at
        8 +                     // updated_at
        1; // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum RewardStatus {
    Pending,
    Claimable,
    Claimed,
    Cancelled,
}

impl RewardStatus {
    pub const SPACE: usize = 1;
}

#[account]
pub struct Reward {
    pub version: u16,
    pub application: Pubkey,
    pub beneficiary: Pubkey,
    pub reward_id: u64,
    pub asset: Pubkey,
    pub amount: u64,
    pub status: RewardStatus,
    pub created_at: i64,
    pub claimable_at: i64,
    pub expires_at: i64,
    pub claimed_at: i64,
    pub cancelled_at: i64,
    pub category: u8,
    pub reason: String,
    pub bump: u8,
}

impl Reward {
    pub const MAX_REASON_LENGTH: usize = 128;

    pub const SPACE: usize = 8 +                         // discriminator
        2 +                         // version
        32 +                        // application
        32 +                        // beneficiary
        8 +                         // reward_id
        32 +                        // asset
        8 +                         // amount
        RewardStatus::SPACE +
        8 +                         // created_at
        8 +                         // claimable_at
        8 +                         // expires_at
        8 +                         // claimed_at
        8 +                         // cancelled_at
        1 +                         // category
        4 + Self::MAX_REASON_LENGTH + // reason
        1; // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum GateType {
    HoldAmount,
    NFTCollection,
    MembershipTier,
}

impl GateType {
    pub const SPACE: usize = 1;
}

#[account]
pub struct TokenGate {
    pub version: u16,
    pub application: Pubkey,
    pub application_asset: Pubkey,
    pub gate_type: GateType,
    pub minimum_amount: u64,
    pub minimum_tier: u16,
    pub enabled: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

impl TokenGate {
    pub const SPACE: usize = 8 + 2 + 32 + 32 + GateType::SPACE + 8 + 2 + 1 + 8 + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum GateConditionType {
    HoldAmount,
    MembershipTier,
    NftOwnership,
}

impl GateConditionType {
    pub const SPACE: usize = 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub struct GateCondition {
    /// Conditions with the same group execute with AND semantics.
    /// Distinct groups execute with OR semantics.
    pub group: u8,
    pub condition_type: GateConditionType,
    pub mint: Pubkey,
    pub minimum_amount: u64,
    pub minimum_tier: u16,
}

impl GateCondition {
    pub const SPACE: usize = 1 +                         // group
        GateConditionType::SPACE +
        32 +                        // mint
        8 +                         // minimum_amount
        2; // minimum_tier
}

#[account]
pub struct GatePolicy {
    pub version: u16,
    pub application: Pubkey,
    pub application_asset: Pubkey,
    pub conditions: Vec<GateCondition>,
    pub enabled: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

impl GatePolicy {
    pub const MAX_CONDITIONS: usize = 6;
    pub const MAX_GROUPS: usize = 3;

    pub const SPACE: usize = 8 +                         // discriminator
        2 +                         // version
        32 +                        // application
        32 +                        // application_asset
        4 +                         // Vec length prefix
        Self::MAX_CONDITIONS * GateCondition::SPACE +
        1 +                         // enabled
        8 +                         // created_at
        8 +                         // updated_at
        1; // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum AuditAction {
    InitializeProtocol,
    RegisterApplication,
    RegisterAsset,
    ConfigureAsset,
    ProcessPayment,
    RegisterMembership,
    CreateReward,
    ClaimReward,
    AssignRole,
    ConfigureGate,
    PauseProtocol,
    TransferAuthority,
}

impl AuditAction {
    pub const SPACE: usize = 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum AuditCategory {
    Protocol,
    Application,
    Payment,
    Access,
    Membership,
    Reward,
    Security,
}

impl AuditCategory {
    pub const SPACE: usize = 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum AuditSeverity {
    Info,
    Notice,
    Warning,
    Critical,
}

impl AuditSeverity {
    pub const SPACE: usize = 1;
}

#[account]
pub struct AuditLog {
    pub version: u16,
    pub event_schema_version: u16,
    pub authority: Pubkey,
    pub application: Pubkey,
    pub action: AuditAction,
    pub category: AuditCategory,
    pub severity: AuditSeverity,
    pub reference: Pubkey,
    pub indexed_references: [Pubkey; 3],
    pub metadata: String,
    pub created_at: i64,
    pub bump: u8,
}

impl AuditLog {
    pub const MAX_METADATA_LENGTH: usize = 256;

    pub const SPACE: usize = 8
        + 2
        + 2
        + 32
        + 32
        + AuditAction::SPACE
        + AuditCategory::SPACE
        + AuditSeverity::SPACE
        + 32
        + (32 * 3)
        + 4
        + Self::MAX_METADATA_LENGTH
        + 8
        + 1;
}
