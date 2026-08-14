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
    buildConfigureApplicationConfigInstruction,
    buildConfigurePaymentPolicyInstruction,
    buildUpdatePaymentPolicyInstruction,
    buildConfigureTokenGateInstruction,
    buildCreateRewardInstruction,
    buildInitializeProtocolInstruction,
    buildNominateApplicationAuthorityInstruction,
    buildAcceptApplicationAuthorityInstruction,
    buildProcessPaymentInstruction,
    buildRecordAuditLogInstruction,
    buildRegisterApplicationInstruction,
    buildRegisterAssetInstruction,
    buildRegisterMembershipInstruction,
    buildAssignApplicationRoleInstruction,
    buildSetProtocolPauseInstruction,
    buildNominateProtocolAuthorityInstruction,
    buildAcceptProtocolAuthorityInstruction,
    buildUpdateApplicationStatusInstruction,
    buildVerifyGateAccessInstruction,
    findApplicationAssetPda,
    findApplicationConfigPda,
    findApplicationPda,
    findApplicationRolePda,
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

const TOKEN_2022_PROGRAM_ID = new PublicKey(
    "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
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

/*
 * XRAY_X4_APPLICATION_INVARIANT_RUNTIME_REGRESSIONS
 *
 * These probes exercise source-enforced Application invariants
 * without changing protocol or SDK production logic.
 */

/*
 * X4-1 — duplicate Application registration.
 *
 * The same authority + application_id resolves to the already
 * initialized Application PDA. Anchor init must fail closed.
 */
await expectInstructionFailure(
    connection,
    buildRegisterApplicationInstruction({
        programId: PROGRAM_ID,
        authority: authority.publicKey,
        applicationId,
        name: applicationName,
        selectedEcosystem: phase.ecosystem,
    }),
    [authority],
    "already in use",
);

console.log(
    "XRAY_X4_DUPLICATE_APPLICATION_REGISTRATION_REJECTED=PASS",
);

/*
 * X4-2 — duplicate ApplicationConfig.
 *
 * ApplicationConfig has exactly one PDA per Application. The
 * second configure attempt targets the already initialized PDA.
 */
const [x4ApplicationConfig] = findApplicationConfigPda(
    PROGRAM_ID,
    application,
);

await send(
    connection,
    buildConfigureApplicationConfigInstruction({
        programId: PROGRAM_ID,
        application,
        authority: authority.publicKey,
        websiteUri: "https://babycowans.example",
        logoUri: "https://babycowans.example/logo.png",
        supportUri: "https://babycowans.example/support",
        description: "Xray X4 Application invariant probe",
        metadataUri: "https://babycowans.example/metadata.json",
    }),
    [authority],
);

if (
    (await connection.getAccountInfo(x4ApplicationConfig)) === null
) {
    throw new Error(
        "XRAY_X4_APPLICATION_CONFIG_CREATION_FAILED",
    );
}

await expectInstructionFailure(
    connection,
    buildConfigureApplicationConfigInstruction({
        programId: PROGRAM_ID,
        application,
        authority: authority.publicKey,
        websiteUri: "https://duplicate.babycowans.example",
        logoUri: "https://duplicate.babycowans.example/logo.png",
        supportUri: "https://duplicate.babycowans.example/support",
        description: "Duplicate Xray X4 ApplicationConfig",
        metadataUri: "https://duplicate.babycowans.example/metadata.json",
    }),
    [authority],
    "already in use",
);

console.log(
    "XRAY_X4_DUPLICATE_APPLICATION_CONFIG_REJECTED=PASS",
);

/*
 * X4-3 — ApplicationRole unauthorized authority.
 *
 * The Application is legitimate and the role PDA is correctly
 * derived. Only the signer is substituted. has_one = authority
 * must reject the transaction.
 */
const x4RoleMember = Keypair.generate().publicKey;

const x4UnauthorizedRoleAuthority = Keypair.generate();

runCommand("solana", [
    "airdrop",
    "2",
    x4UnauthorizedRoleAuthority.publicKey.toBase58(),
    "--url",
    RPC_URL,
]);

const [x4ApplicationRole] = findApplicationRolePda(
    PROGRAM_ID,
    application,
    x4RoleMember,
);

await expectInstructionFailure(
    connection,
    buildAssignApplicationRoleInstruction({
        programId: PROGRAM_ID,
        application,
        applicationRole: x4ApplicationRole,
        member: x4RoleMember,
        authority: x4UnauthorizedRoleAuthority.publicKey,
        role: 1,
    }),
    [x4UnauthorizedRoleAuthority],
    "ConstraintHasOne",
);

console.log(
    "XRAY_X4_APPLICATION_ROLE_UNAUTHORIZED_REJECTED=PASS",
);

/*
 * X4-4 — foreign/orphan ApplicationRole child.
 *
 * Derive the supplied ApplicationRole PDA from a different
 * Application while passing the primary Application account.
 * Anchor's PDA seed constraint must reject the foreign child
 * before initialization.
 */
const x4ForeignApplicationId = applicationId + 10_000_000n;

const [x4ForeignApplication] = findApplicationPda(
    PROGRAM_ID,
    authority.publicKey,
    x4ForeignApplicationId,
);

const [x4ForeignApplicationRole] = findApplicationRolePda(
    PROGRAM_ID,
    x4ForeignApplication,
    x4RoleMember,
);

await expectInstructionFailure(
    connection,
    buildAssignApplicationRoleInstruction({
        programId: PROGRAM_ID,
        application,
        applicationRole: x4ForeignApplicationRole,
        member: x4RoleMember,
        authority: authority.publicKey,
        role: 1,
    }),
    [authority],
    "ConstraintSeeds",
);

console.log(
    "XRAY_X4_FOREIGN_APPLICATION_CHILD_REJECTED=PASS",
);

const mismatchedPhase =
    phaseCode === "BRC" ? PHASES.BEC : PHASES.BRC;

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

/*
 * The non-canonical registration invariant is global rather
 * than ecosystem-specific. Run it once on BRC before the
 * six-slot canonical registry becomes saturated by the
 * six-ecosystem runtime matrix.
 */
if (phaseCode === "BRC") {
    /*
     * ----------------------------------------------------------
     * Xray X2 — canonical asset enforcement.
     *
     * A valid SPL mint that is not one of the six canonical
     * Babycowans mints must be rejected by register_asset.
     * ----------------------------------------------------------
     */

    const nonCanonicalMintPath =
        `/tmp/babycowans-x2-noncanonical-mint-${process.pid}.json`;

    runCommand("solana-keygen", [
        "new",
        "--outfile",
        nonCanonicalMintPath,
        "--no-bip39-passphrase",
        "--force",
        "--silent",
    ]);

    runCommand("spl-token", [
        "create-token",
        nonCanonicalMintPath,
        "--decimals",
        "9",
        "--mint-authority",
        authority.publicKey.toBase58(),
        "--url",
        RPC_URL,
    ]);

    const nonCanonicalMint = new PublicKey(
        runCommand("solana-keygen", [
            "pubkey",
            nonCanonicalMintPath,
        ]),
    );

    const [nonCanonicalAssetConfig] =
        findAssetConfigPda(
            PROGRAM_ID,
            nonCanonicalMint,
        );

    await expectInstructionFailure(
        connection,
        buildRegisterAssetInstruction({
            programId: PROGRAM_ID,
            authority: authority.publicKey,
            mint: nonCanonicalMint,
            assetCode: "ZZZ",
            domain: 4,
        }),
        [authority],
        "UnsupportedMint",
    );

    if (
        (await connection.getAccountInfo(
            nonCanonicalAssetConfig,
        )) !== null
    ) {
        throw new Error(
            "Rejected non-canonical mint created an AssetConfig.",
        );
    }

    console.log(
        "NON_CANONICAL_REGISTER_ASSET_REJECTED=PASS",
    );
}

/*
 * Prepare a valid canonical AssetConfig belonging to a
 * different ecosystem. This is used below to prove that an
 * Application cannot substitute another canonical ecosystem.
 */

const [mismatchedAssetConfig] =
    findAssetConfigPda(
        PROGRAM_ID,
        mismatchedPhase.mint,
    );

if (
    (await connection.getAccountInfo(
        mismatchedAssetConfig,
    )) === null
) {
    await send(
        connection,
        buildRegisterAssetInstruction({
            programId: PROGRAM_ID,
            authority: authority.publicKey,
            mint: mismatchedPhase.mint,
            assetCode: mismatchedPhase.assetCode,
            domain: 4,
        }),
        [authority],
    );
}

const mismatchedMintAccount =
    await connection.getAccountInfo(
        mismatchedPhase.mint,
    );

if (mismatchedMintAccount === null) {
    throw new Error(
        "Opposite canonical mint is missing from the local validator.",
    );
}

const mismatchedTokenProgram =
    mismatchedMintAccount.owner;

runCommand("solana-keygen", [
    "new",
    "--outfile",
    PAYER_KEYPAIR_PATH,
    "--no-bip39-passphrase",
    "--force",
    "--silent",
]);

const payer = loadKeypair(PAYER_KEYPAIR_PATH);

const unauthorizedAuthorityPath =
    `/tmp/babycowans-god-${phaseCode.toLowerCase()}-unauthorized.json`;

runCommand("solana-keygen", [
    "new",
    "--outfile",
    unauthorizedAuthorityPath,
    "--no-bip39-passphrase",
    "--force",
    "--silent",
]);

const unauthorizedAuthority = loadKeypair(
    unauthorizedAuthorityPath,
);

runCommand("solana", [
    "airdrop",
    "2",
    unauthorizedAuthority.publicKey.toBase58(),
    "--url",
    RPC_URL,
]);

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

const protocolTreasuryTokenAccountPath =
    `/tmp/babycowans-god-${phaseCode.toLowerCase()}-protocol-treasury-token-account.json`;

runCommand("solana-keygen", [
    "new",
    "--outfile",
    protocolTreasuryTokenAccountPath,
    "--no-bip39-passphrase",
    "--force",
    "--silent",
]);

const protocolTreasuryTokenAccount = new PublicKey(
    runCommand("solana-keygen", [
        "pubkey",
        protocolTreasuryTokenAccountPath,
    ]),
);

runCommand("spl-token", [
    "create-account",
    CANONICAL_MINT.toBase58(),
    protocolTreasuryTokenAccountPath,
    "--owner",
    `${process.env.HOME}/.config/solana/id.json`,
    "--url",
    RPC_URL,
]);

const payerTokenAccount = createTokenAccount(
    CANONICAL_MINT,
    PAYER_KEYPAIR_PATH,
);

const [applicationAsset] = findApplicationAssetPda(
    PROGRAM_ID,
    application,
    CANONICAL_MINT,
);

await expectInstructionFailure(
    connection,
    buildUpdateApplicationStatusInstruction({
        programId: PROGRAM_ID,
        application,
        authority: unauthorizedAuthority.publicKey,
        newStatus: 2,
    }),
    [unauthorizedAuthority],
    "ConstraintHasOne",
);

await send(
    connection,
    buildUpdateApplicationStatusInstruction({
        programId: PROGRAM_ID,
        application,
        authority: authority.publicKey,
        newStatus: 2,
    }),
    [authority],
);

await expectInstructionFailure(
    connection,
    buildConfigureApplicationAssetInstruction({
        programId: PROGRAM_ID,
        application,
        assetConfig,
        mint: CANONICAL_MINT,
        applicationAsset,
        paymentDestination: destinationTokenAccount,
        authority: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        paymentsEnabled: true,
        gatingEnabled: true,
        rewardsEnabled: true,
    }),
    [authority],
    "InvalidApplication",
);

await send(
    connection,
    buildUpdateApplicationStatusInstruction({
        programId: PROGRAM_ID,
        application,
        authority: authority.publicKey,
        newStatus: 1,
    }),
    [authority],
);

/*
 * ----------------------------------------------------------
 * Xray X2 — cross-ecosystem canonical substitution.
 *
 * The Application selected `phase.ecosystem`. Supplying the
 * valid AssetConfig + mint of another canonical ecosystem
 * must therefore fail with InvalidAsset.
 * ----------------------------------------------------------
 */

const mismatchedPaymentDestination =
    createTokenAccount(
        mismatchedPhase.mint,
        `${process.env.HOME}/.config/solana/id.json`,
    );

const [mismatchedApplicationAsset] =
    findApplicationAssetPda(
        PROGRAM_ID,
        application,
        mismatchedPhase.mint,
    );

await expectInstructionFailure(
    connection,
    buildConfigureApplicationAssetInstruction({
        programId: PROGRAM_ID,
        application,
        assetConfig: mismatchedAssetConfig,
        mint: mismatchedPhase.mint,
        applicationAsset:
            mismatchedApplicationAsset,
        paymentDestination:
            mismatchedPaymentDestination,
        authority: authority.publicKey,
        tokenProgram: mismatchedTokenProgram,
        paymentsEnabled: true,
        gatingEnabled: true,
        rewardsEnabled: true,
    }),
    [authority],
    "InvalidAsset",
);

if (
    (await connection.getAccountInfo(
        mismatchedApplicationAsset,
    )) !== null
) {
    throw new Error(
        "Rejected cross-ecosystem configuration created an ApplicationAsset.",
    );
}

console.log(
    "CROSS_ECOSYSTEM_APPLICATION_ASSET_REJECTED=PASS",
);

runCommand("spl-token", [
    "mint",
    CANONICAL_MINT.toBase58(),
    "1001",
    payerTokenAccount.toBase58(),
    "--url",
    RPC_URL,
]);


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
        treasury: protocolTreasuryTokenAccount,
    }),
    [authority],
);

