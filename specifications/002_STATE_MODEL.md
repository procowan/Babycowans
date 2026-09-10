# Babycowans Protocol V1.0.0 State Model

This specification describes the current on-chain account model implemented by Babycowans Protocol V1.0.0.

The on-chain Rust program and generated IDL are authoritative. This document must not advertise account types, fields, or lifecycle behavior absent from those sources.

## 1. Canonical account surface

The current IDL exposes exactly **12 protocol account types**:

1. `Application`
2. `ApplicationAsset`
3. `ApplicationConfig`
4. `ApplicationPaymentPolicy`
5. `ApplicationRole`
6. `AssetConfig`
7. `AuditLog`
8. `GatePolicy`
9. `Membership`
10. `ProtocolConfig`
11. `Reward`
12. `TokenGate`

There is no `RewardCampaign` account in the current protocol. Rewards use the `Reward` account and the `create_reward`, `claim_reward`, and `cancel_reward` lifecycle.

## 2. Application

| Field | Type |
|---|---|
| `version` | `u16` |
| `application_id` | `u64` |
| `authority` | `pubkey` |
| `pending_authority` | `Option<pubkey>` |
| `selected_ecosystem` | `CanonicalEcosystem` |
| `status` | `ApplicationStatus` |
| `name` | `string` |
| `bump` | `u8` |

Stores application identity, authority lifecycle, selected canonical ecosystem, status, and name.

## 3. ApplicationAsset

| Field | Type |
|---|---|
| `version` | `u16` |
| `application` | `pubkey` |
| `asset_config` | `pubkey` |
| `mint` | `pubkey` |
| `token_program` | `pubkey` |
| `payment_destination` | `pubkey` |
| `payments_enabled` | `bool` |
| `gating_enabled` | `bool` |
| `rewards_enabled` | `bool` |
| `created_at` | `i64` |
| `updated_at` | `i64` |
| `bump` | `u8` |

Binds an Application to an AssetConfig and stores payment destination and feature flags. `configure_application_asset` initializes this account; the current ABI does not expose `update_application_asset`.

## 4. ApplicationConfig

| Field | Type |
|---|---|
| `version` | `u16` |
| `application` | `pubkey` |
| `website_uri` | `string` |
| `logo_uri` | `string` |
| `support_uri` | `string` |
| `description` | `string` |
| `metadata_uri` | `string` |
| `created_at` | `i64` |
| `updated_at` | `i64` |
| `bump` | `u8` |

Stores application metadata and is managed by `configure_application_config` and `update_application_config`.

## 5. ApplicationPaymentPolicy

| Field | Type |
|---|---|
| `version` | `u16` |
| `application` | `pubkey` |
| `application_asset` | `pubkey` |
| `minimum_amount` | `u64` |
| `maximum_amount` | `u64` |
| `payments_enabled` | `bool` |
| `protocol_fee_bps` | `u16` |
| `application_fee_bps` | `u16` |
| `treasury` | `pubkey` |
| `created_at` | `i64` |
| `updated_at` | `i64` |
| `bump` | `u8` |

Stores payment bounds, enablement, fee basis points, and treasury for an ApplicationAsset.

## 6. ApplicationRole

| Field | Type |
|---|---|
| `version` | `u16` |
| `application` | `pubkey` |
| `member` | `pubkey` |
| `role` | `Role` |
| `active` | `bool` |
| `created_at` | `i64` |
| `updated_at` | `i64` |
| `bump` | `u8` |

Stores an application-scoped member role. It does not replace `Application.authority` for privileged handlers that require the application authority.

## 7. AssetConfig

| Field | Type |
|---|---|
| `version` | `u16` |
| `mint` | `pubkey` |
| `token_program` | `pubkey` |
| `asset_code` | `[u8; 3]` |
| `domain` | `AssetDomain` |
| `decimals` | `u8` |
| `enabled` | `bool` |
| `registered_at` | `i64` |
| `bump` | `u8` |

Binds a supported canonical mint to token program, asset code, domain, decimals, and enabled state.

## 8. AuditLog

