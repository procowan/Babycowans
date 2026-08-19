# Babycowans Protocol

**Open developer infrastructure on Solana for building applications across six canonical Babycowans ecosystems — with application registration, payments, rewards, membership, token gating, batch composition, event decoding, and a typed SDK.**

Babycowans Protocol V1.0.0 gives builders one coherent protocol surface instead of requiring every application to recreate the same token-aware primitives from scratch.

> **Build the application. Reuse the infrastructure. Keep the protocol truth on-chain.**

## Start here

| Goal | Go here |
|---|---|
| Understand the protocol | [Protocol Guide](docs/PROTOCOL.md) |
| See the architecture | [Architecture](docs/ARCHITECTURE.md) |
| Integrate the SDK | [SDK Guide](docs/SDK.md) |
| Look up exact APIs | [API Reference](docs/API.md) |
| Follow practical flows | [Cookbook](docs/COOKBOOK.md) |
| Check compatibility | [Migration / Compatibility](docs/MIGRATION.md) |

## Why Babycowans

Modern Solana applications often need the same infrastructure layers: application identity, asset-aware payments, rewards, membership state, access rules, deterministic addresses, events, and client-side integration. Babycowans exposes those capabilities through one Protocol V1.0.0 surface and one developer SDK.

Use Babycowans when you want to:

- build against a defined six-ecosystem model instead of inventing a new integration contract;
- compose application registration, payments, rewards, membership, and gating from reusable protocol primitives;
- work through a typed high-level SDK while retaining access to lower-level builders and PDA helpers;
- rely on repository-defined canonical identities rather than copying token addresses from documentation or memory;
- integrate against a codebase protected by protocol tests, SDK tests, CI gates, dependency guards, and runtime audit checks.

## Six canonical ecosystems

Every Babycowans integration begins from one of the six canonical ecosystem mint identities defined by the protocol source of truth.

| Ecosystem | Canonical mint |
|---|---|
| **BRC** | `25ZEDgK2R62VRnWbqzfKXire7Gdamkopkx6hqtBwpump` |
| **BEC** | `BSf9mueWMeHMAJcbmVSY53H8jcQjwVK3oMRkmwnHpump` |
| **BGC** | `BPCBXkCTYPN3JdcXJojDykmtSvPfykXTLcKnxwopump` |
| **BLC** | `GK1twW6K1o3JrnHjxaAk2LGfWkqRnMoBe6Vyydkpump` |
| **BBC** | `2aso6jnQt3r5sUicejnCFbZupvKaUhezirqVKMjbpump` |
| **BAC** | `DKBBNADxPhGU4yJihzMUu9fXacibXhYHnQhSo5Wopump` |

> Canonical mint identities above are derived from `canonical_assets.rs`; do not substitute remembered or manually copied addresses.

## Architecture at a glance

```text
Developer application
        │
        ├── @babycowans/core-sdk
        │       ├── high-level client
        │       ├── instruction builders
        │       ├── PDA helpers
        │       ├── account / event decoding
        │       └── batch composition
        │
        └── Babycowans Protocol (BSZkHJyqBW19HQ2tTgooKxPc5FEehgm5uxL44Ggxjucp)
                ├── Application
                ├── Payments
                ├── Rewards
                ├── Membership
                └── Token gating / policies
```

For the complete account model, PDA model, authority boundaries, state relationships, and architectural trade-offs, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Quick Start

**SDK package:** `@babycowans/core-sdk`

**Protocol version:** `V1.0.0`

**SDK package version:** `1.0.0`

For repository development, install and build the SDK from the tracked workspace:

```bash
cd sdk
yarn install --frozen-lockfile
yarn build
```

Then initialize the high-level client using the exact setup documented in the [SDK Guide](docs/SDK.md).

## Build Your First Application

The repository includes an executable application-bootstrap flow. It is the fastest source-backed path from a fresh checkout to a real Babycowans Application flow.

```bash
export BABYCOWANS_PROGRAM_ID="$(sed -n 's/.*declare_id!("\([^"]*\)").*/\1/p' protocol/babycowans-protocol/programs/babycowans-protocol/src/lib.rs | head -n1)"

cd examples
yarn application-bootstrap
```

**Fresh local validator:** `application-bootstrap` checks the global `ProtocolConfig` PDA before registering the Application. When that PDA is absent on the repository-owned local validator, the example initializes it once with the configured local wallet as protocol authority. On a non-local RPC endpoint the example fails closed; the deployment/operator flow must initialize `ProtocolConfig` first.

The command above resolves to the tracked example script `tsx application-bootstrap.ts` in `examples/package.json`.

For the complete application lifecycle, continue with the [Cookbook](docs/COOKBOOK.md).

## Core Developer Flows

