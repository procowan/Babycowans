use anchor_lang::prelude::*;

use crate::{
    error::BabycowansError,
    events::MembershipUpdated,
    state::{
        Application,
        Membership,
        MembershipStatus,
    },
};

#[derive(Accounts)]
pub struct UpdateMembership<'info> {
    #[account(
        has_one = authority,
    )]
    pub application: Account<'info, Application>,

    #[account(
        mut,
        constraint = membership.application == application.key()
            @ BabycowansError::InvalidApplication
    )]
    pub membership: Account<'info, Membership>,

    pub authority: Signer<'info>,
}

pub fn update_membership_handler(
    ctx: Context<UpdateMembership>,
    tier: u16,
    status: MembershipStatus,
    expires_at: i64,
) -> Result<()> {
    let clock = Clock::get()?;

    require!(
        expires_at == 0 || expires_at > clock.unix_timestamp,
        BabycowansError::InvalidExpiration
    );

    let membership = &mut ctx.accounts.membership;

    membership.tier = tier;
    membership.status = status;
    membership.expires_at = expires_at;

    emit!(MembershipUpdated {
        application: membership.application,
        member: membership.member,
        asset: membership.asset,
        tier,
        status,
        expires_at,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
