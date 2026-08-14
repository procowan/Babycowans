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
    CanonicalEcosystem,
    buildConfigureApplicationAssetInstruction,
    buildConfigurePaymentPolicyInstruction,
    buildInitializeProtocolInstruction,
    buildProcessPaymentInstruction,
    buildRegisterApplicationInstruction,
    buildRegisterAssetInstruction,
    findApplicationAssetPda,
    findApplicationPda,
    findAssetConfigPda,
    findProtocolConfigPda,
} from "../src/index.js";

const RPC_URL =
    process.env.BABYCOWANS_RPC_URL ??
    "http://127.0.0.1:8899";

const PROGRAM_ID =
    new PublicKey("BSZkHJyqBW19HQ2tTgooKxPc5FEehgm5uxL44Ggxjucp");

const BRC_CANONICAL_MINT =
    new PublicKey("25ZEDgK2R62VRnWbqzfKXire7Gdamkopkx6hqtBwpump");

const TOKEN_2022_PROGRAM_ID =
    new PublicKey(
        "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
    );

const PAYMENT_AMOUNT = 1_000_000_000n;

function loadKeypair(path: string): Keypair {
    const secretKey = Uint8Array.from(
        JSON.parse(fs.readFileSync(path, "utf8")),
    );

    return Keypair.fromSecretKey(secretKey);
}

function runCommand(
    command: string,
    args: string[],
): string {
    return execFileSync(command, args, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
    }).trim();
}

function createToken2022Account(
    mint: PublicKey,
    ownerPath: string,
): PublicKey {
    const output = runCommand("spl-token", [
        "create-account",
        mint.toBase58(),
        "--owner",
        ownerPath,
        "--program-id",
        TOKEN_2022_PROGRAM_ID.toBase58(),
        "--url",
        RPC_URL,
    ]);

    const match = output.match(
        /Creating account ([1-9A-HJ-NP-Za-km-z]+)/,
    );

    if (match === null) {
        throw new Error(
            `Unable to resolve Token-2022 account:\n${output}`,
        );
    }

    return new PublicKey(match[1]);
}

function readTokenAmount(data: Buffer): bigint {
    return data.readBigUInt64LE(64);
}

async function send(
    connection: Connection,
    instruction: ReturnType<
        typeof buildInitializeProtocolInstruction
    >,
    signers: Keypair[],
): Promise<string> {
    return sendAndConfirmTransaction(
        connection,
        new Transaction().add(instruction),
        signers,
        {
            commitment: "confirmed",
        },
    );
}

