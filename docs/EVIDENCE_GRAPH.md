# Babycowans Protocol V1.0.0 — Canonical Evidence Graph

This document is the single canonical evidence graph model for Babycowans Protocol
V1.0.0. It defines how release claims are connected to authoritative identity,
execution, output bytes, and independently inspectable evidence. It does not replace
the evidence bytes themselves.

The release identity authority is [Canonical Release Provenance](PROVENANCE.md).

## Graph root

Every final release claim must resolve through one graph rooted at the final release
identity:

`final main commit → final Git tree → v1.0.0 → GitHub Release`

From that root, evidence edges connect the exact release identity to executions,
outputs, cryptographic identities, and evidence locators.

## Canonical node classes

| Node | Required binding |
|---|---|
| `SOURCE` | Final `main` commit and Git tree |
| `TAG` | `v1.0.0` peeled commit/tree, equal to final `main` |
| `RELEASE` | The one GitHub Release associated with `v1.0.0` |
| `TOOLCHAIN` | Exact Rust, Cargo, Solana, Anchor, Node, and Yarn identities |
| `PROGRAM_ARTIFACT` | Exact `babycowans_protocol.so` release bytes + SHA-256 |
| `SDK_ARTIFACT` | Exact `babycowans-core-sdk-1.0.0.tgz` bytes + SHA-256 + SHA-1 + size + file inventory |
| `REGRESSION` | Rust, SDK static/build, dependency, numeric, IDL, decoder, Read API, Event Decoder, high-level client, batch, metadata, error, property and audit proofs |
| `RUNTIME` | Default isolated E2E, packed bootstrap E2E, Token-2022 coverage and runtime identity |
| `GOLDEN_PATH` | Six-canonical-ecosystem end-to-end proof |
| `FUZZ` | Fail-closed semantic fuzz evidence and its artifact manifest |
| `ASSURANCE` | Scale and security assurance reports/certification hashes as historical evidence inputs |
| `DX` | Packed external-consumer, browser-platform, wallet-neutral transaction-plan and receipt-resolution proofs |
| `FINAL_EXAMINATION` | Final corrective report and independent ASTRA re-examination evidence |

## Required edges

The final graph must demonstrate these semantic edges:

1. `SOURCE → TOOLCHAIN → PROGRAM_ARTIFACT`
2. `SOURCE → SDK_ARTIFACT`
3. `SOURCE + PROGRAM_ARTIFACT → RUNTIME`
4. `SOURCE + SDK_ARTIFACT → DX`
5. `SOURCE → REGRESSION`
6. `SOURCE → GOLDEN_PATH`
7. `SOURCE → FUZZ`
8. `ASSURANCE → FINAL_EXAMINATION`
9. `REGRESSION + RUNTIME + GOLDEN_PATH + FUZZ + DX → FINAL_EXAMINATION`
10. `TAG + RELEASE + PROGRAM_ARTIFACT + SDK_ARTIFACT + FINAL_EXAMINATION → FINAL RELEASE CLAIM`

A PASS marker without its identity edge and inspectable evidence bytes/locator is not
sufficient evidence.

## Repository evidence producers

The canonical CI workflow produces release-relevant runtime evidence under
`.astra-evidence` and uploads it as `astra-runtime-evidence`. Its runtime identity record
binds the checked-out HEAD/TREE, toolchain versions, and SHA-256 of the built program
artifact.

The runtime evidence set includes:

- `runtime-identity.txt`
- `default-e2e.log`
- `application-bootstrap.log`
- `golden-six.log`

The canonical CI workflow also produces semantic fuzz evidence and uploads it as
`astra-fuzz-evidence`. The fuzz gate records lock/manifest hashes, target/seed hashes,
and an artifact manifest.

These CI artifact names are evidence locators, not separate evidence graphs.

## Local corrective evidence

Local corrective evidence may be used during remediation only when it is preserved with
cryptographic manifests and bound to the exact HEAD/TREE that it tested. Such evidence
is an input to the final graph; `/tmp` paths themselves are not durable final-release
locators.

The Stage 06 corrective proof demonstrated the expected manifest pattern: individual
proof logs plus a `SHA256SUMS.txt` manifest. Because later documentation commits change
the Git tree, that Stage 06 evidence remains corrective evidence and must not be
misrepresented as final-tree certification. Final certification must re-prove the final
release tree or explicitly bind a later evidence record to it.

## Assurance evidence

The Scale and Security Assurance documents under `docs/assurance/` are evidence inputs.
Their historical certification hashes preserve the identity of the examinations that
produced them. They do not establish a competing current release source identity and do
not replace final-tree runtime evidence.

## Final evidence record requirements

At final release closure, the one evidence graph must record or point to durable,
independently retrievable evidence for:

- final commit and tree;
- peeled `v1.0.0` commit/tree;
- GitHub Release identity;
- exact program artifact hash;
- exact SDK artifact SHA-256, SHA-1, size, and file inventory;
- exact toolchain identities;
- regression/security/audit results;
- default runtime E2E;
- packed application bootstrap including 2-instruction, 3-instruction and atomic rollback proof;
- Token-2022 runtime coverage;
- six-ecosystem Golden Path;
- semantic fuzz evidence;
- packed consumer/browser/wallet DX evidence;
- Scale/Security assurance inputs;
- final corrective closure report;
- independent Final ASTRA re-examination.

Where evidence is produced by CI, the final record must preserve a durable locator to
the exact workflow run/artifact or preserve the exact artifact bytes in the final
release evidence set. Ephemeral local paths are not sufficient final locators.

## Closure invariants

The final graph is complete only when all release claims satisfy:

`IDENTITY → EXECUTION → OUTPUT → INDEPENDENT EVIDENCE`

and all final evidence resolves to the same release identity:

`NO_ALTERNATE_CURRENT_TRUTH=PASS`

There is one evidence graph model: this document. Assurance reports, CI artifacts,
runtime logs, fuzz manifests, release artifacts, and the Final ASTRA report are nodes or
evidence objects in this graph, not parallel current truths.
