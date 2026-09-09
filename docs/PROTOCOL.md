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

| Ecosystem | Ticker | SDK enum | Token Address | Mission |
|---|---|---|---|---|
| Baby Reptile Coin | `$BRC` | `CanonicalEcosystem.BabyReptile` | `25ZEDgK2R62VRnWbqzfKXire7Gdamkopkx6hqtBwpump` | This meme coin has come to revolutionize human interactions with the aim of tokenizing all kinds of entertainment and pleasure without any boundaries. |
| Baby Eagle Coin | `$BEC` | `CanonicalEcosystem.BabyEagle` | `BSf9mueWMeHMAJcbmVSY53H8jcQjwVK3oMRkmwnHpump` | This meme coin has come to revolutionize Legal interactions with the aim of tokenizing all kinds of trades; Import / Export businesses and Logistics without any boundaries. |
| Baby Goat Coin | `$BGC` | `CanonicalEcosystem.BabyGoat` | `BPCBXkCTYPN3JdcXJojDykmtSvPfykXTLcKnxwopump` | This meme coin has come to revolutionize Legal interactions with the aim of tokenizing all kinds of Intellectual property rights (IPR) & Luxury without any boundaries. |
| Baby Lion Coin | `$BLC` | `CanonicalEcosystem.BabyLion` | `GK1twW6K1o3JrnHjxaAk2LGfWkqRnMoBe6Vyydkpump` | This meme coin has come to revolutionize Legal interactions with the aim of tokenizing all kinds of manufacturing infrastructures and supply-chains, without any boundaries. |
| Baby Bee Coin | `$BBC` | `CanonicalEcosystem.BabyBee` | `2aso6jnQt3r5sUicejnCFbZupvKaUhezirqVKMjbpump` | This meme coin has come to revolutionize Legal interactions with the aim of tokenizing all kinds of Medical services & Health insurance without any boundaries. |
| Baby Agent Coin | `$BAC` | `CanonicalEcosystem.BabyAgent` | `DKBBNADxPhGU4yJihzMUu9fXacibXhYHnQhSo5Wopump` | This meme coin has come to revolutionize Legal interactions with the aim of tokenizing all kinds of Ai services along with IOT and Web3 without any boundaries. |

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

### Application PDA and authority rotation

The Application PDA is established during registration from the Application
seed domain, the registering authority, and the application ID. Later
application-authority rotation does not derive a replacement Application PDA.

Application authority rotation uses a separate two-step lifecycle. The current
authority nominates `Application.pending_authority`; the nominated signer then
accepts, which updates `Application.authority` and clears
`pending_authority`.

Application-scoped role records are not part of that authority-transfer
lifecycle.

Authority rotation also does not automatically migrate token-account control.
`ApplicationAsset.payment_destination` is written when the `ApplicationAsset`
is initialized by `configure_application_asset`. The current ABI has no
`update_application_asset` instruction, so that stored destination address is
fixed for the lifetime of the existing `ApplicationAsset`.

That destination address is distinct from token-account ownership and from
`ApplicationPaymentPolicy.treasury`. Token-account authority or ownership may
change under the applicable token-program rules without changing the
`ApplicationAsset.payment_destination` public key. Separately,
`ApplicationPaymentPolicy.treasury` is mutable through
`update_payment_policy`. Integrations must treat these as three different
state/control surfaces.

### Protocol pause and Application status enforcement

Protocol pause and Application status are separate enforcement mechanisms.
`ProtocolConfig.paused` is not a universal kill switch over every Babycowans
instruction.

The current implementation explicitly enforces protocol pause on
`register_application`, `register_asset`, and `process_payment`.

The current implementation explicitly requires
`ApplicationStatus::Active` on the following paths:

- `process_payment`;
- `configure_application_config`;
- `update_application_config`;
- `configure_application_asset`;
- `configure_payment_policy`;
- `update_payment_policy`;
- `configure_token_gate`;
- `verify_gate_access`;
- `verify_gate_policy`.

Other instruction families must not be assumed to inherit those checks unless
their own Rust account constraints or handler logic enforce them.

Application status transitions are also explicit. The current allowed
transitions are:

- Pending to Active;
- Pending to Disabled;
- Active to Suspended;
- Active to Disabled;
- Suspended to Active;
- Suspended to Disabled.

No transition out of Disabled is defined by the current transition table.

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

`ApplicationAsset.rewards_enabled` is stored application-asset configuration.
In the current ABI, `create_reward`, `claim_reward`, and `cancel_reward` do not
receive an `ApplicationAsset` account and do not read or enforce
`rewards_enabled`. Applications may consume this field as application-owned
configuration, but it must not be interpreted as an on-chain authorization
gate for the current Reward lifecycle instructions.

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

