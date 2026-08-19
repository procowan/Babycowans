



## Authoritative Protocol V1.0.0 public surface

> This section is generated from the current tracked Babycowans Protocol source of truth: the IDL, `BabycowansSDK.ts`, `sdk/package.json`, and `canonical_assets.rs`. Protocol identifiers, account fields, instruction arguments, events, errors, and method names must not be edited here from memory.

### Canonical ecosystem mint identities

- `BRC` — `25ZEDgK2R62VRnWbqzfKXire7Gdamkopkx6hqtBwpump`
- `BEC` — `BSf9mueWMeHMAJcbmVSY53H8jcQjwVK3oMRkmwnHpump`
- `BGC` — `BPCBXkCTYPN3JdcXJojDykmtSvPfykXTLcKnxwopump`
- `BLC` — `GK1twW6K1o3JrnHjxaAk2LGfWkqRnMoBe6Vyydkpump`
- `BBC` — `2aso6jnQt3r5sUicejnCFbZupvKaUhezirqVKMjbpump`
- `BAC` — `DKBBNADxPhGU4yJihzMUu9fXacibXhYHnQhSo5Wopump`

### On-chain instructions

#### `accept_application_authority`

**Accounts**

- `application`
- `authority`

#### `accept_protocol_authority`

**Accounts**

- `protocol_config`
- `pending_authority`

#### `assign_application_role`

**Arguments**

- `role` — `{"defined":{"name":"Role"}}`

**Accounts**

- `application`
- `application_role`
- `member`
- `authority`
- `system_program`

#### `cancel_reward`

**Accounts**

- `application`
- `reward`
- `authority`

#### `claim_reward`

**Accounts**

- `reward`
- `beneficiary`

#### `configure_application_asset`

**Arguments**

- `payments_enabled` — `"bool"`
- `gating_enabled` — `"bool"`
- `rewards_enabled` — `"bool"`

**Accounts**

- `application`
- `asset_config`
- `mint`
- `application_asset`
- `payment_destination`
- `authority`
- `token_program`
- `system_program`

#### `configure_application_config`

**Arguments**

- `website_uri` — `"string"`
- `logo_uri` — `"string"`
- `support_uri` — `"string"`
- `description` — `"string"`
- `metadata_uri` — `"string"`

**Accounts**

- `application`
- `application_config`
- `authority`
- `system_program`

#### `configure_gate_policy`

**Arguments**

- `conditions` — `{"vec":{"defined":{"name":"GateCondition"}}}`
- `enabled` — `"bool"`

**Accounts**

- `application`
- `application_asset`
- `gate_policy`
- `authority`
- `system_program`

#### `configure_payment_policy`

**Arguments**

- `minimum_amount` — `"u64"`
- `maximum_amount` — `"u64"`
- `payments_enabled` — `"bool"`
- `protocol_fee_bps` — `"u16"`
- `application_fee_bps` — `"u16"`
- `treasury` — `"pubkey"`

**Accounts**

- `application`
- `application_asset`
- `payment_policy`
- `authority`
- `system_program`

#### `configure_token_gate`

**Arguments**

- `gate_type` — `{"defined":{"name":"GateType"}}`
- `minimum_amount` — `"u64"`
- `minimum_tier` — `"u16"`
- `enabled` — `"bool"`

**Accounts**

- `application`
- `application_asset`
- `token_gate`
- `authority`
- `system_program`

#### `create_reward`

**Arguments**

- `beneficiary` — `"pubkey"`
- `reward_id` — `"u64"`
- `asset` — `"pubkey"`
- `amount` — `"u64"`
- `claimable_at` — `"i64"`
- `expires_at` — `"i64"`
- `category` — `"u8"`
- `reason` — `"string"`

**Accounts**

- `application`
- `reward`
- `authority`
- `system_program`

#### `initialize_protocol`

**Accounts**

- `protocol_config`
- `authority`
- `system_program`

#### `nominate_application_authority`

**Arguments**

- `new_authority` — `"pubkey"`

**Accounts**

- `application`
- `authority`

#### `nominate_protocol_authority`

**Arguments**

- `new_authority` — `"pubkey"`

**Accounts**

- `protocol_config`
- `authority`

#### `process_payment`

**Arguments**

- `amount` — `"u64"`

