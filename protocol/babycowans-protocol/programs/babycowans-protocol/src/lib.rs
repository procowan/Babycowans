pub mod canonical_assets;
pub mod canonical_ecosystems;
pub mod constants;
pub mod error;
pub mod events;
pub mod instructions;
pub mod state;

#[cfg(feature = "fuzzing")]
pub mod fuzz_support;

use crate::canonical_ecosystems::CanonicalEcosystem;
use crate::state::GateType;
use crate::state::{ApplicationStatus, AssetDomain, MembershipKind, MembershipStatus, Role};
use crate::state::{AuditAction, AuditCategory, AuditSeverity};
use anchor_lang::prelude::*;

pub use instructions::*;

declare_id!("BSZkHJyqBW19HQ2tTgooKxPc5FEehgm5uxL44Ggxjucp");

#[program]
pub mod babycowans_protocol {
    use super::*;

    pub fn initialize_protocol(ctx: Context<InitializeProtocol>) -> Result<()> {
        initialize_protocol_handler(ctx)
    }

    pub fn register_asset(
        ctx: Context<RegisterAsset>,
        asset_code: [u8; 3],
        domain: AssetDomain,
    ) -> Result<()> {
        register_asset_handler(ctx, asset_code, domain)
    }

    pub fn register_application(
        ctx: Context<RegisterApplication>,
        application_id: u64,
        name: String,
        selected_ecosystem: CanonicalEcosystem,
    ) -> Result<()> {
        register_application_handler(ctx, application_id, name, selected_ecosystem)
    }

    pub fn nominate_application_authority(
        ctx: Context<NominateApplicationAuthority>,
        new_authority: Pubkey,
    ) -> Result<()> {
        nominate_application_authority_handler(ctx, new_authority)
    }

    pub fn accept_application_authority(ctx: Context<AcceptApplicationAuthority>) -> Result<()> {
        accept_application_authority_handler(ctx)
    }
    pub fn update_application_status(
        ctx: Context<UpdateApplicationStatus>,
        new_status: ApplicationStatus,
    ) -> Result<()> {
        update_application_status_handler(ctx, new_status)
    }

    pub fn configure_application_config(
        ctx: Context<ConfigureApplicationConfig>,
        website_uri: String,
        logo_uri: String,
        support_uri: String,
        description: String,
        metadata_uri: String,
    ) -> Result<()> {
        configure_application_config_handler(
            ctx,
            website_uri,
            logo_uri,
            support_uri,
            description,
            metadata_uri,
        )
    }

    pub fn update_application_config(
        ctx: Context<UpdateApplicationConfig>,
        website_uri: String,
        logo_uri: String,
        support_uri: String,
        description: String,
        metadata_uri: String,
    ) -> Result<()> {
        update_application_config_handler(
            ctx,
            website_uri,
            logo_uri,
            support_uri,
            description,
            metadata_uri,
        )
    }

    pub fn configure_application_asset(
        ctx: Context<ConfigureApplicationAsset>,
        payments_enabled: bool,
        gating_enabled: bool,
        rewards_enabled: bool,
    ) -> Result<()> {
        configure_application_asset_handler(ctx, payments_enabled, gating_enabled, rewards_enabled)
    }

    pub fn configure_payment_policy(
        ctx: Context<ConfigurePaymentPolicy>,
        minimum_amount: u64,
        maximum_amount: u64,
        payments_enabled: bool,
        protocol_fee_bps: u16,
        application_fee_bps: u16,
        treasury: Pubkey,
    ) -> Result<()> {
        configure_payment_policy_handler(
            ctx,
            minimum_amount,
            maximum_amount,
            payments_enabled,
            protocol_fee_bps,
            application_fee_bps,
            treasury,
        )
    }

    pub fn update_payment_policy(
        ctx: Context<UpdatePaymentPolicy>,
        minimum_amount: u64,
        maximum_amount: u64,
        payments_enabled: bool,
        protocol_fee_bps: u16,
        application_fee_bps: u16,
        treasury: Pubkey,
    ) -> Result<()> {
        update_payment_policy_handler(
            ctx,
            minimum_amount,
            maximum_amount,
            payments_enabled,
            protocol_fee_bps,
            application_fee_bps,
            treasury,
        )
    }

    pub fn process_payment(ctx: Context<ProcessPayment>, amount: u64) -> Result<()> {
        process_payment_handler(ctx, amount)
    }

