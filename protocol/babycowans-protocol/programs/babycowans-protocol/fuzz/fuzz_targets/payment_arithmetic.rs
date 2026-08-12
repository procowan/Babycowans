#![no_main]

use libfuzzer_sys::fuzz_target;

use babycowans_protocol::fuzz_support::calculate_payment_amounts_for_fuzz;

fuzz_target!(|input: (u64, u16, u16)| {
    let (amount, protocol_fee_bps, application_fee_bps) = input;

    let result = calculate_payment_amounts_for_fuzz(amount, protocol_fee_bps, application_fee_bps);

    let total_bps = u32::from(protocol_fee_bps) + u32::from(application_fee_bps);

    if total_bps <= 10_000 {
        let amounts = result.expect("valid basis-point totals must calculate safely");

        let reconstructed = amounts
            .net_amount
            .checked_add(amounts.application_fee)
            .and_then(|value| value.checked_add(amounts.protocol_fee))
            .expect("valid payment reconstruction must not overflow");

        assert_eq!(reconstructed, amount);
    }
});
