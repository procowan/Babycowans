# Babycowans SDK API Reference

This reference documents the current public developer-facing SDK surface of **Babycowans Protocol V1.0.0**.

For implementation details, the SDK source remains authoritative.

## BabycowansSDK

### Construction

```ts
const client =
    new BabycowansSDK({
        connection,
        programId,
    });
```

Configuration is defined by `BabycowansSDKConfig`.

## Experience and metadata

### `resolveApplicationExperience(...)`

Resolves application experience while preserving canonical ecosystem identity.

### `resolveCanonicalTokenMetadata(...)`

Resolves canonical token metadata through the SDK metadata subsystem.

## Application writes

### `registerApplication(params)`

High-Level application registration.

Returns a result containing:

- transaction signature;
- application ID;
- Application PDA.

### `bootstrapApplication(params)`

Atomically composes:

```text
RegisterApplication
ConfigureApplicationConfig
optional AssignApplicationRole
```

into one transaction.

Result includes:

- signature;
- application ID;
- Application PDA;
- ApplicationConfig PDA;
- optional ApplicationRole PDA;
- optional role member.

## Payments

### `processPayment(params)`

Executes application payment using previously configured asset/payment state.

The method does not silently create ApplicationAsset or PaymentPolicy prerequisites.

## Rewards

### `createReward(params)`

Creates a Reward account.

### `claimReward(params)`

Claims an eligible Reward.

### `cancelReward(params)`

Cancels an eligible Reward.

## Application configuration

### `configureApplicationConfig(params)`

Creates application metadata configuration.

### `updateApplicationConfig(params)`

Updates an existing ApplicationConfig.

## Memberships

### `registerMembership(params)`

Registers application membership state.

### `updateMembership(params)`

Updates membership lifecycle state.

### `renewMembership(params)`

Renews eligible membership state.

### `verifyNftMembership(params)`

Verifies NFT ownership for NFT-based membership.

## Token gates

### `configureTokenGate(params)`

Creates/configures an application TokenGate.

### `verifyGateAccess(params)`

Verifies wallet access against the configured TokenGate.

## Event Decoder

### `decodeEvents(signature, options?)`

Fetches a confirmed transaction and decodes Babycowans events from transaction log messages.

Returns:

```ts
Promise<DecodedBabycowansEvent[]>
```

Important behavior:

- events preserve log order;
- unrelated program logs are ignored;
- missing transaction data produces `[]`;
- High-Level decoding scopes to `client.programId`.

## Read API

### `getApplication(params)`

Parameters:

```ts
{
    authority: PublicKey;
    applicationId: bigint;
}
```

Returns:

```ts
Promise<ReadAccount<ApplicationAccount> | null>
```

### `getMembership(params)`

Parameters:

```ts
{
    application: PublicKey;
    member: PublicKey;
}
```

Returns:

```ts
Promise<ReadAccount<MembershipAccount> | null>
```

### `getReward(params)`

Parameters:

```ts
{
    application: PublicKey;
    beneficiary: PublicKey;
    rewardId: bigint;
}
```

Returns:

```ts
Promise<ReadAccount<RewardAccount> | null>
```

### `getAuditHistory(params)`

Parameters:

```ts
{
    application: PublicKey;
}
```

Returns application-scoped AuditLog results.

No matching history returns an empty array.

## Account utility

### `accountExists(address)`

Checks whether an account exists at the given address.

## Transaction utilities

### `buildTransaction(payer, instructions)`

Builds a legacy Solana Transaction using the SDK TransactionHelper.

### `buildVersionedTransaction(payer, instructions)`

Builds a VersionedTransaction.

## Low-Level public surface

The root SDK also exports:

- instruction builders;
- instruction codecs;
- PDA helpers;
- account types;
- account decoders;
- canonical ecosystem registry;
- metadata helpers;
- onboarding helpers;
- Event Decoder primitives;
- Read API types;
- Batch composer primitives;
- protocol IDL.

## Read types

### `ReadAccount<T>`

```ts
interface ReadAccount<T> {
    address: PublicKey;
    data: T;
}
```

### `GetApplicationParams`

```ts
interface GetApplicationParams {
    authority: PublicKey;
    applicationId: bigint;
}
```

### `GetMembershipParams`

```ts
interface GetMembershipParams {
    application: PublicKey;
    member: PublicKey;
}
```

### `GetRewardParams`

```ts
interface GetRewardParams {
    application: PublicKey;
    beneficiary: PublicKey;
    rewardId: bigint;
}
```

### `GetAuditHistoryParams`

```ts
interface GetAuditHistoryParams {
    application: PublicKey;
}
```

## Event types

### `DecodedBabycowansEvent`

```ts
interface DecodedBabycowansEvent<
    TName extends string = string,
    TData = Record<string, unknown>,
> {
    name: TName;
    data: TData;
}
```

### `DecodeEventLogsOptions`

Supports:

```ts
{
    programId?: PublicKey;
    strict?: boolean;
}
```

The High-Level client supplies its own program ID when decoding transaction events.

## Batch types

The Low-Level batch module exports the canonical Application Bootstrap plan types and:

```text
buildApplicationBootstrapPlan(...)
```

The plan deterministically derives:

- Application;
- ApplicationConfig;
- optional ApplicationRole;

and returns ordered TransactionInstructions.

## PDA helpers

Current exported helpers include:

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

## Fidelity rules

Use:

```text
PublicKey → Solana addresses
bigint    → protocol integers requiring u64/i64 fidelity
number    → bounded smaller numeric fields
```

Do not infer a different representation from historical specification documents.

## Historical specifications

Files under `specifications/` may contain earlier design API names.

They are not the current public SDK reference.

Use this document plus current SDK source for integration work.

## Transaction failures

High-level `BabycowansSDK` write methods throw
`BabycowansTransactionError` when transaction submission
or confirmation fails.

The error exposes four diagnostic fields:

- `anchorErrorCode: string | null`
- `anchorErrorMessage: string | null`
- `logs: readonly string[]`
- `originalError: unknown`

When Anchor information is present, `anchorErrorCode`
identifies the Babycowans or Anchor error.

For example, protocol validation can report
`InvalidApplicationName`, while an Anchor account
relationship rejection can report `ConstraintHasOne`.

`anchorErrorMessage` contains the corresponding Anchor
message when available.

`logs` preserves available transaction logs and
`originalError` preserves the original Solana/Web3 failure
for lower-level diagnostics.

Application code using the high-level SDK should prefer
these normalized fields rather than parsing raw transaction
log text.