**Accounts**

- `protocol_config`
- `application`
- `application_asset`
- `payment_policy`
- `asset_config`
- `mint`
- `payer`
- `payer_token_account`
- `destination_token_account`
- `treasury_token_account`
- `token_program`

#### `record_audit_log`

**Arguments**

- `nonce` — `"u64"`
- `action` — `{"defined":{"name":"AuditAction"}}`
- `category` — `{"defined":{"name":"AuditCategory"}}`
- `severity` — `{"defined":{"name":"AuditSeverity"}}`
- `reference` — `"pubkey"`
- `indexed_references` — `{"array":["pubkey",3]}`
- `metadata` — `"string"`

**Accounts**

- `application`
- `audit_log`
- `authority`
- `system_program`

#### `register_application`

**Arguments**

- `application_id` — `"u64"`
- `name` — `"string"`
- `selected_ecosystem` — `{"defined":{"name":"CanonicalEcosystem"}}`

**Accounts**

- `protocol_config`
- `application`
- `authority`
- `system_program`

#### `register_asset`

**Arguments**

- `asset_code` — `{"array":["u8",3]}`
- `domain` — `{"defined":{"name":"AssetDomain"}}`

**Accounts**

- `protocol_config`
- `asset_config`
- `mint`
- `authority`
- `system_program`

#### `register_membership`

**Arguments**

- `member` — `"pubkey"`
- `tier` — `"u16"`
- `expires_at` — `"i64"`
- `renewable` — `"bool"`
- `auto_extend` — `"bool"`
- `renewal_duration` — `"i64"`
- `membership_kind` — `{"defined":{"name":"MembershipKind"}}`
- `nft_mint` — `"pubkey"`

**Accounts**

- `application`
- `membership`
- `authority`
- `system_program`

#### `renew_membership`

**Arguments**

- `requested_expires_at` — `"i64"`

**Accounts**

- `application`
- `membership`
- `authority`

#### `set_protocol_pause`

**Arguments**

- `paused` — `"bool"`

**Accounts**

- `protocol_config`
- `authority`

#### `update_application_config`

**Arguments**

- `website_uri` — `"string"`
- `logo_uri` — `"string"`
- `support_uri` — `"string"`
- `description` — `"string"`
- `metadata_uri` — `"string"`

**Accounts**

- `application`
- `application_config`
- `authority`

#### `update_application_role`

**Arguments**

- `role` — `{"defined":{"name":"Role"}}`
- `active` — `"bool"`

**Accounts**

- `application`
- `application_role`
- `authority`

#### `update_application_status`

**Arguments**

- `new_status` — `{"defined":{"name":"ApplicationStatus"}}`

**Accounts**

- `application`
- `authority`

#### `update_membership`

**Arguments**

- `tier` — `"u16"`
- `status` — `{"defined":{"name":"MembershipStatus"}}`
- `expires_at` — `"i64"`
- `renewable` — `"bool"`
- `auto_extend` — `"bool"`
- `renewal_duration` — `"i64"`

**Accounts**

- `application`
- `membership`
- `authority`

#### `update_payment_policy`

**Arguments**

- `minimum_amount` — `"u64"`
- `maximum_amount` — `"u64"`
- `payments_enabled` — `"bool"`
- `protocol_fee_bps` — `"u16"`
- `application_fee_bps` — `"u16"`
- `treasury` — `"pubkey"`

**Accounts**

- `application`
- `payment_policy`
- `authority`

#### `verify_gate_access`

**Accounts**

- `application`
- `application_asset`
- `token_gate`
- `wallet`
- `user_token_account`

#### `verify_gate_policy`

**Accounts**

- `application`
- `application_asset`
- `gate_policy`
- `wallet`
- `hold_token_account`
- `membership`
- `nft_token_account`

#### `verify_nft_membership`

**Accounts**

- `application`
- `membership`
- `member`
- `nft_token_account`

### IDL accounts

- `Application`
- `ApplicationAsset`
- `ApplicationConfig`
- `ApplicationPaymentPolicy`
- `ApplicationRole`
- `AssetConfig`
- `AuditLog`
- `GatePolicy`
- `Membership`
- `ProtocolConfig`
- `Reward`
- `TokenGate`

### Events

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

### Protocol errors

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

