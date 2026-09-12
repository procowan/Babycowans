# Babycowans Protocol V1.0.0 — Canonical Release Provenance

This document is the single canonical provenance model for Babycowans Protocol V1.0.0.
Other documentation may link here, but must not define a competing current release identity.

## Canonical identity chain

A public Babycowans Protocol V1.0.0 release is provenance-complete only when one identity
chain can be verified end to end:

`main` release commit → Git tree → `v1.0.0` tag → GitHub Release → program artifact →
`@babycowans/core-sdk@1.0.0` artifact → release evidence.

The final release record must bind the exact values below from authoritative sources at
release closure. Intermediate corrective commits or historical assurance checkpoints are
not alternate current release identities.

| Field | Canonical requirement |
|---|---|
| Repository branch | `main` |
| Protocol version | `Babycowans Protocol V1.0.0` |
| SDK package | `@babycowans/core-sdk@1.0.0` |
| Release tag | `v1.0.0` |
| Release commit | Exact commit peeled from the final tag and equal to final `main` |
| Release tree | Exact tree of the release commit |
| Program ID | Derived from current repository truth |
| Program artifact | `babycowans_protocol.so` produced from the release commit |
| Program artifact identity | SHA-256 of the exact release artifact |
| SDK artifact | `babycowans-core-sdk-1.0.0.tgz` produced from `sdk/` at the release commit |
| SDK artifact identity | SHA-256, SHA-1, size, and file inventory of the exact release artifact |
| Toolchain | Exact Rust, Cargo, Solana, Anchor, Node, and Yarn versions used for proof/build |
| Runtime evidence | Evidence generated against the same release commit/tree |
| Deployment verification | Target cluster and verification result when a production deployment is claimed |

## Binding rules

1. Release identity is read from Git and release artifacts; it is not inferred from prose.
2. The final `main`, `v1.0.0` tag, GitHub Release source identity, and published release
   record must resolve to one final release commit/tree.
3. The SDK has one source location, `sdk/`, and one release package identity,
   `@babycowans/core-sdk@1.0.0`.
4. The canonical SDK tarball name is `babycowans-core-sdk-1.0.0.tgz`.
5. Program and SDK artifact hashes must be calculated from the exact bytes attached to or
   otherwise designated by the final release, not from an earlier artifact.
6. Runtime, security, DX, and regression evidence is valid for final certification only
   when its recorded HEAD/TREE matches the final release identity, or when a later
   evidence record explicitly re-proves the final tree.
7. Historical certification hashes may remain as evidence of the examination that
   produced them, but they do not define the current release source identity.
8. No second provenance document, alternate package path, alternate SDK artifact, or
   explanatory “current versus historical” release identity is authoritative.

## Build and deployment provenance

The repository's verifiable-build guidance is defined in
[Migration / Compatibility](MIGRATION.md#verifiable-release-provenance). A local build is
not proof of production deployment byte equality. If production deployment is claimed,
the final provenance record must include the actual target cluster and the repository-
supported verification result for the release artifact/source.

## Final closure condition

The provenance model is PASS only when the final release evidence demonstrates:

`IDENTITY → EXECUTION → OUTPUT → INDEPENDENT EVIDENCE`

and:

`NO_ALTERNATE_CURRENT_TRUTH=PASS`

The concrete final commit, tree, artifact hashes, release binding, and evidence locators
are recorded by the final release/evidence closure process from authoritative bytes and
Git identities. They must not be predeclared in this document before those final stages
complete.
