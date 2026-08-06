use anchor_lang::prelude::*;

use crate::{
    constants::{ACCOUNT_VERSION, MEMBERSHIP_SEED},
    error::BabycowansError,
    events::MembershipRegistered,
    state::{
        Application,
        Membership,
        MembershipStatus,
    },
};

#[derive(Accounts)]
#[instruction(member: Pubkey)]
pub struct RegisterMembership<'info> {
    #[account(
        has_one = authority,
    )]
    pub application: Account<'info, Application>,

    #[account(
        init,
        payer = authority,
        space = Membership::SPACE,
        seeds = [
            MEMBERSHIP_SEED,
            application.key().as_ref(),
            member.as_ref(),
        ],
        bump
    )]
    pub membership: Account<'info, Membership>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn register_membership_handler(
    ctx: Context<RegisterMembership>,
    member: Pubkey,
    tier: u16,
    expires_at: i64,
) -> Result<()> {
    require!(
        member != Pubkey::default(),
        BabycowansError::InvalidAuthority
    );

    let clock = Clock::get()?;
    let selected_ecosystem =
        ctx.accounts.application.selected_ecosystem;
    let token_address = selected_ecosystem.token_address();
    let membership = &mut ctx.accounts.membership;

    membership.version = ACCOUNT_VERSION;
    membership.application = ctx.accounts.application.key();
    membership.member = member;
    membership.tier = tier;
    membership.status = MembershipStatus::Active;
    membership.expires_at = expires_at;
    membership.created_at = clock.unix_timestamp;
    membership.bump = ctx.bumps.membership;

    emit!(MembershipRegistered {
        application: membership.application,
        member,
        selected_ecosystem,
        token_address,
        tier,
        expires_at,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
