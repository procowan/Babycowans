#![no_main]

use libfuzzer_sys::fuzz_target;

use babycowans_protocol::fuzz_support::{membership_renewal_for_fuzz, FuzzMembershipStatus};

fuzz_target!(|input: (i64, i64, i64, i64, u32, bool, bool, u8,)| {
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

    if let Some((new_expires_at, new_count)) = result {
        assert!(new_expires_at > now);
        assert_eq!(new_count, renewal_count + 1,);
        assert!(renewable);
        assert_ne!(status, FuzzMembershipStatus::Suspended,);
    }
});
