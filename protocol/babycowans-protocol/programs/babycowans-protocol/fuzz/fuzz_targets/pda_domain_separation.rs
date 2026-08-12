#![no_main]

use libfuzzer_sys::fuzz_target;

use babycowans_protocol::fuzz_support::deterministic_bytes_domain_for_fuzz;

fuzz_target!(|input: ([u8; 32], [u8; 32], [u8; 32],)| {
    let (parent, child_a, child_b) = input;

    let a1 = deterministic_bytes_domain_for_fuzz(b"application_asset", &parent, &child_a);

    let a2 = deterministic_bytes_domain_for_fuzz(b"application_asset", &parent, &child_a);

    assert_eq!(a1, a2);

    if child_a != child_b {
        let b = deterministic_bytes_domain_for_fuzz(b"application_asset", &parent, &child_b);

        assert_ne!(a1, b);
    }

    let different_domain = deterministic_bytes_domain_for_fuzz(b"membership", &parent, &child_a);

    assert_ne!(a1, different_domain,);
});
