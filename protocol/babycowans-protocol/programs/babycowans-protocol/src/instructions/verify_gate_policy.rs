use anchor_lang::prelude::*;
use anchor_spl::token_interface::TokenAccount;

use crate::{
    error::BabycowansError,
    events::GatePolicyAccessVerified,
    state::{
        Application, ApplicationAsset, ApplicationStatus, GateConditionType, GatePolicy,
        Membership, MembershipStatus,
    },
};

#[derive(Accounts)]
pub struct VerifyGatePolicy<'info> {
    #[account(
        constraint = application.status == ApplicationStatus::Active
            @ BabycowansError::InvalidApplication
    )]
    pub application: Account<'info, Application>,

    #[account(
        constraint = application_asset.application == application.key()
            @ BabycowansError::InvalidApplication,
        constraint = application_asset.gating_enabled
            @ BabycowansError::GatingDisabled
    )]
    pub application_asset: Account<'info, ApplicationAsset>,

    #[account(
        constraint = gate_policy.application == application.key()
            @ BabycowansError::InvalidApplication,
        constraint = gate_policy.application_asset == application_asset.key()
            @ BabycowansError::InvalidGate,
        constraint = gate_policy.enabled
            @ BabycowansError::GateDisabled
    )]
    pub gate_policy: Account<'info, GatePolicy>,

    pub wallet: Signer<'info>,

    pub hold_token_account: Option<InterfaceAccount<'info, TokenAccount>>,

    pub membership: Option<Account<'info, Membership>>,

    pub nft_token_account: Option<InterfaceAccount<'info, TokenAccount>>,
}

pub fn verify_gate_policy_handler(ctx: Context<VerifyGatePolicy>) -> Result<()> {
    let policy = &ctx.accounts.gate_policy;

    require!(
        !policy.conditions.is_empty(),
        BabycowansError::EmptyGatePolicy
    );

    let now = Clock::get()?.unix_timestamp;

    let mut group_present = [false; GatePolicy::MAX_GROUPS];

    let mut group_pass = [true; GatePolicy::MAX_GROUPS];

    for condition in &policy.conditions {
        let group = usize::from(condition.group);

        require!(
            group < GatePolicy::MAX_GROUPS,
            BabycowansError::InvalidGateConditionGroup
        );

        group_present[group] = true;

        let condition_pass = match condition.condition_type {
            GateConditionType::HoldAmount => match &ctx.accounts.hold_token_account {
                Some(account) => {
                    account.owner == ctx.accounts.wallet.key()
                        && account.mint == condition.mint
                        && account.amount >= condition.minimum_amount
                }
                None => false,
            },

            GateConditionType::MembershipTier => match &ctx.accounts.membership {
                Some(membership) => {
                    membership.application == ctx.accounts.application.key()
                        && membership.member == ctx.accounts.wallet.key()
                        && membership.status == MembershipStatus::Active
                        && (membership.expires_at == 0 || membership.expires_at > now)
                        && membership.tier >= condition.minimum_tier
                }
                None => false,
            },

            GateConditionType::NftOwnership => match &ctx.accounts.nft_token_account {
                Some(account) => {
                    account.owner == ctx.accounts.wallet.key()
                        && account.mint == condition.mint
                        && account.amount >= 1
                }
                None => false,
            },
        };

        if !condition_pass {
            group_pass[group] = false;
        }
    }

    let satisfied_group =
        (0..GatePolicy::MAX_GROUPS).find(|group| group_present[*group] && group_pass[*group]);

    let satisfied_group = satisfied_group.ok_or(BabycowansError::GatePolicyNotSatisfied)?;

    emit!(GatePolicyAccessVerified {
        application: ctx.accounts.application.key(),
        application_asset: ctx.accounts.application_asset.key(),
        wallet: ctx.accounts.wallet.key(),
        satisfied_group: u8::try_from(satisfied_group)
            .map_err(|_| BabycowansError::ArithmeticOverflow)?,
        timestamp: now,
    });

    Ok(())
}
