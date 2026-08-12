#![no_main]

use libfuzzer_sys::fuzz_target;

use babycowans_protocol::fuzz_support::{
    authority_accept_for_fuzz, authority_nominate_for_fuzz, FuzzAuthorityState,
};

fuzz_target!(|input: ([u8; 32], [u8; 32], [u8; 32], [u8; 32],)| {
    let (current, nominator, candidate, acceptor) = input;

    let state = FuzzAuthorityState {
        current,
        pending: None,
    };

    let nominated = authority_nominate_for_fuzz(state, nominator, candidate);

    if nominator != current || candidate == [0u8; 32] {
        assert!(nominated.is_none());
        return;
    }

    let nominated = nominated.expect("valid nomination must succeed");

    assert_eq!(nominated.current, current,);

    assert_eq!(nominated.pending, Some(candidate),);

    let accepted = authority_accept_for_fuzz(nominated, acceptor);

    if acceptor != candidate {
        assert!(accepted.is_none());
        return;
    }

    let accepted = accepted.expect("pending authority must accept");

    assert_eq!(accepted.current, candidate,);

    assert_eq!(accepted.pending, None,);

    assert!(
        authority_accept_for_fuzz(accepted, acceptor,).is_none(),
        "stale acceptance replay must fail",
    );
});
