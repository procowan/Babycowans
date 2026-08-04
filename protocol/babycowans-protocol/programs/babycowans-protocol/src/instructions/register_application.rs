use anchor_lang::prelude::*;

use crate::{
    constants::{ACCOUNT_VERSION, PROTOCOL_SEED},
    error::BabycowansError,
    events::ApplicationRegistered,
    state::{Application, ApplicationStatus, ProtocolConfig},
};

pub const APPLICATION_SEED: &[u8] = b"application";

#[derive(Accounts)]
#[instruction(application_id: u64, name: String)]
pub struct RegisterApplication<'info> {
    #[account(
        mut,
        seeds = [PROTOCOL_SEED],
        bump = protocol_config.bump,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,

    #[account(
        init,
        payer = authority,
        space = Application::SPACE,
        seeds = [
            APPLICATION_SEED,
            authority.key().as_ref(),
            &application_id.to_le_bytes()
        ],
        bump
    )]
    pub application: Account<'info, Application>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn register_application_handler(
    ctx: Context<RegisterApplication>,
    application_id: u64,
    name: String,
) -> Result<()> {
    require!(
        name.len() <= Application::MAX_NAME_LENGTH,
        BabycowansError::InvalidApplicationName
    );

    let protocol = &mut ctx.accounts.protocol_config;

    require!(!protocol.paused, BabycowansError::ProtocolPaused);

    let application = &mut ctx.accounts.application;

    application.version = ACCOUNT_VERSION;
    application.application_id = application_id;
    application.authority = ctx.accounts.authority.key();
    application.pending_authority = None;
    application.status = ApplicationStatus::Active;
    application.name = name;
    application.bump = ctx.bumps.application;

    protocol.application_count = protocol
        .application_count
        .checked_add(1)
        .ok_or(BabycowansError::ArithmeticOverflow)?;

    emit!(ApplicationRegistered {
        application: application.key(),
        authority: application.authority,
        application_id: application.application_id,
        name: application.name.clone(),
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
