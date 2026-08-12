#![no_main]

use libfuzzer_sys::fuzz_target;

use babycowans_protocol::fuzz_support::{
    reward_cancel_allowed_for_fuzz, reward_claim_allowed_for_fuzz, reward_schedule_valid_for_fuzz,
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

    let claim_allowed = reward_claim_allowed_for_fuzz(status, now, claimable_at, expires_at);

    let cancel_allowed = reward_cancel_allowed_for_fuzz(status);

    if matches!(
        status,
        FuzzRewardStatus::Claimed | FuzzRewardStatus::Cancelled
    ) {
        assert!(!claim_allowed);
        assert!(!cancel_allowed);
    }

    let _ = reward_schedule_valid_for_fuzz(now, claimable_at, expires_at);
});
