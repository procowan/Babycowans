use anchor_lang::{
    prelude::Pubkey,
    InstructionData,
    ToAccountMetas,
};

#[test]
fn register_application_instruction_is_constructible() {
    let authority = Pubkey::new_unique();
    let protocol_config = Pubkey::new_unique();
    let application_id = 1u64;

    let (application, _) = Pubkey::find_program_address(
        &[
            b"application",
            authority.as_ref(),
            &application_id.to_le_bytes(),
        ],
        &babycowans_protocol::ID,
    );

    let data = babycowans_protocol::instruction::RegisterApplication {
        application_id,
        name: "Example App".to_string(),
    }
    .data();

    let accounts = babycowans_protocol::accounts::RegisterApplication {
        protocol_config,
        application,
        authority,
        system_program: anchor_lang::system_program::ID,
    }
    .to_account_metas(None);

    assert!(!data.is_empty());
    assert_eq!(accounts.len(), 4);
}
