# Babycowans Protocol Roadmap

## Current public release

The current public protocol release is:

**Babycowans Protocol V1.0.0**

The repository and the published `@babycowans/core-sdk` package are the
authoritative implementation surfaces for this release.

Protocol V1.0.0 provides reusable Solana developer infrastructure around the
six canonical Babycowans ecosystems, including application infrastructure,
payments, rewards, membership, access policies, events, audit capabilities,
read APIs, transaction composition, and the typed SDK surface documented in
this repository.

## Release principle

Future development should extend the project without weakening the contracts
already established and validated for Protocol V1.0.0.

In particular, future work must preserve or deliberately and transparently
evolve:

- canonical ecosystem identity;
- protocol and account integrity;
- authority and security boundaries;
- SPL Token and Token-2022 compatibility;
- deterministic PDA behavior;
- SDK and IDL coherence;
- developer usability;
- testing and release assurance.

## Future work

Future development is intentionally evidence-driven.

Potential improvements may arise from real developer adoption, integration
feedback, security research, ecosystem requirements, and demonstrated
production needs.

This document does not promise particular future features, release dates,
financial outcomes, or a separate protocol generation.

The current supported public release remains Babycowans Protocol V1.0.0 until
the repository explicitly establishes otherwise.
