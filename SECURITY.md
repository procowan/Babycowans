# Security Policy

Babycowans Protocol V1.0.0 treats vulnerability reporting and security documentation as part of the release contract.

## Supported Version

The supported Babycowans Protocol release is:

| Version | Supported |
| --- | --- |
| 1.0.0 | Yes |

Security reports should be evaluated against the current repository state and the published Protocol V1.0.0 contract.

## Reporting a Vulnerability

Use GitHub Private Vulnerability Reporting for this repository to report suspected security vulnerabilities privately.

Do **not** disclose an unremediated vulnerability through a public GitHub issue, discussion, pull request, or other public channel.

A useful report should include, where applicable:

- the affected component and Protocol/SDK version;
- a clear description of the vulnerability and its security impact;
- reproducible steps or a minimal proof of concept;
- relevant transaction, account, instruction, or runtime context;
- expected behavior and observed behavior.

Do not include private keys, seed phrases, secret keys, credentials, or other sensitive authentication material in a report.

Reports may be investigated against the on-chain protocol, SDK, runtime behavior, documentation, and relevant repository security boundaries.

## Security Boundaries

Babycowans security depends on the protocol and integration boundaries documented in the repository.

Integrators should preserve, among other applicable controls:

- signer and authority requirements;
- PDA and account relationships;
- canonical ecosystem and canonical mint identity;
- token-account mint and owner validation;
- SPL Token and Token-2022 program compatibility requirements;
- application and protocol authority boundaries;
- protocol lifecycle and pause semantics.

Documentation is not an independent protocol schema. When a security-sensitive assumption matters, verify it against the current Rust/Anchor implementation, IDL, SDK, and repository tests.

## Keys, Wallets, and Secrets

Never commit production private keys, seed phrases, secret keys, credentials, or sensitive wallet material to this repository.

Treat deploy-authority, protocol-authority, application-authority, and operational wallet credentials as sensitive material.

Local development keypairs, test-validator accounts, fixtures, and local RPC configuration must not be treated as production credentials or production deployment instructions.

## Production Deployment and Upgrade Authority

Babycowans Protocol supports an upgradeable Solana program deployment model. A local-validator upgrade authority is local test infrastructure and must never be represented as a production authority.

For a public production deployment:

- deploy and upgrade authority are operator-security responsibilities;
- production authority credentials must not use disposable local-development keypairs;
- an upgradeable deployment should use an operational model appropriate to production risk, such as hardware-backed signing and/or multisignature-controlled authority;
- making a deployed program immutable is a separate, irreversible operator decision;
- production authority addresses are deployment-specific and must not be copied from localnet or invented in documentation.

Compromise or loss of a production deployment authority, protocol authority, application authority, or other privileged signer must be treated as an operational security incident.

## Token Program Compatibility Boundary

Babycowans supports SPL Token and Token-2022 through the protocol's TokenInterface account and transfer model, including the standard mint, token-account, owner, token-program, and checked-transfer semantics exercised by repository tests.

This does not imply blanket semantic support for every optional Token-2022 extension. Extensions that alter transfer behavior, fees, authority, hooks, confidentiality, account state, delegation, or other token semantics are integration-specific and must be validated against the actual mint before production use.

## Real-World Asset and External-Truth Boundary

Babycowans provides on-chain application, payment, membership, reward, access-policy, audit, and tokenization infrastructure.

The protocol does not by itself establish or verify legal title, physical possession, regulatory status, medical facts, shipment completion, provenance, sensor truth, valuation, or other off-chain facts.

Applications that depend on real-world facts are responsible for the external legal, operational, oracle, attestation, custody, identity, or verification systems that establish those facts.

## Local Development and Production

The repository-owned Solana test-validator workflow is a **local development and testing environment**.

Localhost RPC endpoints, local ledgers, generated fixtures, local airdrops, test-validator accounts, and repository localnet commands are not production infrastructure.

Do not infer a mainnet deployment procedure from local-validator examples or localnet configuration.

Production-sensitive deployment decisions must be validated independently against the intended Solana cluster, current repository contract, authority model, release state, and applicable security review requirements.

## Security Claims

Repository tests, CI gates, audits, and security controls provide evidence about specific tested invariants. They are not a guarantee that vulnerabilities cannot exist.

Security-sensitive integrations should verify the current protocol contract rather than relying on assumptions, historical specifications, or copied examples.
