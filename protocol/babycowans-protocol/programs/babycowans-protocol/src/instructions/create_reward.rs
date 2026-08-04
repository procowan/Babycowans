use anchor_lang::prelude::*;

use crate::{
    constants::{ACCOUNT_VERSION, REWARD_SEED},
    error::BabycowansError,
    events::RewardCreated,
    state::{
        Application,
        Reward,
        RewardStatus,
    },
};

#[derive(Accounts)]
#[instruction(beneficiary: Pubkey)]
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
    asset: Pubkey,
    amount: u64,
) -> Result<()> {
    require!(amount > 0, BabycowansError::InvalidAmount);

    let clock = Clock::get()?;
    let reward = &mut ctx.accounts.reward;

    reward.version = ACCOUNT_VERSION;
    reward.application = ctx.accounts.application.key();
    reward.beneficiary = beneficiary;
    reward.asset = asset;
    reward.amount = amount;
    reward.status = RewardStatus::Claimable;
    reward.created_at = clock.unix_timestamp;
    reward.claimed_at = 0;
    reward.bump = ctx.bumps.reward;

    emit!(RewardCreated {
        application: reward.application,
        beneficiary,
        asset,
        amount,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
