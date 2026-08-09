use anchor_lang::prelude::*;

use crate::{
    error::BabycowansError,
    events::RewardCancelled,
    state::{Application, Reward, RewardStatus},
};

#[derive(Accounts)]
pub struct CancelReward<'info> {
    #[account(
        has_one = authority,
    )]
    pub application: Account<'info, Application>,

    #[account(
        mut,
        constraint = reward.application == application.key()
            @ BabycowansError::InvalidApplication,
    )]
    pub reward: Account<'info, Reward>,

    pub authority: Signer<'info>,
}

pub fn cancel_reward_handler(ctx: Context<CancelReward>) -> Result<()> {
    let clock = Clock::get()?;
    let now = clock.unix_timestamp;
    let reward = &mut ctx.accounts.reward;

    require!(
        reward.status == RewardStatus::Pending || reward.status == RewardStatus::Claimable,
        BabycowansError::InvalidRewardStatus
    );

    reward.status = RewardStatus::Cancelled;
    reward.cancelled_at = now;

    emit!(RewardCancelled {
        application: reward.application,
        beneficiary: reward.beneficiary,
        reward_id: reward.reward_id,
        asset: reward.asset,
        amount: reward.amount,
        cancelled_at: now,
    });

    Ok(())
}
