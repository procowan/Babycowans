use anchor_lang::{prelude::Pubkey, InstructionData, ToAccountMetas};

use babycowans_protocol::state::{AuditAction, AuditCategory, AuditSeverity};

#[test]
fn record_audit_log_instruction_is_constructible() {
    let application = Pubkey::new_unique();
    let authority = Pubkey::new_unique();
    let nonce = 1u64;

    let (audit_log, _) = Pubkey::find_program_address(
        &[
            b"audit_log",
            application.as_ref(),
            authority.as_ref(),
            &nonce.to_le_bytes(),
        ],
        &babycowans_protocol::ID,
    );

    let reference = Pubkey::new_unique();

    let data = babycowans_protocol::instruction::RecordAuditLog {
        nonce,
        action: AuditAction::RegisterApplication,
        category: AuditCategory::Application,
        severity: AuditSeverity::Info,
        reference,
        indexed_references: [reference, application, authority],
        metadata: r#"{"source":"rust-test","auditEventSchemaVersion":1}"#.to_string(),
    }
    .data();

    let accounts = babycowans_protocol::accounts::RecordAuditLog {
        application,
        audit_log,
        authority,
        system_program: anchor_lang::system_program::ID,
    }
    .to_account_metas(None);

    assert!(!data.is_empty());
    assert_eq!(accounts.len(), 4);
}

#[test]
fn audit_action_enum_is_stable() {
    assert_eq!(AuditAction::InitializeProtocol as u8, 0);
    assert_eq!(AuditAction::RegisterApplication as u8, 1);
    assert_eq!(AuditAction::RegisterAsset as u8, 2);
    assert_eq!(AuditAction::ConfigureAsset as u8, 3);
    assert_eq!(AuditAction::ProcessPayment as u8, 4);
    assert_eq!(AuditAction::RegisterMembership as u8, 5);
    assert_eq!(AuditAction::CreateReward as u8, 6);
    assert_eq!(AuditAction::ClaimReward as u8, 7);
    assert_eq!(AuditAction::AssignRole as u8, 8);
    assert_eq!(AuditAction::ConfigureGate as u8, 9);
    assert_eq!(AuditAction::PauseProtocol as u8, 10);
    assert_eq!(AuditAction::TransferAuthority as u8, 11);
}

#[test]
fn audit_category_enum_is_stable() {
    assert_eq!(AuditCategory::Protocol as u8, 0);
    assert_eq!(AuditCategory::Application as u8, 1);
    assert_eq!(AuditCategory::Payment as u8, 2);
    assert_eq!(AuditCategory::Access as u8, 3);
    assert_eq!(AuditCategory::Membership as u8, 4);
    assert_eq!(AuditCategory::Reward as u8, 5);
    assert_eq!(AuditCategory::Security as u8, 6);
}

#[test]
fn audit_severity_enum_is_stable() {
    assert_eq!(AuditSeverity::Info as u8, 0);
    assert_eq!(AuditSeverity::Notice as u8, 1);
    assert_eq!(AuditSeverity::Warning as u8, 2);
    assert_eq!(AuditSeverity::Critical as u8, 3);
}