async function main(): Promise<void> {
    const connection =
        new Connection(RPC_URL, "confirmed");

    const authority = loadKeypair(
        `${process.env.HOME}/.config/solana/id.json`,
    );

    const mintAccount =
        await connection.getAccountInfo(
            BRC_CANONICAL_MINT,
        );

    if (mintAccount === null) {
        throw new Error(
            "Canonical BRC mint is missing from isolated runtime.",
        );
    }

    if (!mintAccount.owner.equals(TOKEN_2022_PROGRAM_ID)) {
        throw new Error(
            `Canonical BRC is not Token-2022 owned: ${mintAccount.owner.toBase58()}`,
        );
    }

    console.log(
        "TOKEN_2022_CANONICAL_MINT_OWNER=PASS",
    );

    const programAccount =
        await connection.getAccountInfo(PROGRAM_ID);

    if (
        programAccount === null ||
        !programAccount.executable
    ) {
        throw new Error(
            "Babycowans program is not deployed.",
        );
    }

    const [protocolConfig] =
        findProtocolConfigPda(PROGRAM_ID);

    if (
        (await connection.getAccountInfo(
            protocolConfig,
        )) === null
    ) {
        await send(
            connection,
            buildInitializeProtocolInstruction({
                programId: PROGRAM_ID,
                authority: authority.publicKey,
            }),
            [authority],
        );
    }

    console.log(
        "TOKEN_2022_PROTOCOL_INITIALIZED=PASS",
    );

    const [assetConfig] =
        findAssetConfigPda(
            PROGRAM_ID,
            BRC_CANONICAL_MINT,
        );

    if (
        (await connection.getAccountInfo(
            assetConfig,
        )) === null
    ) {
        await send(
            connection,
            buildRegisterAssetInstruction({
                programId: PROGRAM_ID,
                authority: authority.publicKey,
                mint: BRC_CANONICAL_MINT,
                assetCode: "BRC",
                domain: 4,
            }),
            [authority],
        );
    }

    console.log(
        "TOKEN_2022_CANONICAL_ASSET_REGISTERED=PASS",
    );

    const applicationId =
        BigInt(Date.now());

    const [application] =
        findApplicationPda(
            PROGRAM_ID,
            authority.publicKey,
            applicationId,
        );

    await send(
        connection,
        buildRegisterApplicationInstruction({
            programId: PROGRAM_ID,
            authority: authority.publicKey,
            applicationId,
            name: "XRAY X5 Token-2022 Payment",
            selectedEcosystem:
                CanonicalEcosystem.BabyReptile,
        }),
        [authority],
    );

    console.log(
        "TOKEN_2022_APPLICATION_REGISTERED=PASS",
    );

    const payerPath =
        `/tmp/babycowans-x5-token2022-payer-${process.pid}.json`;

    const treasuryPath =
        `/tmp/babycowans-x5-token2022-treasury-${process.pid}.json`;

    runCommand("solana-keygen", [
        "new",
        "--outfile",
        payerPath,
        "--no-bip39-passphrase",
        "--force",
        "--silent",
    ]);

    runCommand("solana-keygen", [
        "new",
        "--outfile",
        treasuryPath,
        "--no-bip39-passphrase",
        "--force",
        "--silent",
    ]);

    const payer = loadKeypair(payerPath);

    runCommand("solana", [
        "airdrop",
        "10",
        payer.publicKey.toBase58(),
        "--url",
        RPC_URL,
    ]);

    const destinationTokenAccount =
        createToken2022Account(
            BRC_CANONICAL_MINT,
            `${process.env.HOME}/.config/solana/id.json`,
        );

    const payerTokenAccount =
        createToken2022Account(
            BRC_CANONICAL_MINT,
            payerPath,
        );

    const treasuryTokenAccount =
        new PublicKey(
            runCommand("solana-keygen", [
                "pubkey",
                treasuryPath,
            ]),
        );

    runCommand("spl-token", [
        "create-account",
        BRC_CANONICAL_MINT.toBase58(),
        treasuryPath,
        "--owner",
        authority.publicKey.toBase58(),
        "--program-id",
        TOKEN_2022_PROGRAM_ID.toBase58(),
        "--fee-payer",
        `${process.env.HOME}/.config/solana/id.json`,
        "--url",
        RPC_URL,
    ]);

    runCommand("spl-token", [
        "mint",
        BRC_CANONICAL_MINT.toBase58(),
        "1001",
        payerTokenAccount.toBase58(),
        "--program-id",
        TOKEN_2022_PROGRAM_ID.toBase58(),
        "--fee-payer",
        `${process.env.HOME}/.config/solana/id.json`,
        "--url",
        RPC_URL,
    ]);

    console.log(
        "TOKEN_2022_PAYER_FUNDED=PASS",
    );

    const [applicationAsset] =
        findApplicationAssetPda(
            PROGRAM_ID,
            application,
            BRC_CANONICAL_MINT,
        );

    await send(
        connection,
        buildConfigureApplicationAssetInstruction({
            programId: PROGRAM_ID,
            application,
            assetConfig,
            mint: BRC_CANONICAL_MINT,
            paymentDestination:
                destinationTokenAccount,
            authority: authority.publicKey,
            tokenProgram:
                TOKEN_2022_PROGRAM_ID,
            paymentsEnabled: true,
            gatingEnabled: true,
            rewardsEnabled: true,
        }),
        [authority],
    );

    console.log(
        "TOKEN_2022_APPLICATION_ASSET_CONFIGURED=PASS",
    );

    await send(
        connection,
        buildConfigurePaymentPolicyInstruction({
            programId: PROGRAM_ID,
            application,
            applicationAsset,
            authority: authority.publicKey,
            minimumAmount: 100n,
            maximumAmount: PAYMENT_AMOUNT,
            paymentsEnabled: true,
            protocolFeeBps: 0,
            applicationFeeBps: 0,
            treasury: treasuryTokenAccount,
        }),
        [authority],
    );

    console.log(
        "TOKEN_2022_PAYMENT_POLICY_CONFIGURED=PASS",
    );

    for (const account of [
        payerTokenAccount,
        destinationTokenAccount,
        treasuryTokenAccount,
    ]) {
        const info =
            await connection.getAccountInfo(account);

        if (
            info === null ||
            !info.owner.equals(
                TOKEN_2022_PROGRAM_ID,
            )
        ) {
            throw new Error(
                `Non Token-2022 payment account: ${account.toBase58()}`,
            );
        }
    }

    console.log(
        "TOKEN_2022_PAYMENT_ACCOUNT_PROGRAMS=PASS",
    );

    const payerBefore =
        await connection.getAccountInfo(
            payerTokenAccount,
        );

    const destinationBefore =
        await connection.getAccountInfo(
            destinationTokenAccount,
        );

    const treasuryBefore =
        await connection.getAccountInfo(
            treasuryTokenAccount,
        );

    if (
        payerBefore === null ||
        destinationBefore === null ||
        treasuryBefore === null
    ) {
        throw new Error(
            "Token-2022 accounts unavailable before payment.",
        );
    }

    const payerBalanceBefore =
        readTokenAmount(payerBefore.data);

    const destinationBalanceBefore =
        readTokenAmount(destinationBefore.data);

    const treasuryBalanceBefore =
        readTokenAmount(treasuryBefore.data);

    await send(
        connection,
        buildProcessPaymentInstruction({
            programId: PROGRAM_ID,
            application,
            applicationAsset,
            assetConfig,
            mint: BRC_CANONICAL_MINT,
            payer: payer.publicKey,
            payerTokenAccount,
            destinationTokenAccount,
            treasuryTokenAccount,
            tokenProgram:
                TOKEN_2022_PROGRAM_ID,
            amount: PAYMENT_AMOUNT,
        }),
        [payer],
    );

    console.log(
        "TOKEN_2022_TRANSFER_CHECKED_RUNTIME=PASS",
    );

    const payerAfter =
        await connection.getAccountInfo(
            payerTokenAccount,
        );

    const destinationAfter =
        await connection.getAccountInfo(
            destinationTokenAccount,
        );

    const treasuryAfter =
        await connection.getAccountInfo(
            treasuryTokenAccount,
        );

    if (
        payerAfter === null ||
        destinationAfter === null ||
        treasuryAfter === null
    ) {
        throw new Error(
            "Token-2022 accounts unavailable after payment.",
        );
    }

    const payerBalanceAfter =
        readTokenAmount(payerAfter.data);

    const destinationBalanceAfter =
        readTokenAmount(destinationAfter.data);

    const treasuryBalanceAfter =
        readTokenAmount(treasuryAfter.data);

    if (
        payerBalanceAfter !==
        payerBalanceBefore - PAYMENT_AMOUNT
    ) {
        throw new Error(
            "Token-2022 payer debit invariant failed.",
        );
    }

    console.log(
        "TOKEN_2022_PAYER_DEBIT=PASS",
    );

    if (
        destinationBalanceAfter !==
        destinationBalanceBefore +
            PAYMENT_AMOUNT
    ) {
        throw new Error(
            "Token-2022 destination credit invariant failed.",
        );
    }

    console.log(
        "TOKEN_2022_DESTINATION_CREDIT=PASS",
    );

    if (
        treasuryBalanceAfter !==
        treasuryBalanceBefore
    ) {
        throw new Error(
            "Zero-fee Token-2022 treasury invariant failed.",
        );
    }

    console.log(
        "TOKEN_2022_PROTOCOL_FEE_ROUTING=PASS",
    );

    const totalBefore =
        payerBalanceBefore +
        destinationBalanceBefore +
        treasuryBalanceBefore;

    const totalAfter =
        payerBalanceAfter +
        destinationBalanceAfter +
        treasuryBalanceAfter;

    if (totalBefore !== totalAfter) {
        throw new Error(
            "Token-2022 financial conservation failed.",
        );
    }

    console.log(
        "TOKEN_2022_FINANCIAL_CONSERVATION=PASS",
    );

    console.log(
        "XRAY_X5_TOKEN2022_SUCCESSFUL_PAYMENT_RUNTIME=PASS",
    );
}

await main();
