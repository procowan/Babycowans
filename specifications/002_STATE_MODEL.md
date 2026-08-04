# Babycowans Protocol State Model

## 1. Purpose

This document defines the complete Version 1 on-chain state model of the Babycowans Protocol.

The protocol stores only data required for decentralized identity, authorization, configuration, settlement validation, and security.

Application metadata, descriptions, logos, analytics, and user-interface content remain off-chain.

---

## 2. State Design Rules

All protocol-owned accounts must:

- use deterministic Program Derived Addresses
- have one explicitly defined authority
- store a schema version
- store their PDA bump
- use fixed-size fields where practical
- validate all related accounts before mutation
- avoid storing private or unnecessary user data
- remain independently readable through the public IDL

No account may contain seed phrases, private keys, personal information, or arbitrary executable data.

---

## 3. Canonical Accounts

Version 1 contains six protocol-owned account types:

1. `ProtocolConfig`
2. `AssetConfig`
3. `Application`
4. `ApplicationAsset`
5. `GatePolicy`
6. `RewardCampaign`

Payments do not create permanent payment-record accounts.

Successful operations emit verifiable events instead, preventing unnecessary account creation and storage costs.---

## 4. ProtocolConfig

### Purpose

`ProtocolConfig` is the singleton configuration account for the deployed Babycowans program.

### PDA

```text
["protocol"]
```

### Fields

```text
version: u16
authority: Pubkey
pending_authority: Option<Pubkey>
paused: bool
application_count: u64
asset_count: u16
bump: u8
```

### Authority

The protocol authority may:

- register or disable canonical Babycowans assets
- pause security-sensitive instructions
- nominate a replacement authority
- complete documented migrations

The authority may not:

- transfer user tokens
- seize application funds
- modify user wallet balances
- authorize payments on behalf of users
- create undocumented fees

Authority transfer must use a two-step process:

1. nominate a pending authority
2. require the pending authority to accept

---

## 5. AssetConfig

### Purpose

`AssetConfig` registers one canonical Babycowans ecosystem token.

Exactly six canonical asset configurations are expected for Version 1.

### PDA

```text
["asset", mint]
```

### Fields

```text
version: u16
mint: Pubkey
token_program: Pubkey
asset_code: [u8; 3]
domain: AssetDomain
decimals: u8
enabled: bool
registered_at: i64
bump: u8
```

### AssetDomain

```text
ArtificialIntelligenceAndIoT
HealthcareAndInsurance
IntellectualPropertyAndLuxury
TradeAndLogistics
EntertainmentAndExperiences
ManufacturingAndSupplyChain
```

### Validation

Registration must verify:

- the mint account exists
- the mint is owned by an approved token program
- the configured decimals equal the mint decimals
- the mint has not already been registered
- the three-byte asset code is unique
- only the six approved Babycowans mints are registered as canonical assets

### Token Programs

An asset may use:

- the original SPL Token Program
- the Token-2022 Program

The protocol must record and validate the correct token program for every asset.

---

## 6. Application

### Purpose

`Application` represents an external software product or service integrating Babycowans.

It may represent:

- a web application
- a mobile application
- a game
- an AI service
- an IoT service
- a marketplace
- a bot
- an API
- any other software integration

### PDA

```text
["application", authority, application_id]
```

### application_id

`application_id` is a developer-generated 32-byte identifier.

It must be unique under the application authority.

Human-readable names and descriptions remain off-chain.

### Fields

```text
version: u16
application_id: [u8; 32]
authority: Pubkey
pending_authority: Option<Pubkey>
status: ApplicationStatus
created_at: i64
updated_at: i64
bump: u8
```

### ApplicationStatus

```text
Active
Suspended
Closed
```

### Authority

The application authority may:

- configure supported Babycowans assets
- create gate policies
- create reward campaigns
- nominate a replacement application authority
- close eligible application-owned configuration accounts

Application authority transfer must use a two-step acceptance process.---

## 7. ApplicationAsset

### Purpose

`ApplicationAsset` connects one registered application to one canonical Babycowans asset.

It defines how that application uses the asset for payments and utility.

### PDA

```text
["application_asset", application, mint]
```

### Fields

```text
version: u16
application: Pubkey
asset_config: Pubkey
mint: Pubkey
token_program: Pubkey
payment_destination: Pubkey
payments_enabled: bool
gating_enabled: bool
rewards_enabled: bool
created_at: i64
updated_at: i64
bump: u8
```

### payment_destination

`payment_destination` must be a token account that:

- uses the configured mint
- is owned by the expected Token Program
- has an explicitly validated token-account authority
- is approved by the application authority

The protocol never stores or controls the destination wallet's private key.

---

## 8. GatePolicy

### Purpose

