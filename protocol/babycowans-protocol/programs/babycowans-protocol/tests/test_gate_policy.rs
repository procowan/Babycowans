use anchor_lang::prelude::*;
use anchor_lang::{InstructionData, ToAccountMetas};

use babycowans_protocol::{
    accounts::{ConfigureGatePolicy, VerifyGatePolicy},
    instruction::{
        ConfigureGatePolicy as ConfigureGatePolicyIx, VerifyGatePolicy as VerifyGatePolicyIx,
    },
    state::{GateCondition, GateConditionType, GatePolicy},
};

#[test]
fn gate_policy_limits_are_stable() {
    assert_eq!(GatePolicy::MAX_CONDITIONS, 6);
    assert_eq!(GatePolicy::MAX_GROUPS, 3);
    assert!(GatePolicy::SPACE > 0);
}

#[test]
fn gate_condition_layout_is_stable() {
    assert_eq!(GateCondition::SPACE, 1 + 1 + 32 + 8 + 2,);
}

#[test]
fn configure_gate_policy_instruction_is_constructible() {
    let application = Pubkey::new_unique();
    let application_asset = Pubkey::new_unique();
    let gate_policy = Pubkey::new_unique();
    let authority = Pubkey::new_unique();

    let conditions = vec![
        GateCondition {
            group: 0,
            condition_type: GateConditionType::HoldAmount,
            mint: Pubkey::new_unique(),
            minimum_amount: 1,
            minimum_tier: 0,
        },
        GateCondition {
            group: 0,
            condition_type: GateConditionType::MembershipTier,
            mint: Pubkey::default(),
            minimum_amount: 0,
            minimum_tier: 3,
        },
        GateCondition {
            group: 1,
            condition_type: GateConditionType::NftOwnership,
            mint: Pubkey::new_unique(),
            minimum_amount: 0,
            minimum_tier: 0,
        },
    ];

    let data = ConfigureGatePolicyIx {
        conditions,
        enabled: true,
    }
    .data();

    let accounts = ConfigureGatePolicy {
        application,
        application_asset,
        gate_policy,
        authority,
        system_program: anchor_lang::system_program::ID,
    }
    .to_account_metas(None);

    assert!(!data.is_empty());
    assert_eq!(accounts.len(), 5);
}

#[test]
fn verify_gate_policy_instruction_is_constructible() {
    let application = Pubkey::new_unique();
    let application_asset = Pubkey::new_unique();
    let gate_policy = Pubkey::new_unique();
    let wallet = Pubkey::new_unique();
    let hold_token_account = Pubkey::new_unique();
    let membership = Pubkey::new_unique();
    let nft_token_account = Pubkey::new_unique();

    let data = VerifyGatePolicyIx {}.data();

    let accounts = VerifyGatePolicy {
        application,
        application_asset,
        gate_policy,
        wallet,
        hold_token_account: Some(hold_token_account),
        membership: Some(membership),
        nft_token_account: Some(nft_token_account),
    }
    .to_account_metas(None);

    assert!(!data.is_empty());
    assert_eq!(accounts.len(), 7);
}

#[test]
fn gate_policy_or_of_and_example_is_representable() {
    let brc = Pubkey::new_unique();
    let nft = Pubkey::new_unique();

    let conditions = [
        GateCondition {
            group: 0,
            condition_type: GateConditionType::HoldAmount,
            mint: brc,
            minimum_amount: 100,
            minimum_tier: 0,
        },
        GateCondition {
            group: 0,
            condition_type: GateConditionType::MembershipTier,
            mint: Pubkey::default(),
            minimum_amount: 0,
            minimum_tier: 3,
        },
        GateCondition {
            group: 1,
            condition_type: GateConditionType::NftOwnership,
            mint: nft,
            minimum_amount: 0,
            minimum_tier: 0,
        },
    ];

    assert_eq!(conditions[0].group, 0);
    assert_eq!(conditions[1].group, 0);
    assert_eq!(conditions[2].group, 1);

    assert_eq!(conditions[0].condition_type, GateConditionType::HoldAmount,);

    assert_eq!(
        conditions[1].condition_type,
        GateConditionType::MembershipTier,
    );

    assert_eq!(
        conditions[2].condition_type,
        GateConditionType::NftOwnership,
    );
}
