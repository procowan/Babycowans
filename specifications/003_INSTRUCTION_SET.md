# Babycowans Protocol V1.0.0 Instruction Set

This specification enumerates the complete public instruction surface exposed by the current Babycowans Protocol V1.0.0 IDL.

The current canonical surface contains exactly **29 instructions**.

The program source and generated IDL are authoritative for account constraints, signer/writable requirements, argument encoding, and error behavior.

## 1. Canonical instruction inventory

1. `accept_application_authority`
2. `accept_protocol_authority`
3. `assign_application_role`
4. `cancel_reward`
5. `claim_reward`
6. `configure_application_asset`
7. `configure_application_config`
8. `configure_gate_policy`
9. `configure_payment_policy`
10. `configure_token_gate`
11. `create_reward`
12. `initialize_protocol`
13. `nominate_application_authority`
14. `nominate_protocol_authority`
15. `process_payment`
16. `record_audit_log`
17. `register_application`
18. `register_asset`
19. `register_membership`
20. `renew_membership`
21. `set_protocol_pause`
22. `update_application_config`
23. `update_application_role`
24. `update_application_status`
25. `update_membership`
26. `update_payment_policy`
27. `verify_gate_access`
28. `verify_gate_policy`
29. `verify_nft_membership`

## 2. accept_application_authority

### Arguments

No instruction arguments.

### Accounts

| Account | Signer | Writable |
|---|---:|---:|
| `application` | no | yes |
| `authority` | yes | no |

## 3. accept_protocol_authority

### Arguments

No instruction arguments.

### Accounts

| Account | Signer | Writable |
|---|---:|---:|
| `protocol_config` | no | yes |
| `pending_authority` | yes | no |

## 4. assign_application_role

### Arguments

| Argument | Type |
|---|---|
| `role` | `Role` |

### Accounts

| Account | Signer | Writable |
|---|---:|---:|
| `application` | no | no |
| `application_role` | no | yes |
| `member` | no | no |
| `authority` | yes | yes |
| `system_program` | no | no |

## 5. cancel_reward

### Arguments

No instruction arguments.

### Accounts

| Account | Signer | Writable |
|---|---:|---:|
| `application` | no | no |
| `reward` | no | yes |
| `authority` | yes | no |

## 6. claim_reward

### Arguments

No instruction arguments.

### Accounts

| Account | Signer | Writable |
|---|---:|---:|
| `reward` | no | yes |
| `beneficiary` | yes | no |

## 7. configure_application_asset

### Arguments

| Argument | Type |
|---|---|
| `payments_enabled` | `bool` |
| `gating_enabled` | `bool` |
| `rewards_enabled` | `bool` |

### Accounts

| Account | Signer | Writable |
|---|---:|---:|
| `application` | no | no |
| `asset_config` | no | no |
| `mint` | no | no |
| `application_asset` | no | yes |
| `payment_destination` | no | no |
| `authority` | yes | yes |
| `token_program` | no | no |
| `system_program` | no | no |

## 8. configure_application_config

### Arguments

| Argument | Type |
|---|---|
| `website_uri` | `string` |
| `logo_uri` | `string` |
| `support_uri` | `string` |
| `description` | `string` |
| `metadata_uri` | `string` |

### Accounts

| Account | Signer | Writable |
|---|---:|---:|
| `application` | no | no |
| `application_config` | no | yes |
| `authority` | yes | yes |
| `system_program` | no | no |

## 9. configure_gate_policy

### Arguments

| Argument | Type |
|---|---|
| `conditions` | `Vec<GateCondition>` |
| `enabled` | `bool` |

### Accounts

| Account | Signer | Writable |
|---|---:|---:|
| `application` | no | no |
| `application_asset` | no | no |
| `gate_policy` | no | yes |
| `authority` | yes | yes |
| `system_program` | no | no |

## 10. configure_payment_policy

### Arguments

| Argument | Type |
|---|---|
| `minimum_amount` | `u64` |
| `maximum_amount` | `u64` |
| `payments_enabled` | `bool` |
| `protocol_fee_bps` | `u16` |
| `application_fee_bps` | `u16` |
| `treasury` | `pubkey` |

### Accounts

| Account | Signer | Writable |
|---|---:|---:|
| `application` | no | no |
| `application_asset` | no | no |
| `payment_policy` | no | yes |
| `authority` | yes | yes |
| `system_program` | no | no |

## 11. configure_token_gate

### Arguments

| Argument | Type |
|---|---|
| `gate_type` | `GateType` |
| `minimum_amount` | `u64` |
| `minimum_tier` | `u16` |
| `enabled` | `bool` |

