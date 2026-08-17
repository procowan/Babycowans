# Babycowans TypeScript SDK Guide

The official SDK package is:

```text
@babycowans/core-sdk
```

Use this guide for SDK integration patterns. For exact public method reference, use [API.md](API.md).

## 1. SDK layers

The SDK exposes:

### High-Level

`BabycowansSDK` for standard integration workflows.

### Low-Level

Public builders, PDA helpers, account decoders, ecosystem registry, IDL and transaction primitives.

The High-Level API delegates to Low-Level source-of-truth primitives rather than replacing them.

## 2. Create a client

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

## 3. Canonical ecosystems

```ts
import {
    CanonicalEcosystem,
    getCanonicalEcosystem,
} from "@babycowans/core-sdk";

const identity =
    getCanonicalEcosystem(
        CanonicalEcosystem.BabyReptile,
    );

console.log(identity.fullName);
console.log(identity.ticker);
console.log(identity.tokenAddress.toBase58());
console.log(identity.mission);
```

Prefer the canonical registry over duplicated token-address constants.

## 4. Signer model

High-Level write operations use operation-scoped signers.

Examples:

```text
registerApplication → authority
processPayment      → payer
membership writes   → authority
gate verification   → wallet
```

The client does not depend on a hidden global signer.

## 5. Bootstrap an application

The canonical batch operation can execute:

```text
RegisterApplication
ConfigureApplicationConfig
optional AssignApplicationRole
```

in one transaction.

```ts
const result =
    await client.bootstrapApplication({
        authority,
        applicationId,
        name:
            "Example Application",

        selectedEcosystem:
            CanonicalEcosystem.BabyReptile,

        config: {
            websiteUri:
                "https://example.com",
            logoUri:
                "https://example.com/logo.png",
            supportUri:
                "https://example.com/support",
            description:
                "Example Babycowans application",
            metadataUri:
                "https://example.com/metadata.json",
        },

        role: {
            member:
                operatorPublicKey,
            role:
                2,
        },
    });
```

`role` is optional.

The result contains the transaction signature and deterministic account addresses.

## 6. Register an application directly

Use:

```text
client.registerApplication(...)
```

when you do not need application bootstrap batching.

The Application PDA is derived canonically from application identity inputs.

## 7. Application configuration

Use:

```text
client.configureApplicationConfig(...)
client.updateApplicationConfig(...)
```

Application metadata is separate from canonical ecosystem identity.

## 8. Payments

Use:

```text
client.processPayment(...)
```

The High-Level payment API expects required application asset and policy state to exist. It does not silently create hidden prerequisites.

## 9. Rewards

High-Level lifecycle:

```text
client.createReward(...)
client.claimReward(...)
client.cancelReward(...)
```

Reward IDs, amounts and time values preserve protocol integer fidelity.

## 10. Memberships

High-Level lifecycle:

```text
client.registerMembership(...)
client.updateMembership(...)
client.renewMembership(...)
client.verifyNftMembership(...)
```

Membership identity is Application + Member.

## 11. Token gates

High-Level APIs:

```text
client.configureTokenGate(...)
client.verifyGateAccess(...)
```

Composable gate-policy primitives are available through the Low-Level SDK.

## 12. Read API

Current High-Level helpers:

```text
client.getApplication(...)
client.getMembership(...)
client.getReward(...)
client.getAuditHistory(...)
```

Single-account reads return:

```ts
ReadAccount<T> | null
```

where:

```ts
interface ReadAccount<T> {
    address: PublicKey;
    data: T;
}
```

Missing Application, Membership or Reward PDAs return `null`.

A missing audit history returns `[]`.

## 13. Event Decoder

```ts
const events =
    await client.decodeEvents(
        signature,
    );

for (const event of events) {
    console.log(event.name);
    console.log(event.data);
}
```

The High-Level client automatically scopes decoding to its configured program ID.

A transaction with no Babycowans events returns an empty array.

Low-Level decoding exposes strict malformed-payload behavior when needed.

## 14. bigint

Protocol values requiring full `u64` / `i64` fidelity are represented as `bigint`.

```ts
const applicationId =
    1000n;
```

Do not convert arbitrary protocol values to `number` unless you have proven the value is safely representable.

## 15. PublicKey

Protocol addresses use `PublicKey`.

```ts
console.log(
    result.application.toBase58(),
);
```

Keep addresses as `PublicKey` inside integration logic and stringify them only where required.

## 16. Low-Level instruction builders

The root package exports builders for protocol operations.

Use them for:

- explicit transaction construction;
- custom orchestration;
- custom signers;
- externally managed transaction pipelines.

Do not manually recreate instruction discriminators or Borsh layouts.

## 17. PDA helpers

The SDK exports:

```text
findProtocolConfigPda
findAssetConfigPda
findApplicationPda
findApplicationConfigPda
findApplicationAssetPda
findPaymentPolicyPda
findApplicationRolePda
findMembershipPda
findRewardPda
findTokenGatePda
findAuditLogPda
findGatePolicyPda
```

Do not duplicate seed logic.

## 18. Transaction helpers

The High-Level client exposes:

```text
client.buildTransaction(...)
client.buildVersionedTransaction(...)
```

for developers needing manual transaction composition.

## 19. Account decoders

Typed account decoders validate Anchor account discriminators.

The Read API currently uses dedicated decoders for:

- Application;
- ApplicationConfig;
- Membership;
- Reward;
- AuditLog.

Invalid ownership or malformed data is not silently accepted as protocol state.

## 20. Metadata and application experience

Metadata resolution is designed so that:

```text
Application Metadata
        +
Canonical Ecosystem Identity
        ↓
Resolved Application Experience
```

but application metadata cannot redefine canonical token identity.

## 21. Error handling

Possible failure layers include:

- RPC transport;
- simulation;
- on-chain Babycowans constraint/error;
- account ownership;
- account decoding;
- event decoding;
- metadata resolution.

Preserve the failure layer when implementing retries or user-facing diagnostics.

## 22. Development commands

Typecheck:

```bash
cd sdk
npm run typecheck
```

Build SDK:

```bash
npm run build
```

Build protocol:

```bash
cd ../protocol/babycowans-protocol
anchor build --ignore-keys
```

For clean-clone local integration, return to the repository root and start the repository-owned validator with the built program preloaded at the canonical repository Program ID:

```bash
cd ../..

export BABYCOWANS_PROGRAM_ID="$(sed -n 's/.*declare_id!("\([^"]*\)").*/\1/p' protocol/babycowans-protocol/programs/babycowans-protocol/src/lib.rs | head -n1)"

BABYCOWANS_PROGRAM_PRELOAD_ID="$BABYCOWANS_PROGRAM_ID" \
BABYCOWANS_PROGRAM_PRELOAD_SO="$PWD/protocol/babycowans-protocol/target/deploy/babycowans_protocol.so" \
./scripts/start-local-validator.sh
```

This clean-clone local workflow requires no private canonical deploy keypair and must not run `anchor keys sync` or rewrite the repository Program ID.

## 23. Avoid these integration mistakes

Do not:

- copy remembered canonical token addresses;
- manually reconstruct PDA seeds;
- manually reconstruct event schemas;
- silently coerce `bigint`;
- assume High-Level APIs create undocumented prerequisites;
- let external metadata redefine canonical identity;
- use historical specification API names as current SDK APIs.

## Next

- [API Reference](API.md)
- [Cookbook](COOKBOOK.md)
- [Architecture](ARCHITECTURE.md)
- [Integration Compatibility](MIGRATION.md)
