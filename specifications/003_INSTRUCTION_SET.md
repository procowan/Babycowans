# Babycowans Protocol Instruction Set

## 1. Purpose

This specification defines every public instruction exposed by the Babycowans Protocol Program.

Each instruction specifies:

- required accounts
- signer requirements
- PDA derivation
- account constraints
- state mutations
- emitted events
- failure conditions
- security requirements

No undocumented instruction may exist inside the deployed program.

---

## 2. Design Rules

Every instruction must satisfy the following principles.

### Deterministic

The same inputs always produce the same result.

### Explicit

Every writable account is explicitly declared.

### Permissioned

Every state mutation requires documented authorization.

### Canonical

Instructions never infer accounts from client assumptions.

Every PDA must be derived and validated.

### Upgrade Safe

Instruction interfaces must remain backward compatible within a major protocol version whenever possible.

---

## 3. Instruction Categories

Version 1 contains six groups of instructions.

### Protocol Administration

- initialize_protocol
- nominate_protocol_authority
- accept_protocol_authority
- set_protocol_pause

### Canonical Asset Management

- register_asset
- update_asset_status

### Application Management

- register_application
- nominate_application_authority
- accept_application_authority
- update_application_status

### Application Configuration

- configure_application_asset
- create_gate_policy
- update_gate_policy
- create_reward_campaign
- update_reward_campaign

### Payment

- process_payment

### Verification

- verify_gate_access

---

## 4. Common Validation Rules

Every instruction performs the following validation when applicable.

- account ownership
- PDA derivation
- discriminator validation
- signer verification
- writable account verification
- canonical mint validation
- bump validation
- duplicate account prevention
- integer overflow protection
- arithmetic safety
- protocol pause validation
- account version validation---

## 5. initialize_protocol

### Purpose

Creates the canonical ProtocolConfig account.

This instruction may execute exactly once.

### Required Accounts

- protocol_config (PDA, writable)
- protocol_authority (signer)
- system_program

### Validation

The implementation must verify:

- ProtocolConfig does not already exist
- PDA is correct
- authority signed
- version equals 1

### State Changes

Creates:

- ProtocolConfig

Stores:

- protocol authority
- protocol version
- protocol paused = false

### Events

- ProtocolInitialized

### Errors

- ProtocolAlreadyInitialized
- InvalidAuthority
- InvalidPDA

---

## 6. nominate_protocol_authority

### Purpose

Begins authority transfer.

### Required Accounts

- protocol_config
- current_authority (signer)

### State Changes

Stores:

- pending authority

### Events

- ProtocolAuthorityNominated

---

## 7. accept_protocol_authority

### Purpose

Completes protocol authority transfer.

### Required Accounts

- protocol_config
- pending_authority (signer)

### Validation

- pending authority matches signer

### State Changes

Updates:

- authority

Clears:

- pending authority

### Events

- ProtocolAuthorityTransferred

---

## 8. set_protocol_pause

### Purpose

Pauses or resumes protocol operations.

### Required Accounts

- protocol_config
- authority (signer)

### State Changes

Updates:

- protocol paused

### Events

- ProtocolPauseChanged---

## 9. register_asset

### Purpose

Registers one canonical Babycowans asset.

### Required Accounts

- protocol_config
- asset_config (PDA, writable)
- mint
- authority (signer)
- system_program

### Validation

The implementation verifies:

- protocol is initialized
- protocol is not paused
- signer is protocol authority
- mint is supported
- asset is not already registered
- PDA is correct
- decimals match mint
- token program is supported

### State Changes

Creates:

- AssetConfig

### Events

- AssetRegistered

### Errors

- AssetAlreadyRegistered
- UnsupportedMint
- InvalidMint
- InvalidDecimals
- InvalidPDA

---

## 10. update_asset_status

### Purpose

Enables or disables a canonical asset.

### Required Accounts

- protocol_config
- asset_config
- authority (signer)

### Validation

- protocol authority signed

### State Changes

Updates:

- asset status

### Events

- AssetStatusChanged

### Errors

- InvalidAuthority
- InvalidAsset---

## 11. register_application

### Purpose

Registers a developer application that integrates with the protocol.

### Required Accounts

- protocol_config
- application (PDA, writable)
- application_authority (signer)
- system_program

### Validation

The implementation verifies:

- protocol is initialized
- protocol is not paused
- application PDA is correct
- application does not already exist
- application_id is unique for the authority

### State Changes

Creates:

- Application

### Events

- ApplicationRegistered

### Errors

- ApplicationAlreadyExists
- InvalidApplicationId
- InvalidPDA

---

## 12. nominate_application_authority

### Purpose

Begins application ownership transfer.

### Required Accounts

- application
- current_authority (signer)

### State Changes

Stores:

- pending authority

### Events

- ApplicationAuthorityNominated

---

