use anchor_lang::{
    prelude::Pubkey,
    InstructionData,
    ToAccountMetas,
};

#[test]
fn process_payment_instruction_is_constructible() {
    let application = Pubkey::new_unique();
    let application_asset = Pubkey::new_unique();
    let asset_config = Pubkey::new_unique();
    let mint = Pubkey::new_unique();
    let payer = Pubkey::new_unique();
    let payer_token_account = Pubkey::new_unique();
    let destination_token_account = Pubkey::new_unique();
    let token_program = Pubkey::new_unique();

    let data =
        babycowans_protocol::instruction::ProcessPayment {
            amount: 1_000_000,
        }
        .data();

    let accounts =
        babycowans_protocol::accounts::ProcessPayment {
            application,
            application_asset,
            asset_config,
            mint,
            payer,
            payer_token_account,
            destination_token_account,
            token_program,
        }
        .to_account_metas(None);

    assert!(!data.is_empty());
    assert_eq!(accounts.len(), 8);
}
