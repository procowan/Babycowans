import { execFileSync } from "node:child_process";
import fs from "node:fs";

import {
    Connection,
    Keypair,
    PublicKey,
    sendAndConfirmTransaction,
    Transaction,
} from "@solana/web3.js";

import {
    buildConfigurePaymentPolicyInstruction,
    buildProcessPaymentInstruction,
    findApplicationAssetPda,
    findApplicationPda,
    findAssetConfigPda,
    findPaymentPolicyPda,
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





const APPLICATION_ID = 1785944594341n;
const PAYMENT_AMOUNT = 1_000_000_000n;

function loadKeypair(path: string): Keypair {
    const secretKey = Uint8Array.from(
        JSON.parse(fs.readFileSync(path, "utf8")),
    );

    return Keypair.fromSecretKey(secretKey);
}

function runPaymentCommand(
    command: string,
    args: string[],
): string {
    return execFileSync(
        command,
        args,
        {
            encoding:
                "utf8",
            stdio: [
                "ignore",
                "pipe",
                "pipe",
            ],
        },
    ).trim();
}

function createPaymentTokenAccount(
    mint: PublicKey,
    ownerPath: string,
): PublicKey {
    const accountPath =
        `/tmp/babycowans-payment-token-${process.pid}-${Math.random()
            .toString(16)
            .slice(2)}.json`;

    runPaymentCommand(
        "solana-keygen",
        [
            "new",
            "--outfile",
            accountPath,
            "--no-bip39-passphrase",
            "--force",
            "--silent",
        ],
    );

    runPaymentCommand(
        "spl-token",
        [
            "create-account",
            mint.toBase58(),
            accountPath,
            "--owner",
            ownerPath,
            "--url",
            RPC_URL,
        ],
    );

    const address =
        new PublicKey(
            runPaymentCommand(
                "solana-keygen",
                [
                    "pubkey",
                    accountPath,
                ],
            ),
        );

    fs.rmSync(
        accountPath,
        {
            force:
                true,
        },
    );

    return address;
}

function readTokenAmount(data: Buffer): bigint {
    return data.readBigUInt64LE(64);
}

const authority = loadKeypair(
    `${process.env.HOME}/.config/solana/id.json`,
);

const connection = new Connection(RPC_URL, "confirmed");

const payerPath =
    "/tmp/babycowans-payer.json";

if (!fs.existsSync(payerPath)) {
    execFileSync(
        "solana-keygen",
        [
            "new",
            "--outfile",
            payerPath,
            "--no-bip39-passphrase",
            "--force",
            "--silent",
        ],
        {
            stdio:
                "ignore",
        },
    );

    console.log(
        "PAYMENT_PAYER_FIXTURE_CREATED=1",
    );
}

const payer =
    loadKeypair(
        payerPath,
    );

const paymentAuthority =
    loadKeypair(
        `${process.env.HOME}/.config/solana/id.json`,
    );

const paymentBaselineOutput =
    execFileSync(
        "./node_modules/.bin/tsx",
        [
            "tests/e2e-configure-application-asset.test.ts",
        ],
        {
            cwd:
                process.cwd(),
            encoding:
                "utf8",
            stdio: [
                "ignore",
                "pipe",
                "pipe",
            ],
        },
    );

const paymentApplicationMatch =
    paymentBaselineOutput.match(
        /Application PDA:\s*([1-9A-HJ-NP-Za-km-z]{32,44})/u,
    );

const paymentApplicationAssetMatch =
    paymentBaselineOutput.match(
        /ApplicationAsset PDA:\s*([1-9A-HJ-NP-Za-km-z]{32,44})/u,
    );

const paymentDestinationMatch =
    paymentBaselineOutput.match(
        /Payment destination:\s*([1-9A-HJ-NP-Za-km-z]{32,44})/u,
    );

if (
    !paymentApplicationMatch ||
    !paymentApplicationAssetMatch ||
    !paymentDestinationMatch
) {
    throw new Error(
        `PROCESS_PAYMENT_BASELINE_RESOLUTION_FAILED\n${paymentBaselineOutput}`,
    );
}

const application =
    new PublicKey(
        paymentApplicationMatch[1],
    );

const applicationAsset =
    new PublicKey(
        paymentApplicationAssetMatch[1],
    );

const DESTINATION_TOKEN_ACCOUNT =
    new PublicKey(
        paymentDestinationMatch[1],
    );

const TREASURY_TOKEN_ACCOUNT =
    createPaymentTokenAccount(
        BRC_MINT,
        `${process.env.HOME}/.config/solana/id.json`,
    );

if (
    TREASURY_TOKEN_ACCOUNT.equals(
        DESTINATION_TOKEN_ACCOUNT,
    )
) {
    throw new Error(
        "PAYMENT_TREASURY_MUST_DIFFER_FROM_DESTINATION",
    );
}

console.log(
    "PAYMENT_DISTINCT_TREASURY_READY=1",
);

const assetConfig =
    findAssetConfigPda(
        PROGRAM_ID,
        BRC_MINT,
    )[0];

const paymentPolicy =
    findPaymentPolicyPda(
        PROGRAM_ID,
        application,
        applicationAsset,
    )[0];

const existingPaymentPolicy =
    await connection.getAccountInfo(
        paymentPolicy,
    );

if (existingPaymentPolicy === null) {
    const configurePaymentPolicyInstruction =
        buildConfigurePaymentPolicyInstruction({
            programId:
                PROGRAM_ID,

            application:
                application,

            applicationAsset:
                applicationAsset,

            authority:
                paymentAuthority.publicKey,

            minimumAmount:
                1n,

            maximumAmount:
                0n,

            paymentsEnabled:
                true,

            protocolFeeBps:
                0,

            applicationFeeBps:
                0,

            treasury:
                TREASURY_TOKEN_ACCOUNT,
        });

    await sendAndConfirmTransaction(
        connection,
        new Transaction().add(
            configurePaymentPolicyInstruction,
        ),
        [
            paymentAuthority,
        ],
        {
            commitment:
                "confirmed",
        },
    );
}

const applicationBaselineProof =
    await connection.getAccountInfo(
        application,
    );

const applicationAssetBaselineProof =
    await connection.getAccountInfo(
        applicationAsset,
    );

const assetConfigBaselineProof =
    await connection.getAccountInfo(
        assetConfig,
    );

const paymentPolicyBaselineProof =
    await connection.getAccountInfo(
        paymentPolicy,
    );

const paymentDestinationBaselineProof =
    await connection.getAccountInfo(
        DESTINATION_TOKEN_ACCOUNT,
    );

const paymentTreasuryBaselineProof =
    await connection.getAccountInfo(
        TREASURY_TOKEN_ACCOUNT,
    );

if (
    applicationBaselineProof === null ||
    applicationAssetBaselineProof === null ||
    assetConfigBaselineProof === null ||
    paymentPolicyBaselineProof === null ||
    paymentDestinationBaselineProof === null ||
    paymentTreasuryBaselineProof === null
) {
    throw new Error(
        "PROCESS_PAYMENT_PROTOCOL_BASELINE_INCOMPLETE",
    );
}

console.log(
    "PROCESS_PAYMENT_APPLICATION_BASELINE_READY=1",
);

console.log(
    "PROCESS_PAYMENT_APPLICATION_ASSET_BASELINE_READY=1",
);

console.log(
    "PROCESS_PAYMENT_ASSET_CONFIG_BASELINE_READY=1",
);

console.log(
    "PROCESS_PAYMENT_PAYMENT_POLICY_BASELINE_READY=1",
);

console.log(
    "PROCESS_PAYMENT_DESTINATION_TREASURY_BASELINE_READY=1",
);

runPaymentCommand(
    "solana",
    [
        "airdrop",
        "10",
        payer.publicKey.toBase58(),
        "--url",
        RPC_URL,
    ],
);

console.log(
    "PAYMENT_PAYER_SOL_FUNDED=1",
);

const PAYER_TOKEN_ACCOUNT =
    createPaymentTokenAccount(
        BRC_MINT,
        payerPath,
    );

runPaymentCommand(
    "spl-token",
    [
        "mint",
        BRC_MINT.toBase58(),
        "1000000",
        PAYER_TOKEN_ACCOUNT.toBase58(),
        "--url",
        RPC_URL,
    ],
);

console.log(
    "PAYMENT_PAYER_TOKEN_ACCOUNT_FUNDED=1",
);

console.log(
    "PAYMENT_TOKEN_ACCOUNT_FIXTURES_READY=1",
);



const payerBefore = await connection.getAccountInfo(
    PAYER_TOKEN_ACCOUNT,
);

const destinationBefore = await connection.getAccountInfo(
    DESTINATION_TOKEN_ACCOUNT,
);

if (payerBefore === null || destinationBefore === null) {
    throw new Error("Required token account is missing.");
}

const payerBalanceBefore = readTokenAmount(payerBefore.data);
const destinationBalanceBefore = readTokenAmount(
    destinationBefore.data,
);

const instruction = buildProcessPaymentInstruction({
    programId: PROGRAM_ID,
    application,
    applicationAsset,
    assetConfig,
    mint: BRC_MINT,
    payer: payer.publicKey,
    payerTokenAccount: PAYER_TOKEN_ACCOUNT,
    destinationTokenAccount: DESTINATION_TOKEN_ACCOUNT,
    treasuryTokenAccount: TREASURY_TOKEN_ACCOUNT,
    tokenProgram: TOKEN_PROGRAM_ID,
    amount: PAYMENT_AMOUNT,
});

const signature = await sendAndConfirmTransaction(
    connection,
    new Transaction().add(instruction),
    [payer],
    {
        commitment: "confirmed",
    },
);

const payerAfter = await connection.getAccountInfo(
    PAYER_TOKEN_ACCOUNT,
);

const destinationAfter = await connection.getAccountInfo(
    DESTINATION_TOKEN_ACCOUNT,
);

if (payerAfter === null || destinationAfter === null) {
    throw new Error("Token account disappeared after payment.");
}

const payerBalanceAfter = readTokenAmount(payerAfter.data);
const destinationBalanceAfter = readTokenAmount(
    destinationAfter.data,
);

if (
    payerBalanceAfter !==
    payerBalanceBefore - PAYMENT_AMOUNT
) {
    throw new Error("Payer balance was not reduced correctly.");
}

if (
    destinationBalanceAfter !==
    destinationBalanceBefore + PAYMENT_AMOUNT
) {
    throw new Error(
        "Destination balance was not increased correctly.",
    );
}

console.log("✓ process_payment executed successfully");
console.log(`✓ Transaction: ${signature}`);
console.log(`✓ Amount transferred: ${PAYMENT_AMOUNT}`);
console.log(`✓ Payer balance before: ${payerBalanceBefore}`);
console.log(`✓ Payer balance after: ${payerBalanceAfter}`);
console.log(
    `✓ Destination balance before: ${destinationBalanceBefore}`,
);
console.log(
    `✓ Destination balance after: ${destinationBalanceAfter}`,
);
