use anchor_lang::{prelude::Pubkey, InstructionData, ToAccountMetas};

#[test]
fn update_payment_policy_instruction_is_constructible() {
    let application = Pubkey::new_unique();
    let payment_policy = Pubkey::new_unique();
    let authority = Pubkey::new_unique();
    let treasury = Pubkey::new_unique();

    let data = babycowans_protocol::instruction::UpdatePaymentPolicy {
        minimum_amount: 10,
        maximum_amount: 1_000,
        payments_enabled: true,
        protocol_fee_bps: 100,
        application_fee_bps: 200,
        treasury,
    }
    .data();

    let accounts = babycowans_protocol::accounts::UpdatePaymentPolicy {
        application,
        payment_policy,
        authority,
    }
    .to_account_metas(None);

    assert!(!data.is_empty());
    assert_eq!(accounts.len(), 3);
    assert!(accounts[1].is_writable);
    assert!(accounts[2].is_signer);
}
