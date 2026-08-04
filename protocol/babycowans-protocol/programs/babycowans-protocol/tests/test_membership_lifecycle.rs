use anchor_lang::{
    prelude::Pubkey,
    InstructionData,
    ToAccountMetas,
};

use babycowans_protocol::state::MembershipStatus;

#[test]
fn update_membership_instruction_is_constructible() {
    let application = Pubkey::new_unique();
    let membership = Pubkey::new_unique();
    let authority = Pubkey::new_unique();

    let data = babycowans_protocol::instruction::UpdateMembership {
        tier: 2,
        status: MembershipStatus::Active,
        expires_at: 2_000_000_000,
    }
    .data();

    let accounts = babycowans_protocol::accounts::UpdateMembership {
        application,
        membership,
        authority,
    }
    .to_account_metas(None);

    assert!(!data.is_empty());
    assert_eq!(accounts.len(), 3);
}