| Field | Type |
|---|---|
| `version` | `u16` |
| `event_schema_version` | `u16` |
| `authority` | `pubkey` |
| `application` | `pubkey` |
| `action` | `AuditAction` |
| `category` | `AuditCategory` |
| `severity` | `AuditSeverity` |
| `reference` | `pubkey` |
| `indexed_references` | `[pubkey; 3]` |
| `metadata` | `string` |
| `created_at` | `i64` |
| `bump` | `u8` |

Stores structured audit evidence with action, category, severity, references, metadata, and schema version.

## 9. GatePolicy

| Field | Type |
|---|---|
| `version` | `u16` |
| `application` | `pubkey` |
| `application_asset` | `pubkey` |
| `conditions` | `Vec<GateCondition>` |
| `enabled` | `bool` |
| `created_at` | `i64` |
| `updated_at` | `i64` |
| `bump` | `u8` |

Stores bounded composable gate conditions and enablement state.

## 10. Membership

| Field | Type |
|---|---|
| `version` | `u16` |
| `application` | `pubkey` |
| `member` | `pubkey` |
| `tier` | `u16` |
| `status` | `MembershipStatus` |
| `membership_kind` | `MembershipKind` |
| `nft_mint` | `pubkey` |
| `nft_verified` | `bool` |
| `expires_at` | `i64` |
| `renewable` | `bool` |
| `auto_extend` | `bool` |
| `renewal_duration` | `i64` |
| `renewal_count` | `u32` |
| `created_at` | `i64` |
| `updated_at` | `i64` |
| `bump` | `u8` |

Stores membership lifecycle, tier, kind, NFT verification state, expiry, and renewal controls.

## 11. ProtocolConfig

| Field | Type |
|---|---|
| `version` | `u16` |
| `authority` | `pubkey` |
| `pending_authority` | `Option<pubkey>` |
| `paused` | `bool` |
| `application_count` | `u64` |
| `asset_count` | `u16` |
| `bump` | `u8` |

Stores protocol authority, pending authority, pause state, counters, and PDA bump.

## 12. Reward

| Field | Type |
|---|---|
| `version` | `u16` |
| `application` | `pubkey` |
| `beneficiary` | `pubkey` |
| `reward_id` | `u64` |
| `asset` | `pubkey` |
| `amount` | `u64` |
| `status` | `RewardStatus` |
| `created_at` | `i64` |
| `claimable_at` | `i64` |
| `expires_at` | `i64` |
| `claimed_at` | `i64` |
| `cancelled_at` | `i64` |
| `category` | `u8` |
| `reason` | `string` |
| `bump` | `u8` |

`Reward` is the current reward state model. Creation, claim, and cancellation are state lifecycle operations; the current reward instructions do not define a RewardCampaign vault model.

## 13. TokenGate

| Field | Type |
|---|---|
| `version` | `u16` |
| `application` | `pubkey` |
| `application_asset` | `pubkey` |
| `gate_type` | `GateType` |
| `minimum_amount` | `u64` |
| `minimum_tier` | `u16` |
| `enabled` | `bool` |
| `created_at` | `i64` |
| `updated_at` | `i64` |
| `bump` | `u8` |

Stores direct token-gating configuration used by `configure_token_gate` and `verify_gate_access`.

## State-model invariants

- Canonical ecosystem identity is selected on the Application and must resolve to repository-defined canonical ecosystem data.
- Protocol-owned child accounts remain application-scoped.
- Application authority transfer is a two-step nomination/acceptance lifecycle.
- `ApplicationRole` is distinct from `Application.authority`.
- `ApplicationAsset.payment_destination` is distinct from `ApplicationPaymentPolicy.treasury`.
- Membership, Reward, TokenGate, GatePolicy, and AuditLog remain associated with their expected Application context.
- Token compatibility includes SPL Token and Token-2022 where the current instruction contract supports token operations.
- No protocol account stores wallet seed phrases or private keys.

## Source-of-truth boundary

If this specification conflicts with the compiled program or generated IDL, the program and IDL are authoritative and this specification must be corrected before release.
