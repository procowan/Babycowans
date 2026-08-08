use anchor_lang::prelude::*;

use crate::{
    constants::{ACCOUNT_VERSION, PAYMENT_POLICY_SEED},
    error::BabycowansError,
    events::PaymentPolicyConfigured,
    state::{Application, ApplicationAsset, ApplicationPaymentPolicy, ApplicationStatus},
};

#[derive(Accounts)]
pub struct ConfigurePaymentPolicy<'info> {
    #[account(
        has_one = authority,
        constraint = application.status == ApplicationStatus::Active
            @ BabycowansError::InvalidApplication
    )]
    pub application: Account<'info, Application>,

    #[account(
        constraint = application_asset.application == application.key()
            @ BabycowansError::InvalidApplication
    )]
    pub application_asset: Account<'info, ApplicationAsset>,

    #[account(
        init,
        payer = authority,
        space = ApplicationPaymentPolicy::SPACE,
        seeds = [
            PAYMENT_POLICY_SEED,
            application.key().as_ref(),
            application_asset.key().as_ref(),
        ],
        bump
    )]
    pub payment_policy: Account<'info, ApplicationPaymentPolicy>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn configure_payment_policy_handler(
    ctx: Context<ConfigurePaymentPolicy>,
    minimum_amount: u64,
    maximum_amount: u64,
    payments_enabled: bool,
    protocol_fee_bps: u16,
    application_fee_bps: u16,
    treasury: Pubkey,
) -> Result<()> {
    require!(
        maximum_amount == 0 || maximum_amount >= minimum_amount,
        BabycowansError::InvalidPaymentPolicy
    );

    require!(
        protocol_fee_bps <= 10_000
            && application_fee_bps <= 10_000
            && u32::from(protocol_fee_bps) + u32::from(application_fee_bps) <= 10_000,
        BabycowansError::InvalidPaymentPolicy
    );

    require!(
        treasury != Pubkey::default(),
        BabycowansError::InvalidPaymentDestination
    );

    let clock = Clock::get()?;
    let policy = &mut ctx.accounts.payment_policy;

    policy.version = ACCOUNT_VERSION;
    policy.application = ctx.accounts.application.key();
    policy.application_asset = ctx.accounts.application_asset.key();
    policy.minimum_amount = minimum_amount;
    policy.maximum_amount = maximum_amount;
    policy.payments_enabled = payments_enabled;
    policy.protocol_fee_bps = protocol_fee_bps;
    policy.application_fee_bps = application_fee_bps;
    policy.treasury = treasury;
    policy.created_at = clock.unix_timestamp;
    policy.updated_at = clock.unix_timestamp;
    policy.bump = ctx.bumps.payment_policy;

    emit!(PaymentPolicyConfigured {
        application: policy.application,
        application_asset: policy.application_asset,
        payment_policy: policy.key(),
        minimum_amount,
        maximum_amount,
        payments_enabled,
        protocol_fee_bps,
        application_fee_bps,
        treasury,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