await expectInstructionFailure(
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
        treasuryTokenAccount: protocolTreasuryTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        amount: 99n,
    }),
    [payer],
    "PaymentBelowMinimum",
);

await expectInstructionFailure(
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
        treasuryTokenAccount: protocolTreasuryTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        amount: PAYMENT_AMOUNT + 1n,
    }),
    [payer],
    "PaymentAboveMaximum",
);

await expectInstructionFailure(
    connection,
    buildUpdatePaymentPolicyInstruction({
        programId: PROGRAM_ID,
        application,
        applicationAsset,
        authority: unauthorizedAuthority.publicKey,
        minimumAmount: 100n,
        maximumAmount: PAYMENT_AMOUNT,
        paymentsEnabled: true,
        protocolFeeBps: 0,
        applicationFeeBps: 0,
        treasury: protocolTreasuryTokenAccount,
    }),
    [unauthorizedAuthority],
    "ConstraintHasOne",
);

await expectInstructionFailure(
    connection,
    buildUpdatePaymentPolicyInstruction({
        programId: PROGRAM_ID,
        application,
        applicationAsset,
        authority: authority.publicKey,
        minimumAmount: 100n,
        maximumAmount: PAYMENT_AMOUNT,
        paymentsEnabled: true,
        protocolFeeBps: 6_000,
        applicationFeeBps: 5_000,
        treasury: protocolTreasuryTokenAccount,
    }),
    [authority],
    "InvalidPaymentPolicy",
);

