use anchor_lang::prelude::*;

use crate::{
    constants::{ACCOUNT_VERSION, MEMBERSHIP_SEED},
    error::BabycowansError,
    events::MembershipRegistered,
    state::{Application, Membership, MembershipKind, MembershipStatus},
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
    renewable: bool,
    auto_extend: bool,
    renewal_duration: i64,
    membership_kind: MembershipKind,
    nft_mint: Pubkey,
) -> Result<()> {
    require!(
        member != Pubkey::default(),
        BabycowansError::InvalidAuthority
    );

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

    match membership_kind {
        MembershipKind::Standard => require!(
            nft_mint == Pubkey::default(),
            BabycowansError::InvalidMembershipConfiguration
        ),
        MembershipKind::Nft => require!(
            nft_mint != Pubkey::default(),
            BabycowansError::InvalidMembershipConfiguration
        ),
    }

    let selected_ecosystem = ctx.accounts.application.selected_ecosystem;
    let token_address = selected_ecosystem.token_address();
    let membership = &mut ctx.accounts.membership;

    membership.version = ACCOUNT_VERSION;
    membership.application = ctx.accounts.application.key();
    membership.member = member;
    membership.tier = tier;
    membership.status = MembershipStatus::Active;
    membership.membership_kind = membership_kind;
    membership.nft_mint = nft_mint;
    membership.nft_verified = membership_kind == MembershipKind::Standard;
    membership.expires_at = expires_at;
    membership.renewable = renewable;
    membership.auto_extend = auto_extend;
    membership.renewal_duration = renewal_duration;
    membership.renewal_count = 0;
    membership.created_at = clock.unix_timestamp;
    membership.updated_at = clock.unix_timestamp;
    membership.bump = ctx.bumps.membership;

    emit!(MembershipRegistered {
        application: membership.application,
        member,
        selected_ecosystem,
        token_address,
        tier,
        expires_at,
        renewable,
        auto_extend,
        renewal_duration,
        membership_kind,
        nft_mint,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
