use anchor_lang::prelude::*;

use crate::{error::BabycowansError, events::ProtocolPauseChanged, state::ProtocolConfig};

#[derive(Accounts)]
pub struct SetProtocolPause<'info> {
    #[account(
        mut,
        has_one = authority,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,

    pub authority: Signer<'info>,
}

pub fn set_protocol_pause_handler(ctx: Context<SetProtocolPause>, paused: bool) -> Result<()> {
    let protocol = &mut ctx.accounts.protocol_config;

    require!(
        protocol.authority == ctx.accounts.authority.key(),
        BabycowansError::InvalidAuthority
    );

    protocol.paused = paused;

    emit!(ProtocolPauseChanged {
        authority: ctx.accounts.authority.key(),
        paused,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