### IDL types

#### `Application`

Kind: `struct`

- `version` — `"u16"`
- `application_id` — `"u64"`
- `authority` — `"pubkey"`
- `pending_authority` — `{"option":"pubkey"}`
- `selected_ecosystem` — `{"defined":{"name":"CanonicalEcosystem"}}`
- `status` — `{"defined":{"name":"ApplicationStatus"}}`
- `name` — `"string"`
- `bump` — `"u8"`

#### `ApplicationAsset`

Kind: `struct`

- `version` — `"u16"`
- `application` — `"pubkey"`
- `asset_config` — `"pubkey"`
- `mint` — `"pubkey"`
- `token_program` — `"pubkey"`
- `payment_destination` — `"pubkey"`
- `payments_enabled` — `"bool"`
- `gating_enabled` — `"bool"`
- `rewards_enabled` — `"bool"`
- `created_at` — `"i64"`
- `updated_at` — `"i64"`
- `bump` — `"u8"`

#### `ApplicationAssetConfigured`

Kind: `struct`

- `application` — `"pubkey"`
- `asset_config` — `"pubkey"`
- `mint` — `"pubkey"`
- `payment_destination` — `"pubkey"`
- `payments_enabled` — `"bool"`
- `gating_enabled` — `"bool"`
- `rewards_enabled` — `"bool"`
- `timestamp` — `"i64"`

#### `ApplicationAuthorityNominated`

Kind: `struct`

- `application` — `"pubkey"`
- `current_authority` — `"pubkey"`
- `pending_authority` — `"pubkey"`
- `timestamp` — `"i64"`

#### `ApplicationAuthorityTransferred`

Kind: `struct`

- `application` — `"pubkey"`
- `previous_authority` — `"pubkey"`
- `new_authority` — `"pubkey"`
- `timestamp` — `"i64"`

#### `ApplicationConfig`

Kind: `struct`

- `version` — `"u16"`
- `application` — `"pubkey"`
- `website_uri` — `"string"`
- `logo_uri` — `"string"`
- `support_uri` — `"string"`
- `description` — `"string"`
- `metadata_uri` — `"string"`
- `created_at` — `"i64"`
- `updated_at` — `"i64"`
- `bump` — `"u8"`

#### `ApplicationConfigConfigured`

Kind: `struct`

- `application` — `"pubkey"`
- `application_config` — `"pubkey"`
- `authority` — `"pubkey"`
- `timestamp` — `"i64"`

#### `ApplicationConfigUpdated`

Kind: `struct`

- `application` — `"pubkey"`
- `application_config` — `"pubkey"`
- `authority` — `"pubkey"`
- `timestamp` — `"i64"`

#### `ApplicationPaymentPolicy`

Kind: `struct`

- `version` — `"u16"`
- `application` — `"pubkey"`
- `application_asset` — `"pubkey"`
- `minimum_amount` — `"u64"`
- `maximum_amount` — `"u64"`
- `payments_enabled` — `"bool"`
- `protocol_fee_bps` — `"u16"`
- `application_fee_bps` — `"u16"`
- `treasury` — `"pubkey"`
- `created_at` — `"i64"`
- `updated_at` — `"i64"`
- `bump` — `"u8"`

#### `ApplicationRegistered`

Kind: `struct`

- `application` — `"pubkey"`
- `authority` — `"pubkey"`
- `application_id` — `"u64"`
- `selected_ecosystem` — `{"defined":{"name":"CanonicalEcosystem"}}`
- `name` — `"string"`
- `timestamp` — `"i64"`

#### `ApplicationRole`

Kind: `struct`

- `version` — `"u16"`
- `application` — `"pubkey"`
- `member` — `"pubkey"`
- `role` — `{"defined":{"name":"Role"}}`
- `active` — `"bool"`
- `created_at` — `"i64"`
- `updated_at` — `"i64"`
- `bump` — `"u8"`

#### `ApplicationRoleAssigned`

Kind: `struct`

- `application` — `"pubkey"`
- `member` — `"pubkey"`
- `role` — `{"defined":{"name":"Role"}}`
- `timestamp` — `"i64"`

#### `ApplicationRoleUpdated`

Kind: `struct`

