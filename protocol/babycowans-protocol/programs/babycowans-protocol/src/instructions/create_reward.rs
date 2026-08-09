use anchor_lang::prelude::*;

use crate::{
    constants::{ACCOUNT_VERSION, REWARD_SEED},
    error::BabycowansError,
    events::RewardCreated,
    state::{Application, Reward, RewardStatus},
};

#[derive(Accounts)]
#[instruction(beneficiary: Pubkey, reward_id: u64)]
pub struct CreateReward<'info> {
    #[account(
        has_one = authority,
    )]
    pub application: Account<'info, Application>,

    #[account(
        init,
        payer = authority,
        space = Reward::SPACE,
        seeds = [
            REWARD_SEED,
            application.key().as_ref(),
            beneficiary.as_ref(),
            &reward_id.to_le_bytes(),
        ],
        bump
    )]
    pub reward: Account<'info, Reward>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn create_reward_handler(
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
    require!(amount > 0, BabycowansError::InvalidAmount);
    require!(
        reason.len() <= Reward::MAX_REASON_LENGTH,
        BabycowansError::RewardReasonTooLong
    );

    let clock = Clock::get()?;
    let now = clock.unix_timestamp;

    require!(claimable_at >= 0, BabycowansError::InvalidRewardSchedule);

    require!(
        expires_at == 0 || expires_at > claimable_at.max(now),
        BabycowansError::InvalidRewardExpiration
    );

    let effective_claimable_at = if claimable_at == 0 { now } else { claimable_at };

    let status = if effective_claimable_at <= now {
        RewardStatus::Claimable
    } else {
        RewardStatus::Pending
    };

    let reward = &mut ctx.accounts.reward;

    reward.version = ACCOUNT_VERSION;
    reward.application = ctx.accounts.application.key();
    reward.beneficiary = beneficiary;
    reward.reward_id = reward_id;
    reward.asset = asset;
    reward.amount = amount;
    reward.status = status;
    reward.created_at = now;
    reward.claimable_at = effective_claimable_at;
    reward.expires_at = expires_at;
    reward.claimed_at = 0;
    reward.cancelled_at = 0;
    reward.category = category;
    reward.reason = reason.clone();
    reward.bump = ctx.bumps.reward;

    emit!(RewardCreated {
        application: reward.application,
        beneficiary,
        reward_id,
        asset,
        amount,
        claimable_at: effective_claimable_at,
        expires_at,
        category,
        reason,
        timestamp: now,
    });

    Ok(())
}
