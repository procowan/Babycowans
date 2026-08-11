# Babycowans Protocol Guide

This document explains the conceptual model of **Babycowans Protocol V1.0.0**.

Use this guide to understand the protocol. Use [API.md](API.md) for SDK method reference and [COOKBOOK.md](COOKBOOK.md) for task-oriented examples.

## 1. Mental model

Babycowans provides shared Solana infrastructure for applications integrating one of six canonical ecosystems.

A developer selects an existing canonical ecosystem. The application does not create or redefine ecosystem identity.

```text
Canonical Ecosystem
        ↓
Application
        ↓
Application Configuration
        ↓
Application Asset Capabilities
        ↓
Payments / Membership / Rewards / Gates / Audit
```

## 2. Canonical ecosystem identity

The six canonical ecosystems are:

| Ecosystem | SDK enum |
|---|---|
| Baby Reptile Coin | `CanonicalEcosystem.BabyReptile` |
| Baby Eagle Coin | `CanonicalEcosystem.BabyEagle` |
| Baby Goat Coin | `CanonicalEcosystem.BabyGoat` |
| Baby Lion Coin | `CanonicalEcosystem.BabyLion` |
| Baby Bee Coin | `CanonicalEcosystem.BabyBee` |
| Baby Agent Coin | `CanonicalEcosystem.BabyAgent` |

Each contains four protocol identity properties:

1. Full Name
2. Ticker
3. Token Address
4. Mission

These are canonical protocol identity.

Application-hosted metadata can describe an application but cannot redefine canonical ecosystem identity.

Do not copy canonical token addresses from memory. Resolve identity through current repository definitions or the SDK canonical registry.

## 3. ProtocolConfig

`ProtocolConfig` represents protocol-level state.

It records:

- authority;
- pending authority;
- pause state;
- application count;
- asset count.

Protocol authority is distinct from application authority.

## 4. Application

`Application` is the root account of a Babycowans integration.

It records:

- application ID;
- authority;
- pending authority;
- selected canonical ecosystem;
- status;
- name.

The ecosystem choice is persisted on-chain.

## 5. ApplicationConfig

`ApplicationConfig` stores application-specific metadata:

- website URI;
- logo URI;
- support URI;
- description;
- metadata URI;
- created / updated timestamps.

The separation is intentional:

```text
Canonical Ecosystem Identity
            ≠
Application Metadata
```

## 6. AssetConfig

`AssetConfig` represents protocol-recognized canonical asset configuration.

It includes:

- mint;
- token program;
- asset code;
- domain;
- decimals;
- enabled state.

Application-level asset configuration depends on the relevant protocol AssetConfig.

## 7. ApplicationAsset

`ApplicationAsset` connects an Application to an AssetConfig.

It records:

- application;
- asset configuration;
- mint;
- token program;
- payment destination;
- payments enabled;
- gating enabled;
- rewards enabled.

Several downstream operations depend on this state.

## 8. Payments

The application payment path relies on:

```text
Application
    +
ApplicationAsset
    +
AssetConfig
    +
ApplicationPaymentPolicy
```

Payment policy state controls:

- minimum amount;
- maximum amount;
- payment enablement;
- protocol fee basis points;
- application fee basis points;
- treasury.

Use the SDK's builders or High-Level API rather than recreating instruction encoding or fee/account contracts manually.

## 9. Memberships

A Membership is derived from:

```text
Application + Member
```

Membership state includes:

- tier;
- status;
- membership kind;
- NFT mint;
- NFT verification state;
- expiry;
- renewable state;
- auto extension;
- renewal duration;
- renewal count.

Lifecycle:

```text
Register
   ↓
Update
   ↓
Renew
```

NFT memberships additionally support ownership verification.

The canonical ecosystem is inherited from the parent Application.

## 10. Rewards

A Reward is derived from:

```text
Application
+ Beneficiary
+ Reward ID
```

Reward state includes:

- asset;
- amount;
- status;
- creation time;
- claimable time;
- expiry;
- claimed time;
- cancelled time;
- category;
- reason.

Lifecycle:

```text
Create
 ├──→ Claim
 └──→ Cancel
```

Scheduled and expiring rewards use the protocol's time fields rather than a separate reward system.

## 11. Token gates

`TokenGate` represents direct application access gating.

State includes:

- application;
- application asset;
- gate type;
- minimum amount;
- minimum tier;
- enabled state.

## 12. Composable gate policies

`GatePolicy` provides composable access logic using conditions grouped for evaluation.

Conceptually:

```text
Conditions inside a group → AND
Multiple groups           → OR
```

Developers should use the protocol policy model instead of implementing a second incompatible policy engine.

## 13. Application roles

`ApplicationRole` is application-scoped authorization.

Identity:

```text
Application + Member
```

Role management is separate from protocol authority.

The role lifecycle supports assignment and later updates.

## 14. Audit logs

`AuditLog` records structured application activity.

It includes:

- event schema version;
- authority;
- application;
- action;
- category;
- severity;
- reference;
- three indexed references;
- metadata;
- creation time.

The High-Level Read API exposes application-scoped audit history.

## 15. Events

Babycowans instructions emit Anchor events for major lifecycle actions.

The authoritative event schema is defined by:

```text
Rust events
    ↓
Protocol IDL
    ↓
SDK Event Decoder
```

Do not reconstruct event layouts from documentation or memory.

## 16. Write path

```text
Developer
    ↓
BabycowansSDK
    ↓
Instruction Builder
    ↓
TransactionHelper
    ↓
Solana Transaction
    ↓
Babycowans Program
    ↓
Accounts + Events
```

High-Level APIs orchestrate existing primitives. They do not replace the Low-Level source of truth.

## 17. Read path

```text
Developer
    ↓
BabycowansSDK Read API
    ↓
Canonical PDA / Program Query
    ↓
Account Decoder
    ↓
Typed SDK Model
```

Current High-Level Read helpers include:

```text
getApplication
getMembership
getReward
getAuditHistory
```

Single-account reads return `null` for a missing PDA.

Audit history returns `[]` when there are no matching records.

## 18. Event Decoder

`client.decodeEvents(signature)` fetches a transaction and decodes Babycowans events from transaction logs.

The decoder preserves:

- Babycowans program scoping;
- event ordering;
- `PublicKey` fidelity;
- `u64` / `i64` fidelity through `bigint`.

Unrelated logs are ignored.

## 19. Atomic application bootstrap

The canonical Batch Instructions flow is:

```text
RegisterApplication
        ↓
ConfigureApplicationConfig
        ↓
optional AssignApplicationRole
```

The instructions execute in one Solana transaction.

Properties:

- one transaction;
- one signature;
- deterministic ordering;
- atomic rollback if any later instruction fails.

This is a bounded canonical batch, not a generic workflow engine.

## 20. Source-of-truth boundaries

| Concern | Repository authority |
|---|---|
| Canonical ecosystem identity | canonical Rust definitions + generated SDK registry |
| Protocol accounts | Rust state + SDK account models |
| Instruction contract | Rust handlers + SDK builders |
| PDA derivation | protocol seeds + SDK PDA helpers |
| Events | Rust events + IDL + SDK Event Decoder |
| Errors | protocol `error.rs` |
| Public SDK API | SDK root exports + `BabycowansSDK` |

Production documentation is downstream of implementation and must never become an independent protocol schema.

## Next

- [Architecture](ARCHITECTURE.md)
- [SDK Guide](SDK.md)
- [API Reference](API.md)
- [Cookbook](COOKBOOK.md)
- [Integration Compatibility](MIGRATION.md)