`GatePolicy` defines a reusable token-access condition for an application.

An application may create multiple gate policies.

### PDA

```text
["gate", application, gate_id]
```

### gate_id

`gate_id` is an application-defined 32-byte identifier.

### Fields

```text
version: u16
gate_id: [u8; 32]
application: Pubkey
asset_config: Pubkey
mint: Pubkey
minimum_amount: u64
status: PolicyStatus
created_at: i64
updated_at: i64
bump: u8
```

### PolicyStatus

```text
Active
Disabled
```

### Verification

A gate check succeeds only when:

- the policy is active
- the application is active
- the asset is enabled
- the supplied token account belongs to the requesting wallet
- the supplied token account uses the configured mint
- the token balance is greater than or equal to `minimum_amount`

A gate check does not transfer or lock tokens.---

## 9. RewardCampaign

### Purpose

`RewardCampaign` defines a controlled token-reward source for an application.

An application may create multiple reward campaigns.

### PDA

```text
["reward", application, campaign_id]
```

### campaign_id

`campaign_id` is an application-defined 32-byte identifier.

### Fields

```text
version: u16
campaign_id: [u8; 32]
application: Pubkey
asset_config: Pubkey
mint: Pubkey
vault: Pubkey
vault_authority: Pubkey
distribution_authority: Pubkey
maximum_reward_per_transfer: u64
distributed_amount: u64
status: CampaignStatus
created_at: i64
updated_at: i64
bump: u8
```

### CampaignStatus

```text
Active
Paused
Closed
```

### Reward Security

A reward transfer requires:

- an active application
- an enabled canonical asset
- an active campaign
- the authorized distribution signer
- the correct reward vault
- the correct recipient token account
- an amount no greater than `maximum_reward_per_transfer`
- checked arithmetic
- a checked token transfer

Version 1 does not implement hidden minting or arbitrary inflation.

Rewards may only be distributed from an explicitly funded vault.

---

## 10. Loyalty Model

Version 1 does not create a separate on-chain user profile or proprietary points balance.

Loyalty behavior is composed from:

- verified payments
- gate policies
- reward campaigns
- protocol events
- application-defined off-chain rules

This keeps personal activity and non-critical business logic outside the blockchain while preserving verifiable token operations on-chain.---

## 11. Events Instead of Transaction Accounts

The protocol emits events for successful state changes and utility operations.

Version 1 events include:

```text
ProtocolInitialized
ProtocolAuthorityNominated
ProtocolAuthorityTransferred
ProtocolPauseChanged

AssetRegistered
AssetStatusChanged

ApplicationRegistered
ApplicationAuthorityNominated
ApplicationAuthorityTransferred
ApplicationStatusChanged

ApplicationAssetConfigured
ApplicationAssetStatusChanged

PaymentProcessed

GatePolicyCreated
GatePolicyUpdated
GateAccessVerified

RewardCampaignCreated
RewardCampaignUpdated
RewardDistributed
```

Events provide verifiable integration data without creating a permanent account for every payment, gate check, or reward.

---

## 12. Data Excluded from On-Chain State

The following data must remain off-chain:

- application names
- application descriptions
- logos and images
- websites and social links
- customer personal information
- user behavior histories
- private analytics
- marketing content
- business scoring
- arbitrary JSON documents
- confidential commercial terms

Applications may associate this data with their 32-byte identifiers through their own systems or through optional Babycowans indexing services.

---

## 13. Account Closure

An account may be closed only when:

- the signer is the documented authority
- all account relationships are validated
- no active dependent configuration requires the account
- closure does not give the protocol custody of user funds
- rent is returned to the documented recipient

Canonical `ProtocolConfig` and active `AssetConfig` accounts are not closable in Version 1.

---

## 14. Versioning

Every protocol-owned account begins with a schema version.

Version 1 accounts use:

```text
version = 1
```

Future schema changes must provide:

- a documented migration
- backward-compatibility analysis
- updated SDK support
- migration tests
- a new protocol release

Public account layouts must never change silently.

---

## 15. State Model Invariants

The implementation must preserve these invariants:

1. One `ProtocolConfig` exists per deployed program.
2. One `AssetConfig` exists per canonical mint.
3. An application is uniquely identified by its authority and `application_id`.
4. One `ApplicationAsset` exists per application and mint pair.
5. A gate policy belongs to exactly one application and one canonical asset.
6. A reward campaign belongs to exactly one application and one canonical asset.
7. Payments always settle to the registered application destination.
8. Reward transfers always originate from the registered campaign vault.
9. No instruction can move tokens without the required signer or PDA authority.
10. Disabling a configuration prevents new operations but does not alter historical events.
11. No protocol instruction stores private user information.
12. No protocol account contains undocumented administrative behavior.