### Reward entitlement and settlement boundary

A Babycowans `Reward` is an on-chain entitlement and lifecycle record.

`create_reward` records the beneficiary, asset, amount, timing and reward
metadata. `claim_reward` validates the beneficiary and reward lifecycle,
changes the reward state to Claimed, records the claim timestamp and emits the
reward event. `cancel_reward` changes eligible reward state to Cancelled and
emits its event.

The current reward create, claim and cancel instructions do not perform an SPL
Token or Token-2022 transfer.

Therefore `Reward.asset` and `Reward.amount` describe protocol reward state;
they do not by themselves prove that a token payout occurred. Applications
that require token settlement, distribution or another external benefit must
implement and verify that settlement separately.

A `RewardClaimed` event must not be interpreted as token-transfer proof.

## 11. Token gates

`TokenGate` represents direct application access gating.

State includes:

- application;
- application asset;
- gate type;
- minimum amount;
- minimum tier;
- enabled state.

The `TokenGate` account schema contains multiple gate-type variants. However,
the current direct verification instruction, `verify_gate_access`, explicitly
supports only `GateType::HoldAmount`.

Direct HoldAmount verification requires the supplied token account to belong
to the signing wallet, match the ApplicationAsset mint and satisfy the
configured minimum amount. A different direct gate type is rejected with
`UnsupportedGateType`; it is not silently treated as membership or NFT
verification.

## 12. Composable gate policies

`GatePolicy` provides composable access logic using conditions grouped for evaluation.

Conceptually:

```text
Conditions inside a group → AND
Multiple groups           → OR
```

Developers should use the protocol policy model instead of implementing a second incompatible policy engine.

Current GatePolicy predicate semantics are distinct:

- `HoldAmount` checks wallet ownership, exact condition mint and minimum token
  amount.
- `MembershipTier` checks that the Membership belongs to the same Application
  and wallet, is Active, is not expired and meets the minimum tier. This
  predicate does not require `membership.nft_verified` and does not require
  current NFT ownership.
- `NftOwnership` checks a wallet-owned token account for the exact condition
  mint and an amount of at least one.

Membership NFT verification and GatePolicy NFT ownership are separate
verification concepts and must not be conflated by integrations.

## 13. Application roles

`ApplicationRole` is an application-scoped role record intended for
application-owned authorization logic.

Identity:

```text
Application + Member
```

Role management is separate from protocol authority.

The role lifecycle supports assignment and later updates.

`Role::Owner` and `Role::Admin` are Application-scoped authorization values.
Assigning or updating either role changes the `ApplicationRole` record; it does
not mutate `Application.authority`, populate `Application.pending_authority`,
or transfer the Application PDA.

Application authority changes only through the dedicated nomination and
acceptance lifecycle.

An Owner/Admin role record therefore must not be treated as proof that the
member controls the Application authority key.

The current protected Babycowans instruction handlers do not consult
`ApplicationRole` capability helpers as authorization gates. Assigning
`Role::Owner` or `Role::Admin` therefore does not authorize a member to invoke
handlers that require the actual Application authority signer. If an
application wants Owner/Admin/Operator/Auditor semantics beyond the stored role
record, that application must explicitly consume and enforce the role in its
own integration logic.

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

### Transaction-success and finality boundary

`client.decodeEvents(signature)` requests the transaction and passes
`transaction.meta.logMessages` to the Babycowans event decoder.

The current helper does not reject the transaction merely because
`transaction.meta.err` is non-null.

Failed Solana transactions can contain program logs. Consequently, a
syntactically valid Babycowans event payload present in failed-transaction logs
can still be decoded.

Decoded event presence therefore proves that a Babycowans event payload was
found and decoded from the scoped logs. It does not by itself prove that the
transaction successfully committed state.

Applications that use decoded events as committed-state evidence must
independently require transaction success and apply the confirmation/finality
policy appropriate to their integration before performing settlement,
accounting, access-control or other irreversible actions.

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

## Ecosystem application architectures

For real-product architecture patterns across all six canonical ecosystems, including the boundary between Babycowans primitives, application-owned business logic, and external systems, see [Ecosystem Reference Architectures](ECOSYSTEM_REFERENCE_ARCHITECTURES.md).

## Next

- [Architecture](ARCHITECTURE.md)
- [SDK Guide](SDK.md)
- [API Reference](API.md)
- [Cookbook](COOKBOOK.md)
- [Ecosystem Reference Architectures](ECOSYSTEM_REFERENCE_ARCHITECTURES.md)
- [Integration Compatibility](MIGRATION.md)