- `application` — `"pubkey"`
- `member` — `"pubkey"`
- `role` — `{"defined":{"name":"Role"}}`
- `active` — `"bool"`
- `timestamp` — `"i64"`

#### `ApplicationStatus`

Kind: `enum`

- `Pending`
- `Active`
- `Suspended`
- `Disabled`

#### `ApplicationStatusChanged`

Kind: `struct`

- `application` — `"pubkey"`
- `authority` — `"pubkey"`
- `previous_status` — `{"defined":{"name":"ApplicationStatus"}}`
- `new_status` — `{"defined":{"name":"ApplicationStatus"}}`
- `timestamp` — `"i64"`

#### `AssetConfig`

Kind: `struct`

- `version` — `"u16"`
- `mint` — `"pubkey"`
- `token_program` — `"pubkey"`
- `asset_code` — `{"array":["u8",3]}`
- `domain` — `{"defined":{"name":"AssetDomain"}}`
- `decimals` — `"u8"`
- `enabled` — `"bool"`
- `registered_at` — `"i64"`
- `bump` — `"u8"`

#### `AssetDomain`

Kind: `enum`

- `ArtificialIntelligenceAndIoT`
- `HealthcareAndInsurance`
- `IntellectualPropertyAndLuxury`
- `TradeAndLogistics`
- `EntertainmentAndExperiences`
- `ManufacturingAndSupplyChain`

#### `AssetRegistered`

Kind: `struct`

- `mint` — `"pubkey"`
- `token_program` — `"pubkey"`
- `asset_code` — `{"array":["u8",3]}`
- `domain` — `{"defined":{"name":"AssetDomain"}}`
- `decimals` — `"u8"`
- `timestamp` — `"i64"`

#### `AuditAction`

Kind: `enum`

- `InitializeProtocol`
- `RegisterApplication`
- `RegisterAsset`
- `ConfigureAsset`
- `ProcessPayment`
- `RegisterMembership`
- `CreateReward`
- `ClaimReward`
- `AssignRole`
- `ConfigureGate`
- `PauseProtocol`
- `TransferAuthority`

#### `AuditCategory`

Kind: `enum`

- `Protocol`
- `Application`
- `Payment`
- `Access`
- `Membership`
- `Reward`
- `Security`

#### `AuditLog`

Kind: `struct`

- `version` — `"u16"`
- `event_schema_version` — `"u16"`
- `authority` — `"pubkey"`
- `application` — `"pubkey"`
- `action` — `{"defined":{"name":"AuditAction"}}`
- `category` — `{"defined":{"name":"AuditCategory"}}`
- `severity` — `{"defined":{"name":"AuditSeverity"}}`
- `reference` — `"pubkey"`
- `indexed_references` — `{"array":["pubkey",3]}`
- `metadata` — `"string"`
- `created_at` — `"i64"`
- `bump` — `"u8"`

#### `AuditLogRecorded`

Kind: `struct`

- `audit_log` — `"pubkey"`
- `event_schema_version` — `"u16"`
- `authority` — `"pubkey"`
- `application` — `"pubkey"`
- `action` — `{"defined":{"name":"AuditAction"}}`
- `category` — `{"defined":{"name":"AuditCategory"}}`
- `severity` — `{"defined":{"name":"AuditSeverity"}}`
- `reference` — `"pubkey"`
- `indexed_references` — `{"array":["pubkey",3]}`
- `metadata` — `"string"`
- `timestamp` — `"i64"`

#### `AuditSeverity`

Kind: `enum`

- `Info`
- `Notice`
- `Warning`
- `Critical`

#### `CanonicalEcosystem`

Kind: `enum`

- `BabyReptile`
- `BabyEagle`
- `BabyGoat`
- `BabyLion`
- `BabyBee`
- `BabyAgent`

#### `GateAccessVerified`

Kind: `struct`

- `application` — `"pubkey"`
- `wallet` — `"pubkey"`
- `mint` — `"pubkey"`
- `balance` — `"u64"`
- `minimum_amount` — `"u64"`
- `timestamp` — `"i64"`

#### `GateCondition`

Kind: `struct`

- `group` — `"u8"`
- `condition_type` — `{"defined":{"name":"GateConditionType"}}`
- `mint` — `"pubkey"`
- `minimum_amount` — `"u64"`
- `minimum_tier` — `"u16"`

