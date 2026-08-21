# Contributing to Babycowans Protocol

Thank you for helping improve Babycowans Protocol V1.0.0.

Babycowans is open developer infrastructure intended to be useful to
developers, builders, researchers, startups, and teams building on Solana.

## Before contributing

Please:

1. work from the current repository state;
2. preserve the six canonical Babycowans ecosystem identities;
3. preserve SPL Token and Token-2022 compatibility;
4. preserve protocol, PDA, authority, account, event, and SDK contracts;
5. avoid duplicating Low-Level SDK protocol logic in higher-level abstractions;
6. keep changes focused and supported by tests or repository evidence;
7. run the relevant repository checks before submitting a pull request.

The public SDK package is:

`@babycowans/core-sdk`

## Pull requests

A useful pull request should clearly explain:

- what is changing;
- why the change is needed;
- which protocol or SDK surface is affected;
- what tests or evidence validate the change.

Do not include unrelated refactors in a focused fix.

Changes to protocol behavior, public SDK contracts, account layouts,
instruction semantics, canonical ecosystem identity, or security boundaries
require especially careful review.

## Security vulnerabilities

Do not disclose an unremediated security vulnerability in a public issue,
discussion, or pull request.

Follow the private reporting process documented in `SECURITY.md`.

## License and ownership

Contributions to this repository are made under the repository's MIT License.

Copyright and project ownership notices for Babycowans remain associated with
procowan as stated in the repository License. The MIT License permits broad
use, modification, distribution, and commercial use subject to its terms.
