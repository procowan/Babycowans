import {
    Keypair,
    PublicKey,
} from "@solana/web3.js";

import {
    CANONICAL_ECOSYSTEMS,
    TOKEN_METADATA_PROGRAM_ID,
    resolveApplicationExperience,
} from "../src/index.js";

import type {
    ApplicationConfigAccount,
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

    const encoded =
        Buffer.alloc(
            4 + bytes.length,
        );

    encoded.writeUInt32LE(
        bytes.length,
        0,
    );

    bytes.copy(
        encoded,
        4,
    );

    return encoded;
}

function metadataAccount(
    mint: PublicKey,
    name: string,
    symbol: string,
    uri: string,
): Buffer {
    return Buffer.concat([
        Buffer.from([4]),

        Keypair.generate()
            .publicKey
            .toBuffer(),

        mint.toBuffer(),

        encodeString(name),
        encodeString(symbol),
        encodeString(uri),

        Buffer.alloc(32),
    ]);
}

const canonical =
    CANONICAL_ECOSYSTEMS[0];

const tokenMetadataUri =
    "https://example.test/token.json";

const applicationMetadataUri =
    "https://example.test/application.json";

const accountData =
    metadataAccount(
        canonical.tokenAddress,
        canonical.fullName,
        canonical.ticker.replace(
            "$",
            "",
        ),
        tokenMetadataUri,
    );

const fakeConnection = {
    async getAccountInfo(
        _address: PublicKey,
    ) {
        return {
            data:
                accountData,
            executable:
                false,
            lamports:
                1,
            owner:
                TOKEN_METADATA_PROGRAM_ID,
            rentEpoch:
                0,
        };
    },
};

const config: ApplicationConfigAccount = {
    version: 1,
    application:
        Keypair.generate()
            .publicKey,

    websiteUri:
        "https://developer.example",

    logoUri:
        "https://developer.example/logo.png",

    supportUri:
        "https://developer.example/support",

    description:
        "Developer application",

    metadataUri:
        applicationMetadataUri,

    createdAt:
        1_700_000_000n,

    updatedAt:
        1_700_000_100n,

    bump:
        200,
};

const originalFetch =
    globalThis.fetch;

globalThis.fetch =
    async (
        input: RequestInfo | URL,
    ) => {
        const url =
            typeof input === "string"
                ? input
                : input instanceof URL
                    ? input.toString()
                    : input.url;

        if (url === tokenMetadataUri) {
            return new Response(
                JSON.stringify({
                    name:
                        "UNTRUSTED TOKEN NAME",
                    symbol:
                        "UNTRUSTED",
                    description:
                        "Real token metadata description",
                    image:
                        "https://example.test/coin.png",
                }),
                {
                    status: 200,
                    headers: {
                        "content-type":
                            "application/json",
                    },
                },
            );
        }

        if (url === applicationMetadataUri) {
            return new Response(
                JSON.stringify({
                    name:
                        "Developer Application",
                    symbol:
                        "DAPP",
                    description:
                        "Application-specific metadata",
                    image:
                        "https://example.test/application.png",
                    external_url:
                        "https://developer.example",
                }),
                {
                    status: 200,
                    headers: {
                        "content-type":
                            "application/json",
                    },
                },
            );
        }

        return new Response(
            "Not found",
            {
                status: 404,
            },
        );
    };

try {
    const resolved =
        await resolveApplicationExperience(
            fakeConnection,
            canonical.ecosystem,
            config,
        );

    /*
     * Canonical ecosystem identity.
     */
    expect(
        resolved.ecosystem.fullName
            === canonical.fullName,
        "Canonical fullName mismatch",
    );

    expect(
        resolved.ecosystem.ticker
            === canonical.ticker,
        "Canonical ticker mismatch",
    );

    expect(
        resolved.ecosystem.tokenAddress.equals(
            canonical.tokenAddress,
        ),
        "Canonical token address mismatch",
    );

    expect(
        resolved.ecosystem.mission
            === canonical.mission,
        "Canonical mission mismatch",
    );

    expect(
        resolved.ecosystem.image
            === "https://example.test/coin.png",
        "Real token image missing",
    );

    /*
     * Developer ApplicationConfig.
     */
    expect(
        resolved.application.config
            === config,
        "ApplicationConfig reference mismatch",
    );

    expect(
        resolved.application.metadata
            ?.metadata.name
            === "Developer Application",
        "Application metadata name mismatch",
    );

    expect(
        resolved.application.metadata
            ?.metadata.image
            === "https://example.test/application.png",
        "Application metadata image mismatch",
    );

    /*
     * Critical separation:
     *
     * Application metadata must never replace
     * canonical ecosystem identity.
     */
    expect(
        resolved.ecosystem.fullName
            !== resolved.application.metadata
                ?.metadata.name,
        "Application metadata polluted canonical identity",
    );

    console.log(
        "✓ Phase 7 unified developer application experience",
    );

    console.log(
        "✓ Canonical token image and identity auto-resolved",
    );

    console.log(
        "✓ Application metadata resolved independently",
    );

    console.log(
        "✓ Application metadata cannot override ecosystem identity",
    );
} finally {
    globalThis.fetch =
        originalFetch;
}

/*
 * ----------------------------------------------------------
 * Empty application metadata URI is valid.
 * Token identity must still resolve.
 * ----------------------------------------------------------
 */

const configWithoutMetadata: ApplicationConfigAccount = {
    ...config,
    metadataUri: "",
};

globalThis.fetch =
    async () =>
        new Response(
            JSON.stringify({
                name:
                    canonical.fullName,
                symbol:
                    canonical.ticker.replace(
                        "$",
                        "",
                    ),
                description:
                    "Token metadata",
                image:
                    "https://example.test/coin.png",
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
        await resolveApplicationExperience(
            fakeConnection,
            canonical.ecosystem,
            configWithoutMetadata,
        );

    expect(
        resolved.ecosystem.image
            === "https://example.test/coin.png",
        "Token identity must survive empty application metadata URI",
    );

    expect(
        resolved.application.metadata
            === undefined,
        "Empty ApplicationConfig metadata URI must not trigger application metadata resolution",
    );

    console.log(
        "✓ Empty application metadata does not break canonical token experience",
    );
} finally {
    globalThis.fetch =
        originalFetch;
}
