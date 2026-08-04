use anchor_lang::{
    prelude::Pubkey,
    InstructionData,
    ToAccountMetas,
};

#[test]
fn nominate_application_authority_instruction_is_constructible() {
    let application = Pubkey::new_unique();
    let authority = Pubkey::new_unique();
    let new_authority = Pubkey::new_unique();

    let data =
        babycowans_protocol::instruction::NominateApplicationAuthority {
            new_authority,
        }
        .data();

    let accounts =
        babycowans_protocol::accounts::NominateApplicationAuthority {
            application,
            authority,
        }
        .to_account_metas(None);

    assert!(!data.is_empty());
    assert_eq!(accounts.len(), 2);
}

#[test]
fn accept_application_authority_instruction_is_constructible() {
    let application = Pubkey::new_unique();
    let authority = Pubkey::new_unique();

    let data =
        babycowans_protocol::instruction::AcceptApplicationAuthority {}.data();

    let accounts =
        babycowans_protocol::accounts::AcceptApplicationAuthority {
            application,
            authority,
        }
        .to_account_metas(None);

    assert!(!data.is_empty());
    assert_eq!(accounts.len(), 2);
}