The high-level `BabycowansSDK` composes existing protocol primitives. The examples below intentionally keep parameters abstract; use the [API Reference](docs/API.md) for the exact current parameter and account contract.

### Payments

```ts
const result = await sdk.processPayment(params);
```

`processPayment` is present in the current high-level SDK surface.

### Rewards

```ts
const created = await sdk.createReward(params);
const claimed = await sdk.claimReward(params);
const cancelled = await sdk.cancelReward(params);
```

Reward creation, claim, and cancellation are exposed through the current high-level SDK.

### Membership

```ts
const membership = await sdk.registerMembership(params);
const updated = await sdk.updateMembership(params);
const renewed = await sdk.renewMembership(params);
const verified = await sdk.verifyNftMembership(params);
```

Membership lifecycle and NFT-membership verification are part of the current SDK surface.

### Token gating

```ts
const gate = await sdk.configureTokenGate(params);
const access = await sdk.verifyGateAccess(params);
```

Token-gate configuration and access verification are exposed through the current SDK.

## SDK and API

`@babycowans/core-sdk` is the developer-facing SDK for Babycowans Protocol V1.0.0.

| Surface | Reference |
|---|---|
| High-level SDK | [SDK Guide](docs/SDK.md) |
| Exact public API | [API Reference](docs/API.md) |
| Protocol concepts | [Protocol Guide](docs/PROTOCOL.md) |
| Architecture and PDAs | [Architecture](docs/ARCHITECTURE.md) |
| Practical integrations | [Cookbook](docs/COOKBOOK.md) |

The API Reference contains the source-aligned Protocol V1.0.0 public surface, including instructions, accounts, events, errors, IDL types, high-level methods, and SDK developer commands.

## Security and Testing

Babycowans treats security evidence as an engineering contract, not as a marketing claim. The repository includes protocol tests, SDK tests, CI enforcement, runtime dependency verification, and an adjudicated runtime audit gate.

Current proof surfaces include:

- `.github/workflows/ci.yml` — formatting, protocol tests, release Clippy, locked compile checks, ABI generation/compatibility and SDK gates;
- `protocol/babycowans-protocol/tests/` — protocol-level test coverage;
- `sdk/tests/` — SDK, decoder, read API, E2E and regression coverage;
- `sdk/scripts/runtime-dependency-guard.cjs` — runtime dependency contract;
- `sdk/scripts/runtime-audit-gate.cjs` — fail-closed runtime advisory policy with repository-specific adjudication.

For exact authority, ownership, PDA, lifecycle and protocol-security semantics, use the [Protocol Guide](docs/PROTOCOL.md), [Architecture](docs/ARCHITECTURE.md), and [API Reference](docs/API.md).

## Documentation

- [Protocol Guide](docs/PROTOCOL.md) — protocol concepts and integration model.
- [Architecture](docs/ARCHITECTURE.md) — accounts, PDAs, relationships and system design.
- [SDK Guide](docs/SDK.md) — SDK setup and developer integration.
- [API Reference](docs/API.md) — exact source-aligned public surface.
- [Cookbook](docs/COOKBOOK.md) — practical application flows.
- [Migration / Compatibility](docs/MIGRATION.md) — compatibility and migration guidance.
- [SDK package README](sdk/README.md) — package-level SDK documentation.

## Repository development

Canonical local development uses the repository-owned validator startup contract and repository-defined canonical mint identities. Do not substitute a plain empty validator for canonical integration flows.

For build, validator, local-development and executable-example details, use:

- [Protocol Guide](docs/PROTOCOL.md)
- [Architecture](docs/ARCHITECTURE.md)
- [SDK Guide](docs/SDK.md)
- [Cookbook](docs/COOKBOOK.md)

## Support the Future of Babycowans

**Babycowans is being built as open infrastructure for developers, builders, researchers, and teams exploring the next generation of products across Solana, DeFi, Web3, tokenized real-world assets, and the six Babycowans ecosystems.**

If this protocol helps your work—or if you believe in the value of making powerful blockchain infrastructure easier to build on—you can help us continue developing it. Voluntary contributions of any size support the time, infrastructure, testing resources, equipment, and engineering effort required to keep Babycowans growing, secure, accessible, and useful to the wider developer community.

**Support wallet (Solana):** `6kqHeyAm7jqaYnPSn2yJFjAAdQ2XKzz1xq96vdt8txEc`

**Every contribution is appreciated. Whether you contribute code, ideas, testing, adoption, or financial support, you are helping build the next chapter of Babycowans and infrastructure for the broader blockchain ecosystem.**

> Support is voluntary. Contributions do not represent an investment contract, ownership interest, entitlement to protocol returns, or a promise of financial performance.

## License

See [LICENSE](LICENSE).
