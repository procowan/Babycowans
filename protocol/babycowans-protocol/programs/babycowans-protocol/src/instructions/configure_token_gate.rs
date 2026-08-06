use anchor_lang::prelude::*;

use crate::{
    constants::{ACCOUNT_VERSION, TOKEN_GATE_SEED},
    error::BabycowansError,
    events::TokenGateConfigured,
    state::{
        Application,
        ApplicationAsset,
        ApplicationStatus,
        GateType,
        TokenGate,
    },
};

#[derive(Accounts)]
pub struct ConfigureTokenGate<'info> {
    #[account(
        has_one = authority,
        constraint = application.status == ApplicationStatus::Active
            @ BabycowansError::InvalidApplication
    )]
    pub application: Account<'info, Application>,

    #[account(
        constraint = application_asset.application == application.key()
            @ BabycowansError::InvalidApplication,
        constraint = application_asset.gating_enabled
            @ BabycowansError::GatingDisabled
    )]
    pub application_asset: Account<'info, ApplicationAsset>,

    #[account(
        init,
        payer = authority,
        space = TokenGate::SPACE,
        seeds = [
            TOKEN_GATE_SEED,
            application.key().as_ref(),
            application_asset.key().as_ref(),
        ],
        bump
    )]
    pub token_gate: Account<'info, TokenGate>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn configure_token_gate_handler(
    ctx: Context<ConfigureTokenGate>,
    gate_type: GateType,
    minimum_amount: u64,
    minimum_tier: u16,
    enabled: bool,
) -> Result<()> {
    let clock = Clock::get()?;
    let gate = &mut ctx.accounts.token_gate;

    gate.version = ACCOUNT_VERSION;
    gate.application = ctx.accounts.application.key();
    gate.application_asset = ctx.accounts.application_asset.key();
    gate.gate_type = gate_type;
    gate.minimum_amount = minimum_amount;
    gate.minimum_tier = minimum_tier;
    gate.enabled = enabled;
    gate.created_at = clock.unix_timestamp;
    gate.updated_at = clock.unix_timestamp;
    gate.bump = ctx.bumps.token_gate;

    emit!(TokenGateConfigured {
        application: gate.application,
        application_asset: gate.application_asset,
        gate_type,
        minimum_amount,
        minimum_tier,
        enabled,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
