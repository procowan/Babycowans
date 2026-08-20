# Babycowans Integration Compatibility Guide

This guide covers integration compatibility and upgrade practices for **Babycowans Protocol V1.0.0**.

It does not define or imply a second Babycowans protocol/product version.

## 1. Purpose

Use this document when:

- updating the SDK dependency;
- changing an integration from manual Low-Level code to High-Level helpers;
- consuming a newer IDL or deployment artifact;
- adding support for newer backward-compatible capabilities;
- reviewing whether account/event assumptions still match the repository.

## 2. Source-of-truth order

For compatibility-sensitive work, validate against:

```text
1. Rust / Anchor program definitions
2. Current protocol IDL
3. Current SDK types and builders
4. Current production documentation
5. Historical specifications
```

Historical specifications are intentionally last.

## 3. Canonical ecosystem identity

Never migrate canonical Full Name, Ticker, Token Address or Mission from copied documentation.

Resolve canonical identity from current repository sources.

Application metadata must remain independent from canonical ecosystem identity.

## 4. PDA compatibility

Use SDK helpers instead of reproducing seed strings.

If PDA behavior changes in a future compatible repository update, the current SDK helper should remain the integration boundary.

## 5. Account compatibility

Do not decode program accounts with handwritten offsets copied from old code.

Prefer current SDK decoders.

The SDK validates Anchor account discriminators before accepting account bytes as known protocol state.

## 6. Integer compatibility

Preserve:

```text
u64 / i64 → bigint
```

when the SDK exposes those values as `bigint`.

Do not migrate to `number` for convenience without proving the domain is safe.

## 7. PublicKey compatibility

Keep Solana addresses as `PublicKey` in protocol logic.

Serialize to Base58 only at boundaries that require strings.

## 8. Event compatibility

Event source of truth is:

```text
Rust events
    ↓
IDL
    ↓
SDK Event Decoder
```

Do not maintain an application-owned copy of event discriminators or layouts.

## 9. Read API adoption

Manual account fetch + decode code can often be replaced by:

```text
getApplication
getMembership
getReward
getAuditHistory
```

Benefits include:

- canonical PDA derivation;
- program-owner validation;
- account-discriminator validation;
- typed return models;
- consistent missing-state semantics.

## 10. Event Decoder adoption

Manual transaction-log parsing can be replaced by:

```text
client.decodeEvents(signature)
```

This preserves:

- event ordering;
- program scoping;
- integer fidelity;
- PublicKey fidelity.

## 11. Batch Instructions adoption

A sequence that separately executes:

```text
RegisterApplication
ConfigureApplicationConfig
AssignApplicationRole
```

can use the canonical application bootstrap flow when atomicity is desired.

Benefits:

- one transaction;
- one signature;
- atomic rollback;
- deterministic instruction ordering.

Do not replace unrelated multi-operation workflows with a generic batch abstraction unless their protocol dependencies have been verified.

## 12. High-Level versus Low-Level SDK

Adopting High-Level APIs does not require abandoning Low-Level SDK access.

Use High-Level APIs for common canonical operations.

Use Low-Level primitives for:

- custom transaction composition;
- external signer orchestration;
- Versioned Transactions;
- specialized integration pipelines.

## 13. Historical API names

Historical specification documents may contain design names that are not current SDK exports.

Do not assume a historical method is available because it appears under `specifications/`.

Use:

```text
docs/API.md
sdk/src/index.ts
sdk/src/client/BabycowansSDK.ts
```

for current public integration surface.

## 14. Deployment compatibility

Before deploying a repository update:

1. derive the program ID from repository configuration;
2. verify it matches Rust `declare_id!`;
3. build the current program;
4. compare the intended deployment artifact;
5. verify validator / cluster target;
6. deploy only when required;
7. use the supported Anchor command.

Current repository command form:

```bash
anchor program deploy \
  target/deploy/babycowans_protocol.so \
  --provider.cluster localnet \
  --no-idl
```

The command above documents the repository's local-development deployment contract. It is not a production-cluster deployment procedure.

### Production deployment authority

For a production deployment, verify the intended Solana cluster and deployment artifact independently. Do not reuse local-validator authority assumptions, local test keypairs, local RPC configuration, or generated fixtures as production authority policy.

Babycowans supports an upgradeable program deployment model. The production deploy/upgrade authority is an operator-security decision and should be protected according to production risk, for example through hardware-backed signing and/or a multisignature-controlled authority. Making a deployment immutable is a separate irreversible decision and is not implied by the localnet workflow.

### Verifiable release provenance

For release provenance, a reviewer should be able to relate the public repository source to the program bytecode intended for deployment.

The installed Anchor toolchain exposes verifiable-build and verification support. Inspect the exact options supported by the installed toolchain with:

```bash
anchor build --help
anchor verify --help
```

When producing a production release artifact, use the repository-supported verifiable-build workflow with an explicitly selected Solana/toolchain environment appropriate to that release, then record the resulting source revision and artifact identity.

After deployment, verify the deployed program against the intended release artifact/source using the repository-supported Anchor verification workflow and the actual target cluster. Do not substitute local-validator bytecode equality for production-cluster verification.

Release provenance should preserve, at minimum:

- the exact Git commit used for the release;
- the Program ID derived from current repository truth;
- the intended Solana cluster;
- the build/toolchain environment;
- the program artifact identity or cryptographic hash;
- the deployed-program verification result.

A successful local build alone is not proof that a public production deployment contains the same bytecode.

## 15. IDL compatibility checklist

When the IDL changes, verify:

- instruction list;
- account definitions;
- discriminators;
- event definitions;
- enum definitions;
- SDK consistency tests;
- account decoders;
- Event Decoder behavior.

## 16. SDK upgrade checklist

Before updating a production integration:

- run `npm run typecheck`;
- inspect SDK public type changes;
- run relevant application tests;
- verify `bigint` behavior;
- verify signer requirements;
- verify account prerequisites;
- verify event decoding;
- verify Read API null/empty semantics;
- verify canonical ecosystem identity resolution.

## 17. Do not infer compatibility from documentation alone

Documentation is an integration aid, not an independent protocol schema.

When a production assumption matters, verify the repository contract.
