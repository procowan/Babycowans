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
    buildClaimRewardInstruction,
    buildConfigureApplicationAssetInstruction,
    buildConfigureTokenGateInstruction,
    buildCreateRewardInstruction,
    buildInitializeProtocolInstruction,
    buildProcessPaymentInstruction,
    buildRecordAuditLogInstruction,
    buildRegisterApplicationInstruction,
    buildRegisterAssetInstruction,
    buildRegisterMembershipInstruction,
    buildVerifyGateAccessInstruction,
    findApplicationAssetPda,
    findApplicationPda,
    findAssetConfigPda,
    findAuditLogPda,
    findMembershipPda,
    findProtocolConfigPda,
    findRewardPda,
    findTokenGatePda,
} from "../src/index.js";

const RPC_URL = "http://127.0.0.1:8899";

const PROGRAM_ID = new PublicKey(
    "BSZkHJyqBW19HQ2tTgooKxPc5FEehgm5uxL44Ggxjucp",
);

const PHASES = {
    BRC: {
        ecosystem: CanonicalEcosystem.BabyReptile,
        fullName: "Baby Reptile Coin",
        ticker: "$BRC",
        assetCode: "BRC",
        mint: new PublicKey(
            "25ZEDgK2R62VRnWbqzfKXire7Gdamkopkx6hqtBwpump",
        ),
    },
    BEC: {
        ecosystem: CanonicalEcosystem.BabyEagle,
        fullName: "Baby Eagle Coin",
        ticker: "$BEC",
        assetCode: "BEC",
        mint: new PublicKey(
            "BSf9mueWMeHMAJcbmVSY53H8jcQjwVK3oMRkmwnHpump",
        ),
    },
    BGC: {
        ecosystem: CanonicalEcosystem.BabyGoat,
        fullName: "Baby Goat Coin",
        ticker: "$BGC",
        assetCode: "BGC",
        mint: new PublicKey(
            "BPCBXkCTYPN3JdcXJojDykmtSvPfykXTLcKnxwopump",
        ),
    },
    BLC: {
        ecosystem: CanonicalEcosystem.BabyLion,
        fullName: "Baby Lion Coin",
        ticker: "$BLC",
        assetCode: "BLC",
        mint: new PublicKey(
            "GK1twW6K1o3JrnHjxaAk2LGfWkqRnMoBe6Vyydkpump",
        ),
    },
    BBC: {
        ecosystem: CanonicalEcosystem.BabyBee,
        fullName: "Baby Bee Coin",
        ticker: "$BBC",
        assetCode: "BBC",
        mint: new PublicKey(
            "2aso6jnQt3r5sUicejnCFbZupvKaUhezirqVKMjbpump",
        ),
    },
    BAC: {
        ecosystem: CanonicalEcosystem.BabyAgent,
        fullName: "Baby Agent Coin",
        ticker: "$BAC",
        assetCode: "BAC",
        mint: new PublicKey(
            "DKBBNADxPhGU4yJihzMUu9fXacibXhYHnQhSo5Wopump",
        ),
    },
} as const;

type PhaseCode = keyof typeof PHASES;

const phaseCode = (process.env.BABYCOWANS_PHASE ?? "BRC") as PhaseCode;
const phase = PHASES[phaseCode];

if (phase === undefined) {
    throw new Error(
        `Unknown God Examination phase: ${process.env.BABYCOWANS_PHASE}`,
    );
}

const CANONICAL_MINT = phase.mint;

const TOKEN_PROGRAM_ID = new PublicKey(
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
);

const PAYER_KEYPAIR_PATH =
    "/tmp/babycowans-golden-path-payer.json";

const PAYMENT_AMOUNT = 1_000_000_000n;
const REWARD_AMOUNT = 500_000_000n;
const MEMBERSHIP_TIER = 1;
const MEMBERSHIP_EXPIRES_AT = 2_000_000_000n;
const PAYMENT_PROCESSED_ACTION = 4;
const HOLD_AMOUNT_GATE_TYPE = 0;
const TOKEN_GATE_MINIMUM_AMOUNT = 1_000_000n;

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

