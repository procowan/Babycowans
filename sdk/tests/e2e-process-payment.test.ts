import fs from "node:fs";

import {
    Connection,
    Keypair,
    PublicKey,
    sendAndConfirmTransaction,
    Transaction,
} from "@solana/web3.js";

import {
    buildProcessPaymentInstruction,
    findApplicationAssetPda,
    findApplicationPda,
    findAssetConfigPda,
} from "../src/index.js";

const RPC_URL = "http://127.0.0.1:8899";

const PROGRAM_ID = new PublicKey(
    "BSZkHJyqBW19HQ2tTgooKxPc5FEehgm5uxL44Ggxjucp",
);

const BRC_MINT = new PublicKey(
    "25ZEDgK2R62VRnWbqzfKXire7Gdamkopkx6hqtBwpump",
);

const TOKEN_PROGRAM_ID = new PublicKey(
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
);

const PAYER_TOKEN_ACCOUNT = new PublicKey(
    "9k8UZfbeas66vcEYnzngquiCQiHkWbEHktb7s6x9GFAf",
);

const DESTINATION_TOKEN_ACCOUNT = new PublicKey(
    "E9xEWThW5trSxRySxoFefzgLZUf1U77XLwBznzgTfQ8C",
);

const APPLICATION_ID = 1785944594341n;
const PAYMENT_AMOUNT = 1_000_000_000n;

function loadKeypair(path: string): Keypair {
    const secretKey = Uint8Array.from(
        JSON.parse(fs.readFileSync(path, "utf8")),
    );

    return Keypair.fromSecretKey(secretKey);
}

function readTokenAmount(data: Buffer): bigint {
    return data.readBigUInt64LE(64);
}

const authority = loadKeypair(
    `${process.env.HOME}/.config/solana/id.json`,
);

const payer = loadKeypair(
    "/tmp/babycowans-payer.json",
);

const connection = new Connection(RPC_URL, "confirmed");

const [application] = findApplicationPda(
    PROGRAM_ID,
    authority.publicKey,
    APPLICATION_ID,
);

const [assetConfig] = findAssetConfigPda(
    PROGRAM_ID,
    BRC_MINT,
);

const [applicationAsset] = findApplicationAssetPda(
    PROGRAM_ID,
    application,
    BRC_MINT,
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
    treasuryTokenAccount: DESTINATION_TOKEN_ACCOUNT,
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