#### `GateConditionType`

Kind: `enum`

- `HoldAmount`
- `MembershipTier`
- `NftOwnership`

#### `GatePolicy`

Kind: `struct`

- `version` — `"u16"`
- `application` — `"pubkey"`
- `application_asset` — `"pubkey"`
- `conditions` — `{"vec":{"defined":{"name":"GateCondition"}}}`
- `enabled` — `"bool"`
- `created_at` — `"i64"`
- `updated_at` — `"i64"`
- `bump` — `"u8"`

#### `GatePolicyAccessVerified`

Kind: `struct`

- `application` — `"pubkey"`
- `application_asset` — `"pubkey"`
- `wallet` — `"pubkey"`
- `satisfied_group` — `"u8"`
- `timestamp` — `"i64"`

#### `GatePolicyConfigured`

Kind: `struct`

- `application` — `"pubkey"`
- `application_asset` — `"pubkey"`
- `condition_count` — `"u8"`
- `group_count` — `"u8"`
- `enabled` — `"bool"`
- `timestamp` — `"i64"`

#### `GateType`

Kind: `enum`

- `HoldAmount`
- `NFTCollection`
- `MembershipTier`

#### `Membership`

Kind: `struct`

- `version` — `"u16"`
- `application` — `"pubkey"`
- `member` — `"pubkey"`
- `tier` — `"u16"`
- `status` — `{"defined":{"name":"MembershipStatus"}}`
- `membership_kind` — `{"defined":{"name":"MembershipKind"}}`
- `nft_mint` — `"pubkey"`
- `nft_verified` — `"bool"`
- `expires_at` — `"i64"`
- `renewable` — `"bool"`
- `auto_extend` — `"bool"`
- `renewal_duration` — `"i64"`
- `renewal_count` — `"u32"`
- `created_at` — `"i64"`
- `updated_at` — `"i64"`
- `bump` — `"u8"`

#### `MembershipKind`

Kind: `enum`

- `Standard`
- `Nft`

#### `MembershipRegistered`

Kind: `struct`

- `application` — `"pubkey"`
- `member` — `"pubkey"`
- `selected_ecosystem` — `{"defined":{"name":"CanonicalEcosystem"}}`
- `token_address` — `"pubkey"`
- `tier` — `"u16"`
- `expires_at` — `"i64"`
- `renewable` — `"bool"`
- `auto_extend` — `"bool"`
- `renewal_duration` — `"i64"`
- `membership_kind` — `{"defined":{"name":"MembershipKind"}}`
- `nft_mint` — `"pubkey"`
- `timestamp` — `"i64"`

#### `MembershipRenewed`

Kind: `struct`

- `application` — `"pubkey"`
- `member` — `"pubkey"`
- `selected_ecosystem` — `{"defined":{"name":"CanonicalEcosystem"}}`
- `token_address` — `"pubkey"`
- `tier` — `"u16"`
- `expires_at` — `"i64"`
- `auto_extend` — `"bool"`
- `renewal_duration` — `"i64"`
- `renewal_count` — `"u32"`
- `timestamp` — `"i64"`

#### `MembershipStatus`

Kind: `enum`

- `Active`
- `Expired`
- `Suspended`

#### `MembershipUpdated`

Kind: `struct`

- `application` — `"pubkey"`
- `member` — `"pubkey"`
- `selected_ecosystem` — `{"defined":{"name":"CanonicalEcosystem"}}`
- `token_address` — `"pubkey"`
- `tier` — `"u16"`
- `status` — `{"defined":{"name":"MembershipStatus"}}`
- `expires_at` — `"i64"`
- `renewable` — `"bool"`
- `auto_extend` — `"bool"`
- `renewal_duration` — `"i64"`
- `timestamp` — `"i64"`

#### `NftMembershipVerified`

Kind: `struct`

- `application` — `"pubkey"`
- `member` — `"pubkey"`
- `selected_ecosystem` — `{"defined":{"name":"CanonicalEcosystem"}}`
- `token_address` — `"pubkey"`
- `nft_mint` — `"pubkey"`
- `nft_token_account` — `"pubkey"`
- `timestamp` — `"i64"`

#### `PaymentPolicyConfigured`

Kind: `struct`

