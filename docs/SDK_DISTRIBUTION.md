# Babycowans Protocol V1.0.0 — SDK Distribution Contract

This document defines the authoritative SDK distribution contract for
Babycowans Protocol V1.0.0.

## Package identity

- Package: `@babycowans/core-sdk`
- SDK package version: `1.0.0`
- Protocol version: `V1.0.0`
- Official source-bound asset name: `babycowans-core-sdk-1.0.0-source-bound.tgz`

## Authoritative corrected artifact

The authoritative corrected SDK artifact is reproduced from the tracked
Babycowans SDK source and is distributed through the existing
Babycowans Protocol V1.0.0 GitHub Release.

The artifact identity is:

- SHA-1: `36c512ebe85977a2de7137cfabefee822406a852`
- SHA-256: `bac574ac7befc4a475550dbe2780458e8329f07583ccaa3e51b321bf3585edb8`

SHA-256 is the authoritative byte-level identity.

Consumers must verify the downloaded asset before installation.

## Historical npm registry artifact

The historical public npm registry artifact published as
`@babycowans/core-sdk@1.0.0` is retained as historical distribution evidence.

Its independently established artifact identity is:

- SHA-1: `3ce8abb57d8722092edc322e05d4daa6dd50ded3`
- SHA-256: `1d98a5528e5dca31375b4496fe64e88f0ed70b4571ac4bae8cbe7ce19df19576`

The historical npm artifact is not byte-equivalent to the corrected
source-bound artifact documented above.

It must not be treated as evidence that the current tracked SDK exports,
dependency boundary, numeric validation behavior, transaction helpers,
onboarding subpath, or other corrected SDK surfaces have been reproduced.

The historical npm bytes are not rewritten or represented as corrected.

## Installation from the source-bound artifact

Download `babycowans-core-sdk-1.0.0-source-bound.tgz` from the existing
Babycowans Protocol V1.0.0 GitHub Release.

Verify it before installation:

```bash
sha256sum babycowans-core-sdk-1.0.0-source-bound.tgz
```

The result must contain:

```text
bac574ac7befc4a475550dbe2780458e8329f07583ccaa3e51b321bf3585edb8  babycowans-core-sdk-1.0.0-source-bound.tgz
```

Install the verified artifact together with its Solana Web3 peer dependency:

```bash
npm install ./babycowans-core-sdk-1.0.0-source-bound.tgz @solana/web3.js@1.98.4
```

## Package export boundary

The corrected artifact exposes the package root and the separate
`./onboarding` subpath.

The Node-oriented onboarding subpath is intended for terminal developer
onboarding and must not be imported by browser applications.

Browser wallet ownership and signing remain outside SDK custody.

## Reproduction contract

The source-bound artifact is accepted only when an independently reproduced
`npm pack` result matches the authoritative SHA-256 recorded in this document.

The final corrective closure evidence binds that artifact identity to the
corresponding tracked SDK source tree.

## Versioning and provenance boundary

This corrective distribution contract does not create a new Babycowans
Protocol version, SDK package version, Git tag, or GitHub Release.

The existing historical `v1.0.0` tag remains historical provenance.

Moving that tag as part of this corrective distribution closure is forbidden.

The corrected SDK artifact is identified independently through its
cryptographic digest and source-binding evidence.