    pub fn assign_application_role(ctx: Context<AssignApplicationRole>, role: Role) -> Result<()> {
        assign_application_role_handler(ctx, role)
    }

    pub fn update_application_role(
        ctx: Context<UpdateApplicationRole>,
        role: Role,
        active: bool,
    ) -> Result<()> {
        update_application_role_handler(ctx, role, active)
    }

    pub fn register_membership(
        ctx: Context<RegisterMembership>,
        member: Pubkey,
        tier: u16,
        expires_at: i64,
        renewable: bool,
        auto_extend: bool,
        renewal_duration: i64,
        membership_kind: MembershipKind,
        nft_mint: Pubkey,
    ) -> Result<()> {
        register_membership_handler(
            ctx,
            member,
            tier,
            expires_at,
            renewable,
            auto_extend,
            renewal_duration,
            membership_kind,
            nft_mint,
        )
    }

    pub fn update_membership(
        ctx: Context<UpdateMembership>,
        tier: u16,
        status: MembershipStatus,
        expires_at: i64,
        renewable: bool,
        auto_extend: bool,
        renewal_duration: i64,
    ) -> Result<()> {
        update_membership_handler(
            ctx,
            tier,
            status,
            expires_at,
            renewable,
            auto_extend,
            renewal_duration,
        )
    }

    pub fn renew_membership(
        ctx: Context<RenewMembership>,
        requested_expires_at: i64,
    ) -> Result<()> {
        renew_membership_handler(ctx, requested_expires_at)
    }

    pub fn verify_nft_membership(ctx: Context<VerifyNftMembership>) -> Result<()> {
        verify_nft_membership_handler(ctx)
    }

    pub fn create_reward(
        ctx: Context<CreateReward>,
        beneficiary: Pubkey,
        reward_id: u64,
        asset: Pubkey,
        amount: u64,
        claimable_at: i64,
        expires_at: i64,
        category: u8,
        reason: String,
    ) -> Result<()> {
        create_reward_handler(
            ctx,
            beneficiary,
            reward_id,
            asset,
            amount,
            claimable_at,
            expires_at,
            category,
            reason,
        )
    }

    pub fn claim_reward(ctx: Context<ClaimReward>) -> Result<()> {
        claim_reward_handler(ctx)
    }

    pub fn cancel_reward(ctx: Context<CancelReward>) -> Result<()> {
        cancel_reward_handler(ctx)
    }

    pub fn configure_token_gate(
        ctx: Context<ConfigureTokenGate>,
        gate_type: GateType,
        minimum_amount: u64,
        minimum_tier: u16,
        enabled: bool,
    ) -> Result<()> {
        configure_token_gate_handler(ctx, gate_type, minimum_amount, minimum_tier, enabled)
    }

    pub fn verify_gate_access(ctx: Context<VerifyGateAccess>) -> Result<()> {
        verify_gate_access_handler(ctx)
    }

    pub fn configure_gate_policy(
        ctx: Context<ConfigureGatePolicy>,
        conditions: Vec<crate::state::GateCondition>,
        enabled: bool,
    ) -> Result<()> {
        configure_gate_policy_handler(ctx, conditions, enabled)
    }

    pub fn verify_gate_policy(ctx: Context<VerifyGatePolicy>) -> Result<()> {
        verify_gate_policy_handler(ctx)
    }

    pub fn set_protocol_pause(ctx: Context<SetProtocolPause>, paused: bool) -> Result<()> {
        set_protocol_pause_handler(ctx, paused)
    }

    pub fn nominate_protocol_authority(
        ctx: Context<NominateProtocolAuthority>,
        new_authority: Pubkey,
    ) -> Result<()> {
        nominate_protocol_authority_handler(ctx, new_authority)
    }

    pub fn accept_protocol_authority(ctx: Context<AcceptProtocolAuthority>) -> Result<()> {
        accept_protocol_authority_handler(ctx)
    }

    pub fn record_audit_log(
        ctx: Context<RecordAuditLog>,
        nonce: u64,
        action: AuditAction,
        category: AuditCategory,
        severity: AuditSeverity,
        reference: Pubkey,
        indexed_references: [Pubkey; 3],
        metadata: String,
    ) -> Result<()> {
        record_audit_log_handler(
            ctx,
            nonce,
            action,
            category,
            severity,
            reference,
            indexed_references,
            metadata,
        )
    }
}
