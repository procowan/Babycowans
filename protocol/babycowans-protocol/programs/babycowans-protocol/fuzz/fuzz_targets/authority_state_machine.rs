#![no_main]

use libfuzzer_sys::{
    arbitrary::{Arbitrary, Result as ArbitraryResult, Unstructured},
    fuzz_target,
};

use babycowans_protocol::fuzz_support::{
    authority_accept_for_fuzz, authority_nominate_for_fuzz, FuzzAuthorityState,
};

#[derive(Debug)]
struct AuthorityInput {
    current: [u8; 32],
    nominator: [u8; 32],
    candidate: [u8; 32],
    acceptor: [u8; 32],
}

fn take_32(u: &mut Unstructured<'_>) -> ArbitraryResult<[u8; 32]> {
    let bytes = u.bytes(32)?;
    let mut output = [0u8; 32];
    output.copy_from_slice(bytes);
    Ok(output)
}

impl<'a> Arbitrary<'a> for AuthorityInput {
    fn arbitrary(u: &mut Unstructured<'a>) -> ArbitraryResult<Self> {
        Ok(Self {
            current: take_32(u)?,
            nominator: take_32(u)?,
            candidate: take_32(u)?,
            acceptor: take_32(u)?,
        })
    }

    fn size_hint(_depth: usize) -> (usize, Option<usize>) {
        (128, Some(128))
    }
}

fuzz_target!(|input: AuthorityInput| {
    let AuthorityInput {
        current,
        nominator,
        candidate,
        acceptor,
    } = input;

    let state = FuzzAuthorityState {
        current,
        pending: None,
    };

    let nominated =
        authority_nominate_for_fuzz(state, nominator, candidate);

    if nominator != current || candidate == [0u8; 32] {
        assert!(nominated.is_none());

        eprintln!(
            "BABYCOWANS_FUZZ target=authority_state_machine body=1 class=nomination_rejected scope=model"
        );

        return;
    }

    let nominated =
        nominated.expect("valid nomination must succeed");

    assert_eq!(nominated.current, current);
    assert_eq!(nominated.pending, Some(candidate));

    let accepted =
        authority_accept_for_fuzz(nominated, acceptor);

    if acceptor != candidate {
        assert!(accepted.is_none());

        eprintln!(
            "BABYCOWANS_FUZZ target=authority_state_machine body=1 class=acceptance_rejected scope=model"
        );

        return;
    }

    let accepted =
        accepted.expect("pending authority must accept");

    assert_eq!(accepted.current, candidate);
    assert_eq!(accepted.pending, None);

    assert!(
        authority_accept_for_fuzz(accepted, acceptor).is_none(),
        "stale acceptance replay must fail"
    );

    eprintln!(
        "BABYCOWANS_FUZZ target=authority_state_machine body=1 class=transfer_completed scope=model"
    );
});
