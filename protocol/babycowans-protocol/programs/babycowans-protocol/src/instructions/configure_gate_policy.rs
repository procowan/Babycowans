use anchor_lang::prelude::*;

use crate::{
    constants::ACCOUNT_VERSION,
    error::BabycowansError,
    events::GatePolicyConfigured,
    state::{Application, ApplicationAsset, GateCondition, GateConditionType, GatePolicy},
};

#[derive(Accounts)]
pub struct ConfigureGatePolicy<'info> {
    #[account(
        has_one = authority,
    )]
    pub application: Account<'info, Application>,

    #[account(
        constraint = application_asset.application == application.key()
            @ BabycowansError::InvalidApplication
    )]
    pub application_asset: Account<'info, ApplicationAsset>,

    #[account(
        init,
        payer = authority,
        space = GatePolicy::SPACE,
        seeds = [
            b"gate_policy",
            application_asset.key().as_ref(),
        ],
        bump
    )]
    pub gate_policy: Account<'info, GatePolicy>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn configure_gate_policy_handler(
    ctx: Context<ConfigureGatePolicy>,
    conditions: Vec<GateCondition>,
    enabled: bool,
) -> Result<()> {
    require!(!conditions.is_empty(), BabycowansError::EmptyGatePolicy);

    require!(
        conditions.len() <= GatePolicy::MAX_CONDITIONS,
        BabycowansError::TooManyGateConditions
    );

    let mut group_used = [false; GatePolicy::MAX_GROUPS];
    let mut seen_kind = [[false; 3]; GatePolicy::MAX_GROUPS];

    for condition in &conditions {
        let group = usize::from(condition.group);

        require!(
            group < GatePolicy::MAX_GROUPS,
            BabycowansError::InvalidGateConditionGroup
        );

        group_used[group] = true;

        let kind_index = match condition.condition_type {
            GateConditionType::HoldAmount => {
                require!(
                    condition.minimum_amount > 0,
                    BabycowansError::InvalidGateCondition
                );

                require!(
                    condition.mint == ctx.accounts.application_asset.mint,
                    BabycowansError::InvalidAsset
                );

                0usize
            }

            GateConditionType::MembershipTier => {
                require!(
                    condition.minimum_tier > 0,
                    BabycowansError::InvalidGateCondition
                );

                require!(
                    condition.mint == Pubkey::default(),
                    BabycowansError::InvalidGateCondition
                );

                1usize
            }

            GateConditionType::NftOwnership => {
                require!(
                    condition.mint != Pubkey::default(),
                    BabycowansError::InvalidGateCondition
                );

                2usize
            }
        };

        require!(
            !seen_kind[group][kind_index],
            BabycowansError::InvalidGateCondition
        );

        seen_kind[group][kind_index] = true;
    }

    // Group identifiers must be contiguous:
    // group 0, then optionally 1, then optionally 2.
    let mut gap_found = false;

    for used in group_used {
        if !used {
            gap_found = true;
        } else {
            require!(!gap_found, BabycowansError::InvalidGateConditionGroup);
        }
    }

    let clock = Clock::get()?;
    let policy = &mut ctx.accounts.gate_policy;

    policy.version = ACCOUNT_VERSION;
    policy.application = ctx.accounts.application.key();
    policy.application_asset = ctx.accounts.application_asset.key();
    policy.conditions = conditions;
    policy.enabled = enabled;
    policy.created_at = clock.unix_timestamp;
    policy.updated_at = clock.unix_timestamp;
    policy.bump = ctx.bumps.gate_policy;

    let group_count = group_used.iter().filter(|used| **used).count();

    emit!(GatePolicyConfigured {
        application: policy.application,
        application_asset: policy.application_asset,
        condition_count: u8::try_from(policy.conditions.len())
            .map_err(|_| BabycowansError::ArithmeticOverflow)?,
        group_count: u8::try_from(group_count).map_err(|_| BabycowansError::ArithmeticOverflow)?,
        enabled,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
