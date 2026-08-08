use anchor_lang::{prelude::Pubkey, InstructionData, ToAccountMetas};

#[test]
fn configure_payment_policy_instruction_is_constructible() {
    let application = Pubkey::new_unique();
    let application_asset = Pubkey::new_unique();
    let payment_policy = Pubkey::new_unique();
    let authority = Pubkey::new_unique();
    let treasury = Pubkey::new_unique();

    let data = babycowans_protocol::instruction::ConfigurePaymentPolicy {
        minimum_amount: 1,
        maximum_amount: 1_000,
        payments_enabled: true,
        protocol_fee_bps: 100,
        application_fee_bps: 200,
        treasury,
    }
    .data();

    let accounts = babycowans_protocol::accounts::ConfigurePaymentPolicy {
        application,
        application_asset,
        payment_policy,
        authority,
        system_program: anchor_lang::system_program::ID,
    }
    .to_account_metas(None);

    assert!(!data.is_empty());
    assert_eq!(accounts.len(), 5);
    assert!(accounts[2].is_writable);
    assert!(accounts[3].is_signer);
}
