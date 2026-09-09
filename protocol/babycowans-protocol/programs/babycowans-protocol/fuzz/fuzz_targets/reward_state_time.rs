#![no_main]

use libfuzzer_sys::fuzz_target;

use babycowans_protocol::fuzz_support::{
    reward_cancel_allowed_for_fuzz,
    reward_claim_allowed_for_fuzz,
    reward_schedule_valid_for_fuzz,
    FuzzRewardStatus,
};

fuzz_target!(|input: (u8, i64, i64, i64)| {
    let (status_raw, now, claimable_at, expires_at) = input;

    let status = match status_raw % 4 {
        0 => FuzzRewardStatus::Pending,
        1 => FuzzRewardStatus::Claimable,
        2 => FuzzRewardStatus::Claimed,
        _ => FuzzRewardStatus::Cancelled,
    };

    let claim_allowed =
        reward_claim_allowed_for_fuzz(status, now, claimable_at, expires_at);

    let cancel_allowed =
        reward_cancel_allowed_for_fuzz(status);

    let schedule_valid =
        reward_schedule_valid_for_fuzz(now, claimable_at, expires_at);

    let expected_claim = !matches!(
        status,
        FuzzRewardStatus::Claimed | FuzzRewardStatus::Cancelled
    )
        && now >= claimable_at
        && (expires_at == 0 || now < expires_at)
        && matches!(
            status,
            FuzzRewardStatus::Pending | FuzzRewardStatus::Claimable
        );

    let expected_cancel = matches!(
        status,
        FuzzRewardStatus::Pending | FuzzRewardStatus::Claimable
    );

    let expected_schedule =
        claimable_at >= 0
            && (expires_at == 0 || expires_at > claimable_at.max(now));

    assert_eq!(claim_allowed, expected_claim);
    assert_eq!(cancel_allowed, expected_cancel);
    assert_eq!(schedule_valid, expected_schedule);

    eprintln!(
        "BABYCOWANS_FUZZ target=reward_state_time body=1 claim={} cancel={} schedule={} scope=model",
        if claim_allowed { "allowed" } else { "rejected" },
        if cancel_allowed { "allowed" } else { "rejected" },
        if schedule_valid { "valid" } else { "invalid" }
    );
});
