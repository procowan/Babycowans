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

Start the local validator:

```bash
solana-test-validator --reset
```

In another terminal:

```bash
anchor program deploy
```

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
