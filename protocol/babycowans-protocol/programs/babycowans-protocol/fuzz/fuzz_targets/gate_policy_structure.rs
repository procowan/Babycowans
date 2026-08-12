#![no_main]

use libfuzzer_sys::fuzz_target;

use babycowans_protocol::fuzz_support::{
    gate_policy_structure_valid_for_fuzz, FuzzGateCondition, FuzzGateConditionKind,
};

fuzz_target!(|input: Vec<(u8, u8, bool, bool, u64, u16)>| {
    let conditions: Vec<FuzzGateCondition> = input
        .into_iter()
        .take(10)
        .map(
            |(group, kind, mint_is_default, mint_matches, minimum_amount, minimum_tier)| {
                let kind = match kind % 3 {
                    0 => FuzzGateConditionKind::HoldAmount,
                    1 => FuzzGateConditionKind::MembershipTier,
                    _ => FuzzGateConditionKind::NftOwnership,
                };

                FuzzGateCondition {
                    group,
                    kind,
                    mint_is_default,
                    mint_matches_application_asset: mint_matches,
                    minimum_amount,
                    minimum_tier,
                }
            },
        )
        .collect();

    let _ = gate_policy_structure_valid_for_fuzz(&conditions);
});
