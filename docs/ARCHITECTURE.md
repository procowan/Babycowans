# Babycowans Architecture

This document describes the architecture of **Babycowans Protocol V1.0.0** and `@babycowans/core-sdk`.

## 1. System overview

```mermaid
flowchart LR
    DEV[Developer Application]

    subgraph SDK["@babycowans/core-sdk"]
        CLIENT[BabycowansSDK]
        READ[Read API]
        EVENT[Event Decoder]
        BATCH[Batch Composer]
        BUILD[Instruction Builders]
        PDA[PDA Helpers]
        DEC[Account Decoders]
        TX[TransactionHelper]
        IDL[Protocol IDL]
    end

    SOL[Solana Runtime]
    PROGRAM[Babycowans Program]
    ACCOUNTS[(Program Accounts)]
    EVENTS[(Program Events)]

    DEV --> CLIENT

    CLIENT --> BATCH
    CLIENT --> BUILD
    CLIENT --> READ
    CLIENT --> EVENT
    CLIENT --> TX

    BATCH --> BUILD
    BUILD --> PDA
    TX --> SOL
    SOL --> PROGRAM

    PROGRAM --> ACCOUNTS
    PROGRAM --> EVENTS

    ACCOUNTS --> READ
    READ --> DEC

    EVENTS --> EVENT

    DEC --> IDL
    EVENT --> IDL
```

## 2. Architectural rule

The SDK follows:

```text
High-Level Developer API
          ↓
Existing Low-Level SDK Primitives
          ↓
Protocol Source of Truth
```

High-Level APIs should not duplicate:

- PDA rules;
- instruction encoding;
- account layout;
- event schema.

## 3. Source-of-truth hierarchy

```mermaid
flowchart TD
    RUST[Rust / Anchor Program]
    IDL[Protocol IDL]
    LOW[Low-Level SDK]
    HIGH[High-Level SDK]
    DOCS[Production Documentation]

    RUST --> IDL
    RUST --> LOW
    IDL --> LOW
    LOW --> HIGH
    RUST --> DOCS
    LOW --> DOCS
    HIGH --> DOCS
```

Documentation is downstream of protocol and SDK implementation.

## 4. Main account model

```mermaid
flowchart TD
    PC[ProtocolConfig]
    ASSET[AssetConfig]
    APP[Application]
    CFG[ApplicationConfig]
    AA[ApplicationAsset]
    PP[ApplicationPaymentPolicy]
    ROLE[ApplicationRole]
    MEM[Membership]
    REWARD[Reward]
    TG[TokenGate]
    GP[GatePolicy]
    AUDIT[AuditLog]

    PC --> ASSET
    PC --> APP

    APP --> CFG
    APP --> AA
    APP --> ROLE
    APP --> MEM
    APP --> REWARD
    APP --> AUDIT

    ASSET --> AA

    AA --> PP
    AA --> TG
    AA --> GP
```

This diagram expresses integration dependencies. It is not intended to replace Rust account constraints.

## 5. PDA model

The SDK exposes deterministic helpers for:

```text
ProtocolConfig
AssetConfig
Application
ApplicationConfig
ApplicationAsset
PaymentPolicy
ApplicationRole
Membership
Reward
TokenGate
AuditLog
GatePolicy
```

Use SDK PDA helpers rather than duplicating seed strings.

## 6. Canonical identity boundary

```mermaid
flowchart LR
    ECO[Canonical Ecosystem]
    APP[Application]
    META[Application Metadata]
    EXPERIENCE[Resolved Experience]

    ECO --> APP
    APP --> META
    ECO --> EXPERIENCE
    META --> EXPERIENCE

    META -. cannot redefine .-> ECO
```

Canonical identity includes:

```text
Full Name
Ticker
Token Address
Mission
```

Application metadata remains application-owned information.

## 7. Write architecture

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant SDK as BabycowansSDK
    participant Builder as Instruction Builder
    participant Tx as TransactionHelper
    participant Solana as Solana
    participant Program as Babycowans Program

    Dev->>SDK: High-Level operation
    SDK->>Builder: Build canonical instruction
    Builder-->>SDK: TransactionInstruction
    SDK->>Tx: createTransaction(...)
    Tx-->>SDK: Transaction
    SDK->>Solana: send + confirm
    Solana->>Program: execute
    Program-->>Solana: state + events
    Solana-->>SDK: signature
    SDK-->>Dev: typed result
