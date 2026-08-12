#![no_main]

use libfuzzer_sys::fuzz_target;

use babycowans_protocol::fuzz_support::application_config_lengths_valid_for_fuzz;

fuzz_target!(|input: (u16, u16, u16, u16, u16)| {
    let (website, logo, support, description, metadata) = input;

    let valid = application_config_lengths_valid_for_fuzz(
        usize::from(website),
        usize::from(logo),
        usize::from(support),
        usize::from(description),
        usize::from(metadata),
    );

    let expected = usize::from(website) <= 256
        && usize::from(logo) <= 256
        && usize::from(support) <= 256
        && usize::from(description) <= 512
        && usize::from(metadata) <= 256;

    assert_eq!(valid, expected);
});
