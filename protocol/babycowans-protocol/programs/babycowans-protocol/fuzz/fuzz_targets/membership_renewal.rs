#![no_main]

use libfuzzer_sys::fuzz_target;

use babycowans_protocol::fuzz_support::{
    membership_renewal_for_fuzz, FuzzMembershipStatus,
};

fuzz_target!(|input: (i64, i64, i64, i64, u32, bool, bool, u8)| {
    let (
        now,
        expires_at,
        renewal_duration,
        requested_expires_at,
        renewal_count,
        renewable,
        auto_extend,
        status_raw,
    ) = input;

    let status = match status_raw % 3 {
        0 => FuzzMembershipStatus::Active,
        1 => FuzzMembershipStatus::Expired,
        _ => FuzzMembershipStatus::Suspended,
    };

    let result = membership_renewal_for_fuzz(
        now,
        expires_at,
        renewal_duration,
        requested_expires_at,
        renewal_count,
        renewable,
        auto_extend,
        status,
    );

    let expected = if !renewable
        || status == FuzzMembershipStatus::Suspended
    {
        None
    } else if requested_expires_at != 0 {
        if requested_expires_at <= now {
            None
        } else {
            renewal_count
                .checked_add(1)
                .map(|count| (requested_expires_at, count))
        }
    } else if !auto_extend || renewal_duration <= 0 {
        None
    } else {
        expires_at
            .max(now)
            .checked_add(renewal_duration)
            .and_then(|new_expires_at| {
                renewal_count
                    .checked_add(1)
                    .map(|count| (new_expires_at, count))
            })
    };

    assert_eq!(
        result, expected,
        "membership renewal model diverged from independent oracle"
    );

    if let Some((new_expires_at, new_count)) = result {
        assert!(new_expires_at > now);
        assert_eq!(new_count, renewal_count + 1);
        assert!(renewable);
        assert_ne!(status, FuzzMembershipStatus::Suspended);
    }

    eprintln!(
        "BABYCOWANS_FUZZ target=membership_renewal body=1 class={} scope=model",
        if result.is_some() { "accepted" } else { "rejected" }
    );
});
