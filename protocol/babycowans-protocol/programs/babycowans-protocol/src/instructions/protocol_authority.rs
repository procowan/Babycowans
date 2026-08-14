use anchor_lang::prelude::*;

use crate::{
    error::BabycowansError,
    events::{ProtocolAuthorityNominated, ProtocolAuthorityTransferred},
    state::ProtocolConfig,
};

#[derive(Accounts)]
pub struct NominateProtocolAuthority<'info> {
    #[account(
        mut,
        has_one = authority,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,

    pub authority: Signer<'info>,
}

pub fn nominate_protocol_authority_handler(
    ctx: Context<NominateProtocolAuthority>,
    new_authority: Pubkey,
) -> Result<()> {
    require!(
        new_authority != Pubkey::default(),
        BabycowansError::InvalidAuthority
    );

    let protocol = &mut ctx.accounts.protocol_config;
    protocol.pending_authority = Some(new_authority);

    emit!(ProtocolAuthorityNominated {
        current_authority: protocol.authority,
        pending_authority: new_authority,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct AcceptProtocolAuthority<'info> {
    #[account(mut)]
    pub protocol_config: Account<'info, ProtocolConfig>,

    pub pending_authority: Signer<'info>,
}

pub fn accept_protocol_authority_handler(ctx: Context<AcceptProtocolAuthority>) -> Result<()> {
    let protocol = &mut ctx.accounts.protocol_config;

    require!(
        protocol.pending_authority == Some(ctx.accounts.pending_authority.key()),
        BabycowansError::InvalidAuthority
    );

    let previous_authority = protocol.authority;
    let new_authority = ctx.accounts.pending_authority.key();

    protocol.authority = new_authority;
    protocol.pending_authority = None;

    emit!(ProtocolAuthorityTransferred {
        previous_authority,
        new_authority,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
