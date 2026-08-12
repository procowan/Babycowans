#![no_main]

use libfuzzer_sys::fuzz_target;

use babycowans_protocol::{
    canonical_ecosystems::CanonicalEcosystem,
    fuzz_support::{arbitrary_pubkey_is_canonical_for_fuzz, canonical_identity_roundtrip_for_fuzz},
};

fuzz_target!(|input: ([u8; 32], u8)| {
    let (bytes, selector) = input;

    let _ = arbitrary_pubkey_is_canonical_for_fuzz(bytes);

    let ecosystem = match selector % 6 {
        0 => CanonicalEcosystem::BabyReptile,
        1 => CanonicalEcosystem::BabyEagle,
        2 => CanonicalEcosystem::BabyGoat,
        3 => CanonicalEcosystem::BabyLion,
        4 => CanonicalEcosystem::BabyBee,
        _ => CanonicalEcosystem::BabyAgent,
    };

    assert!(canonical_identity_roundtrip_for_fuzz(ecosystem,),);
});
