use anchor_lang::prelude::*;

use crate::{
    constants::{ACCOUNT_VERSION, APPLICATION_ROLE_SEED},
    error::BabycowansError,
    events::{ApplicationRoleAssigned, ApplicationRoleUpdated},
    state::{Application, ApplicationRole, Role},
};

#[derive(Accounts)]
pub struct AssignApplicationRole<'info> {
    #[account(
        has_one = authority,
    )]
    pub application: Account<'info, Application>,

    #[account(
        init,
        payer = authority,
        space = ApplicationRole::SPACE,
        seeds = [
            APPLICATION_ROLE_SEED,
            application.key().as_ref(),
            member.key().as_ref(),
        ],
        bump
    )]
    pub application_role: Account<'info, ApplicationRole>,

    /// CHECK: The member public key is stored only and does not require account data.
    pub member: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn assign_application_role_handler(
    ctx: Context<AssignApplicationRole>,
    role: Role,
) -> Result<()> {
    require!(
        ctx.accounts.member.key() != Pubkey::default(),
        BabycowansError::InvalidRoleMember
    );

    let clock = Clock::get()?;
    let application_role = &mut ctx.accounts.application_role;

    application_role.version = ACCOUNT_VERSION;
    application_role.application = ctx.accounts.application.key();
    application_role.member = ctx.accounts.member.key();
    application_role.role = role;
    application_role.active = true;
    application_role.created_at = clock.unix_timestamp;
    application_role.updated_at = clock.unix_timestamp;
    application_role.bump = ctx.bumps.application_role;

    emit!(ApplicationRoleAssigned {
        application: application_role.application,
        member: application_role.member,
        role: application_role.role,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct UpdateApplicationRole<'info> {
    #[account(
        has_one = authority,
    )]
    pub application: Account<'info, Application>,

    #[account(
        mut,
        seeds = [
            APPLICATION_ROLE_SEED,
            application.key().as_ref(),
            application_role.member.as_ref(),
        ],
        bump = application_role.bump,
        constraint = application_role.application == application.key()
            @ BabycowansError::InvalidApplication
    )]
    pub application_role: Account<'info, ApplicationRole>,

    pub authority: Signer<'info>,
}

pub fn update_application_role_handler(
    ctx: Context<UpdateApplicationRole>,
    role: Role,
    active: bool,
) -> Result<()> {
    let application_role = &mut ctx.accounts.application_role;
    let clock = Clock::get()?;

    application_role.role = role;
    application_role.active = active;
    application_role.updated_at = clock.unix_timestamp;

    emit!(ApplicationRoleUpdated {
        application: application_role.application,
        member: application_role.member,
        role: application_role.role,
        active,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