function createTokenAccount(
    mint: PublicKey,
    ownerPath: string,
): PublicKey {
    let output: string;

    try {
        output = runCommand("spl-token", [
            "create-account",
            mint.toBase58(),
            "--owner",
            ownerPath,
            "--url",
            RPC_URL,
        ]);
    } catch (error: unknown) {
        const commandError = error as {
            stdout?: string | Buffer;
            stderr?: string | Buffer;
        };

        output = [
            commandError.stdout?.toString() ?? "",
            commandError.stderr?.toString() ?? "",
        ].join("\n");

        if (!output.includes("Account already exists")) {
            throw error;
        }
    }

    const match = output.match(
        /Creating account ([1-9A-HJ-NP-Za-km-z]+)/,
    );

    if (match === null) {
        throw new Error(
            `Unable to resolve token account from output:\n${output}`,
        );
    }

    return new PublicKey(match[1]);
}

function readTokenAmount(data: Buffer): bigint {
    return data.readBigUInt64LE(64);
}

async function expectInstructionFailure(
    connection: Connection,
    instruction: ReturnType<
        typeof buildVerifyGateAccessInstruction
    >,
    signers: Keypair[],
    expectedAnchorError: string,
): Promise<void> {
    try {
        await send(connection, instruction, signers);
    } catch (error: unknown) {
        const logs =
            typeof error === "object" &&
            error !== null &&
            "logs" in error &&
            Array.isArray((error as { logs?: unknown[] }).logs)
                ? (error as { logs: unknown[] }).logs
                      .map(String)
                      .join("\n")
                : "";

        const message =
            error instanceof Error
                ? error.message
                : String(error);

        const completeError = `${message}\n${logs}`;

        if (!completeError.includes(expectedAnchorError)) {
            throw new Error(
                `Expected ${expectedAnchorError}, but received:\n${completeError}`,
            );
        }

        return;
    }

    throw new Error(
        `Expected transaction failure: ${expectedAnchorError}`,
    );
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

const authority = loadKeypair(
    `${process.env.HOME}/.config/solana/id.json`,
);

const connection = new Connection(RPC_URL, "confirmed");

const mintAccount = await connection.getAccountInfo(CANONICAL_MINT);

if (mintAccount === null) {
    throw new Error(
        "Canonical BRC mint is missing from the local validator.",
    );
}

const programAccount = await connection.getAccountInfo(PROGRAM_ID);

if (programAccount === null || !programAccount.executable) {
    throw new Error(
        "Babycowans program is not deployed on the local validator.",
    );
}

const [protocolConfig] = findProtocolConfigPda(PROGRAM_ID);

if ((await connection.getAccountInfo(protocolConfig)) === null) {
    await send(
        connection,
        buildInitializeProtocolInstruction({
            programId: PROGRAM_ID,
            authority: authority.publicKey,
        }),
        [authority],
    );
}

const applicationId = BigInt(Date.now());
const applicationName = `God Examination ${phaseCode}`;

const [application] = findApplicationPda(
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
        name: applicationName,
        selectedEcosystem: phase.ecosystem,
    }),
    [authority],
);

const [assetConfig] = findAssetConfigPda(
    PROGRAM_ID,
    CANONICAL_MINT,
);

if ((await connection.getAccountInfo(assetConfig)) === null) {
    await send(
        connection,
        buildRegisterAssetInstruction({
            programId: PROGRAM_ID,
            authority: authority.publicKey,
            mint: CANONICAL_MINT,
            assetCode: phase.assetCode,
            domain: 4,
        }),
        [authority],
    );
}

runCommand("solana-keygen", [
    "new",
    "--outfile",
    PAYER_KEYPAIR_PATH,
    "--no-bip39-passphrase",
    "--force",
    "--silent",
]);

