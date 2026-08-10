import {
    CANONICAL_ECOSYSTEMS,
    resolveCanonicalEcosystemIdentity,
} from "../src/index.js";

function expect(
    condition: boolean,
    message: string,
): void {
    if (!condition) {
        throw new Error(message);
    }
}

expect(
    CANONICAL_ECOSYSTEMS.length === 6,
    "Exactly six canonical ecosystems are required",
);

for (const canonical of CANONICAL_ECOSYSTEMS) {
    const metadataUri =
        `https://metadata.example/${canonical.ecosystem}.json`;

    const image =
        `https://metadata.example/${canonical.ecosystem}.png`;

    const externalDescription =
        `External metadata for ${canonical.fullName}`;

    const resolved =
        resolveCanonicalEcosystemIdentity(
            canonical.ecosystem,
            {
                /*
                 * Deliberately conflicting identity fields.
                 *
                 * These MUST NOT override canonical
                 * protocol identity.
                 */
                name: "UNTRUSTED NAME",
                symbol: "UNTRUSTED",
                description:
                    externalDescription,
                image,
            },
            metadataUri,
        );

    expect(
        resolved.ecosystem ===
            canonical.ecosystem,
        "Canonical ecosystem mismatch",
    );

    expect(
        resolved.fullName ===
            canonical.fullName,
        "External metadata overrode canonical name",
    );

    expect(
        resolved.ticker ===
            canonical.ticker,
        "External metadata overrode canonical ticker",
    );

    expect(
        resolved.tokenAddress.equals(
            canonical.tokenAddress,
        ),
        "Canonical token address mismatch",
    );

    expect(
        resolved.mission ===
            canonical.mission,
        "External metadata overrode canonical mission",
    );

    expect(
        resolved.metadataUri === metadataUri,
        "Metadata URI mismatch",
    );

    expect(
        resolved.image === image,
        "Resolved image mismatch",
    );

    expect(
        resolved.description ===
            externalDescription,
        "Resolved external description mismatch",
    );
}

console.log(
    "✓ Phase 7 six canonical ecosystem identities",
);

console.log(
    "✓ External metadata cannot override canonical identity",
);

console.log(
    "✓ Canonical identity metadata enrichment passed",
);
