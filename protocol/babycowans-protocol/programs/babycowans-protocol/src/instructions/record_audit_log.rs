use anchor_lang::prelude::*;

use crate::{
    constants::{ACCOUNT_VERSION, AUDIT_EVENT_SCHEMA_VERSION, AUDIT_LOG_SEED},
    error::BabycowansError,
    events::AuditLogRecorded,
    state::{Application, AuditAction, AuditCategory, AuditLog, AuditSeverity},
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
    category: AuditCategory,
    severity: AuditSeverity,
    reference: Pubkey,
    indexed_references: [Pubkey; 3],
    metadata: String,
) -> Result<()> {
    require!(
        reference != Pubkey::default(),
        BabycowansError::InvalidAuditReference
    );

    require!(
        metadata.len() <= AuditLog::MAX_METADATA_LENGTH,
        BabycowansError::AuditMetadataTooLong
    );

    let clock = Clock::get()?;
    let audit_log = &mut ctx.accounts.audit_log;

    audit_log.version = ACCOUNT_VERSION;
    audit_log.event_schema_version = AUDIT_EVENT_SCHEMA_VERSION;
    audit_log.authority = ctx.accounts.authority.key();
    audit_log.application = ctx.accounts.application.key();
    audit_log.action = action;
    audit_log.category = category;
    audit_log.severity = severity;
    audit_log.reference = reference;
    audit_log.indexed_references = indexed_references;
    audit_log.metadata = metadata.clone();
    audit_log.created_at = clock.unix_timestamp;
    audit_log.bump = ctx.bumps.audit_log;

    emit!(AuditLogRecorded {
        audit_log: audit_log.key(),
        event_schema_version: AUDIT_EVENT_SCHEMA_VERSION,
        authority: audit_log.authority,
        application: audit_log.application,
        action,
        category,
        severity,
        reference,
        indexed_references,
        metadata,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