- `application` — `"pubkey"`
- `application_asset` — `"pubkey"`
- `payment_policy` — `"pubkey"`
- `minimum_amount` — `"u64"`
- `maximum_amount` — `"u64"`
- `payments_enabled` — `"bool"`
- `protocol_fee_bps` — `"u16"`
- `application_fee_bps` — `"u16"`
- `treasury` — `"pubkey"`
- `timestamp` — `"i64"`

#### `PaymentProcessed`

Kind: `struct`

- `application` — `"pubkey"`
- `payer` — `"pubkey"`
- `mint` — `"pubkey"`
- `destination` — `"pubkey"`
- `treasury` — `"pubkey"`
- `amount` — `"u64"`
- `net_amount` — `"u64"`
- `protocol_fee` — `"u64"`
- `application_fee` — `"u64"`
- `timestamp` — `"i64"`

#### `ProtocolAuthorityNominated`

Kind: `struct`

- `current_authority` — `"pubkey"`
- `pending_authority` — `"pubkey"`
- `timestamp` — `"i64"`

#### `ProtocolAuthorityTransferred`

Kind: `struct`

- `previous_authority` — `"pubkey"`
- `new_authority` — `"pubkey"`
- `timestamp` — `"i64"`

#### `ProtocolConfig`

Kind: `struct`

- `version` — `"u16"`
- `authority` — `"pubkey"`
- `pending_authority` — `{"option":"pubkey"}`
- `paused` — `"bool"`
- `application_count` — `"u64"`
- `asset_count` — `"u16"`
- `bump` — `"u8"`

#### `ProtocolInitialized`

Kind: `struct`

- `authority` — `"pubkey"`
- `version` — `"u16"`
- `timestamp` — `"i64"`

#### `ProtocolPauseChanged`

Kind: `struct`

- `authority` — `"pubkey"`
- `paused` — `"bool"`
- `timestamp` — `"i64"`

#### `Reward`

Kind: `struct`

- `version` — `"u16"`
- `application` — `"pubkey"`
- `beneficiary` — `"pubkey"`
- `reward_id` — `"u64"`
- `asset` — `"pubkey"`
- `amount` — `"u64"`
- `status` — `{"defined":{"name":"RewardStatus"}}`
- `created_at` — `"i64"`
- `claimable_at` — `"i64"`
- `expires_at` — `"i64"`
- `claimed_at` — `"i64"`
- `cancelled_at` — `"i64"`
- `category` — `"u8"`
- `reason` — `"string"`
- `bump` — `"u8"`

#### `RewardCancelled`

Kind: `struct`

- `application` — `"pubkey"`
- `beneficiary` — `"pubkey"`
- `reward_id` — `"u64"`
- `asset` — `"pubkey"`
- `amount` — `"u64"`
- `cancelled_at` — `"i64"`

#### `RewardClaimed`

Kind: `struct`

- `application` — `"pubkey"`
- `beneficiary` — `"pubkey"`
- `reward_id` — `"u64"`
- `asset` — `"pubkey"`
- `amount` — `"u64"`
- `timestamp` — `"i64"`

#### `RewardCreated`

Kind: `struct`

- `application` — `"pubkey"`
- `beneficiary` — `"pubkey"`
- `reward_id` — `"u64"`
- `asset` — `"pubkey"`
- `amount` — `"u64"`
- `claimable_at` — `"i64"`
- `expires_at` — `"i64"`
- `category` — `"u8"`
- `reason` — `"string"`
- `timestamp` — `"i64"`

#### `RewardStatus`

Kind: `enum`

- `Pending`
- `Claimable`
- `Claimed`
- `Cancelled`

#### `Role`

Kind: `enum`

- `Owner`
- `Admin`
- `Operator`
- `Auditor`

#### `TokenGate`

Kind: `struct`

- `version` — `"u16"`
- `application` — `"pubkey"`
- `application_asset` — `"pubkey"`
- `gate_type` — `{"defined":{"name":"GateType"}}`
- `minimum_amount` — `"u64"`
- `minimum_tier` — `"u16"`
- `enabled` — `"bool"`
- `created_at` — `"i64"`
- `updated_at` — `"i64"`
- `bump` — `"u8"`

#### `TokenGateConfigured`

Kind: `struct`