await expectInstructionFailure(
    connection,
    buildUpdatePaymentPolicyInstruction({
        programId: PROGRAM_ID,
        application,
        applicationAsset,
        authority: authority.publicKey,
        minimumAmount: 100n,
        maximumAmount: PAYMENT_AMOUNT,
        paymentsEnabled: true,
        protocolFeeBps: 0,
        applicationFeeBps: 0,
        treasury: new PublicKey(
            "11111111111111111111111111111111",
        ),
    }),
    [authority],
    "InvalidPaymentDestination",
);

await send(
    connection,
    buildUpdatePaymentPolicyInstruction({
        programId: PROGRAM_ID,
        application,
        applicationAsset,
        authority: authority.publicKey,
        minimumAmount: 200n,
        maximumAmount: PAYMENT_AMOUNT,
        paymentsEnabled: true,
        protocolFeeBps: 0,
        applicationFeeBps: 0,
        treasury: protocolTreasuryTokenAccount,
    }),
    [authority],
);

await expectInstructionFailure(
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
        treasuryTokenAccount: protocolTreasuryTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        amount: 199n,
    }),
    [payer],
    "PaymentBelowMinimum",
);

await send(
    connection,
    buildUpdatePaymentPolicyInstruction({
        programId: PROGRAM_ID,
        application,
        applicationAsset,
        authority: authority.publicKey,
        minimumAmount: 100n,
        maximumAmount: PAYMENT_AMOUNT,
        paymentsEnabled: true,
        protocolFeeBps: 0,
        applicationFeeBps: 0,
        treasury: protocolTreasuryTokenAccount,
    }),
    [authority],
);