### Accounts

| Account | Signer | Writable |
|---|---:|---:|
| `application` | no | no |
| `application_asset` | no | no |
| `token_gate` | no | yes |
| `authority` | yes | yes |
| `system_program` | no | no |

## 12. create_reward

### Arguments

| Argument | Type |
|---|---|
| `beneficiary` | `pubkey` |
| `reward_id` | `u64` |
| `asset` | `pubkey` |
| `amount` | `u64` |
| `claimable_at` | `i64` |
| `expires_at` | `i64` |
| `category` | `u8` |
| `reason` | `string` |

### Accounts

| Account | Signer | Writable |
|---|---:|---:|
| `application` | no | no |
| `reward` | no | yes |
| `authority` | yes | yes |
| `system_program` | no | no |

## 13. initialize_protocol

### Arguments

No instruction arguments.

### Accounts

| Account | Signer | Writable |
|---|---:|---:|
| `protocol_config` | no | yes |
| `authority` | yes | yes |
| `system_program` | no | no |

## 14. nominate_application_authority

### Arguments

| Argument | Type |
|---|---|
| `new_authority` | `pubkey` |

### Accounts

| Account | Signer | Writable |
|---|---:|---:|
| `application` | no | yes |
| `authority` | yes | no |

## 15. nominate_protocol_authority

### Arguments

| Argument | Type |
|---|---|
| `new_authority` | `pubkey` |

### Accounts

| Account | Signer | Writable |
|---|---:|---:|
| `protocol_config` | no | yes |
| `authority` | yes | no |

## 16. process_payment

### Arguments

| Argument | Type |
|---|---|
| `amount` | `u64` |

### Accounts

| Account | Signer | Writable |
|---|---:|---:|
| `protocol_config` | no | no |
| `application` | no | no |
| `application_asset` | no | no |
| `payment_policy` | no | no |
| `asset_config` | no | no |
| `mint` | no | no |
| `payer` | yes | yes |
| `payer_token_account` | no | yes |
| `destination_token_account` | no | yes |
| `treasury_token_account` | no | yes |
| `token_program` | no | no |

## 17. record_audit_log

### Arguments

| Argument | Type |
|---|---|
| `nonce` | `u64` |
| `action` | `AuditAction` |
| `category` | `AuditCategory` |
| `severity` | `AuditSeverity` |
| `reference` | `pubkey` |
| `indexed_references` | `[pubkey; 3]` |
| `metadata` | `string` |

### Accounts

| Account | Signer | Writable |
|---|---:|---:|
| `application` | no | no |
| `audit_log` | no | yes |
| `authority` | yes | yes |
| `system_program` | no | no |

## 18. register_application

### Arguments

| Argument | Type |
|---|---|
| `application_id` | `u64` |
| `name` | `string` |
| `selected_ecosystem` | `CanonicalEcosystem` |

### Accounts

| Account | Signer | Writable |
|---|---:|---:|
| `protocol_config` | no | yes |
| `application` | no | yes |
| `authority` | yes | yes |
| `system_program` | no | no |

## 19. register_asset

### Arguments

| Argument | Type |
|---|---|
| `asset_code` | `[u8; 3]` |
| `domain` | `AssetDomain` |

### Accounts

| Account | Signer | Writable |
|---|---:|---:|
| `protocol_config` | no | yes |
| `asset_config` | no | yes |
| `mint` | no | no |
| `authority` | yes | yes |
| `system_program` | no | no |

## 20. register_membership

### Arguments

| Argument | Type |
|---|---|
| `member` | `pubkey` |
| `tier` | `u16` |
| `expires_at` | `i64` |
| `renewable` | `bool` |
| `auto_extend` | `bool` |
| `renewal_duration` | `i64` |
| `membership_kind` | `MembershipKind` |
| `nft_mint` | `pubkey` |

### Accounts

| Account | Signer | Writable |
|---|---:|---:|
| `application` | no | no |
| `membership` | no | yes |
| `authority` | yes | yes |
| `system_program` | no | no |

## 21. renew_membership

### Arguments

| Argument | Type |
|---|---|
| `requested_expires_at` | `i64` |

### Accounts

| Account | Signer | Writable |
|---|---:|---:|
| `application` | no | no |
| `membership` | no | yes |
| `authority` | yes | no |

## 22. set_protocol_pause

### Arguments

| Argument | Type |
|---|---|
| `paused` | `bool` |

### Accounts

| Account | Signer | Writable |
|---|---:|---:|
| `protocol_config` | no | yes |
| `authority` | yes | no |

