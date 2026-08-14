use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use crate::{
    constants::{ACCOUNT_VERSION, APPLICATION_ASSET_SEED},
    error::BabycowansError,
    events::ApplicationAssetConfigured,
    state::{Application, ApplicationAsset, ApplicationStatus, AssetConfig},
};

#[derive(Accounts)]
pub struct ConfigureApplicationAsset<'info> {
    #[account(
        has_one = authority,
        constraint = application.status == ApplicationStatus::Active
            @ BabycowansError::InvalidApplication
    )]
    pub application: Account<'info, Application>,

    #[account(
        constraint = asset_config.enabled
            @ BabycowansError::InvalidAsset,
        constraint = asset_config.mint == mint.key()
            @ BabycowansError::InvalidAsset,
        constraint = asset_config.mint
            == application.selected_ecosystem.token_address()
            @ BabycowansError::InvalidAsset
    )]
    pub asset_config: Account<'info, AssetConfig>,

    #[account(
        address = asset_config.mint
            @ BabycowansError::InvalidAsset
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = authority,
        space = ApplicationAsset::SPACE,
        seeds = [
            APPLICATION_ASSET_SEED,
            application.key().as_ref(),
            mint.key().as_ref()
        ],
        bump
    )]
    pub application_asset: Account<'info, ApplicationAsset>,

    #[account(
        constraint = payment_destination.mint == mint.key()
            @ BabycowansError::InvalidPaymentDestination,
        constraint = payment_destination.owner == authority.key()
            @ BabycowansError::InvalidPaymentDestination
    )]
    pub payment_destination: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        constraint = token_program.key() == asset_config.token_program
            @ BabycowansError::InvalidTokenProgram
    )]
    pub token_program: Interface<'info, TokenInterface>,

    pub system_program: Program<'info, System>,
}

pub fn configure_application_asset_handler(
    ctx: Context<ConfigureApplicationAsset>,
    payments_enabled: bool,
    gating_enabled: bool,
    rewards_enabled: bool,
) -> Result<()> {
    let clock = Clock::get()?;
    let application_asset = &mut ctx.accounts.application_asset;

    application_asset.version = ACCOUNT_VERSION;
    application_asset.application = ctx.accounts.application.key();
    application_asset.asset_config = ctx.accounts.asset_config.key();
    application_asset.mint = ctx.accounts.mint.key();
    application_asset.token_program = ctx.accounts.token_program.key();
    application_asset.payment_destination = ctx.accounts.payment_destination.key();
    application_asset.payments_enabled = payments_enabled;
    application_asset.gating_enabled = gating_enabled;
    application_asset.rewards_enabled = rewards_enabled;
    application_asset.created_at = clock.unix_timestamp;
    application_asset.updated_at = clock.unix_timestamp;
    application_asset.bump = ctx.bumps.application_asset;

    emit!(ApplicationAssetConfigured {
        application: application_asset.application,
        asset_config: application_asset.asset_config,
        mint: application_asset.mint,
        payment_destination: application_asset.payment_destination,
        payments_enabled,
        gating_enabled,
        rewards_enabled,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
