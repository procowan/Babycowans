use anchor_lang::prelude::*;

use crate::{
    constants::{ACCOUNT_VERSION, PROTOCOL_SEED},
    events::ProtocolInitialized,
    state::ProtocolConfig,
};

#[derive(Accounts)]
pub struct InitializeProtocol<'info> {
    #[account(
        init,
        payer = authority,
        space = ProtocolConfig::SPACE,
        seeds = [PROTOCOL_SEED],
        bump
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeProtocol>) -> Result<()> {
    let protocol_config = &mut ctx.accounts.protocol_config;
    let clock = Clock::get()?;

    protocol_config.version = ACCOUNT_VERSION;
    protocol_config.authority = ctx.accounts.authority.key();
    protocol_config.pending_authority = None;
    protocol_config.paused = false;
    protocol_config.application_count = 0;
    protocol_config.asset_count = 0;
    protocol_config.bump = ctx.bumps.protocol_config;

    emit!(ProtocolInitialized {
        authority: protocol_config.authority,
        version: protocol_config.version,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
