#![no_main]

use libfuzzer_sys::fuzz_target;
use babycowans_protocol::fuzz_support::{
    calculate_payment_amounts_for_fuzz,
    calculate_payment_amounts_production_for_fuzz,
};

fuzz_target!(|input: (u64, u16, u16)| {
    let (amount, protocol_fee_bps, application_fee_bps) = input;

    let oracle = calculate_payment_amounts_for_fuzz(
        amount,
        protocol_fee_bps,
        application_fee_bps,
    );

    let production = calculate_payment_amounts_production_for_fuzz(
        amount,
        protocol_fee_bps,
        application_fee_bps,
    );

    assert_eq!(
        production,
        oracle,
        "production payment arithmetic diverged from the independent fuzz oracle",
    );

    if let Some(amounts) = production {
        let reconstructed = amounts
            .net_amount
            .checked_add(amounts.application_fee)
            .and_then(|value| value.checked_add(amounts.protocol_fee))
            .expect("successful payment reconstruction must not overflow");

        assert_eq!(reconstructed, amount);
    }
});