## 23. update_application_config

### Arguments

| Argument | Type |
|---|---|
| `website_uri` | `string` |
| `logo_uri` | `string` |
| `support_uri` | `string` |
| `description` | `string` |
| `metadata_uri` | `string` |

### Accounts

| Account | Signer | Writable |
|---|---:|---:|
| `application` | no | no |
| `application_config` | no | yes |
| `authority` | yes | no |

## 24. update_application_role

### Arguments

| Argument | Type |
|---|---|
| `role` | `Role` |
| `active` | `bool` |

### Accounts

| Account | Signer | Writable |
|---|---:|---:|
| `application` | no | no |
| `application_role` | no | yes |
| `authority` | yes | no |

## 25. update_application_status

### Arguments

| Argument | Type |
|---|---|
| `new_status` | `ApplicationStatus` |

### Accounts

| Account | Signer | Writable |
|---|---:|---:|
| `application` | no | yes |
| `authority` | yes | no |

## 26. update_membership

### Arguments

| Argument | Type |
|---|---|
| `tier` | `u16` |
| `status` | `MembershipStatus` |
| `expires_at` | `i64` |
| `renewable` | `bool` |
| `auto_extend` | `bool` |
| `renewal_duration` | `i64` |

### Accounts

| Account | Signer | Writable |
|---|---:|---:|
| `application` | no | no |
| `membership` | no | yes |
| `authority` | yes | no |

## 27. update_payment_policy

### Arguments

| Argument | Type |
|---|---|
| `minimum_amount` | `u64` |
| `maximum_amount` | `u64` |
| `payments_enabled` | `bool` |
| `protocol_fee_bps` | `u16` |
| `application_fee_bps` | `u16` |
| `treasury` | `pubkey` |

### Accounts

| Account | Signer | Writable |
|---|---:|---:|
| `application` | no | no |
| `payment_policy` | no | yes |
| `authority` | yes | no |

## 28. verify_gate_access

### Arguments

No instruction arguments.

### Accounts

| Account | Signer | Writable |
|---|---:|---:|
| `application` | no | no |
| `application_asset` | no | no |
| `token_gate` | no | no |
| `wallet` | yes | no |
| `user_token_account` | no | no |

## 29. verify_gate_policy

### Arguments

No instruction arguments.

### Accounts

| Account | Signer | Writable |
|---|---:|---:|
| `application` | no | no |
| `application_asset` | no | no |
| `gate_policy` | no | no |
| `wallet` | yes | no |
| `hold_token_account` | no | no |
| `membership` | no | no |
| `nft_token_account` | no | no |

## 30. verify_nft_membership

### Arguments

No instruction arguments.

### Accounts

| Account | Signer | Writable |
|---|---:|---:|
| `application` | no | no |
| `membership` | no | yes |
| `member` | yes | no |
| `nft_token_account` | no | no |

## Event surface

The current IDL exposes exactly **28 event types**:

- `ApplicationAssetConfigured`
- `ApplicationAuthorityNominated`
- `ApplicationAuthorityTransferred`
- `ApplicationConfigConfigured`
- `ApplicationConfigUpdated`
- `ApplicationRegistered`
- `ApplicationRoleAssigned`
- `ApplicationRoleUpdated`
- `ApplicationStatusChanged`
- `AssetRegistered`
- `AuditLogRecorded`
- `GateAccessVerified`
- `GatePolicyAccessVerified`
- `GatePolicyConfigured`
- `MembershipRegistered`
- `MembershipRenewed`
- `MembershipUpdated`
- `NftMembershipVerified`
- `PaymentPolicyConfigured`
- `PaymentProcessed`
- `ProtocolAuthorityNominated`
- `ProtocolAuthorityTransferred`
- `ProtocolInitialized`
- `ProtocolPauseChanged`
- `RewardCancelled`
- `RewardClaimed`
- `RewardCreated`
- `TokenGateConfigured`

## Error surface

The current IDL exposes exactly **48 custom errors**:

