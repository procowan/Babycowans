use anchor_lang::prelude::*;

use crate::{
    error::BabycowansError,
    events::RewardClaimed,
    state::{
        Reward,
        RewardStatus,
    },
};

#[derive(Accounts)]
pub struct ClaimReward<'info> {
    #[account(
        mut,
        constraint = reward.beneficiary == beneficiary.key()
            @ BabycowansError::InvalidAuthority,
        constraint = reward.status == RewardStatus::Claimable
            @ BabycowansError::InvalidRewardStatus
    )]
    pub reward: Account<'info, Reward>,

    pub beneficiary: Signer<'info>,
}

pub fn claim_reward_handler(
    ctx: Context<ClaimReward>,
) -> Result<()> {
    let clock = Clock::get()?;
    let reward = &mut ctx.accounts.reward;

    reward.status = RewardStatus::Claimed;
    reward.claimed_at = clock.unix_timestamp;

    emit!(RewardClaimed {
        application: reward.application,
        beneficiary: reward.beneficiary,
        asset: reward.asset,
        amount: reward.amount,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
