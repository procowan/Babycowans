# Babycowans Cookbook

This cookbook is organized by developer task rather than by internal module.

Examples assume an initialized `BabycowansSDK` client unless otherwise stated.

## 1. Choose a canonical ecosystem

```ts
import {
    CanonicalEcosystem,
    getCanonicalEcosystem,
} from "@babycowans/core-sdk";

const ecosystem =
    CanonicalEcosystem.BabyReptile;

const identity =
    getCanonicalEcosystem(
        ecosystem,
    );

console.log(identity.fullName);
console.log(identity.ticker);
console.log(identity.tokenAddress.toBase58());
console.log(identity.mission);
```

Do not duplicate canonical identity constants in application code.

## 2. Bootstrap a new application

Use the atomic canonical batch when you want registration + config in one transaction.

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
                "Example application",
            metadataUri:
                "https://example.com/metadata.json",
        },
    });

console.log(result.signature);
console.log(
    result.application.toBase58(),
);
```

## 3. Bootstrap with an application role

```ts
const result =
    await client.bootstrapApplication({
        authority,
        applicationId,
        name:
            "Application With Operator",

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
                "Example application",
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

If any instruction fails, the entire bootstrap transaction rolls back.

## 4. Register without batching

Use:

```text
client.registerApplication(...)
```

when you intentionally want registration to be its own transaction.

## 5. Configure or update application metadata

```text
client.configureApplicationConfig(...)
client.updateApplicationConfig(...)
```

Remember that application metadata cannot redefine canonical ecosystem identity.

## 6. Process a payment

```text
client.processPayment(...)
```

Prerequisites such as ApplicationAsset and payment policy must already exist.

The High-Level method does not silently configure them.

## 7. Create a reward

```text
client.createReward(...)
```

Use protocol `bigint` values for IDs and amounts where required.

## 8. Claim a reward

```text
client.claimReward(...)
```

The Reward must be in an eligible lifecycle state.

## 9. Cancel a reward

```text
client.cancelReward(...)
```

The protocol enforces reward-state constraints on-chain.

## 10. Register membership

```text
client.registerMembership(...)
```

Membership identity is determined by Application + Member.

## 11. Update membership

```text
client.updateMembership(...)
```

## 12. Renew membership

```text
client.renewMembership(...)
```

Renewal behavior depends on the membership lifecycle configuration stored on-chain.

## 13. Verify NFT membership

```text
client.verifyNftMembership(...)
```

Use the protocol's NFT membership flow rather than treating arbitrary NFT metadata as verification.

## 14. Configure token gating

```text
client.configureTokenGate(...)
```

## 15. Verify gate access

```text
client.verifyGateAccess(...)
```

## 16. Configure and verify composable GatePolicy

Use TokenGate for a direct single-gate flow. Use GatePolicy when access requires composable conditions.

GatePolicy evaluation uses AND inside a group and OR across groups. For example: Group 0 = HoldAmount + MembershipTier; Group 1 = NftOwnership. The resulting policy is (HoldAmount AND MembershipTier) OR NftOwnership.

Use the exported Low-Level SDK primitives `findGatePolicyPda`, `buildConfigureGatePolicyInstruction`, and `buildVerifyGatePolicyInstruction`. Verification evidence is supplied with the optional `holdTokenAccount`, `membership`, and `nftTokenAccount` accounts required by the configured branch.

For the simpler direct gate, use `client.configureTokenGate(...)` and `client.verifyGateAccess(...)`.

## 17. Read an Application

```ts
const application =
    await client.getApplication({
        authority,
        applicationId,
    });

if (application === null) {
    console.log(
        "Application does not exist",
    );
} else {
    console.log(
        application.address.toBase58(),
    );

    console.log(
        application.data.name,
    );
}
```

## 18. Read Membership state

```ts
const membership =
    await client.getMembership({
        application,
        member,
    });

if (membership !== null) {
    console.log(membership.data.tier);
    console.log(membership.data.status);
}
```

## 19. Read a Reward

```ts
const reward =
    await client.getReward({
        application,
        beneficiary,
        rewardId,
    });

if (reward !== null) {
    console.log(reward.data.amount);
    console.log(reward.data.reason);
}
```

## 20. Read audit history

```ts
const history =
    await client.getAuditHistory({
        application,
    });

for (const entry of history) {
    console.log(
        entry.address.toBase58(),
    );

    console.log(
        entry.data.metadata,
    );
}
```

No matching audit records returns `[]`.

## 21. Decode events from a write

```ts
const result =
    await client.registerApplication({
        authority,
        applicationId,
        name:
            "Event Example",
        selectedEcosystem:
            CanonicalEcosystem.BabyReptile,
    });

const events =
    await client.decodeEvents(
        result.signature,
    );

for (const event of events) {
    console.log(event.name);
    console.log(event.data);
}
```

## 22. Use strict Low-Level event decoding

The Low-Level Event Decoder supports strict malformed-event behavior:

```ts
decodeBabycowansEventLogs(
    logMessages,
    {
        programId,
        strict: true,
    },
);
```

Use this when malformed known Babycowans event data must become an integration error.

## 23. Build a custom transaction

```ts
const transaction =
    await client.buildTransaction(
        payer,
        instructions,
    );
```

Use Low-Level builders to produce the instructions.

## 24. Build a versioned transaction

```ts
const transaction =
    await client.buildVersionedTransaction(
        payer,
        instructions,
    );
```

## 25. Resolve canonical identity safely

```ts
const identity =
    getCanonicalEcosystem(
        selectedEcosystem,
    );
```

Avoid manually copied Base58 constants.

## 26. Serialize bigint intentionally

JSON does not serialize `bigint` by default.

Choose an application serialization policy, for example:

```ts
const json =
    JSON.stringify(
        value,
        (_key, current) =>
            typeof current === "bigint"
                ? current.toString()
                : current,
    );
```

Do not silently coerce large protocol integers to `number`.

## 27. Handle missing state

For single-account reads:

```text
missing account → null
```

For audit history:

```text
no matching records → []
```

Do not treat these two normal states as malformed-account errors.

## 28. Diagnose write failures

### High-level SDK transaction failures

High-level `BabycowansSDK` write methods normalize failed
transaction submission or confirmation as
`BabycowansTransactionError`.

The normalized error exposes:

- `anchorErrorCode`
- `anchorErrorMessage`
- `logs`
- `originalError`

When Anchor information is available, `anchorErrorCode`
identifies the Babycowans or Anchor error and
`anchorErrorMessage` contains its developer-facing message.

A Babycowans validation failure can report
`InvalidApplicationName`. An Anchor account relationship
failure can report `ConstraintHasOne`.

`logs` preserves available transaction logs.
`originalError` preserves the original Solana/Web3 error.

When no Anchor error can be recovered, the SDK still throws
`BabycowansTransactionError` with the original failure
context preserved.

Use these normalized fields before parsing raw logs or
changing protocol code.


Distinguish:

```text
RPC error
simulation error
on-chain Babycowans error
signing error
```

If a transaction simulation fails, inspect Solana transaction logs before changing protocol code.

## 29. Use historical specifications carefully

Do not copy API names from `specifications/` into new integrations without confirming that the current SDK exports them.

The production API reference is [API.md](API.md).
