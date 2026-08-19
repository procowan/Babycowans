import fs from "node:fs";

import {
    BabycowansSDK,
    CanonicalEcosystem,
    buildInitializeProtocolInstruction,
    findProtocolConfigPda,
    } from "@babycowans/core-sdk";

import {
    Connection,
    Keypair,
    PublicKey,
    Transaction,
    sendAndConfirmTransaction,
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

const connection =
    new Connection(
        rpcUrl,
        "confirmed",
    );

const programId =
    new PublicKey(
        programIdValue,
    );

const client =
    new BabycowansSDK({
        connection,
        programId,
    });

const applicationId =
    BigInt(Date.now());

/*
 * X29_LOCAL_PROTOCOL_INITIALIZATION
 *
 * RegisterApplication requires the global ProtocolConfig PDA.
 * A fresh repository-owned local validator does not contain it yet.
 * This example initializes it exactly once on local RPC only.
 * Non-local endpoints fail closed instead of silently creating
 * global protocol state.
 */
const [protocolConfig] =
    findProtocolConfigPda(
        programId,
    );

const protocolConfigAccount =
    await connection.getAccountInfo(
        protocolConfig,
        "confirmed",
    );

if (protocolConfigAccount === null) {
    const rpcHostname =
        new URL(rpcUrl).hostname;

    const localRpcHosts =
        new Set([
            "127.0.0.1",
            "localhost",
            "::1",
        ]);

    if (!localRpcHosts.has(rpcHostname)) {
        throw new Error(
            "ProtocolConfig is not initialized. " +
            "Automatic initialization is restricted " +
            "to a local RPC endpoint. Initialize the " +
            "protocol through the deployment/operator " +
            "flow before registering an Application.",
        );
    }

    const initializeProtocolInstruction =
        buildInitializeProtocolInstruction({
            programId,
            authority:
                authority.publicKey,
        });

    const initializeProtocolSignature =
        await sendAndConfirmTransaction(
            connection,
            new Transaction().add(
                initializeProtocolInstruction,
            ),
            [authority],
            {
                commitment:
                    "confirmed",
            },
        );

    console.log(
        `BABYCOWANS_PROTOCOL_INITIALIZATION_SIGNATURE=${initializeProtocolSignature}`,
    );
}

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
    "applicationId",
    applicationId.toString(),
);

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

console.log(
    `BABYCOWANS_APPLICATION_ID=${result.applicationId.toString()}`,
);

console.log(
    `BABYCOWANS_APPLICATION_ADDRESS=${result.application.toBase58()}`,
);

console.log(
    `BABYCOWANS_APPLICATION_AUTHORITY=${authority.publicKey.toBase58()}`,
);

console.log(
    `BABYCOWANS_TRANSACTION_SIGNATURE=${result.signature}`,
);
