use anchor_lang::prelude::*;

use crate::{
    error::BabycowansError,
    events::MembershipUpdated,
    state::{Application, Membership, MembershipStatus},
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
    renewable: bool,
    auto_extend: bool,
    renewal_duration: i64,
) -> Result<()> {
    let clock = Clock::get()?;

    require!(
        expires_at == 0 || expires_at > clock.unix_timestamp,
        BabycowansError::InvalidExpiration
    );

    require!(
        !auto_extend || renewable,
        BabycowansError::InvalidMembershipConfiguration
    );

    require!(
        (!renewable && renewal_duration == 0) || (renewable && renewal_duration > 0),
        BabycowansError::InvalidMembershipConfiguration
    );

    let membership = &mut ctx.accounts.membership;

    membership.tier = tier;
    membership.status = status;
    membership.expires_at = expires_at;
    membership.renewable = renewable;
    membership.auto_extend = auto_extend;
    membership.renewal_duration = renewal_duration;
    membership.updated_at = clock.unix_timestamp;

    let selected_ecosystem = ctx.accounts.application.selected_ecosystem;

    emit!(MembershipUpdated {
        application: membership.application,
        member: membership.member,
        selected_ecosystem,
        token_address: selected_ecosystem.token_address(),
        tier,
        status,
        expires_at,
        renewable,
        auto_extend,
        renewal_duration,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
