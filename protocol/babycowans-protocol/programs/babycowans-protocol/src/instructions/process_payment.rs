use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
};

use crate::{
    constants::{PAYMENT_POLICY_SEED, PROTOCOL_SEED},
    error::BabycowansError,
    events::PaymentProcessed,
    state::{
        Application, ApplicationAsset, ApplicationPaymentPolicy, ApplicationStatus, AssetConfig,
        ProtocolConfig,
    },
};

const BPS_DENOMINATOR: u128 = 10_000;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct PaymentAmounts {
    protocol_fee: u64,
    application_fee: u64,
    net_amount: u64,
}

fn calculate_payment_amounts(
    amount: u64,
    protocol_fee_bps: u16,
    application_fee_bps: u16,
) -> Result<PaymentAmounts> {
    let amount_u128 = u128::from(amount);

    let protocol_fee_u128 = amount_u128
        .checked_mul(u128::from(protocol_fee_bps))
        .ok_or(BabycowansError::ArithmeticOverflow)?
        / BPS_DENOMINATOR;

    let application_fee_u128 = amount_u128
        .checked_mul(u128::from(application_fee_bps))
        .ok_or(BabycowansError::ArithmeticOverflow)?
        / BPS_DENOMINATOR;

    let total_fee_u128 = protocol_fee_u128
        .checked_add(application_fee_u128)
        .ok_or(BabycowansError::ArithmeticOverflow)?;

    let net_amount_u128 = amount_u128
        .checked_sub(total_fee_u128)
        .ok_or(BabycowansError::ArithmeticOverflow)?;

    let protocol_fee =
        u64::try_from(protocol_fee_u128).map_err(|_| BabycowansError::ArithmeticOverflow)?;

    let application_fee =
        u64::try_from(application_fee_u128).map_err(|_| BabycowansError::ArithmeticOverflow)?;

    let net_amount =
        u64::try_from(net_amount_u128).map_err(|_| BabycowansError::ArithmeticOverflow)?;

    let reconstructed = net_amount
        .checked_add(application_fee)
        .and_then(|value| value.checked_add(protocol_fee))
        .ok_or(BabycowansError::ArithmeticOverflow)?;

    require_eq!(reconstructed, amount, BabycowansError::ArithmeticOverflow);

    Ok(PaymentAmounts {
        protocol_fee,
        application_fee,
        net_amount,
    })
}

