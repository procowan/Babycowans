use anchor_lang::prelude::*;

use crate::{
    error::BabycowansError,
    events::RewardClaimed,
    state::{Reward, RewardStatus},
};

#[derive(Accounts)]
pub struct ClaimReward<'info> {
    #[account(
        mut,
        constraint = reward.beneficiary == beneficiary.key()
            @ BabycowansError::InvalidAuthority
    )]
    pub reward: Account<'info, Reward>,

    pub beneficiary: Signer<'info>,
}

pub fn claim_reward_handler(ctx: Context<ClaimReward>) -> Result<()> {
    let clock = Clock::get()?;
    let now = clock.unix_timestamp;
    let reward = &mut ctx.accounts.reward;

    require!(
        reward.status != RewardStatus::Claimed,
        BabycowansError::InvalidRewardStatus
    );

    require!(
        reward.status != RewardStatus::Cancelled,
        BabycowansError::InvalidRewardStatus
    );

    require!(
        now >= reward.claimable_at,
        BabycowansError::RewardNotYetClaimable
    );

    require!(
        reward.expires_at == 0 || now < reward.expires_at,
        BabycowansError::RewardExpired
    );

    require!(
        reward.status == RewardStatus::Pending || reward.status == RewardStatus::Claimable,
        BabycowansError::InvalidRewardStatus
    );

    reward.status = RewardStatus::Claimed;
    reward.claimed_at = now;

    emit!(RewardClaimed {
        application: reward.application,
        beneficiary: reward.beneficiary,
        reward_id: reward.reward_id,
        asset: reward.asset,
        amount: reward.amount,
        timestamp: now,
    });

    Ok(())
}
