import fs from "node:fs";

import {
    BabycowansSDK,
    CanonicalEcosystem,
} from "@babycowans/core-sdk";

import {
    Connection,
    Keypair,
    PublicKey,
} from "@solana/web3.js";

const rpcUrl =
    process.env.SOLANA_RPC_URL ??
    "http://127.0.0.1:8899";

const programIdValue =
    process.env.BABYCOWANS_PROGRAM_ID;

if (!programIdValue) {
    throw new Error(
        "BABYCOWANS_PROGRAM_ID is required",
    );
}

const walletPath =
    process.env.SOLANA_WALLET ??
    `${process.env.HOME}/.config/solana/id.json`;

const authority =
    Keypair.fromSecretKey(
        Uint8Array.from(
            JSON.parse(
                fs.readFileSync(
                    walletPath,
                    "utf8",
                ),
            ),
        ),
    );

const client =
    new BabycowansSDK({
        connection:
            new Connection(
                rpcUrl,
                "confirmed",
            ),

        programId:
            new PublicKey(
                programIdValue,
            ),
    });

const applicationId =
    BigInt(Date.now());

const result =
    await client.bootstrapApplication({
        authority,
        applicationId,
        name:
            "Babycowans Example",

        selectedEcosystem:
            CanonicalEcosystem.BabyReptile,

        config: {
            websiteUri:
                "https://example.com",
            logoUri:
                "https://example.com/logo.png",
            supportUri:
                "https://example.com/support",
            description:
                "Executable Babycowans bootstrap example",
            metadataUri:
                "https://example.com/metadata.json",
        },
    });

console.log(
    "signature",
    result.signature,
);

console.log(
    "application",
    result.application.toBase58(),
);

console.log(
    "applicationConfig",
    result.applicationConfig.toBase58(),
);