await expectInstructionFailure(
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
        treasuryTokenAccount: protocolTreasuryTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        amount: 0n,
    }),
    [payer],
    "InvalidAmount",
);

await expectInstructionFailure(
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
        treasuryTokenAccount: protocolTreasuryTokenAccount,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        amount: PAYMENT_AMOUNT,
    }),
    [payer],
    "InvalidTokenProgram",
);

const invalidDestinationPath =
    `/tmp/babycowans-god-${phaseCode.toLowerCase()}-destination.json`;

runCommand("solana-keygen", [
    "new",
    "--outfile",
    invalidDestinationPath,
    "--no-bip39-passphrase",
    "--force",
    "--silent",
]);

const invalidDestinationOwner = loadKeypair(
    invalidDestinationPath,
);

runCommand("solana", [
    "airdrop",
    "2",
    invalidDestinationOwner.publicKey.toBase58(),
    "--url",
    RPC_URL,
]);

const invalidDestinationTokenAccount = createTokenAccount(
    CANONICAL_MINT,
    invalidDestinationPath,
);

await expectInstructionFailure(
    connection,
    buildProcessPaymentInstruction({
        programId: PROGRAM_ID,
        application,
        applicationAsset,
        assetConfig,
        mint: CANONICAL_MINT,
        payer: payer.publicKey,
        payerTokenAccount,
        destinationTokenAccount: invalidDestinationTokenAccount,
        treasuryTokenAccount: protocolTreasuryTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        amount: PAYMENT_AMOUNT,
    }),
    [payer],
    "InvalidPaymentDestination",
);

const disabledApplicationId =
    applicationId + 1_000_000n;

const [disabledApplication] = findApplicationPda(
    PROGRAM_ID,
    authority.publicKey,
    disabledApplicationId,
);

await send(
    connection,
    buildRegisterApplicationInstruction({
        programId: PROGRAM_ID,
        authority: authority.publicKey,
        applicationId: disabledApplicationId,
        name: `Payments Disabled ${phaseCode}`,
        selectedEcosystem: phase.ecosystem,
    }),
    [authority],
);

const [disabledApplicationAsset] =
    findApplicationAssetPda(
        PROGRAM_ID,
        disabledApplication,
        CANONICAL_MINT,
    );

await send(
    connection,
    buildConfigureApplicationAssetInstruction({
        programId: PROGRAM_ID,
        application: disabledApplication,
        assetConfig,
        mint: CANONICAL_MINT,
        paymentDestination: destinationTokenAccount,
        authority: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        paymentsEnabled: false,
        gatingEnabled: true,
        rewardsEnabled: true,
    }),
    [authority],
);

await send(
    connection,
    buildConfigurePaymentPolicyInstruction({
        programId: PROGRAM_ID,
        application: disabledApplication,
        applicationAsset: disabledApplicationAsset,
        authority: authority.publicKey,
        minimumAmount: 1n,
        maximumAmount: 1_000_000_000n,
        paymentsEnabled: true,
        protocolFeeBps: 0,
        applicationFeeBps: 0,
        treasury: protocolTreasuryTokenAccount,
    }),
    [authority],
);

