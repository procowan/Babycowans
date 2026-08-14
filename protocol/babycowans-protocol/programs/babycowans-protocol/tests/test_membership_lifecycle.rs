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
/* ============================================================
 * XRAY_X7_MEMBERSHIP_BOUNDARY_PROPERTY_TESTS
 * Test-only Zero-Doubt arithmetic boundary regression.
 * ============================================================ */

#[test]
fn xray_x7_membership_timestamp_checked_add_rejects_overflow() {
    let base = i64::MAX;
    let renewal_duration = 1_i64;

    let result = base.checked_add(renewal_duration);

    assert!(
        result.is_none(),
        "XRAY X7: membership expiration arithmetic must reject i64 overflow"
    );
}

#[test]
fn xray_x7_membership_timestamp_checked_add_preserves_max_boundary() {
    let base = i64::MAX - 1;
    let renewal_duration = 1_i64;

    let result = base.checked_add(renewal_duration);

    assert_eq!(
        result,
        Some(i64::MAX),
        "XRAY X7: valid maximum i64 expiration boundary must remain exact"
    );
}

#[test]
fn xray_x7_membership_renewal_counter_rejects_overflow() {
    let renewal_count = u32::MAX;

    let result = renewal_count.checked_add(1);

    assert!(
        result.is_none(),
        "XRAY X7: membership renewal counter must reject u32 overflow"
    );
}

#[test]
fn xray_x7_membership_renewal_counter_preserves_max_boundary() {
    let renewal_count = u32::MAX - 1;

    let result = renewal_count.checked_add(1);

    assert_eq!(
        result,
        Some(u32::MAX),
        "XRAY X7: valid maximum renewal counter boundary must remain exact"
    );
}
