use anchor_lang::{
    prelude::Pubkey,
    InstructionData,
    ToAccountMetas,
};

#[test]
fn initialize_protocol_instruction_is_constructible() {
    let authority = Pubkey::new_unique();

    let (protocol_config, _) =
        Pubkey::find_program_address(&[b"protocol"], &babycowans_protocol::ID);

    let data =
        babycowans_protocol::instruction::InitializeProtocol {}.data();

    let accounts =
        babycowans_protocol::accounts::InitializeProtocol {
            protocol_config,
            authority,
            system_program: anchor_lang::system_program::ID,
        }
        .to_account_metas(None);

    assert!(!data.is_empty());
    assert_eq!(accounts.len(), 3);
}
