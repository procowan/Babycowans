#![no_main]

use libfuzzer_sys::{
    arbitrary::{Arbitrary, Result as ArbitraryResult, Unstructured},
    fuzz_target,
};

use babycowans_protocol::fuzz_support::deterministic_bytes_domain_for_fuzz;

#[derive(Debug)]
struct DomainInput {
    parent: [u8; 32],
    child_a: [u8; 32],
    child_b: [u8; 32],
}

fn take_32(u: &mut Unstructured<'_>) -> ArbitraryResult<[u8; 32]> {
    let bytes = u.bytes(32)?;
    let mut output = [0u8; 32];
    output.copy_from_slice(bytes);
    Ok(output)
}

impl<'a> Arbitrary<'a> for DomainInput {
    fn arbitrary(u: &mut Unstructured<'a>) -> ArbitraryResult<Self> {
        Ok(Self {
            parent: take_32(u)?,
            child_a: take_32(u)?,
            child_b: take_32(u)?,
        })
    }

    fn size_hint(_depth: usize) -> (usize, Option<usize>) {
        (96, Some(96))
    }
}

fuzz_target!(|input: DomainInput| {
    let DomainInput {
        parent,
        child_a,
        child_b,
    } = input;

    let a1 = deterministic_bytes_domain_for_fuzz(
        b"application_asset",
        &parent,
        &child_a,
    );

    let a2 = deterministic_bytes_domain_for_fuzz(
        b"application_asset",
        &parent,
        &child_a,
    );

    assert_eq!(a1, a2);

    let class = if child_a != child_b {
        let b = deterministic_bytes_domain_for_fuzz(
            b"application_asset",
            &parent,
            &child_b,
        );

        assert_ne!(a1, b);

        "different_child"
    } else {
        "same_child"
    };

    let different_domain =
        deterministic_bytes_domain_for_fuzz(
            b"membership",
            &parent,
            &child_a,
        );

    assert_ne!(a1, different_domain);

    eprintln!(
        "BABYCOWANS_FUZZ target=pda_domain_separation body=1 class={} scope=byte_domain_model_not_solana_pda",
        class
    );
});
