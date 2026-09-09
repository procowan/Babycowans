#![no_main]

use libfuzzer_sys::fuzz_target;

use babycowans_protocol::{
    canonical_ecosystems::CanonicalEcosystem,
    fuzz_support::{
        arbitrary_pubkey_is_canonical_for_fuzz,
        canonical_identity_roundtrip_for_fuzz,
    },
};

fuzz_target!(|input: ([u8; 32], u8)| {
    let (bytes, selector) = input;

    let ecosystems = [
        CanonicalEcosystem::BabyReptile,
        CanonicalEcosystem::BabyEagle,
        CanonicalEcosystem::BabyGoat,
        CanonicalEcosystem::BabyLion,
        CanonicalEcosystem::BabyBee,
        CanonicalEcosystem::BabyAgent,
    ];

    let arbitrary_result = arbitrary_pubkey_is_canonical_for_fuzz(bytes);

    let expected = ecosystems
        .iter()
        .any(|ecosystem| ecosystem.token_address().to_bytes() == bytes);

    assert_eq!(
        arbitrary_result, expected,
        "arbitrary canonical classification diverged from six canonical identities"
    );

    let ecosystem = ecosystems[usize::from(selector % 6)];

    assert!(
        canonical_identity_roundtrip_for_fuzz(ecosystem),
        "canonical ecosystem roundtrip must hold"
    );

    eprintln!(
        "BABYCOWANS_FUZZ target=canonical_identity body=1 class={}",
        if arbitrary_result {
            "canonical"
        } else {
            "noncanonical"
        }
    );
});
