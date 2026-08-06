use anchor_lang::prelude::*;

use crate::{
    error::BabycowansError,
    events::ApplicationStatusChanged,
    state::{
        Application,
        ApplicationStatus,
    },
};

#[derive(Accounts)]
pub struct UpdateApplicationStatus<'info> {
    #[account(
        mut,
        has_one = authority,
    )]
    pub application: Account<'info, Application>,

    pub authority: Signer<'info>,
}

pub fn update_application_status_handler(
    ctx: Context<UpdateApplicationStatus>,
    new_status: ApplicationStatus,
) -> Result<()> {
    let application = &mut ctx.accounts.application;
    let previous_status = application.status;

    let valid_transition = matches!(
        (previous_status, new_status),
        (
            ApplicationStatus::Active,
            ApplicationStatus::Suspended
        )
            | (
                ApplicationStatus::Active,
                ApplicationStatus::Disabled
            )
            | (
                ApplicationStatus::Suspended,
                ApplicationStatus::Active
            )
            | (
                ApplicationStatus::Suspended,
                ApplicationStatus::Disabled
            )
            | (
                ApplicationStatus::Pending,
                ApplicationStatus::Active
            )
            | (
                ApplicationStatus::Pending,
                ApplicationStatus::Disabled
            )
    );

    require!(
        valid_transition,
        BabycowansError::InvalidApplicationStatusTransition
    );

    application.status = new_status;

    emit!(ApplicationStatusChanged {
        application: application.key(),
        authority: application.authority,
        previous_status,
        new_status,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