const payer = loadKeypair(PAYER_KEYPAIR_PATH);

runCommand("solana", [
    "airdrop",
    "10",
    payer.publicKey.toBase58(),
    "--url",
    RPC_URL,
]);

const destinationTokenAccount = createTokenAccount(
    CANONICAL_MINT,
    `${process.env.HOME}/.config/solana/id.json`,
);

const payerTokenAccount = createTokenAccount(
    CANONICAL_MINT,
    PAYER_KEYPAIR_PATH,
);

runCommand("spl-token", [
    "mint",
    CANONICAL_MINT.toBase58(),
    "1000",
    payerTokenAccount.toBase58(),
    "--url",
    RPC_URL,
]);

const [applicationAsset] = findApplicationAssetPda(
    PROGRAM_ID,
    application,
    CANONICAL_MINT,
);

await send(
    connection,
    buildConfigureApplicationAssetInstruction({
        programId: PROGRAM_ID,
        application,
        assetConfig,
        mint: CANONICAL_MINT,
        paymentDestination: destinationTokenAccount,
        authority: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        paymentsEnabled: true,
        gatingEnabled: true,
        rewardsEnabled: true,
    }),
    [authority],
);

const payerBefore = await connection.getAccountInfo(
    payerTokenAccount,
);

const destinationBefore = await connection.getAccountInfo(
    destinationTokenAccount,
);

if (payerBefore === null || destinationBefore === null) {
    throw new Error(
        "Payment token accounts are unavailable before payment.",
    );
}

const payerBalanceBefore = readTokenAmount(payerBefore.data);
const destinationBalanceBefore = readTokenAmount(
    destinationBefore.data,
);

await send(
    connection,
    buildProcessPaymentInstruction({
        programId: PROGRAM_ID,
        application,
        applicationAsset,
        assetConfig,
        mint: CANONICAL_MINT,
        payer: payer.publicKey,
        payerTokenAccount,
        destinationTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        amount: PAYMENT_AMOUNT,
    }),
    [payer],
);

const payerAfter = await connection.getAccountInfo(
    payerTokenAccount,
);

const destinationAfter = await connection.getAccountInfo(
    destinationTokenAccount,
);

if (payerAfter === null || destinationAfter === null) {
    throw new Error(
        "Payment token accounts are unavailable after payment.",
    );
}

if (
    readTokenAmount(payerAfter.data) !==
    payerBalanceBefore - PAYMENT_AMOUNT
) {
    throw new Error(
        "Payer balance did not decrease by the payment amount.",
    );
}

if (
    readTokenAmount(destinationAfter.data) !==
    destinationBalanceBefore + PAYMENT_AMOUNT
) {
    throw new Error(
        "Destination balance did not increase by the payment amount.",
    );
}

const [tokenGate] = findTokenGatePda(
    PROGRAM_ID,
    application,
    applicationAsset,
);

await send(
    connection,
    buildConfigureTokenGateInstruction({
        programId: PROGRAM_ID,
        application,
        applicationAsset,
        tokenGate,
        authority: authority.publicKey,
        gateType: HOLD_AMOUNT_GATE_TYPE,
        minimumAmount: TOKEN_GATE_MINIMUM_AMOUNT,
        minimumTier: 0,
        enabled: true,
    }),
    [authority],
);

await send(
    connection,
    buildVerifyGateAccessInstruction({
        programId: PROGRAM_ID,
        application,
        applicationAsset,
        tokenGate,
        wallet: payer.publicKey,
        userTokenAccount: payerTokenAccount,
    }),
    [payer],
);

const insufficientKeypairPath =
    `/tmp/babycowans-god-${phaseCode.toLowerCase()}-insufficient.json`;

runCommand("solana-keygen", [
    "new",
    "--outfile",
    insufficientKeypairPath,
    "--no-bip39-passphrase",
    "--force",
    "--silent",
]);

const insufficientWallet = loadKeypair(
    insufficientKeypairPath,
);

