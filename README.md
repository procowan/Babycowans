# Babycowans

**Six canonical ecosystems. One Solana developer infrastructure.**

Babycowans Protocol V1.0.0 is a Solana protocol and TypeScript SDK for developers building applications around the six canonical Babycowans ecosystems.

The repository contains:

- an Anchor/Rust protocol;
- the `@babycowans/core-sdk` TypeScript SDK;
- canonical ecosystem identity;
- application registration and configuration;
- payments;
- memberships;
- rewards;
- token gates and composable gate policies;
- application roles;
- audit logging;
- event decoding;
- typed state Read APIs;
- atomic application bootstrap batching.

## Start here

If you are new to Babycowans, follow this path:

1. [Protocol Guide](docs/PROTOCOL.md)
2. [Architecture](docs/ARCHITECTURE.md)
3. [SDK Guide](docs/SDK.md)
4. [API Reference](docs/API.md)
5. [Cookbook](docs/COOKBOOK.md)
6. [Integration Compatibility](docs/MIGRATION.md)

A normal integration moves through:

```text
Choose canonical ecosystem
        ↓
Create BabycowansSDK
        ↓
Register or bootstrap an Application
        ↓
Configure required application capabilities
        ↓
Payments / memberships / rewards / gates
        ↓
Read protocol state
        ↓
Decode transaction events
```

## Requirements

Repository development currently uses:

- Rust
- Solana CLI
- Anchor CLI 1.0.2
- Node.js
- the package tooling declared by the repository

Prefer repository-declared versions and scripts over external setup snippets.

## Build the protocol

```bash
cd protocol/babycowans-protocol
anchor build
```

## Build and typecheck the SDK

```bash
cd sdk
npm run build
npm run typecheck
```

The official package is:

```text
@babycowans/core-sdk
```

## Minimal SDK setup

```ts
import {
    BabycowansSDK,
} from "@babycowans/core-sdk";

import {
    Connection,
    PublicKey,
} from "@solana/web3.js";

const connection =
    new Connection(
        "http://127.0.0.1:8899",
        "confirmed",
    );

const client =
    new BabycowansSDK({
        connection,
        programId:
            new PublicKey(
                process.env.BABYCOWANS_PROGRAM_ID!,
            ),
    });
```

For deployment, validator startup, and integration tests, resolve immutable protocol identifiers from the current repository. Do not rely on remembered Base58 values.

## Canonical ecosystems

Babycowans contains exactly six canonical ecosystems:

| Ecosystem | Ticker |
|---|---|
| Baby Reptile Coin | `$BRC` |
| Baby Eagle Coin | `$BEC` |
| Baby Goat Coin | `$BGC` |
| Baby Lion Coin | `$BLC` |
| Baby Bee Coin | `$BBC` |
| Baby Agent Coin | `$BAC` |

Every ecosystem has four canonical identity attributes:

- Full Name
- Ticker
- Token Address
- Mission

Application metadata cannot redefine those properties.

Repository source of truth:

```text
protocol/babycowans-protocol/programs/babycowans-protocol/src/canonical_assets.rs
protocol/babycowans-protocol/programs/babycowans-protocol/src/canonical_ecosystems.rs
sdk/src/ecosystems/
```

## Local development

The development workflow uses three persistent terminals:

```text
Terminal 1 → local Solana validator
Terminal 2 → build / deployment freshness
Terminal 3 → main protocol + SDK workspace
```

Build:

```bash
cd protocol/babycowans-protocol
anchor build
```

Use the supported deployment command:

```bash
anchor program deploy \
  target/deploy/babycowans_protocol.so \
  --provider.cluster localnet \
  --no-idl
```

Do not use deprecated `anchor deploy` in new Babycowans instructions.

The canonical validator setup must derive ecosystem mint addresses from repository canonical definitions.

## Documentation

### Protocol Guide

[`docs/PROTOCOL.md`](docs/PROTOCOL.md)

Protocol concepts, canonical identities, accounts, capabilities and lifecycle.

### Architecture

[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

Protocol / SDK / IDL boundaries, accounts, PDAs, Read API, Event Decoder and Batch architecture.

### SDK Guide

[`docs/SDK.md`](docs/SDK.md)

High-Level SDK integration, signers, integer/address fidelity, Read API and Low-Level escape hatches.

### API Reference

[`docs/API.md`](docs/API.md)

Reference for the current public SDK surface.

### Cookbook

[`docs/COOKBOOK.md`](docs/COOKBOOK.md)

Task-oriented integration recipes.

### Integration Compatibility

[`docs/MIGRATION.md`](docs/MIGRATION.md)

Compatibility, upgrade and integration-maintenance guidance for Babycowans Protocol V1.0.0.

## Executable examples

See:

```text
examples/application-bootstrap.ts
examples/read-api.ts
examples/event-decoder.ts
```

These examples are typechecked against the current repository SDK during Phase 12 validation.

## Repository structure

```text
Babycowans/
├── protocol/
│   └── babycowans-protocol/
├── sdk/
├── docs/
├── examples/
├── specifications/
└── scripts/
```

`specifications/` contains historical design material. It is not the authoritative current SDK API reference.

## Security

See `SECURITY.md`.

## License

MIT