## 13. accept_application_authority

### Purpose

Completes application ownership transfer.

### Required Accounts

- application
- pending_authority (signer)

### Validation

- pending authority matches signer

### State Changes

Updates:

- application authority

Clears:

- pending authority

### Events

- ApplicationAuthorityTransferred

---

## 14. update_application_status

### Purpose

Activates or disables an application.

### Required Accounts

- application
- authority (signer)

### Validation

- signer is application authority

### State Changes

Updates:

- application status

### Events

- ApplicationStatusChanged---

## 15. configure_application_asset

### Purpose

Associates a registered application with one canonical Babycowans asset.

### Required Accounts

- application
- asset_config
- application_asset (PDA, writable)
- authority (signer)
- system_program

### Validation

The implementation verifies:

- application exists
- asset exists
- signer owns the application
- configuration does not already exist
- payment destination is valid

### State Changes

Creates:

- ApplicationAsset

### Events

- ApplicationAssetConfigured

### Errors

- InvalidApplication
- InvalidAsset
- InvalidPaymentDestination
- ConfigurationAlreadyExists

---

## 16. create_gate_policy

### Purpose

Creates a token-gating policy for an application.

### Required Accounts

- application
- application_asset
- gate_policy (PDA, writable)
- authority (signer)
- system_program

### Validation

- application exists
- application asset exists
- signer owns application
- gate_id is unique

### State Changes

Creates:

- GatePolicy

### Events

- GatePolicyCreated

---

## 17. update_gate_policy

### Purpose

Updates an existing gate policy.

### Required Accounts

- gate_policy
- authority (signer)

### Validation

- signer owns application

### State Changes

Updates:

- gate configuration

### Events

- GatePolicyUpdated---

## 18. create_reward_campaign

### Purpose

Creates a reward distribution campaign.

### Required Accounts

- application
- application_asset
- reward_campaign (PDA, writable)
- authority (signer)
- system_program

### Validation

The implementation verifies:

- application exists
- application asset exists
- signer owns application
- campaign_id is unique
- reward vault configuration is valid

### State Changes

Creates:

- RewardCampaign

### Events

- RewardCampaignCreated

---

## 19. update_reward_campaign

### Purpose

Updates an existing reward campaign.

### Required Accounts

- reward_campaign
- authority (signer)

### Validation

- signer owns application

### State Changes

Updates:

- campaign configuration

### Events

- RewardCampaignUpdated

---

## 20. process_payment

### Purpose

Transfers a supported Babycowans asset from a payer to an application's registered payment destination.

### Required Accounts

- application
- application_asset
- asset_config
- payer (signer)
- payer token account
- destination token account
- token program

### Validation

The implementation verifies:

- application is active
- asset is active
- application asset is active
- payment amount is valid
- token program matches asset configuration
- destination matches registered payment destination

### State Changes

No protocol-owned account is modified.

### Events

- PaymentProcessed

---

## 21. verify_gate_access

### Purpose

Verifies whether a wallet satisfies a gate policy.

### Required Accounts

- gate_policy
- application_asset
- user token account
- asset mint

### Validation

The implementation verifies:

- policy is active
- application asset is active
- asset is active
- wallet satisfies the configured rule

### State Changes

None.

### Events

- GateAccessVerified---

## 22. Error Model

Every public instruction must return documented errors only.

Version 1 defines:

- InvalidAuthority
- InvalidPDA
- InvalidVersion
- ProtocolPaused
- UnsupportedMint
- InvalidMint
- InvalidDecimals
- AssetAlreadyRegistered
- InvalidAsset
- ApplicationAlreadyExists
- InvalidApplication
- InvalidApplicationId
- ConfigurationAlreadyExists
- InvalidPaymentDestination
- InvalidGate
- InvalidCampaign
- InvalidAmount
- InvalidTokenProgram
- ArithmeticOverflow

No undocumented custom error may be introduced.

---

## 23. Event Model

Every successful instruction emits exactly one primary event.

Events are never emitted on failure.

Events are append-only and become part of the permanent protocol history.

---

## 24. Instruction Invariants

Every implementation must preserve the following invariants.

1. Every PDA is deterministically derived.
2. Every writable account is validated before mutation.
3. Every authority transition is two-step.
4. Every payment uses a registered canonical asset.
5. Every application owns only its own configurations.
6. Disabled objects cannot initiate new operations.
7. Protocol pause blocks state-changing instructions.
8. Verification instructions never mutate protocol state.
9. Payments never give protocol custody of user funds.
10. Every successful instruction emits exactly one documented event.

---

## 25. Versioning

This document defines the complete public instruction surface for Babycowans Protocol Version 1.

Any future public instruction requires:

- specification update
- implementation
- tests
- SDK update
- IDL regeneration
- documentation update
- release notes

No public instruction may exist outside this specification.

