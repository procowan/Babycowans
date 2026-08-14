# Babycowans Protocol

Anchor program for the Babycowans developer infrastructure on Solana.

## Requirements

- Rust
- Solana CLI
- Anchor CLI 1.0.2
- Yarn 1.x

## Build

```bash
anchor build
```

## Test

```bash
anchor test
```

## Local Deployment

Babycowans canonical integration uses the repository-owned validator launcher.

From the repository root, open Terminal 1:

```bash
./scripts/start-local-validator.sh
```

Leave Terminal 1 open.

In Terminal 2:

```bash
cd protocol/babycowans-protocol
anchor build

solana program deploy \
  --url http://127.0.0.1:8899 \
  --program-id target/deploy/babycowans_protocol-keypair.json \
  target/deploy/babycowans_protocol.so
```

The launcher derives the canonical mint identities from the current repository. Do not substitute a plain empty validator for Babycowans canonical integration flows.

## Program ID

```text
BSZkHJyqBW19HQ2tTgooKxPc5FEehgm5uxL44Ggxjucp
```

## Core Capabilities

- protocol initialization
- canonical asset registration
- application registration
- authority management
- application asset configuration
- payment processing
- role management
- memberships
- rewards
- token gating
- pause controls
- audit logging

## Canonical Assets

The canonical mint registry is defined at:

```text
programs/babycowans-protocol/src/canonical_assets.rs
```

## Specifications

Protocol behavior is defined in:

```text
../../specifications/
```
