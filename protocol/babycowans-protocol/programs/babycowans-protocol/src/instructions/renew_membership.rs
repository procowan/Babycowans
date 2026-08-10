use anchor_lang::prelude::*;

use crate::{
    error::BabycowansError,
    events::MembershipRenewed,
    state::{Application, Membership, MembershipStatus},
};

#[derive(Accounts)]
pub struct RenewMembership<'info> {
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

pub fn renew_membership_handler(
    ctx: Context<RenewMembership>,
    requested_expires_at: i64,
) -> Result<()> {
    let clock = Clock::get()?;
    let membership = &mut ctx.accounts.membership;

    require!(
        membership.renewable,
        BabycowansError::MembershipNotRenewable
    );

    require!(
        membership.status != MembershipStatus::Suspended,
        BabycowansError::MembershipSuspended
    );

    let new_expires_at = if requested_expires_at != 0 {
        require!(
            requested_expires_at > clock.unix_timestamp,
            BabycowansError::InvalidExpiration
        );

        requested_expires_at
    } else {
        require!(
            membership.auto_extend,
            BabycowansError::MembershipAutoExtendDisabled
        );

        require!(
            membership.renewal_duration > 0,
            BabycowansError::InvalidMembershipConfiguration
        );

        let base = membership.expires_at.max(clock.unix_timestamp);

        base.checked_add(membership.renewal_duration)
            .ok_or(BabycowansError::InvalidExpiration)?
    };

    membership.expires_at = new_expires_at;
    membership.status = MembershipStatus::Active;
    membership.updated_at = clock.unix_timestamp;
    membership.renewal_count = membership
        .renewal_count
        .checked_add(1)
        .ok_or(BabycowansError::InvalidMembershipConfiguration)?;

    let selected_ecosystem = ctx.accounts.application.selected_ecosystem;

    emit!(MembershipRenewed {
        application: membership.application,
        member: membership.member,
        selected_ecosystem,
        token_address: selected_ecosystem.token_address(),
        tier: membership.tier,
        expires_at: membership.expires_at,
        auto_extend: membership.auto_extend,
        renewal_duration: membership.renewal_duration,
        renewal_count: membership.renewal_count,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
