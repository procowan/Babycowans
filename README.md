# Babycowans

Six meme coins.  
One developer infrastructure.  
Unlimited real-world utility.

## Overview

Babycowans is a Solana protocol and TypeScript SDK for integrating the six canonical Babycowans assets into applications.

The repository includes:

- Anchor protocol
- SPL Token and Token-2022 compatibility
- canonical asset registry
- application registry
- payment processing
- token gating
- memberships
- rewards
- role management
- audit logging
- official TypeScript SDK

## Repository Structure

```text
Babycowans
├── protocol
│   └── babycowans-protocol
├── sdk
├── specifications
├── docs
├── examples
├── tests
└── scripts
```

## Requirements

- Rust
- Solana CLI
- Anchor CLI 1.0.2
- Node.js
- Yarn 1.x

See `ENVIRONMENT.md` for environment requirements.

## Build the Protocol

```bash
cd protocol/babycowans-protocol
anchor build
```

## Test the Protocol

```bash
cd protocol/babycowans-protocol
anchor test
```

## Build the SDK

```bash
cd sdk
yarn install
yarn build
```

## Test the SDK

```bash
cd sdk
yarn test:pda
yarn test:instructions
yarn test:idl
yarn test:decoder
```

## Local Validator

Start the local validator:

```bash
solana-test-validator --reset
```

In another terminal:

```bash
cd protocol/babycowans-protocol
anchor program deploy
anchor test --skip-local-validator
```

## Canonical Assets

The protocol supports exactly six canonical Babycowans assets:

- BRC — Baby Reptile Coin
- BEC — Baby Eagle Coin
- BGC — Baby Goat Coin
- BLC — Baby Lion Coin
- BBC — Baby Bee Coin
- BAC — Baby Agent Coin

Canonical mint addresses are defined in:

```text
protocol/babycowans-protocol/programs/babycowans-protocol/src/canonical_assets.rs
```

## SDK

The official SDK package is:

```text
@babycowans/core-sdk
```

See `sdk/README.md`.

## Documentation

See:

- `specifications/`
- `docs/PROTOCOL.md`
- `docs/ARCHITECTURE.md`
- `docs/API.md`
- `docs/SDK.md`

## Security

See `SECURITY.md`.

## License

MIT
