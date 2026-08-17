# Babycowans Protocol

Anchor program for the Babycowans developer infrastructure on Solana.

## Requirements

- repository-pinned Rust 1.89.0 with rustfmt and Clippy
- Solana CLI 3.1.10 certified development baseline
- SPL Token CLI 5.5.0 certified development baseline
- Anchor CLI 1.0.2
- Node.js 22.22.1
- Yarn 1.22.22

## Build

```bash
anchor build --ignore-keys
```

The canonical Program ID is repository-owned identity. A clean clone does not require its private deploy keypair, and the source Program ID must not be synchronized to an ephemeral generated keypair.

## Test

```bash
anchor test
```

## Local Runtime

Babycowans canonical integration uses the repository-owned validator launcher and canonical program preload contract.

First build the program artifact from the repository root:

```bash
cd protocol/babycowans-protocol
anchor build --ignore-keys
cd ../..
```

Then start the repository-owned validator:

```bash
export BABYCOWANS_PROGRAM_ID="$(sed -n 's/.*declare_id!("\([^"]*\)").*/\1/p' protocol/babycowans-protocol/programs/babycowans-protocol/src/lib.rs | head -n1)"

BABYCOWANS_PROGRAM_PRELOAD_ID="$BABYCOWANS_PROGRAM_ID" \
BABYCOWANS_PROGRAM_PRELOAD_SO="$PWD/protocol/babycowans-protocol/target/deploy/babycowans_protocol.so" \
./scripts/start-local-validator.sh
```

Leave the validator running in the foreground.

The launcher derives the canonical mint identities from the current repository and preloads the built `.so` at the canonical repository Program ID. The clean-clone workflow requires no private canonical program keypair.

Do not run `anchor keys sync`, do not rewrite the repository Program ID, and do not substitute a plain empty validator for Babycowans canonical integration flows.

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