runCommand("solana", [
    "airdrop",
    "2",
    insufficientWallet.publicKey.toBase58(),
    "--url",
    RPC_URL,
]);

const insufficientTokenAccount = createTokenAccount(
    CANONICAL_MINT,
    insufficientKeypairPath,
);

await expectInstructionFailure(
    connection,
    buildVerifyGateAccessInstruction({
        programId: PROGRAM_ID,
        application,
        applicationAsset,
        tokenGate,
        wallet: insufficientWallet.publicKey,
        userTokenAccount: insufficientTokenAccount,
    }),
    [insufficientWallet],
    "InsufficientTokenBalance",
);

const mismatchedPhase =
    phaseCode === "BRC" ? PHASES.BEC : PHASES.BRC;

const mismatchedTokenAccount = createTokenAccount(
    mismatchedPhase.mint,
    PAYER_KEYPAIR_PATH,
);

await expectInstructionFailure(
    connection,
    buildVerifyGateAccessInstruction({
        programId: PROGRAM_ID,
        application,
        applicationAsset,
        tokenGate,
        wallet: payer.publicKey,
        userTokenAccount: mismatchedTokenAccount,
    }),
    [payer],
    "InvalidAsset",
);

const [membership] = findMembershipPda(
    PROGRAM_ID,
    application,
    payer.publicKey,
);

await send(
    connection,
    buildRegisterMembershipInstruction({
        programId: PROGRAM_ID,
        application,
        membership,
        authority: authority.publicKey,
        member: payer.publicKey,
        tier: MEMBERSHIP_TIER,
        expiresAt: MEMBERSHIP_EXPIRES_AT,
    }),
    [authority],
);

const [reward] = findRewardPda(
    PROGRAM_ID,
    application,
    payer.publicKey,
);

await send(
    connection,
    buildCreateRewardInstruction({
        programId: PROGRAM_ID,
        application,
        reward,
        authority: authority.publicKey,
        beneficiary: payer.publicKey,
        asset: CANONICAL_MINT,
        amount: REWARD_AMOUNT,
    }),
    [authority],
);

await send(
    connection,
    buildClaimRewardInstruction({
        programId: PROGRAM_ID,
        reward,
        beneficiary: payer.publicKey,
    }),
    [payer],
);

const auditNonce = BigInt(Date.now());

const [auditLog] = findAuditLogPda(
    PROGRAM_ID,
    application,
    authority.publicKey,
    auditNonce,
);

await send(
    connection,
    buildRecordAuditLogInstruction({
        programId: PROGRAM_ID,
        application,
        auditLog,
        authority: authority.publicKey,
        nonce: auditNonce,
        action: PAYMENT_PROCESSED_ACTION,
        reference: reward,
    }),
    [authority],
);

const requiredAccounts = [
    application,
    assetConfig,
    applicationAsset,
    tokenGate,
    membership,
    reward,
    auditLog,
];

for (const accountAddress of requiredAccounts) {
    const account = await connection.getAccountInfo(accountAddress);

    if (account === null) {
        throw new Error(
            `Expected account is missing: ${accountAddress.toBase58()}`,
        );
    }

    if (!account.owner.equals(PROGRAM_ID)) {
        throw new Error(
            `Unexpected account owner: ${accountAddress.toBase58()}`,
        );
    }
}

console.log("✓ Unified Golden Path completed successfully");
console.log("✓ Token Gate access succeeded");
console.log("✓ Insufficient balance was rejected");
console.log("✓ Mismatched mint was rejected");
console.log(`✓ Ecosystem: ${phase.fullName} — ${phase.ticker}`);
console.log(`✓ Application: ${application.toBase58()}`);
console.log(`✓ Application Asset: ${applicationAsset.toBase58()}`);
console.log(`✓ Membership: ${membership.toBase58()}`);
console.log(`✓ Reward: ${reward.toBase58()}`);
console.log(`✓ Audit Log: ${auditLog.toBase58()}`);
