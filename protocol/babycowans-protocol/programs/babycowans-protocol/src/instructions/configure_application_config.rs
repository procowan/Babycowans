use anchor_lang::prelude::*;

use crate::{
    constants::{ACCOUNT_VERSION, APPLICATION_CONFIG_SEED},
    error::BabycowansError,
    events::ApplicationConfigConfigured,
    state::{Application, ApplicationConfig, ApplicationStatus},
};

#[derive(Accounts)]
pub struct ConfigureApplicationConfig<'info> {
    #[account(
        has_one = authority,
        constraint = application.status == ApplicationStatus::Active
            @ BabycowansError::InvalidApplication
    )]
    pub application: Account<'info, Application>,

    #[account(
        init,
        payer = authority,
        space = ApplicationConfig::SPACE,
        seeds = [
            APPLICATION_CONFIG_SEED,
            application.key().as_ref()
        ],
        bump
    )]
    pub application_config: Account<'info, ApplicationConfig>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn configure_application_config_handler(
    ctx: Context<ConfigureApplicationConfig>,
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

    config.version = ACCOUNT_VERSION;
    config.application = ctx.accounts.application.key();
    config.website_uri = website_uri;
    config.logo_uri = logo_uri;
    config.support_uri = support_uri;
    config.description = description;
    config.metadata_uri = metadata_uri;
    config.created_at = clock.unix_timestamp;
    config.updated_at = clock.unix_timestamp;
    config.bump = ctx.bumps.application_config;

    emit!(ApplicationConfigConfigured {
        application: config.application,
        application_config: config.key(),
        authority: ctx.accounts.authority.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

pub(crate) fn validate_application_config(
    website_uri: &str,
    logo_uri: &str,
    support_uri: &str,
    description: &str,
    metadata_uri: &str,
) -> Result<()> {
    require!(
        website_uri.len() <= ApplicationConfig::MAX_WEBSITE_URI_LENGTH
            && logo_uri.len() <= ApplicationConfig::MAX_LOGO_URI_LENGTH
            && support_uri.len() <= ApplicationConfig::MAX_SUPPORT_URI_LENGTH
            && description.len() <= ApplicationConfig::MAX_DESCRIPTION_LENGTH
            && metadata_uri.len() <= ApplicationConfig::MAX_METADATA_URI_LENGTH,
        BabycowansError::InvalidApplicationConfig
    );

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn repeated(length: usize) -> String {
        "x".repeat(length)
    }

    #[test]
    fn application_config_accepts_exact_maximum_lengths() {
        let result = validate_application_config(
            &repeated(ApplicationConfig::MAX_WEBSITE_URI_LENGTH),
            &repeated(ApplicationConfig::MAX_LOGO_URI_LENGTH),
            &repeated(ApplicationConfig::MAX_SUPPORT_URI_LENGTH),
            &repeated(ApplicationConfig::MAX_DESCRIPTION_LENGTH),
            &repeated(ApplicationConfig::MAX_METADATA_URI_LENGTH),
        );

        assert!(result.is_ok());
    }

    #[test]
    fn application_config_rejects_each_field_one_above_maximum() {
        let valid_website = repeated(ApplicationConfig::MAX_WEBSITE_URI_LENGTH);
        let valid_logo = repeated(ApplicationConfig::MAX_LOGO_URI_LENGTH);
        let valid_support = repeated(ApplicationConfig::MAX_SUPPORT_URI_LENGTH);
        let valid_description = repeated(ApplicationConfig::MAX_DESCRIPTION_LENGTH);
        let valid_metadata = repeated(ApplicationConfig::MAX_METADATA_URI_LENGTH);

        let cases = [
            (
                repeated(ApplicationConfig::MAX_WEBSITE_URI_LENGTH + 1),
                valid_logo.clone(),
                valid_support.clone(),
                valid_description.clone(),
                valid_metadata.clone(),
            ),
            (
                valid_website.clone(),
                repeated(ApplicationConfig::MAX_LOGO_URI_LENGTH + 1),
                valid_support.clone(),
                valid_description.clone(),
                valid_metadata.clone(),
            ),
            (
                valid_website.clone(),
                valid_logo.clone(),
                repeated(ApplicationConfig::MAX_SUPPORT_URI_LENGTH + 1),
                valid_description.clone(),
                valid_metadata.clone(),
            ),
            (
                valid_website.clone(),
                valid_logo.clone(),
                valid_support.clone(),
                repeated(ApplicationConfig::MAX_DESCRIPTION_LENGTH + 1),
                valid_metadata.clone(),
            ),
            (
                valid_website.clone(),
                valid_logo.clone(),
                valid_support.clone(),
                valid_description.clone(),
                repeated(ApplicationConfig::MAX_METADATA_URI_LENGTH + 1),
            ),
        ];

        for (website_uri, logo_uri, support_uri, description, metadata_uri) in cases {
            assert!(validate_application_config(
                &website_uri,
                &logo_uri,
                &support_uri,
                &description,
                &metadata_uri,
            )
            .is_err());
        }
    }
}
