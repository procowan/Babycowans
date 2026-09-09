#![no_main]

use libfuzzer_sys::fuzz_target;

use babycowans_protocol::fuzz_support::{
    gate_policy_structure_valid_for_fuzz, FuzzGateCondition,
    FuzzGateConditionKind,
};

type RawCondition = (u8, u8, bool, bool, u64, u16);

fn oracle(conditions: &[FuzzGateCondition]) -> bool {
    const MAX_CONDITIONS: usize = 6;
    const MAX_GROUPS: usize = 3;

    if conditions.is_empty() || conditions.len() > MAX_CONDITIONS {
        return false;
    }

    let mut group_used = [false; MAX_GROUPS];
    let mut seen_kind = [[false; 3]; MAX_GROUPS];

    for condition in conditions {
        let group = usize::from(condition.group);

        if group >= MAX_GROUPS {
            return false;
        }

        group_used[group] = true;

        let kind_index = match condition.kind {
            FuzzGateConditionKind::HoldAmount => {
                if condition.minimum_amount == 0
                    || !condition.mint_matches_application_asset
                {
                    return false;
                }

                0
            }
            FuzzGateConditionKind::MembershipTier => {
                if condition.minimum_tier == 0 || !condition.mint_is_default {
                    return false;
                }

                1
            }
            FuzzGateConditionKind::NftOwnership => {
                if condition.mint_is_default {
                    return false;
                }

                2
            }
        };

        if seen_kind[group][kind_index] {
            return false;
        }

        seen_kind[group][kind_index] = true;
    }

    let mut gap_found = false;

    for used in group_used {
        if !used {
            gap_found = true;
        } else if gap_found {
            return false;
        }
    }

    true
}

fuzz_target!(|input: ([RawCondition; 7], u8)| {
    let (raw, count_raw) = input;
    let count = usize::from(count_raw % 8);

    let conditions: Vec<FuzzGateCondition> = raw
        .into_iter()
        .take(count)
        .map(
            |(
                group,
                kind,
                mint_is_default,
                mint_matches,
                minimum_amount,
                minimum_tier,
            )| {
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

    let actual = gate_policy_structure_valid_for_fuzz(&conditions);
    let expected = oracle(&conditions);

    assert_eq!(
        actual, expected,
        "GatePolicy fuzz model diverged from independent structural oracle"
    );

    eprintln!(
        "BABYCOWANS_FUZZ target=gate_policy_structure body=1 class={} scope=model",
        if actual { "valid" } else { "invalid" }
    );
});
