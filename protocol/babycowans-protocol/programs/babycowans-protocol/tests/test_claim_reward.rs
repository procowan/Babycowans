use anchor_lang::{
    prelude::Pubkey,
    InstructionData,
    ToAccountMetas,
};

#[test]
fn claim_reward_instruction_is_constructible() {
    let reward = Pubkey::new_unique();
    let beneficiary = Pubkey::new_unique();

    let data =
        babycowans_protocol::instruction::ClaimReward {}.data();

    let accounts =
        babycowans_protocol::accounts::ClaimReward {
            reward,
            beneficiary,
        }
        .to_account_metas(None);

    assert!(!data.is_empty());
    assert_eq!(accounts.len(), 2);
}
