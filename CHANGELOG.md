# Changelog

## 1.0.0

Babycowans Protocol V1.0.0 is the complete public developer release of
the Babycowans Solana protocol and `@babycowans/core-sdk`.

### Canonical ecosystem infrastructure

- Six canonical Babycowans ecosystems
- Immutable canonical ecosystem identity
- Canonical mint resolution
- Application ecosystem selection persisted on-chain
- SDK ecosystem registry and identity resolution

### Protocol infrastructure

- Application registration
- Application configuration
- Application authority lifecycle
- Application status lifecycle
- Application asset configuration
- Protocol authority lifecycle
- Protocol pause control
- Application-scoped roles
- Deterministic PDA and parent-child relationship model

### Token and Payment infrastructure

- SPL Token compatibility
- Token-2022 compatibility at the documented protocol boundary
- Canonical asset registration
- Application Payment policy
- Payment minimum and maximum controls
- Protocol and Application fee allocation
- Payment destination and treasury binding
- Token-account owner, mint, and token-program validation

### Membership and access infrastructure

- Membership registration
- Membership updates
- Membership renewal
- Membership status and tier state
- NFT membership verification
- Direct TokenGate access control
- Composable GatePolicy access control
- HoldAmount, MembershipTier, and NFT ownership conditions

### Reward infrastructure

- Reward creation
- Scheduled rewards
- Reward expiration
- Reward claim
- Reward cancellation
- Reward reason
- Reward category
- Deterministic Reward identity and lifecycle

### Audit, events, and reads

- Structured AuditLog state
- Application-scoped audit history
- Typed protocol events
- Event Decoder
- malformed-event boundaries
- High-Level Read API
- Application, Membership, Reward, and AuditLog reads

### SDK and developer infrastructure

- `@babycowans/core-sdk`
- High-Level `BabycowansSDK`
- Low-Level instruction builders
- PDA helpers
- account decoders
- typed error normalization
- transaction helpers
- batch composition
- canonical Application bootstrap
- developer onboarding
- executable examples
- six-canonical repository-owned local validator workflow

### Documentation and security

- Product README
- Protocol Guide
- Architecture
- SDK Guide
- API Reference
- Cookbook
- Migration and compatibility guidance
- Security Policy
- responsible vulnerability disclosure
- production operational security guidance
- Release Assurance

### Final Release Assurance

- Scale Assurance: **PASS**
- Security Attack Assurance: **PASS**
- 10,000,000-user population model: **PASS**
- Application runtime Scale: **PASS**
- Payment runtime Scale: **PASS**
- Confirmed Protocol Scale defects: **0**
- Confirmed Test 2 Protocol security defects: **0**
- Confirmed Test 2 SDK security defects: **0**

See [Protocol V1.0.0 Release Assurance](docs/assurance/README.md).
