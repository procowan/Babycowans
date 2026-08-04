use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;

use crate::{
    canonical_assets::is_canonical_mint,
    constants::{ACCOUNT_VERSION, ASSET_SEED, MAX_CANONICAL_ASSETS, PROTOCOL_SEED},
    error::BabycowansError,
    events::AssetRegistered,
    state::{AssetConfig, AssetDomain, ProtocolConfig},
};

#[derive(Accounts)]
pub struct RegisterAsset<'info> {
    #[account(
        mut,
        seeds = [PROTOCOL_SEED],
        bump = protocol_config.bump,
        has_one = authority,
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,

    #[account(
        init,
        payer = authority,
        space = AssetConfig::SPACE,
        seeds = [ASSET_SEED, mint.key().as_ref()],
        bump
    )]
    pub asset_config: Account<'info, AssetConfig>,

    pub mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn register_asset_handler(
    ctx: Context<RegisterAsset>,
    asset_code: [u8; 3],
    domain: AssetDomain,
) -> Result<()> {
    let protocol = &mut ctx.accounts.protocol_config;

    require!(!protocol.paused, BabycowansError::ProtocolPaused);

    require!(
        protocol.asset_count < MAX_CANONICAL_ASSETS,
        BabycowansError::MaximumAssetsReached
    );

    require!(
        is_canonical_mint(&ctx.accounts.mint.key()),
        BabycowansError::UnsupportedMint
    );

    let asset = &mut ctx.accounts.asset_config;

    asset.version = ACCOUNT_VERSION;
    asset.mint = ctx.accounts.mint.key();
    asset.token_program = ctx.accounts.mint.to_account_info().owner.key();
    asset.asset_code = asset_code;
    asset.domain = domain;
    asset.decimals = ctx.accounts.mint.decimals;
    asset.enabled = true;
    asset.registered_at = Clock::get()?.unix_timestamp;
    asset.bump = ctx.bumps.asset_config;

    protocol.asset_count = protocol
        .asset_count
        .checked_add(1)
        .ok_or(BabycowansError::ArithmeticOverflow)?;

    emit!(AssetRegistered {
        mint: asset.mint,
        token_program: asset.token_program,
        asset_code: asset.asset_code,
        domain: asset.domain,
        decimals: asset.decimals,
        timestamp: asset.registered_at,
    });

    Ok(())
}
