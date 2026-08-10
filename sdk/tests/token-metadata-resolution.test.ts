import {
    Keypair,
    PublicKey,
} from "@solana/web3.js";

import {
    CANONICAL_ECOSYSTEMS,
    TOKEN_METADATA_PROGRAM_ID,
    decodeTokenMetadataHeader,
    findTokenMetadataPda,
    resolveCanonicalTokenMetadata,
} from "../src/index.js";

function expect(
    condition: boolean,
    message: string,
): void {
    if (!condition) {
        throw new Error(message);
    }
}

function encodeString(
    value: string,
): Buffer {
    const bytes =
        Buffer.from(
            value,
            "utf8",
        );

    const output =
        Buffer.alloc(
            4 + bytes.length,
        );

    output.writeUInt32LE(
        bytes.length,
        0,
    );

    bytes.copy(
        output,
        4,
    );

    return output;
}

function buildMetadataAccount(
    mint: PublicKey,
    name: string,
    symbol: string,
    uri: string,
): Buffer {
    return Buffer.concat([
        // Metadata key.
        Buffer.from([4]),

        // Update authority.
        Keypair.generate()
            .publicKey
            .toBuffer(),

        mint.toBuffer(),

        encodeString(name),
        encodeString(symbol),
        encodeString(uri),

        // Decoder intentionally ignores
        // remaining account fields.
        Buffer.alloc(32),
    ]);
}

expect(
    CANONICAL_ECOSYSTEMS.length === 6,
    "Exactly six canonical ecosystems required",
);

for (
    const canonical
    of CANONICAL_ECOSYSTEMS
) {
    const [first, firstBump] =
        findTokenMetadataPda(
            canonical.tokenAddress,
        );

    const [second, secondBump] =
        findTokenMetadataPda(
            canonical.tokenAddress,
        );

    expect(
        first.equals(second),
        "Token metadata PDA must be deterministic",
    );

    expect(
        firstBump === secondBump,
        "Token metadata PDA bump must be deterministic",
    );

    const account =
        buildMetadataAccount(
            canonical.tokenAddress,
            canonical.fullName,
            canonical.ticker.replace(
                "$",
                "",
            ),
            "https://example.test/metadata.json",
        );

    const decoded =
        decodeTokenMetadataHeader(
            account,
        );

    expect(
        decoded.mint.equals(
            canonical.tokenAddress,
        ),
        "Decoded token metadata mint mismatch",
    );

    expect(
        decoded.name ===
            canonical.fullName,
        "Decoded metadata name mismatch",
    );
}

/*
 * ----------------------------------------------------------
 * Production resolver contract.
 *
 * Network and fetch are mocked here so the semantic test
 * remains deterministic.
 * ----------------------------------------------------------
 */

{
    const canonical =
        CANONICAL_ECOSYSTEMS[0];

    const [metadataPda] =
        findTokenMetadataPda(
            canonical.tokenAddress,
        );

    const accountData =
        buildMetadataAccount(
            canonical.tokenAddress,
            canonical.fullName,
            canonical.ticker.replace(
                "$",
                "",
            ),
            "https://example.test/metadata.json",
        );

    const fakeConnection = {
        async getAccountInfo(
            address: PublicKey,
        ) {
            expect(
                address.equals(metadataPda),
                "Resolver requested wrong metadata PDA",
            );

            return {
                data: accountData,
                executable: false,
                lamports: 1,
                owner:
                    TOKEN_METADATA_PROGRAM_ID,
                rentEpoch: 0,
            };
        },
    };

    const originalFetch =
        globalThis.fetch;

    globalThis.fetch =
        async () =>
            new Response(
                JSON.stringify({
                    /*
                     * Deliberately hostile identity.
                     * It must not override canonical data.
                     */
                    name:
                        "UNTRUSTED TOKEN NAME",
                    symbol:
                        "UNTRUSTED",
                    description:
                        "Resolved external description",
                    image:
                        "https://example.test/real-image.png",
                    external_url:
                        "https://example.test",
                }),
                {
                    status: 200,
                    headers: {
                        "content-type":
                            "application/json",
                    },
                },
            );

    try {
        const resolved =
            await resolveCanonicalTokenMetadata(
                fakeConnection,
                canonical.ecosystem,
            );

        expect(
            resolved.fullName ===
                canonical.fullName,
            "External metadata overrode canonical fullName",
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
            resolved.metadataPda.equals(
                metadataPda,
            ),
            "Resolved metadata PDA mismatch",
        );

        expect(
            resolved.onchainName ===
                canonical.fullName,
            "Resolved on-chain name mismatch",
        );

        expect(
            resolved.image ===
                "https://example.test/real-image.png",
            "Resolved token image mismatch",
        );

        expect(
            resolved.description ===
                "Resolved external description",
            "Resolved description mismatch",
        );

        expect(
            resolved.externalUrl ===
                "https://example.test",
            "Resolved external URL mismatch",
        );
    } finally {
        globalThis.fetch =
            originalFetch;
    }
}

console.log(
    "✓ Phase 7 token Metadata PDA derivation",
);

console.log(
    "✓ Phase 7 token metadata header decoding",
);

console.log(
    "✓ Phase 7 production canonical metadata resolver",
);

console.log(
    "✓ External metadata cannot override canonical identity",
);
