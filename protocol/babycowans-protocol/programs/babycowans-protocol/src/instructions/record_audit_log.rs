use anchor_lang::prelude::*;

use crate::{
    constants::{
        ACCOUNT_VERSION,
        AUDIT_LOG_SEED,
    },
    error::BabycowansError,
    events::AuditLogRecorded,
    state::{
        Application,
        AuditAction,
        AuditLog,
    },
};

#[derive(Accounts)]
#[instruction(nonce: u64)]
pub struct RecordAuditLog<'info> {
    #[account(
        has_one = authority,
    )]
    pub application: Account<'info, Application>,

    #[account(
        init,
        payer = authority,
        space = AuditLog::SPACE,
        seeds = [
            AUDIT_LOG_SEED,
            application.key().as_ref(),
            authority.key().as_ref(),
            &nonce.to_le_bytes(),
        ],
        bump
    )]
    pub audit_log: Account<'info, AuditLog>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn record_audit_log_handler(
    ctx: Context<RecordAuditLog>,
    _nonce: u64,
    action: AuditAction,
    reference: Pubkey,
) -> Result<()> {
    require!(
        reference != Pubkey::default(),
        BabycowansError::InvalidAuditReference
    );

    let clock = Clock::get()?;
    let audit_log = &mut ctx.accounts.audit_log;

    audit_log.version = ACCOUNT_VERSION;
    audit_log.authority = ctx.accounts.authority.key();
    audit_log.application = ctx.accounts.application.key();
    audit_log.action = action;
    audit_log.reference = reference;
    audit_log.created_at = clock.unix_timestamp;
    audit_log.bump = ctx.bumps.audit_log;

    emit!(AuditLogRecorded {
        audit_log: audit_log.key(),
        authority: audit_log.authority,
        application: audit_log.application,
        action,
        reference,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
