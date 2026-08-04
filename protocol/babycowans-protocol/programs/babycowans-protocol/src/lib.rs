pub mod constants;
pub mod canonical_assets;
pub mod error;
pub mod events;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
use crate::state::{AssetDomain, MembershipStatus, Role};

pub use instructions::*;

declare_id!("BSZkHJyqBW19HQ2tTgooKxPc5FEehgm5uxL44Ggxjucp");

#[program]
pub mod babycowans_protocol {
    use super::*;

    pub fn initialize_protocol(
        ctx: Context<InitializeProtocol>,
    ) -> Result<()> {
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
    ) -> Result<()> {
        register_application_handler(ctx, application_id, name)
    }

    pub fn nominate_application_authority(
        ctx: Context<NominateApplicationAuthority>,
        new_authority: Pubkey,
    ) -> Result<()> {
        nominate_application_authority_handler(ctx, new_authority)
    }

    pub fn accept_application_authority(
        ctx: Context<AcceptApplicationAuthority>,
    ) -> Result<()> {
        accept_application_authority_handler(ctx)
    }
    pub fn configure_application_asset(
        ctx: Context<ConfigureApplicationAsset>,
        payments_enabled: bool,
        gating_enabled: bool,
        rewards_enabled: bool,
    ) -> Result<()> {
        configure_application_asset_handler(
            ctx,
            payments_enabled,
            gating_enabled,
            rewards_enabled,
        )
    }

    pub fn process_payment(
        ctx: Context<ProcessPayment>,
        amount: u64,
    ) -> Result<()> {
        process_payment_handler(ctx, amount)
    }

    pub fn assign_application_role(
        ctx: Context<AssignApplicationRole>,
        role: Role,
    ) -> Result<()> {
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
        asset: Pubkey,
        tier: u16,
        expires_at: i64,
    ) -> Result<()> {
        register_membership_handler(
            ctx,
            member,
            asset,
            tier,
            expires_at,
        )
    }

    pub fn update_membership(
        ctx: Context<UpdateMembership>,
        tier: u16,
        status: MembershipStatus,
        expires_at: i64,
    ) -> Result<()> {
        update_membership_handler(
            ctx,
            tier,
            status,
            expires_at,
        )
    }

    pub fn create_reward(
        ctx: Context<CreateReward>,
        beneficiary: Pubkey,
        asset: Pubkey,
        amount: u64,
    ) -> Result<()> {
        create_reward_handler(
            ctx,
            beneficiary,
            asset,
            amount,
        )
    }

    pub fn claim_reward(
        ctx: Context<ClaimReward>,
    ) -> Result<()> {
        claim_reward_handler(ctx)
    }

}
