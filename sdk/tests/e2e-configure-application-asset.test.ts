import fs from "node:fs";
import { execFileSync } from "node:child_process";

import {
    Connection,
    Keypair,
    PublicKey,
    sendAndConfirmTransaction,
    Transaction,
} from "@solana/web3.js";

import {
    CanonicalEcosystem,
    buildConfigureApplicationAssetInstruction,
    buildRegisterApplicationInstruction,
    findApplicationAssetPda,
    findApplicationPda,
    findAssetConfigPda,
} from "../src/index.js";

const RPC_URL =
    process.env.BABYCOWANS_RPC_URL ??
    "http://127.0.0.1:8899";

const PROGRAM_ID = new PublicKey(
    "BSZkHJyqBW19HQ2tTgooKxPc5FEehgm5uxL44Ggxjucp",
);

const BRC_MINT = new PublicKey(
    "25ZEDgK2R62VRnWbqzfKXire7Gdamkopkx6hqtBwpump",
);

const TOKEN_PROGRAM_ID = new PublicKey(
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
);

const applicationId =
    BigInt(Date.now()) * 1_000n +
    BigInt(process.pid % 1_000);

const secretKey = Uint8Array.from(
    JSON.parse(
        fs.readFileSync(
            `${process.env.HOME}/.config/solana/id.json`,
            "utf8",
        ),
    ),
);

const authority = Keypair.fromSecretKey(secretKey);
const connection = new Connection(RPC_URL, "confirmed");

const paymentDestinationPath =
    `/tmp/babycowans-configure-application-asset-payment-${process.pid}.json`;

execFileSync(
    "solana-keygen",
    [
        "new",
        "--outfile",
        paymentDestinationPath,
        "--no-bip39-passphrase",
        "--force",
        "--silent",
    ],
    {
        stdio: "ignore",
    },
);

execFileSync(
    "spl-token",
    [
        "create-account",
        BRC_MINT.toBase58(),
        paymentDestinationPath,
        "--owner",
        `${process.env.HOME}/.config/solana/id.json`,
        "--url",
        RPC_URL,
    ],
    {
        stdio: [
            "ignore",
            "pipe",
            "pipe",
        ],
    },
);

const paymentDestination =
    new PublicKey(
        execFileSync(
            "solana-keygen",
            [
                "pubkey",
                paymentDestinationPath,
            ],
            {
                encoding: "utf8",
            },
        ).trim(),
    );

console.log(
    "PAYMENT_DESTINATION_FIXTURE_READY=1",
);

const [application] = findApplicationPda(
    PROGRAM_ID,
    authority.publicKey,
    applicationId,
);

const registerApplicationInstruction =
    buildRegisterApplicationInstruction({
        programId: PROGRAM_ID,
        authority: authority.publicKey,
        applicationId,
        name: "Configure Application Asset E2E",
        selectedEcosystem: CanonicalEcosystem.BabyReptile,
    });

await sendAndConfirmTransaction(
    connection,
    new Transaction().add(registerApplicationInstruction),
    [authority],
    {
        commitment: "confirmed",
    },
);

const applicationAccount =
    await connection.getAccountInfo(application);

if (applicationAccount === null) {
    throw new Error(
        "Configure E2E fixture failed to create its Application account.",
    );
}

if (!applicationAccount.owner.equals(PROGRAM_ID)) {
    throw new Error(
        "Configure E2E fixture Application is not owned by the Babycowans program.",
    );
}

const [assetConfig] = findAssetConfigPda(
    PROGRAM_ID,
    BRC_MINT,
);

const [applicationAsset] = findApplicationAssetPda(
    PROGRAM_ID,
    application,
    BRC_MINT,
);

const instruction =
    buildConfigureApplicationAssetInstruction({
        programId: PROGRAM_ID,
        application,
        assetConfig,
        mint: BRC_MINT,
        paymentDestination,
        authority: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        paymentsEnabled: true,
        gatingEnabled: true,
        rewardsEnabled: true,
    });

const transaction = new Transaction().add(instruction);

const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [authority],
    {
        commitment: "confirmed",
    },
);

const applicationAssetAccount =
    await connection.getAccountInfo(applicationAsset);

if (applicationAssetAccount === null) {
    throw new Error(
        "configure_application_asset succeeded, but ApplicationAsset was not created.",
    );
}

if (!applicationAssetAccount.owner.equals(PROGRAM_ID)) {
    throw new Error(
        "ApplicationAsset is not owned by the Babycowans program.",
    );
}

console.log("✓ configure_application_asset executed successfully");
console.log(`✓ Transaction: ${signature}`);
console.log(`✓ Application PDA: ${application.toBase58()}`);
console.log(`✓ ApplicationAsset PDA: ${applicationAsset.toBase58()}`);
console.log(`✓ Payment destination: ${paymentDestination.toBase58()}`);
console.log(`✓ Account owner: ${applicationAssetAccount.owner.toBase58()}`);

fs.rmSync(
    paymentDestinationPath,
    {
        force: true,
    },
);
