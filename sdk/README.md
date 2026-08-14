# @babycowans/core-sdk

Official TypeScript SDK for **Babycowans Protocol V1.0.0**.

## What it provides

The package exposes:

- `BabycowansSDK` High-Level client;
- canonical ecosystem registry;
- protocol PDA helpers;
- instruction builders;
- typed account models and decoders;
- metadata/application-experience helpers;
- Event Decoder;
- Read API;
- canonical Application Bootstrap Batch;
- transaction helpers;
- protocol IDL.

## Developer onboarding

After installing SDK dependencies, explore the six canonical ecosystems interactively:

```bash
yarn onboard
```

The onboarding displays Full Name, Ticker, Token Address, and Mission. Use the Up and Down Arrow keys to move and Enter to select.

## Client setup

```ts
import {
    BabycowansSDK,
} from "@babycowans/core-sdk";

import {
    Connection,
    PublicKey,
} from "@solana/web3.js";

const client =
    new BabycowansSDK({
        connection:
            new Connection(
                "http://127.0.0.1:8899",
                "confirmed",
            ),

        programId:
            new PublicKey(
                process.env.BABYCOWANS_PROGRAM_ID!,
            ),
    });
```

## High-Level capabilities

Current High-Level methods cover:

- application registration;
- application bootstrap batching;
- payments;
- rewards;
- application configuration;
- membership lifecycle;
- NFT membership verification;
- token gates;
- event decoding;
- application/membership/reward/audit reads.

## Typecheck

```bash
npm run typecheck
```

## Build

```bash
npm run build
```

## Documentation

Start from the repository root:

- `README.md`
- `docs/PROTOCOL.md`
- `docs/ARCHITECTURE.md`
- `docs/SDK.md`
- `docs/API.md`
- `docs/COOKBOOK.md`
- `docs/MIGRATION.md`

## Important integration rules

- Do not hardcode remembered canonical token addresses.
- Do not duplicate PDA seed logic.
- Do not manually duplicate event layouts.
- Preserve `bigint` for protocol integers requiring full fidelity.
- Keep canonical ecosystem identity independent from application metadata.
- Treat historical `specifications/` content as design history rather than current API reference.
