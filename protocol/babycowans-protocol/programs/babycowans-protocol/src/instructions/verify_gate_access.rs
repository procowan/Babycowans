use anchor_lang::prelude::*;
use anchor_spl::token_interface::TokenAccount;

use crate::{
    error::BabycowansError,
    events::GateAccessVerified,
    state::{Application, ApplicationAsset, ApplicationStatus, GateType, TokenGate},
};

#[derive(Accounts)]
pub struct VerifyGateAccess<'info> {
    #[account(
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
        constraint = token_gate.application == application.key()
            @ BabycowansError::InvalidApplication,
        constraint = token_gate.application_asset == application_asset.key()
            @ BabycowansError::InvalidGate,
        constraint = token_gate.enabled
            @ BabycowansError::GateDisabled
    )]
    pub token_gate: Account<'info, TokenGate>,

    pub wallet: Signer<'info>,

    #[account(
        constraint = user_token_account.owner == wallet.key()
            @ BabycowansError::InvalidAuthority,
        constraint = user_token_account.mint == application_asset.mint
            @ BabycowansError::InvalidAsset
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,
}

pub fn verify_gate_access_handler(ctx: Context<VerifyGateAccess>) -> Result<()> {
    let gate = &ctx.accounts.token_gate;

    require!(
        gate.gate_type == GateType::HoldAmount,
        BabycowansError::UnsupportedGateType
    );

    require!(
        ctx.accounts.user_token_account.amount >= gate.minimum_amount,
        BabycowansError::InsufficientTokenBalance
    );

    emit!(GateAccessVerified {
        application: ctx.accounts.application.key(),
        wallet: ctx.accounts.wallet.key(),
        mint: ctx.accounts.user_token_account.mint,
        balance: ctx.accounts.user_token_account.amount,
        minimum_amount: gate.minimum_amount,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
