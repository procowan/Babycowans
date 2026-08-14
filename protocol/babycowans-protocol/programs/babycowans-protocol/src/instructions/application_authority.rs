use anchor_lang::prelude::*;

use crate::{
    error::BabycowansError,
    events::{ApplicationAuthorityNominated, ApplicationAuthorityTransferred},
    state::Application,
};

#[derive(Accounts)]
pub struct NominateApplicationAuthority<'info> {
    #[account(
        mut,
        has_one = authority,
    )]
    pub application: Account<'info, Application>,

    pub authority: Signer<'info>,
}

pub fn nominate_application_authority_handler(
    ctx: Context<NominateApplicationAuthority>,
    new_authority: Pubkey,
) -> Result<()> {
    require!(
        new_authority != Pubkey::default(),
        BabycowansError::InvalidAuthority
    );

    let application = &mut ctx.accounts.application;
    let current_authority = application.authority;

    application.pending_authority = Some(new_authority);

    emit!(ApplicationAuthorityNominated {
        application: application.key(),
        current_authority,
        pending_authority: new_authority,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct AcceptApplicationAuthority<'info> {
    #[account(mut)]
    pub application: Account<'info, Application>,

    pub authority: Signer<'info>,
}

pub fn accept_application_authority_handler(
    ctx: Context<AcceptApplicationAuthority>,
) -> Result<()> {
    let application = &mut ctx.accounts.application;

    require!(
        application.pending_authority == Some(ctx.accounts.authority.key()),
        BabycowansError::InvalidAuthority
    );

    let previous_authority = application.authority;
    let new_authority = ctx.accounts.authority.key();

    application.authority = new_authority;
    application.pending_authority = None;

    emit!(ApplicationAuthorityTransferred {
        application: application.key(),
        previous_authority,
        new_authority,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