- `application` — `"pubkey"`
- `application_asset` — `"pubkey"`
- `gate_type` — `{"defined":{"name":"GateType"}}`
- `minimum_amount` — `"u64"`
- `minimum_tier` — `"u16"`
- `enabled` — `"bool"`
- `timestamp` — `"i64"`

### `BabycowansSDK` high-level methods

- `findProtocolConfig`
- `findAssetConfig`
- `findApplication`
- `findApplicationConfig`
- `findApplicationAsset`
- `findApplicationRole`
- `findMembership`
- `findReward`
- `findTokenGate`
- `findAuditLog`
- `resolveApplicationExperience`
- `resolveCanonicalTokenMetadata`
- `registerApplication`
- `buildRegisterApplicationInstruction`
- `bootstrapApplication`
- `buildApplicationBootstrapPlan`
- `processPayment`
- `buildProcessPaymentInstruction`
- `createReward`
- `findRewardPda`
- `buildCreateRewardInstruction`
- `claimReward`
- `buildClaimRewardInstruction`
- `cancelReward`
- `buildCancelRewardInstruction`
- `configureApplicationConfig`
- `findApplicationConfigPda`
- `buildConfigureApplicationConfigInstruction`
- `updateApplicationConfig`
- `buildUpdateApplicationConfigInstruction`
- `registerMembership`
- `findMembershipPda`
- `buildRegisterMembershipInstruction`
- `updateMembership`
- `buildUpdateMembershipInstruction`
- `renewMembership`
- `buildRenewMembershipInstruction`
- `verifyNftMembership`
- `buildVerifyNftMembershipInstruction`
- `configureTokenGate`
- `findTokenGatePda`
- `buildConfigureTokenGateInstruction`
- `verifyGateAccess`
- `buildVerifyGateAccessInstruction`
- `decodeEvents`
- `if`
- `decoder`
- `getApplication`
- `getMembership`
- `getReward`
- `getAuditHistory`
- `for`
- `decodeAuditLogAccount`
- `accountExists`
- `buildTransaction`
- `buildVersionedTransaction`

### SDK developer commands

- `yarn build` — `tsc -p tsconfig.json`
- `yarn test:audit` — `node scripts/runtime-audit-gate.cjs`
- `yarn test:decoder` — `tsx tests/decoder-layout.test.ts`
- `yarn test:dependencies` — `node scripts/runtime-dependency-guard.cjs --verify`
- `yarn test:e2e` — `tsx tests/run-e2e-isolated.ts`
- `yarn test:e2e:application` — `tsx tests/e2e-register-application.test.ts`
- `yarn test:e2e:asset` — `tsx tests/e2e-register-asset.test.ts`
- `yarn test:e2e:audit` — `tsx tests/e2e-audit-log.test.ts`
- `yarn test:e2e:configure` — `tsx tests/e2e-configure-application-asset.test.ts`
- `yarn test:e2e:golden` — `tsx tests/e2e-golden-path.test.ts`
- `yarn test:e2e:initialize` — `tsx tests/e2e-initialize.test.ts`
- `yarn test:e2e:membership` — `tsx tests/e2e-register-membership.test.ts`
- `yarn test:e2e:payment` — `tsx tests/e2e-process-payment.test.ts`
- `yarn test:e2e:reward` — `tsx tests/e2e-reward.test.ts`
- `yarn test:god` — `BABYCOWANS_PHASE=BRC yarn test:god:phase && BABYCOWANS_PHASE=BEC yarn test:god:phase && BABYCOWANS_PHASE=BGC yarn test:god:phase && BABYCOWANS_PHASE=BLC yarn test:god:phase && BABYCOWANS_PHASE=BBC yarn test:god:phase && BABYCOWANS_PHASE=BAC yarn test:god:phase`
- `yarn test:god:isolated` — `BABYCOWANS_ISOLATED_SUITE=god tsx tests/run-e2e-isolated.ts`
- `yarn test:god:phase` — `tsx tests/e2e-golden-path.test.ts`
- `yarn test:idl` — `tsx tests/idl-consistency.test.ts`
- `yarn test:instructions` — `tsx tests/instructions.test.ts`
- `yarn test:pda` — `tsx tests/pda.test.ts`
- `yarn typecheck` — `tsc -p tsconfig.json --noEmit`