- `InvalidAuthority` (`6000`) — The provided authority is invalid.
- `InvalidPda` (`6001`) — The provided PDA is invalid.
- `InvalidVersion` (`6002`) — The account version is invalid.
- `ProtocolPaused` (`6003`) — The protocol is currently paused.
- `UnsupportedMint` (`6004`) — The provided mint is not a canonical Babycowans asset.
- `MaximumAssetsReached` (`6005`) — The maximum number of canonical assets has been reached.
- `InvalidApplicationName` (`6006`) — The application name is invalid or too long.
- `InvalidApplication` (`6007`) — The application is invalid or inactive.
- `InvalidApplicationConfig` (`6008`) — The application configuration contains an invalid or oversized field.
- `InvalidApplicationStatusTransition` (`6009`) — The requested application status transition is invalid.
- `InvalidAsset` (`6010`) — The asset configuration is invalid or disabled.
- `InvalidPaymentDestination` (`6011`) — The payment destination token account is invalid.
- `InvalidTokenProgram` (`6012`) — The token program does not match the registered asset.
- `PaymentsDisabled` (`6013`) — Payments are disabled for this application asset.
- `InvalidAmount` (`6014`) — The payment amount must be greater than zero.
- `InvalidPaymentPolicy` (`6015`) — The payment policy configuration is invalid.
- `PaymentBelowMinimum` (`6016`) — The payment amount is below the configured minimum.
- `PaymentAboveMaximum` (`6017`) — The payment amount exceeds the configured maximum.
- `InvalidRoleMember` (`6018`) — The role member public key is invalid.
- `InvalidExpiration` (`6019`) — The membership expiration timestamp is invalid.
- `InvalidMembershipConfiguration` (`6020`) — The membership configuration is invalid.
- `MembershipNotRenewable` (`6021`) — The membership is not renewable.
- `MembershipAutoExtendDisabled` (`6022`) — Automatic membership extension is disabled.
- `MembershipSuspended` (`6023`) — The membership is suspended and cannot be renewed.
- `NotNftMembership` (`6024`) — This membership is not an NFT membership.
- `InvalidNftMint` (`6025`) — The NFT mint does not match the membership.
- `InvalidNftOwnership` (`6026`) — The member does not own the required NFT.
- `InvalidRewardStatus` (`6027`) — The reward status does not allow this operation.
- `InvalidRewardSchedule` (`6028`) — The reward schedule is invalid.
- `InvalidRewardExpiration` (`6029`) — The reward expiration timestamp is invalid.
- `RewardNotYetClaimable` (`6030`) — The reward is not claimable yet.
- `RewardExpired` (`6031`) — The reward has expired.
- `RewardReasonTooLong` (`6032`) — The reward reason exceeds the maximum allowed length.
- `GatingDisabled` (`6033`) — Token gating is disabled for this application asset.
- `InvalidGate` (`6034`) — The token gate is invalid.
- `GateDisabled` (`6035`) — The token gate is disabled.
- `UnsupportedGateType` (`6036`) — This gate type is not supported by Version 1.
- `InsufficientTokenBalance` (`6037`) — The wallet token balance is insufficient.
- `EmptyGatePolicy` (`6038`) — The gate policy contains no conditions.
- `TooManyGateConditions` (`6039`) — The gate policy contains too many conditions.
- `InvalidGateConditionGroup` (`6040`) — The gate policy contains an invalid condition group.
- `InvalidGateCondition` (`6041`) — The gate condition is invalid.
- `MembershipGateNotSatisfied` (`6042`) — The supplied membership does not satisfy the gate condition.
- `NftGateNotSatisfied` (`6043`) — The supplied NFT ownership proof does not satisfy the gate condition.
- `GatePolicyNotSatisfied` (`6044`) — No gate-policy condition group was satisfied.
- `InvalidAuditReference` (`6045`) — The audit reference public key is invalid.
- `AuditMetadataTooLong` (`6046`) — The audit metadata exceeds the maximum allowed length.
- `ArithmeticOverflow` (`6047`) — An arithmetic operation overflowed.

## Current semantic boundaries

- `configure_gate_policy` is the current composable gate-policy configuration instruction; there is no current `create_gate_policy` or `update_gate_policy` instruction.
- `register_asset` is the current canonical asset registration instruction; there is no current `update_asset_status` instruction.
- Rewards use `create_reward`, `claim_reward`, and `cancel_reward`; there is no current RewardCampaign instruction family.
- Application metadata uses `configure_application_config` and `update_application_config`.
- Application roles use `assign_application_role` and `update_application_role`.
- Payment policy uses `configure_payment_policy` and `update_payment_policy`.
- Membership uses `register_membership`, `update_membership`, `renew_membership`, and `verify_nft_membership`.
- Direct token gating uses `configure_token_gate` and `verify_gate_access`.
- Composable gate verification uses `verify_gate_policy`.
- Structured audit state uses `record_audit_log`.

## Source-of-truth boundary

No instruction may be presented as part of Babycowans Protocol V1.0.0 unless it exists in the current generated IDL and program entrypoint surface.