await expectInstructionFailure(
    connection,
    buildProcessPaymentInstruction({
        programId: PROGRAM_ID,
        application: disabledApplication,
        applicationAsset: disabledApplicationAsset,
        assetConfig,
        mint: CANONICAL_MINT,
        payer: payer.publicKey,
        payerTokenAccount,
        destinationTokenAccount,
        treasuryTokenAccount: protocolTreasuryTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        amount: PAYMENT_AMOUNT,
    }),
    [payer],
    "PaymentsDisabled",
);

const policyDisabledApplicationId =
    applicationId + 2_000_000n;

const [policyDisabledApplication] = findApplicationPda(
    PROGRAM_ID,
    authority.publicKey,
    policyDisabledApplicationId,
);

await send(
    connection,
    buildRegisterApplicationInstruction({
        programId: PROGRAM_ID,
        authority: authority.publicKey,
        applicationId: policyDisabledApplicationId,
        name: `Policy Disabled ${phaseCode}`,
        selectedEcosystem: phase.ecosystem,
    }),
    [authority],
);

const [policyDisabledApplicationAsset] =
    findApplicationAssetPda(
        PROGRAM_ID,
        policyDisabledApplication,
        CANONICAL_MINT,
    );

await send(
    connection,
    buildConfigureApplicationAssetInstruction({
        programId: PROGRAM_ID,
        application: policyDisabledApplication,
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

await send(
    connection,
    buildConfigurePaymentPolicyInstruction({
        programId: PROGRAM_ID,
        application: policyDisabledApplication,
        applicationAsset: policyDisabledApplicationAsset,
        authority: authority.publicKey,
        minimumAmount: 1n,
        maximumAmount: 0n,
        paymentsEnabled: false,
        protocolFeeBps: 0,
        applicationFeeBps: 0,
        treasury: protocolTreasuryTokenAccount,
    }),
    [authority],
);

await expectInstructionFailure(
    connection,
    buildProcessPaymentInstruction({
        programId: PROGRAM_ID,
        application: policyDisabledApplication,
        applicationAsset: policyDisabledApplicationAsset,
        assetConfig,
        mint: CANONICAL_MINT,
        payer: payer.publicKey,
        payerTokenAccount,
        destinationTokenAccount,
        treasuryTokenAccount: protocolTreasuryTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        amount: PAYMENT_AMOUNT,
    }),
    [payer],
    "PaymentsDisabled",
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

await expectInstructionFailure(
    connection,
    buildSetProtocolPauseInstruction({
        programId: PROGRAM_ID,
        protocolConfig,
        authority: unauthorizedAuthority.publicKey,
        paused: true,
    }),
    [unauthorizedAuthority],
    "ConstraintHasOne",
);

await send(
    connection,
    buildSetProtocolPauseInstruction({
        programId: PROGRAM_ID,
        protocolConfig,
        authority: authority.publicKey,
        paused: true,
    }),
    [authority],
);

await expectInstructionFailure(
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
        treasuryTokenAccount: protocolTreasuryTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        amount: PAYMENT_AMOUNT,
    }),
    [payer],
    "ProtocolPaused",
);

await send(
    connection,
    buildSetProtocolPauseInstruction({
        programId: PROGRAM_ID,
        protocolConfig,
        authority: authority.publicKey,
        paused: false,
    }),
    [authority],
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
        treasuryTokenAccount: protocolTreasuryTokenAccount,
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

const GOLDEN_REWARD_ID = 0n;

const [reward] = findRewardPda(
    PROGRAM_ID,
    application,
    payer.publicKey,
    GOLDEN_REWARD_ID,
);

await send(
    connection,
    buildCreateRewardInstruction({
        programId: PROGRAM_ID,
        application,
        reward,
        authority: authority.publicKey,
        beneficiary: payer.publicKey,
        rewardId: GOLDEN_REWARD_ID,
        asset: CANONICAL_MINT,
        amount: REWARD_AMOUNT,
        claimableAt: 0n,
        expiresAt: 0n,
        category: 0,
        reason: "golden-path",
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

await expectInstructionFailure(
    connection,
    buildClaimRewardInstruction({
        programId: PROGRAM_ID,
        reward,
        beneficiary: payer.publicKey,
    }),
    [payer],
    "InvalidRewardStatus",
);

await send(
    connection,
    buildUpdateApplicationStatusInstruction({
        programId: PROGRAM_ID,
        application,
        authority: authority.publicKey,
        newStatus: 2,
    }),
    [authority],
);

await expectInstructionFailure(
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
        treasuryTokenAccount: protocolTreasuryTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        amount: PAYMENT_AMOUNT,
    }),
    [payer],
    "InvalidApplication",
);

await send(
    connection,
    buildUpdateApplicationStatusInstruction({
        programId: PROGRAM_ID,
        application,
        authority: authority.publicKey,
        newStatus: 1,
    }),
    [authority],
);


const FEE_ENGINE_AMOUNT = 10_000n;
const EXPECTED_PROTOCOL_FEE = 100n;
const EXPECTED_APPLICATION_FEE = 200n;
const EXPECTED_NET_AMOUNT = 9_700n;
const EXPECTED_APPLICATION_DESTINATION =
    EXPECTED_NET_AMOUNT + EXPECTED_APPLICATION_FEE;

await send(
    connection,
    buildUpdatePaymentPolicyInstruction({
        programId: PROGRAM_ID,
        application,
        applicationAsset,
        authority: authority.publicKey,
        minimumAmount: 1n,
        maximumAmount: 1_000_000_000n,
        paymentsEnabled: true,
        protocolFeeBps: 100,
        applicationFeeBps: 200,
        treasury: protocolTreasuryTokenAccount,
    }),
    [authority],
);

const feePayerBefore = await connection.getAccountInfo(
    payerTokenAccount,
);

const feeDestinationBefore = await connection.getAccountInfo(
    destinationTokenAccount,
);

const feeTreasuryBefore = await connection.getAccountInfo(
    protocolTreasuryTokenAccount,
);

if (
    feePayerBefore === null ||
    feeDestinationBefore === null ||
    feeTreasuryBefore === null
) {
    throw new Error(
        "Fee engine token accounts are unavailable before payment.",
    );
}

const feePayerBalanceBefore =
    readTokenAmount(feePayerBefore.data);

const feeDestinationBalanceBefore =
    readTokenAmount(feeDestinationBefore.data);

const feeTreasuryBalanceBefore =
    readTokenAmount(feeTreasuryBefore.data);

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
        treasuryTokenAccount: protocolTreasuryTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        amount: FEE_ENGINE_AMOUNT,
    }),
    [payer],
);

const feePayerAfter = await connection.getAccountInfo(
    payerTokenAccount,
);

const feeDestinationAfter = await connection.getAccountInfo(
    destinationTokenAccount,
);

const feeTreasuryAfter = await connection.getAccountInfo(
    protocolTreasuryTokenAccount,
);

if (
    feePayerAfter === null ||
    feeDestinationAfter === null ||
    feeTreasuryAfter === null
) {
    throw new Error(
        "Fee engine token accounts are unavailable after payment.",
    );
}

if (
    readTokenAmount(feePayerAfter.data) !==
    feePayerBalanceBefore - FEE_ENGINE_AMOUNT
) {
    throw new Error(
        "Fee engine payer debit is incorrect.",
    );
}

if (
    readTokenAmount(feeDestinationAfter.data) !==
    feeDestinationBalanceBefore +
        EXPECTED_APPLICATION_DESTINATION
) {
    throw new Error(
        "Fee engine application destination credit is incorrect.",
    );
}

if (
    readTokenAmount(feeTreasuryAfter.data) !==
    feeTreasuryBalanceBefore + EXPECTED_PROTOCOL_FEE
) {
    throw new Error(
        "Fee engine protocol treasury credit is incorrect.",
    );
}

await send(
    connection,
    buildUpdatePaymentPolicyInstruction({
        programId: PROGRAM_ID,
        application,
        applicationAsset,
        authority: authority.publicKey,
        minimumAmount: 1n,
        maximumAmount: 1_000_000_000n,
        paymentsEnabled: true,
        protocolFeeBps: 0,
        applicationFeeBps: 0,
        treasury: protocolTreasuryTokenAccount,
    }),
    [authority],
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
        category: 2,
        severity: 0,
        reference: reward,
        indexedReferences: [
            reward,
            applicationAsset,
            application,
        ],
        metadata: JSON.stringify({
            event: "payment_processed",
            ecosystem: phase.assetCode,
            auditEventSchemaVersion: 1,
        }),
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

/*
 * PHASE13_CROSS_APPLICATION_PAYMENT_SUBSTITUTION
 *
 * Security invariant:
 * process_payment must reject an ApplicationAsset PDA that belongs
 * to a different Application.
 *
 * Only the ApplicationAsset account is substituted. All other
 * accounts remain those of the valid primary payment flow.
 *
 * The payment-policy PDA is derived from both Application and
 * ApplicationAsset. This foreign combination therefore resolves to
 * an uninitialized hybrid policy and must fail closed during Anchor
 * account loading before any state mutation can occur.
 */
await expectInstructionFailure(
    connection,
    buildProcessPaymentInstruction({
        programId: PROGRAM_ID,
        application,
        applicationAsset: policyDisabledApplicationAsset,
        assetConfig,
        mint: CANONICAL_MINT,
        payer: payer.publicKey,
        payerTokenAccount,
        destinationTokenAccount,
        treasuryTokenAccount: protocolTreasuryTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        amount: PAYMENT_AMOUNT,
    }),
    [payer],
    "AccountNotInitialized",
);

console.log(
    "✓ Cross-application ApplicationAsset substitution was rejected",
);

/*
 * PHASE13_APPLICATION_AUTHORITY_ADVERSARIAL_LIFECYCLE
 *
 * Security invariants:
 * - only the current authority may nominate;
 * - the default public key cannot be nominated;
 * - nomination alone grants no authority;
 * - only the pending authority may accept;
 * - acceptance clears pending authority;
 * - stale acceptance cannot replay;
 * - the old authority loses privilege after acceptance;
 * - the new authority gains privilege only after acceptance.
 */

const defaultAuthority = new PublicKey(new Uint8Array(32));

await expectInstructionFailure(
    connection,
    buildNominateApplicationAuthorityInstruction({
        programId: PROGRAM_ID,
        application,
        authority: unauthorizedAuthority.publicKey,
        newAuthority: payer.publicKey,
    }),
    [unauthorizedAuthority],
    "ConstraintHasOne",
);

await expectInstructionFailure(
    connection,
    buildNominateApplicationAuthorityInstruction({
        programId: PROGRAM_ID,
        application,
        authority: authority.publicKey,
        newAuthority: defaultAuthority,
    }),
    [authority],
    "InvalidAuthority",
);

await send(
    connection,
    buildNominateApplicationAuthorityInstruction({
        programId: PROGRAM_ID,
        application,
        authority: authority.publicKey,
        newAuthority: unauthorizedAuthority.publicKey,
    }),
    [authority],
);

await expectInstructionFailure(
    connection,
    buildUpdateApplicationStatusInstruction({
        programId: PROGRAM_ID,
        application,
        authority: unauthorizedAuthority.publicKey,
        newStatus: 2,
    }),
    [unauthorizedAuthority],
    "ConstraintHasOne",
);

await expectInstructionFailure(
    connection,
    buildAcceptApplicationAuthorityInstruction({
        programId: PROGRAM_ID,
        application,
        authority: payer.publicKey,
    }),
    [payer],
    "InvalidAuthority",
);

await send(
    connection,
    buildAcceptApplicationAuthorityInstruction({
        programId: PROGRAM_ID,
        application,
        authority: unauthorizedAuthority.publicKey,
    }),
    [unauthorizedAuthority],
);

await expectInstructionFailure(
    connection,
    buildAcceptApplicationAuthorityInstruction({
        programId: PROGRAM_ID,
        application,
        authority: unauthorizedAuthority.publicKey,
    }),
    [unauthorizedAuthority],
    "InvalidAuthority",
);

await expectInstructionFailure(
    connection,
    buildUpdateApplicationStatusInstruction({
        programId: PROGRAM_ID,
        application,
        authority: authority.publicKey,
        newStatus: 2,
    }),
    [authority],
    "ConstraintHasOne",
);

await send(
    connection,
    buildUpdateApplicationStatusInstruction({
        programId: PROGRAM_ID,
        application,
        authority: unauthorizedAuthority.publicKey,
        newStatus: 2,
    }),
    [unauthorizedAuthority],
);

await send(
    connection,
    buildUpdateApplicationStatusInstruction({
        programId: PROGRAM_ID,
        application,
        authority: unauthorizedAuthority.publicKey,
        newStatus: 1,
    }),
    [unauthorizedAuthority],
);

console.log("✓ Non-current application authority nomination was rejected");
console.log("✓ Default application authority nomination was rejected");
console.log("✓ Pending application authority had no premature privilege");
console.log("✓ Non-pending application authority acceptance was rejected");
console.log("✓ Application authority transfer succeeded");
console.log("✓ Stale application authority acceptance replay was rejected");
console.log("✓ Previous application authority lost privilege");
console.log("✓ New application authority gained privilege");

/*
 * PHASE13_APPLICATION_AUTHORITY_CROSS_APPLICATION_BOUNDARY
 *
 * At this point unauthorizedAuthority is the legitimate authority
 * of the primary Application. It must not gain authority over the
 * independent policyDisabledApplication.
 */
await expectInstructionFailure(
    connection,
    buildNominateApplicationAuthorityInstruction({
        programId: PROGRAM_ID,
        application: policyDisabledApplication,
        authority: unauthorizedAuthority.publicKey,
        newAuthority: payer.publicKey,
    }),
    [unauthorizedAuthority],
    "ConstraintHasOne",
);

console.log(
    "✓ Application authority cross-application nomination was rejected",
);

/*
 * PHASE13_PROTOCOL_AUTHORITY_ADVERSARIAL_LIFECYCLE
 *
 * Security invariants:
 * - only the current protocol authority may nominate;
 * - the default public key cannot be nominated;
 * - nomination grants no premature protocol privilege;
 * - only the pending authority may accept;
 * - acceptance clears pending authority;
 * - stale acceptance cannot replay;
 * - the old authority loses protocol privilege;
 * - the new authority gains protocol privilege;
 * - the original authority can be restored through the same
 *   nominate/accept state machine, preserving the Golden Path baseline.
 */

await expectInstructionFailure(
    connection,
    buildNominateProtocolAuthorityInstruction({
        programId: PROGRAM_ID,
        protocolConfig,
        authority: unauthorizedAuthority.publicKey,
        newAuthority: payer.publicKey,
    }),
    [unauthorizedAuthority],
    "ConstraintHasOne",
);

await expectInstructionFailure(
    connection,
    buildNominateProtocolAuthorityInstruction({
        programId: PROGRAM_ID,
        protocolConfig,
        authority: authority.publicKey,
        newAuthority: defaultAuthority,
    }),
    [authority],
    "InvalidAuthority",
);

await send(
    connection,
    buildNominateProtocolAuthorityInstruction({
        programId: PROGRAM_ID,
        protocolConfig,
        authority: authority.publicKey,
        newAuthority: payer.publicKey,
    }),
    [authority],
);

await expectInstructionFailure(
    connection,
    buildSetProtocolPauseInstruction({
        programId: PROGRAM_ID,
        protocolConfig,
        authority: payer.publicKey,
        paused: true,
    }),
    [payer],
    "ConstraintHasOne",
);

await expectInstructionFailure(
    connection,
    buildAcceptProtocolAuthorityInstruction({
        programId: PROGRAM_ID,
        protocolConfig,
        pendingAuthority: unauthorizedAuthority.publicKey,
    }),
    [unauthorizedAuthority],
    "InvalidAuthority",
);

await send(
    connection,
    buildAcceptProtocolAuthorityInstruction({
        programId: PROGRAM_ID,
        protocolConfig,
        pendingAuthority: payer.publicKey,
    }),
    [payer],
);

await expectInstructionFailure(
    connection,
    buildAcceptProtocolAuthorityInstruction({
        programId: PROGRAM_ID,
        protocolConfig,
        pendingAuthority: payer.publicKey,
    }),
    [payer],
    "InvalidAuthority",
);

await expectInstructionFailure(
    connection,
    buildSetProtocolPauseInstruction({
        programId: PROGRAM_ID,
        protocolConfig,
        authority: authority.publicKey,
        paused: true,
    }),
    [authority],
    "ConstraintHasOne",
);

await send(
    connection,
    buildSetProtocolPauseInstruction({
        programId: PROGRAM_ID,
        protocolConfig,
        authority: payer.publicKey,
        paused: true,
    }),
    [payer],
);

await send(
    connection,
    buildSetProtocolPauseInstruction({
        programId: PROGRAM_ID,
        protocolConfig,
        authority: payer.publicKey,
        paused: false,
    }),
    [payer],
);

/*
 * Restore the original protocol authority using the exact same
 * state machine so later Phase 13 security probes retain the
 * established baseline.
 */
await send(
    connection,
    buildNominateProtocolAuthorityInstruction({
        programId: PROGRAM_ID,
        protocolConfig,
        authority: payer.publicKey,
        newAuthority: authority.publicKey,
    }),
    [payer],
);

await send(
    connection,
    buildAcceptProtocolAuthorityInstruction({
        programId: PROGRAM_ID,
        protocolConfig,
        pendingAuthority: authority.publicKey,
    }),
    [authority],
);

await send(
    connection,
    buildSetProtocolPauseInstruction({
        programId: PROGRAM_ID,
        protocolConfig,
        authority: authority.publicKey,
        paused: false,
    }),
    [authority],
);

console.log("✓ Non-current protocol authority nomination was rejected");
console.log("✓ Default protocol authority nomination was rejected");
console.log("✓ Pending protocol authority had no premature privilege");
console.log("✓ Non-pending protocol authority acceptance was rejected");
console.log("✓ Protocol authority transfer succeeded");
console.log("✓ Stale protocol authority acceptance replay was rejected");
console.log("✓ Previous protocol authority lost privilege");
console.log("✓ New protocol authority gained privilege");
console.log("✓ Original protocol authority was restored");




console.log("✓ Unified Golden Path completed successfully");
console.log("✓ Token Gate access succeeded");
console.log("✓ Insufficient balance was rejected");
console.log("✓ Mismatched mint was rejected");
console.log("✓ Suspended application rejected asset configuration");
console.log("✓ Suspended application rejected payment");
console.log("✓ Application reactivation succeeded");
console.log("✓ Double reward claim was rejected");
console.log("✓ Paused protocol rejected payment");
console.log("✓ Protocol resume restored payment");
console.log("✓ Unauthorized application status update was rejected");
console.log("✓ Unauthorized protocol pause was rejected");
console.log("✓ Zero payment amount was rejected");
console.log("✓ Invalid payment destination was rejected");
console.log("✓ Disabled payments were rejected");
console.log("✓ Invalid token program was rejected");
console.log("✓ Payment below policy minimum was rejected");
console.log("✓ Payment above policy maximum was rejected");
console.log("✓ Unauthorized payment policy update was rejected");
console.log("✓ Invalid payment policy fee sum was rejected");
console.log("✓ Invalid payment policy treasury was rejected");
console.log("✓ Payment policy reconfiguration succeeded");
console.log("✓ Updated payment policy was enforced");
console.log("✓ Disabled payment policy rejected payment");
console.log("✓ Valid payment inside policy range succeeded");
console.log("✓ Fee routing balance accounting succeeded");
console.log("✓ Protocol fee reached treasury");
console.log("✓ Application fee accounting succeeded");
console.log(`✓ Ecosystem: ${phase.fullName} — ${phase.ticker}`);
console.log(`✓ Application: ${application.toBase58()}`);
console.log(`✓ Application Asset: ${applicationAsset.toBase58()}`);
console.log(`✓ Membership: ${membership.toBase58()}`);
console.log(`✓ Reward: ${reward.toBase58()}`);
console.log(`✓ Audit Log: ${auditLog.toBase58()}`);
