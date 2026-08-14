use anchor_lang::{prelude::Pubkey, InstructionData, ToAccountMetas};

#[test]
fn configure_application_asset_instruction_is_constructible() {
    let application = Pubkey::new_unique();
    let asset_config = Pubkey::new_unique();
    let mint = Pubkey::new_unique();
    let payment_destination = Pubkey::new_unique();
    let authority = Pubkey::new_unique();
    let token_program = Pubkey::new_unique();

    let (application_asset, _) = Pubkey::find_program_address(
        &[b"application_asset", application.as_ref(), mint.as_ref()],
        &babycowans_protocol::ID,
    );

    let data = babycowans_protocol::instruction::ConfigureApplicationAsset {
        payments_enabled: true,
        gating_enabled: true,
        rewards_enabled: true,
    }
    .data();

    let accounts = babycowans_protocol::accounts::ConfigureApplicationAsset {
        application,
        asset_config,
        mint,
        application_asset,
        payment_destination,
        authority,
        token_program,
        system_program: anchor_lang::system_program::ID,
    }
    .to_account_metas(None);

    assert!(!data.is_empty());
    assert_eq!(accounts.len(), 8);
}
