use anchor_lang::prelude::*;

use crate::{
    constants::APPLICATION_CONFIG_SEED,
    error::BabycowansError,
    events::ApplicationConfigUpdated,
    state::{Application, ApplicationConfig, ApplicationStatus},
};

use super::configure_application_config::validate_application_config;

#[derive(Accounts)]
pub struct UpdateApplicationConfig<'info> {
    #[account(
        has_one = authority,
        constraint = application.status == ApplicationStatus::Active
            @ BabycowansError::InvalidApplication
    )]
    pub application: Account<'info, Application>,

    #[account(
        mut,
        seeds = [
            APPLICATION_CONFIG_SEED,
            application.key().as_ref()
        ],
        bump = application_config.bump,
        constraint = application_config.application == application.key()
            @ BabycowansError::InvalidApplication
    )]
    pub application_config: Account<'info, ApplicationConfig>,

    pub authority: Signer<'info>,
}

pub fn update_application_config_handler(
    ctx: Context<UpdateApplicationConfig>,
    website_uri: String,
    logo_uri: String,
    support_uri: String,
    description: String,
    metadata_uri: String,
) -> Result<()> {
    validate_application_config(
        &website_uri,
        &logo_uri,
        &support_uri,
        &description,
        &metadata_uri,
    )?;

    let clock = Clock::get()?;
    let config = &mut ctx.accounts.application_config;

    config.website_uri = website_uri;
    config.logo_uri = logo_uri;
    config.support_uri = support_uri;
    config.description = description;
    config.metadata_uri = metadata_uri;
    config.updated_at = clock.unix_timestamp;

    emit!(ApplicationConfigUpdated {
        application: config.application,
        application_config: config.key(),
        authority: ctx.accounts.authority.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
