# @babycowans/core-sdk

Official TypeScript SDK for the Babycowans Protocol.

## Installation

```bash
yarn add @babycowans/core-sdk
```

## Local Development

```bash
yarn install
yarn build
```

## Tests

```bash
yarn test:pda
yarn test:instructions
yarn test:idl
yarn test:decoder
```

## Basic Client

```typescript
import { BabycowansSDK } from "@babycowans/core-sdk";

const sdk = new BabycowansSDK({
    connection,
    programId,
});
```

## Included Modules

- high-level client
- PDA utilities
- instruction factory
- transaction helpers
- account fetchers
- typed account interfaces
- canonical protocol IDL

## Compatibility

```text
Anchor 1.0.2
```

The canonical IDL is included at:

```text
src/idl/babycowans_protocol.json
```
