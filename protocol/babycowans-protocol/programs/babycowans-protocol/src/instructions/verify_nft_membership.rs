use anchor_lang::prelude::*;
use anchor_spl::token_interface::TokenAccount;

use crate::{
    error::BabycowansError,
    events::NftMembershipVerified,
    state::{Application, Membership, MembershipKind},
};

#[derive(Accounts)]
pub struct VerifyNftMembership<'info> {
    pub application: Account<'info, Application>,

    #[account(
        mut,
        constraint = membership.application == application.key()
            @ BabycowansError::InvalidApplication,
        constraint = membership.member == member.key()
            @ BabycowansError::InvalidAuthority
    )]
    pub membership: Account<'info, Membership>,

    pub member: Signer<'info>,

    #[account(
        constraint = nft_token_account.owner == member.key()
            @ BabycowansError::InvalidNftOwnership,
        constraint = nft_token_account.mint == membership.nft_mint
            @ BabycowansError::InvalidNftMint
    )]
    pub nft_token_account: InterfaceAccount<'info, TokenAccount>,
}

pub fn verify_nft_membership_handler(ctx: Context<VerifyNftMembership>) -> Result<()> {
    let clock = Clock::get()?;
    let membership = &mut ctx.accounts.membership;

    require!(
        membership.membership_kind == MembershipKind::Nft,
        BabycowansError::NotNftMembership
    );

    require!(
        membership.nft_mint != Pubkey::default(),
        BabycowansError::InvalidNftMint
    );

    require!(
        ctx.accounts.nft_token_account.amount >= 1,
        BabycowansError::InvalidNftOwnership
    );

    membership.nft_verified = true;
    membership.updated_at = clock.unix_timestamp;

    let selected_ecosystem = ctx.accounts.application.selected_ecosystem;

    emit!(NftMembershipVerified {
        application: membership.application,
        member: membership.member,
        selected_ecosystem,
        token_address: selected_ecosystem.token_address(),
        nft_mint: membership.nft_mint,
        nft_token_account: ctx.accounts.nft_token_account.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
