use anchor_lang::{prelude::Pubkey, InstructionData, ToAccountMetas};

use babycowans_protocol::state::ApplicationStatus;

#[test]
fn update_application_status_instruction_is_constructible() {
    let application = Pubkey::new_unique();
    let authority = Pubkey::new_unique();

    let data = babycowans_protocol::instruction::UpdateApplicationStatus {
        new_status: ApplicationStatus::Suspended,
    }
    .data();

    let accounts = babycowans_protocol::accounts::UpdateApplicationStatus {
        application,
        authority,
    }
    .to_account_metas(None);

    assert!(!data.is_empty());
    assert_eq!(accounts.len(), 2);
    assert!(accounts[0].is_writable);
    assert!(accounts[1].is_signer);
}