```

## 8. Read architecture

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant SDK as BabycowansSDK
    participant RPC as Solana RPC
    participant Decoder as Account Decoder

    Dev->>SDK: getApplication / getMembership / getReward
    SDK->>SDK: derive canonical PDA
    SDK->>RPC: getAccountInfo
    RPC-->>SDK: account bytes
    SDK->>Decoder: decode
    Decoder-->>SDK: typed account
    SDK-->>Dev: ReadAccount<T> or null
```

Audit history uses a program-account query and returns deterministic application-scoped results.

## 9. Event architecture

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant SDK as BabycowansSDK
    participant RPC as Solana RPC
    participant Decoder as Event Decoder
    participant IDL as Protocol IDL

    Dev->>SDK: decodeEvents(signature)
    SDK->>RPC: getTransaction(signature)
    RPC-->>SDK: logMessages
    SDK->>Decoder: decode logs
    Decoder->>IDL: discriminator + layout
    Decoder-->>SDK: DecodedBabycowansEvent[]
    SDK-->>Dev: ordered events
```

The decoder:

- scopes to the configured Babycowans program;
- recognizes current IDL discriminators;
- preserves ordering;
- preserves `PublicKey`;
- preserves relevant integers as `bigint`;
- ignores unrelated logs;
- supports strict malformed-payload handling.

## 10. Batch architecture

```mermaid
flowchart LR
    INPUT[Bootstrap Parameters]
    PLAN[Application Bootstrap Plan]
    REGISTER[RegisterApplication]
    CONFIG[ConfigureApplicationConfig]
    ROLE[AssignApplicationRole optional]
    TX[One Transaction]
    SOLANA[Solana Runtime]

    INPUT --> PLAN
    PLAN --> REGISTER
    PLAN --> CONFIG
    PLAN --> ROLE

    REGISTER --> TX
    CONFIG --> TX
    ROLE --> TX

    TX --> SOLANA
```

Canonical instruction order:

```text
1. RegisterApplication
2. ConfigureApplicationConfig
3. optional AssignApplicationRole
```

## 11. Atomic rollback

```mermaid
flowchart TD
    TX[Bootstrap Transaction]
    I1[Register Application]
    I2[Configure Application]
    I3[Optional Assign Role]

    SUCCESS[Commit all state]
    FAILURE[Rollback entire transaction]

    TX --> I1
    I1 --> I2
    I2 --> I3

    I1 -->|failure| FAILURE
    I2 -->|failure| FAILURE
    I3 -->|failure| FAILURE
    I3 -->|success| SUCCESS
```

No partial Application / ApplicationConfig bootstrap state survives a failed transaction.

## 12. SDK layers

```text
BabycowansSDK
│
├── High-Level write operations
├── Read API
├── Event Decoder integration
├── Application Bootstrap Batch
│
└── Existing primitives
    ├── instruction builders
    ├── PDA helpers
    ├── account decoders
    ├── ecosystem registry
    ├── metadata resolvers
    ├── IDL
    └── TransactionHelper
```

The Low-Level SDK remains publicly usable.

## 13. Integer fidelity

Protocol values backed by `u64` or `i64` may exceed JavaScript's safe integer range.

Relevant SDK models preserve these values as `bigint`.

Do not silently coerce arbitrary protocol `bigint` values to `number`.

## 14. PublicKey fidelity

Solana addresses remain `PublicKey` objects inside typed SDK models where address behavior matters.

Convert to Base58 only at external presentation or serialization boundaries.

## 15. Failure boundaries

Integrations should distinguish:

```text
Input / Builder Error
RPC Transport Error
Transaction Simulation Error
On-chain Anchor Error
Account Decoder Error
Event Decoder Error
Metadata Resolution Error
```

Do not collapse every failure into one generic application error when retry or diagnosis depends on the actual layer.

## 16. Compatibility principle

Babycowans Protocol V1.0.0 should evolve through compatible additions wherever practical.

For integration-sensitive assumptions, prefer:

1. current SDK types;
2. current IDL;
3. current Rust definitions;

over copied documentation fragments.

See [MIGRATION.md](MIGRATION.md).