#[derive(Accounts)]
pub struct ProcessPayment<'info> {
    #[account(
        seeds = [PROTOCOL_SEED],
        bump = protocol_config.bump,
        constraint = !protocol_config.paused
            @ BabycowansError::ProtocolPaused
    )]
    pub protocol_config: Box<Account<'info, ProtocolConfig>>,

    #[account(
        constraint = application.status == ApplicationStatus::Active
            @ BabycowansError::InvalidApplication
    )]
    pub application: Box<Account<'info, Application>>,

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
    pub application_asset: Box<Account<'info, ApplicationAsset>>,

    #[account(
        seeds = [
            PAYMENT_POLICY_SEED,
            application.key().as_ref(),
            application_asset.key().as_ref(),
        ],
        bump = payment_policy.bump,
        constraint = payment_policy.application == application.key()
            @ BabycowansError::InvalidApplication,
        constraint = payment_policy.application_asset
            == application_asset.key()
            @ BabycowansError::InvalidPaymentPolicy,
        constraint = payment_policy.payments_enabled
            @ BabycowansError::PaymentsDisabled
    )]
    pub payment_policy: Box<Account<'info, ApplicationPaymentPolicy>>,

    #[account(
        constraint = asset_config.enabled
            @ BabycowansError::InvalidAsset,
        constraint = asset_config.mint == mint.key()
            @ BabycowansError::InvalidAsset,
        constraint = asset_config.token_program == token_program.key()
            @ BabycowansError::InvalidTokenProgram
    )]
    pub asset_config: Box<Account<'info, AssetConfig>>,

    #[account(
        address = asset_config.mint
            @ BabycowansError::InvalidAsset
    )]
    pub mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        constraint = payer_token_account.owner == payer.key()
            @ BabycowansError::InvalidAuthority,
        constraint = payer_token_account.mint == mint.key()
            @ BabycowansError::InvalidAsset
    )]
    pub payer_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        address = application_asset.payment_destination
            @ BabycowansError::InvalidPaymentDestination,
        constraint = destination_token_account.mint == mint.key()
            @ BabycowansError::InvalidPaymentDestination
    )]
    pub destination_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        address = payment_policy.treasury
            @ BabycowansError::InvalidPaymentDestination,
        constraint = treasury_token_account.mint == mint.key()
            @ BabycowansError::InvalidPaymentDestination
    )]
    pub treasury_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn process_payment_handler(ctx: Context<ProcessPayment>, amount: u64) -> Result<()> {
    require!(amount > 0, BabycowansError::InvalidAmount);

    require!(
        amount >= ctx.accounts.payment_policy.minimum_amount,
        BabycowansError::PaymentBelowMinimum
    );

    require!(
        ctx.accounts.payment_policy.maximum_amount == 0
            || amount <= ctx.accounts.payment_policy.maximum_amount,
        BabycowansError::PaymentAboveMaximum
    );

    let amounts = calculate_payment_amounts(
        amount,
        ctx.accounts.payment_policy.protocol_fee_bps,
        ctx.accounts.payment_policy.application_fee_bps,
    )?;

    let application_destination_amount = amounts
        .net_amount
        .checked_add(amounts.application_fee)
        .ok_or(BabycowansError::ArithmeticOverflow)?;

    if application_destination_amount > 0 {
        let transfer_accounts = TransferChecked {
            from: ctx.accounts.payer_token_account.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.destination_token_account.to_account_info(),
            authority: ctx.accounts.payer.to_account_info(),
        };

        let transfer_context = CpiContext::new(ctx.accounts.token_program.key(), transfer_accounts);

        transfer_checked(
            transfer_context,
            application_destination_amount,
            ctx.accounts.mint.decimals,
        )?;
    }

    if amounts.protocol_fee > 0 {
        let transfer_accounts = TransferChecked {
            from: ctx.accounts.payer_token_account.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.treasury_token_account.to_account_info(),
            authority: ctx.accounts.payer.to_account_info(),
        };

        let transfer_context = CpiContext::new(ctx.accounts.token_program.key(), transfer_accounts);

        transfer_checked(
            transfer_context,
            amounts.protocol_fee,
            ctx.accounts.mint.decimals,
        )?;
    }

    emit!(PaymentProcessed {
        application: ctx.accounts.application.key(),
        payer: ctx.accounts.payer.key(),
        mint: ctx.accounts.mint.key(),
        destination: ctx.accounts.destination_token_account.key(),
        treasury: ctx.accounts.treasury_token_account.key(),
        amount,
        net_amount: amounts.net_amount,
        protocol_fee: amounts.protocol_fee,
        application_fee: amounts.application_fee,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn payment_amounts_preserve_gross_amount() {
        let amounts = calculate_payment_amounts(10_000, 100, 200).unwrap();

        assert_eq!(amounts.protocol_fee, 100);
        assert_eq!(amounts.application_fee, 200);
        assert_eq!(amounts.net_amount, 9_700);

        assert_eq!(
            amounts.net_amount + amounts.application_fee + amounts.protocol_fee,
            10_000
        );
    }

    #[test]
    fn payment_amounts_use_deterministic_floor_rounding() {
        let amounts = calculate_payment_amounts(101, 100, 100).unwrap();

        assert_eq!(amounts.protocol_fee, 1);
        assert_eq!(amounts.application_fee, 1);
        assert_eq!(amounts.net_amount, 99);
    }

    #[test]
    fn payment_amounts_accept_u64_max_without_fees() {
        let amounts = calculate_payment_amounts(u64::MAX, 0, 0).unwrap();

        assert_eq!(amounts.protocol_fee, 0,);

        assert_eq!(amounts.application_fee, 0,);

        assert_eq!(amounts.net_amount, u64::MAX,);

        assert_eq!(
            amounts
                .net_amount
                .checked_add(amounts.application_fee,)
                .and_then(|value| { value.checked_add(amounts.protocol_fee,) },),
            Some(u64::MAX),
        );
    }

    #[test]
    fn payment_amounts_preserve_u64_max_with_full_fee_allocation() {
        let amounts = calculate_payment_amounts(u64::MAX, 5_000, 5_000).unwrap();

        assert_eq!(amounts.protocol_fee, u64::MAX / 2,);

        assert_eq!(amounts.application_fee, u64::MAX / 2,);

        assert_eq!(amounts.net_amount, 1,);

        assert_eq!(
            amounts
                .net_amount
                .checked_add(amounts.application_fee,)
                .and_then(|value| { value.checked_add(amounts.protocol_fee,) },),
            Some(u64::MAX),
        );
    }

    #[test]
    fn payment_amounts_fail_closed_when_fee_allocation_exceeds_amount() {
        let result = calculate_payment_amounts(u64::MAX, 10_000, 1);

        assert!(
            result.is_err(),
            "fee allocation above 100% must fail closed",
        );
    }
}
