use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    transfer_checked,
    Mint,
    TokenAccount,
    TokenInterface,
    TransferChecked,
};

use crate::{
    error::BabycowansError,
    events::PaymentProcessed,
    state::{
        Application,
        ApplicationAsset,
        ApplicationStatus,
        AssetConfig,
    },
};

#[derive(Accounts)]
pub struct ProcessPayment<'info> {
    #[account(
        constraint = application.status == ApplicationStatus::Active
            @ BabycowansError::InvalidApplication
    )]
    pub application: Account<'info, Application>,

    #[account(
        constraint = application_asset.application == application.key()
            @ BabycowansError::InvalidApplication,
        constraint = application_asset.asset_config == asset_config.key()
            @ BabycowansError::InvalidAsset,
        constraint = application_asset.mint == mint.key()
            @ BabycowansError::InvalidAsset,
        constraint = application_asset.payments_enabled
            @ BabycowansError::PaymentsDisabled
    )]
    pub application_asset: Account<'info, ApplicationAsset>,

    #[account(
        constraint = asset_config.enabled
            @ BabycowansError::InvalidAsset,
        constraint = asset_config.mint == mint.key()
            @ BabycowansError::InvalidAsset,
        constraint = asset_config.token_program == token_program.key()
            @ BabycowansError::InvalidTokenProgram
    )]
    pub asset_config: Account<'info, AssetConfig>,

    #[account(
        address = asset_config.mint
            @ BabycowansError::InvalidAsset
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        constraint = payer_token_account.owner == payer.key()
            @ BabycowansError::InvalidAuthority,
        constraint = payer_token_account.mint == mint.key()
            @ BabycowansError::InvalidAsset
    )]
    pub payer_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        address = application_asset.payment_destination
            @ BabycowansError::InvalidPaymentDestination,
        constraint = destination_token_account.mint == mint.key()
            @ BabycowansError::InvalidPaymentDestination
    )]
    pub destination_token_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn process_payment_handler(
    ctx: Context<ProcessPayment>,
    amount: u64,
) -> Result<()> {
    require!(amount > 0, BabycowansError::InvalidAmount);

    let transfer_accounts = TransferChecked {
        from: ctx.accounts.payer_token_account.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.destination_token_account.to_account_info(),
        authority: ctx.accounts.payer.to_account_info(),
    };

    let transfer_context = CpiContext::new(
        ctx.accounts.token_program.key(),
        transfer_accounts,
    );

    transfer_checked(
        transfer_context,
        amount,
        ctx.accounts.mint.decimals,
    )?;

    emit!(PaymentProcessed {
        application: ctx.accounts.application.key(),
        payer: ctx.accounts.payer.key(),
        mint: ctx.accounts.mint.key(),
        destination: ctx.accounts.destination_token_account.key(),
        amount,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
