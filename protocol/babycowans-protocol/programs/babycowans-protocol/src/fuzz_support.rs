#![cfg(feature = "fuzzing")]

use anchor_lang::prelude::Pubkey;

use crate::{
    canonical_assets::is_canonical_mint, canonical_ecosystems::CanonicalEcosystem,
    state::ApplicationConfig,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FuzzPaymentAmounts {
    pub protocol_fee: u64,
    pub application_fee: u64,
    pub net_amount: u64,
}

pub fn calculate_payment_amounts_for_fuzz(
    amount: u64,
    protocol_fee_bps: u16,
    application_fee_bps: u16,
) -> Option<FuzzPaymentAmounts> {
    const BPS_DENOMINATOR: u128 = 10_000;

    let amount_u128 = u128::from(amount);

    let protocol_fee = amount_u128.checked_mul(u128::from(protocol_fee_bps))? / BPS_DENOMINATOR;

    let application_fee =
        amount_u128.checked_mul(u128::from(application_fee_bps))? / BPS_DENOMINATOR;

    let total_fee = protocol_fee.checked_add(application_fee)?;

    let net_amount = amount_u128.checked_sub(total_fee)?;

    let protocol_fee = u64::try_from(protocol_fee).ok()?;

    let application_fee = u64::try_from(application_fee).ok()?;

    let net_amount = u64::try_from(net_amount).ok()?;

    let reconstructed = net_amount
        .checked_add(application_fee)?
        .checked_add(protocol_fee)?;

    if reconstructed != amount {
        return None;
    }

    Some(FuzzPaymentAmounts {
        protocol_fee,
        application_fee,
        net_amount,
    })
}

pub fn application_config_lengths_valid_for_fuzz(
    website_len: usize,
    logo_len: usize,
    support_len: usize,
    description_len: usize,
    metadata_len: usize,
) -> bool {
    website_len <= ApplicationConfig::MAX_WEBSITE_URI_LENGTH
        && logo_len <= ApplicationConfig::MAX_LOGO_URI_LENGTH
        && support_len <= ApplicationConfig::MAX_SUPPORT_URI_LENGTH
        && description_len <= ApplicationConfig::MAX_DESCRIPTION_LENGTH
        && metadata_len <= ApplicationConfig::MAX_METADATA_URI_LENGTH
}

pub fn canonical_identity_roundtrip_for_fuzz(ecosystem: CanonicalEcosystem) -> bool {
    let mint = ecosystem.token_address();

    is_canonical_mint(&mint) && CanonicalEcosystem::from_token_address(&mint) == Some(ecosystem)
}

pub fn arbitrary_pubkey_is_canonical_for_fuzz(bytes: [u8; 32]) -> bool {
    is_canonical_mint(&Pubkey::new_from_array(bytes))
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FuzzGateConditionKind {
    HoldAmount,
    MembershipTier,
    NftOwnership,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FuzzGateCondition {
    pub group: u8,
    pub kind: FuzzGateConditionKind,
    pub mint_is_default: bool,
    pub mint_matches_application_asset: bool,
    pub minimum_amount: u64,
    pub minimum_tier: u16,
}

pub fn gate_policy_structure_valid_for_fuzz(conditions: &[FuzzGateCondition]) -> bool {
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
                if condition.minimum_amount == 0 || !condition.mint_matches_application_asset {
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

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FuzzRewardStatus {
    Pending,
    Claimable,
    Claimed,
    Cancelled,
}

pub fn reward_claim_allowed_for_fuzz(
    status: FuzzRewardStatus,
    now: i64,
    claimable_at: i64,
    expires_at: i64,
) -> bool {
    if matches!(
        status,
        FuzzRewardStatus::Claimed | FuzzRewardStatus::Cancelled
    ) {
        return false;
    }

    if now < claimable_at {
        return false;
    }

    if expires_at != 0 && now >= expires_at {
        return false;
    }

    matches!(
        status,
        FuzzRewardStatus::Pending | FuzzRewardStatus::Claimable
    )
}

pub fn reward_cancel_allowed_for_fuzz(status: FuzzRewardStatus) -> bool {
    matches!(
        status,
        FuzzRewardStatus::Pending | FuzzRewardStatus::Claimable
    )
}

pub fn reward_schedule_valid_for_fuzz(now: i64, claimable_at: i64, expires_at: i64) -> bool {
    if claimable_at < 0 {
        return false;
    }

    expires_at == 0 || expires_at > claimable_at.max(now)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FuzzMembershipStatus {
    Active,
    Expired,
    Suspended,
}

pub fn membership_renewal_for_fuzz(
    now: i64,
    expires_at: i64,
    renewal_duration: i64,
    requested_expires_at: i64,
    renewal_count: u32,
    renewable: bool,
    auto_extend: bool,
    status: FuzzMembershipStatus,
) -> Option<(i64, u32)> {
    if !renewable || status == FuzzMembershipStatus::Suspended {
        return None;
    }

    let new_expires_at = if requested_expires_at != 0 {
        if requested_expires_at <= now {
            return None;
        }

        requested_expires_at
    } else {
        if !auto_extend || renewal_duration <= 0 {
            return None;
        }

        expires_at.max(now).checked_add(renewal_duration)?
    };

    let new_count = renewal_count.checked_add(1)?;

    Some((new_expires_at, new_count))
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FuzzAuthorityState {
    pub current: [u8; 32],
    pub pending: Option<[u8; 32]>,
}

pub fn authority_nominate_for_fuzz(
    state: FuzzAuthorityState,
    signer: [u8; 32],
    new_authority: [u8; 32],
) -> Option<FuzzAuthorityState> {
    if signer != state.current || new_authority == [0u8; 32] {
        return None;
    }

    Some(FuzzAuthorityState {
        current: state.current,
        pending: Some(new_authority),
    })
}

pub fn authority_accept_for_fuzz(
    state: FuzzAuthorityState,
    signer: [u8; 32],
) -> Option<FuzzAuthorityState> {
    if state.pending != Some(signer) {
        return None;
    }

    Some(FuzzAuthorityState {
        current: signer,
        pending: None,
    })
}

pub fn deterministic_bytes_domain_for_fuzz(
    prefix: &[u8],
    parent: &[u8; 32],
    child: &[u8; 32],
) -> Vec<u8> {
    let mut output = Vec::with_capacity(prefix.len() + 64);

    output.extend_from_slice(prefix);
    output.extend_from_slice(parent);
    output.extend_from_slice(child);

    output
}
