use anchor_lang::{prelude::Pubkey, InstructionData, ToAccountMetas};

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
        renewable: true,
        auto_extend: true,
        renewal_duration: 86_400,
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

#[test]
fn renew_membership_instruction_is_constructible() {
    let application = Pubkey::new_unique();
    let membership = Pubkey::new_unique();
    let authority = Pubkey::new_unique();

    let data = babycowans_protocol::instruction::RenewMembership {
        requested_expires_at: 0,
    }
    .data();

    let accounts = babycowans_protocol::accounts::RenewMembership {
        application,
        membership,
        authority,
    }
    .to_account_metas(None);

    assert!(!data.is_empty());
    assert_eq!(accounts.len(), 3);
}

#[test]
fn verify_nft_membership_instruction_is_constructible() {
    let application = Pubkey::new_unique();
    let membership = Pubkey::new_unique();
    let member = Pubkey::new_unique();
    let nft_token_account = Pubkey::new_unique();

    let data = babycowans_protocol::instruction::VerifyNftMembership {}.data();

    let accounts = babycowans_protocol::accounts::VerifyNftMembership {
        application,
        membership,
        member,
        nft_token_account,
    }
    .to_account_metas(None);

    assert!(!data.is_empty());
    assert_eq!(accounts.len(), 4);
}
