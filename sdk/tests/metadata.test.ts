import {
    normalizeMetadataUri,
    parseApplicationMetadata,
} from "../src/metadata/index.js";

function expect(
    condition: boolean,
    message: string,
): void {
    if (!condition) {
        throw new Error(message);
    }
}

/*
 * ----------------------------------------------------------
 * Minimal metadata
 * ----------------------------------------------------------
 */

{
    const metadata =
        parseApplicationMetadata({
            name: "Babycowans Example Application",
        });

    expect(
        metadata.name ===
            "Babycowans Example Application",
        "Minimal metadata name mismatch",
    );

    expect(
        metadata.image === undefined,
        "Minimal metadata image must remain optional",
    );

    console.log(
        "✓ Phase 7 minimal application metadata",
    );
}

/*
 * ----------------------------------------------------------
 * Rich Solana-style metadata
 * ----------------------------------------------------------
 */

{
    const metadata =
        parseApplicationMetadata({
            name: "Babycowans Application",
            symbol: "APP",
            description:
                "Application built on Babycowans Protocol.",
            image:
                "ipfs://example-image-cid",
            animation_url:
                "https://example.com/animation.mp4",
            external_url:
                "https://example.com",
            attributes: [
                {
                    trait_type: "ecosystem",
                    value: "BRC",
                },
                {
                    trait_type: "tier",
                    value: 3,
                },
            ],
            properties: {
                category: "application",
                files: [
                    {
                        uri:
                            "ipfs://example-image-cid",
                        type: "image/png",
                    },
                ],
            },
        });

    expect(
        metadata.symbol === "APP",
        "Metadata symbol mismatch",
    );

    expect(
        metadata.attributes?.length === 2,
        "Metadata attribute count mismatch",
    );

    expect(
        metadata.attributes?.[0].traitType
            === "ecosystem",
        "Metadata trait_type conversion mismatch",
    );

    expect(
        metadata.animationUrl ===
            "https://example.com/animation.mp4",
        "Metadata animation_url mismatch",
    );

    expect(
        metadata.externalUrl ===
            "https://example.com",
        "Metadata external_url mismatch",
    );

    expect(
        metadata.properties?.files?.[0].type
            === "image/png",
        "Metadata properties.files mismatch",
    );

    console.log(
        "✓ Phase 7 rich Solana-style metadata",
    );
}

/*
 * ----------------------------------------------------------
 * URI normalization
 * ----------------------------------------------------------
 */

{
    expect(
        normalizeMetadataUri(
            "ipfs://QmBabycowansMetadata",
        ) ===
            "https://ipfs.io/ipfs/QmBabycowansMetadata",
        "IPFS URI normalization mismatch",
    );

    expect(
        normalizeMetadataUri(
            "ar://BabycowansArweaveMetadata",
        ) ===
            "https://arweave.net/BabycowansArweaveMetadata",
        "Arweave URI normalization mismatch",
    );

    expect(
        normalizeMetadataUri(
            "https://example.com/metadata.json",
        ) ===
            "https://example.com/metadata.json",
        "HTTPS URI normalization mismatch",
    );

    console.log(
        "✓ Phase 7 metadata URI normalization",
    );
}

/*
 * ----------------------------------------------------------
 * Invalid documents
 * ----------------------------------------------------------
 */

{
    let rejected = false;

    try {
        parseApplicationMetadata({});
    } catch {
        rejected = true;
    }

    expect(
        rejected,
        "Metadata without name must be rejected",
    );
}

{
    let rejected = false;

    try {
        parseApplicationMetadata({
            name: "Invalid",
            image: 123,
        });
    } catch {
        rejected = true;
    }

    expect(
        rejected,
        "Invalid image type must be rejected",
    );
}

{
    let rejected = false;

    try {
        parseApplicationMetadata({
            name: "Invalid",
            attributes: [
                {
                    trait_type: 123,
                    value: "BRC",
                },
            ],
        });
    } catch {
        rejected = true;
    }

    expect(
        rejected,
        "Invalid attribute trait_type must be rejected",
    );
}

{
    let rejected = false;

    try {
        normalizeMetadataUri(
            "ftp://example.com/metadata.json",
        );
    } catch {
        rejected = true;
    }

    expect(
        rejected,
        "Unsupported URI scheme must be rejected",
    );
}

console.log(
    "✓ Phase 7 metadata semantic tests passed",
);
