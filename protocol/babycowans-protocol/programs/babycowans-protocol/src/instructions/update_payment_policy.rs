use anchor_lang::prelude::*;

use crate::{
    error::BabycowansError,
    events::PaymentPolicyConfigured,
    state::{Application, ApplicationPaymentPolicy, ApplicationStatus},
};

#[derive(Accounts)]
pub struct UpdatePaymentPolicy<'info> {
    #[account(
        has_one = authority,
        constraint = application.status == ApplicationStatus::Active
            @ BabycowansError::InvalidApplication
    )]
    pub application: Account<'info, Application>,

    #[account(
        mut,
        constraint = payment_policy.application == application.key()
            @ BabycowansError::InvalidApplication
    )]
    pub payment_policy: Account<'info, ApplicationPaymentPolicy>,

    pub authority: Signer<'info>,
}

pub fn update_payment_policy_handler(
    ctx: Context<UpdatePaymentPolicy>,
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

    policy.minimum_amount = minimum_amount;
    policy.maximum_amount = maximum_amount;
    policy.payments_enabled = payments_enabled;
    policy.protocol_fee_bps = protocol_fee_bps;
    policy.application_fee_bps = application_fee_bps;
    policy.treasury = treasury;
    policy.updated_at = clock.unix_timestamp;

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
