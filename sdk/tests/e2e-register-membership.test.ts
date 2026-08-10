import fs from "node:fs";
import {
    execFileSync,
} from "node:child_process";

import {
    Connection,
    Keypair,
    PublicKey,
    sendAndConfirmTransaction,
    Transaction,
    TransactionInstruction,
} from "@solana/web3.js";

import {
    CanonicalEcosystem,
    buildRegisterApplicationInstruction,
    buildRegisterMembershipInstruction,
    buildRenewMembershipInstruction,
    buildUpdateMembershipInstruction,
    buildVerifyNftMembershipInstruction,
    findApplicationPda,
    findMembershipPda,
} from "../src/index.js";

const RPC_URL = "http://127.0.0.1:8899";

const PROGRAM_ID = new PublicKey(
    "BSZkHJyqBW19HQ2tTgooKxPc5FEehgm5uxL44Ggxjucp",
);

/*
 * Phase 4 owns its application fixture.
 *
 * A fresh application ID prevents coupling this E2E to
 * Golden Path state or another test's lifecycle.
 */
const APPLICATION_ID =
    BigInt(Date.now()) * 1_000n +
    BigInt(process.pid % 1_000);

function loadKeypair(path: string): Keypair {
    return Keypair.fromSecretKey(
        Uint8Array.from(
            JSON.parse(
                fs.readFileSync(path, "utf8"),
            ),
        ),
    );
}

function writeKeypair(
    path: string,
    keypair: Keypair,
): void {
    fs.writeFileSync(
        path,
        JSON.stringify(
            Array.from(keypair.secretKey),
        ),
    );
}

function run(
    command: string,
    args: string[],
): string {
    try {
        return execFileSync(
            command,
            args,
            {
                encoding: "utf8",
                stdio: [
                    "ignore",
                    "pipe",
                    "pipe",
                ],
            },
        ).trim();
    } catch (error: unknown) {
        const stderr =
            typeof error === "object" &&
            error !== null &&
            "stderr" in error
                ? String(
                    (
                        error as {
                            stderr?: unknown;
                        }
                    ).stderr ?? "",
                )
                : "";

        const stdout =
            typeof error === "object" &&
            error !== null &&
            "stdout" in error
                ? String(
                    (
                        error as {
                            stdout?: unknown;
                        }
                    ).stdout ?? "",
                )
                : "";

        throw new Error(
            `${command} ${args.join(" ")} failed\n${stdout}\n${stderr}`,
        );
    }
}

async function send(
    connection: Connection,
    instruction: TransactionInstruction,
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

async function expectInstructionFailure(
    connection: Connection,
    instruction: TransactionInstruction,
    signers: Keypair[],
    expectedAnchorError: string,
): Promise<void> {
    try {
        await send(
            connection,
            instruction,
            signers,
        );
    } catch (error: unknown) {
        const logs =
            typeof error === "object" &&
            error !== null &&
            "logs" in error &&
            Array.isArray(
                (
                    error as {
                        logs?: unknown[];
                    }
                ).logs,
            )
                ? (
                    error as {
                        logs: unknown[];
                    }
                ).logs
                    .map(String)
                    .join("\n")
                : "";

        const message =
            error instanceof Error
                ? error.message
                : String(error);

        const complete =
            `${message}\n${logs}`;

        if (
            !complete.includes(
                expectedAnchorError,
            )
        ) {
            throw new Error(
                `Expected ${expectedAnchorError}, received:\n${complete}`,
            );
        }

        return;
    }

    throw new Error(
        `Expected ${expectedAnchorError}, but instruction succeeded.`,
    );
}

function parseCreatedAddress(
    output: string,
    kind: "token" | "account",
): PublicKey {
    const pattern =
        kind === "token"
            ? /Creating token\s+([1-9A-HJ-NP-Za-km-z]+)/
            : /Creating account\s+([1-9A-HJ-NP-Za-km-z]+)/;

    const match =
        output.match(pattern);

    if (!match) {
        throw new Error(
            `Could not parse created ${kind} address:\n${output}`,
        );
    }

    return new PublicKey(match[1]);
}

const authority =
    loadKeypair(
        `${process.env.HOME}/.config/solana/id.json`,
    );

const connection =
    new Connection(
        RPC_URL,
        "confirmed",
    );

const [application] =
    findApplicationPda(
        PROGRAM_ID,
        authority.publicKey,
        APPLICATION_ID,
    );

const applicationBefore =
    await connection.getAccountInfo(
        application,
    );

if (applicationBefore !== null) {
    throw new Error(
        `Unexpected Phase 4 Application collision at ${application.toBase58()}.`,
    );
}

await send(
    connection,
    buildRegisterApplicationInstruction({
        programId: PROGRAM_ID,
        authority:
            authority.publicKey,
        applicationId:
            APPLICATION_ID,
        name:
            "Phase 4 Membership E2E",
        selectedEcosystem:
            CanonicalEcosystem.BabyReptile,
    }),
    [authority],
);

const applicationInfo =
    await connection.getAccountInfo(
        application,
    );

if (applicationInfo === null) {
    throw new Error(
        "Phase 4 Application registration succeeded but account was not created.",
    );
}

if (
    !applicationInfo.owner.equals(
        PROGRAM_ID,
    )
) {
    throw new Error(
        "Phase 4 Application is not owned by Babycowans.",
    );
}

console.log(
    "===== PHASE 4 MEMBERSHIP E2E =====",
);

console.log(
    "✓ Dedicated Phase 4 Application registered",
);
console.log(
    `Program: ${PROGRAM_ID.toBase58()}`,
);
console.log(
    `Application: ${application.toBase58()}`,
);

const now =
    BigInt(
        Math.floor(
            Date.now() / 1000,
        ),
    );

/* =========================================================
 * 1. STANDARD + RENEWABLE + AUTO EXTEND + MULTI-TIER
 * ========================================================= */

const standardMember =
    Keypair.generate();

const [
    standardMembership,
] = findMembershipPda(
    PROGRAM_ID,
    application,
    standardMember.publicKey,
);

await send(
    connection,
    buildRegisterMembershipInstruction({
        programId: PROGRAM_ID,
        application,
        membership:
            standardMembership,
        authority:
            authority.publicKey,
        member:
            standardMember.publicKey,
        tier: 1,
        expiresAt:
            now + 3_600n,
        renewable: true,
        autoExtend: true,
        renewalDuration:
            3_600n,
        membershipKind: 0,
        nftMint:
            PublicKey.default,
    }),
    [authority],
);

console.log(
    "✓ Standard Membership registered",
);

await send(
    connection,
    buildUpdateMembershipInstruction({
        programId: PROGRAM_ID,
        application,
        membership:
            standardMembership,
        authority:
            authority.publicKey,
        tier: 3,
        status: 0,
        expiresAt:
            now + 7_200n,
        renewable: true,
        autoExtend: true,
        renewalDuration:
            3_600n,
    }),
    [authority],
);

console.log(
    "✓ Multi-tier upgrade succeeded",
);
console.log(
    "✓ Dynamic Expiration update succeeded",
);

await send(
    connection,
    buildRenewMembershipInstruction({
        programId: PROGRAM_ID,
        application,
        membership:
            standardMembership,
        authority:
            authority.publicKey,
        requestedExpiresAt:
            now + 10_800n,
    }),
    [authority],
);

console.log(
    "✓ Manual Renewal succeeded",
);

await send(
    connection,
    buildRenewMembershipInstruction({
        programId: PROGRAM_ID,
        application,
        membership:
            standardMembership,
        authority:
            authority.publicKey,
        requestedExpiresAt: 0n,
    }),
    [authority],
);

console.log(
    "✓ Auto Extend succeeded",
);

/* =========================================================
 * 2. NON-RENEWABLE REJECTION
 * ========================================================= */

const nonRenewableMember =
    Keypair.generate();

const [
    nonRenewableMembership,
] = findMembershipPda(
    PROGRAM_ID,
    application,
    nonRenewableMember.publicKey,
);

await send(
    connection,
    buildRegisterMembershipInstruction({
        programId: PROGRAM_ID,
        application,
        membership:
            nonRenewableMembership,
        authority:
            authority.publicKey,
        member:
            nonRenewableMember.publicKey,
        tier: 1,
        expiresAt:
            now + 3_600n,
        renewable: false,
        autoExtend: false,
        renewalDuration: 0n,
        membershipKind: 0,
        nftMint:
            PublicKey.default,
    }),
    [authority],
);

await expectInstructionFailure(
    connection,
    buildRenewMembershipInstruction({
        programId: PROGRAM_ID,
        application,
        membership:
            nonRenewableMembership,
        authority:
            authority.publicKey,
        requestedExpiresAt:
            now + 7_200n,
    }),
    [authority],
    "MembershipNotRenewable",
);

console.log(
    "✓ Non-renewable rejection succeeded",
);

/* =========================================================
 * 3. AUTO EXTEND DISABLED REJECTION
 * ========================================================= */

const manualOnlyMember =
    Keypair.generate();

const [
    manualOnlyMembership,
] = findMembershipPda(
    PROGRAM_ID,
    application,
    manualOnlyMember.publicKey,
);

await send(
    connection,
    buildRegisterMembershipInstruction({
        programId: PROGRAM_ID,
        application,
        membership:
            manualOnlyMembership,
        authority:
            authority.publicKey,
        member:
            manualOnlyMember.publicKey,
        tier: 2,
        expiresAt:
            now + 3_600n,
        renewable: true,
        autoExtend: false,
        renewalDuration:
            3_600n,
        membershipKind: 0,
        nftMint:
            PublicKey.default,
    }),
    [authority],
);

await expectInstructionFailure(
    connection,
    buildRenewMembershipInstruction({
        programId: PROGRAM_ID,
        application,
        membership:
            manualOnlyMembership,
        authority:
            authority.publicKey,
        requestedExpiresAt: 0n,
    }),
    [authority],
    "MembershipAutoExtendDisabled",
);

console.log(
    "✓ Auto Extend disabled rejection succeeded",
);

/* =========================================================
 * 4. SUSPENDED REJECTION
 * ========================================================= */

await send(
    connection,
    buildUpdateMembershipInstruction({
        programId: PROGRAM_ID,
        application,
        membership:
            standardMembership,
        authority:
            authority.publicKey,
        tier: 3,
        status: 2,
        expiresAt:
            now + 10_800n,
        renewable: true,
        autoExtend: true,
        renewalDuration:
            3_600n,
    }),
    [authority],
);

await expectInstructionFailure(
    connection,
    buildRenewMembershipInstruction({
        programId: PROGRAM_ID,
        application,
        membership:
            standardMembership,
        authority:
            authority.publicKey,
        requestedExpiresAt:
            now + 14_400n,
    }),
    [authority],
    "MembershipSuspended",
);

console.log(
    "✓ Suspended Membership rejection succeeded",
);

/* =========================================================
 * 5. REAL NFT FIXTURE
 * ========================================================= */

const nftMember =
    Keypair.generate();

const nftMemberFile =
    "/tmp/babycowans-phase4-nft-member.json";

writeKeypair(
    nftMemberFile,
    nftMember,
);

run(
    "solana",
    [
        "airdrop",
        "2",
        nftMember.publicKey.toBase58(),
        "--url",
        RPC_URL,
    ],
);

const nftMintOutput =
    run(
        "spl-token",
        [
            "create-token",
            "--decimals",
            "0",
            "--url",
            RPC_URL,
        ],
    );

const nftMint =
    parseCreatedAddress(
        nftMintOutput,
        "token",
    );

const nftTokenOutput =
    run(
        "spl-token",
        [
            "create-account",
            nftMint.toBase58(),
            "--owner",
            nftMemberFile,
            "--fee-payer",
            `${process.env.HOME}/.config/solana/id.json`,
            "--url",
            RPC_URL,
        ],
    );

const nftTokenAccount =
    parseCreatedAddress(
        nftTokenOutput,
        "account",
    );

run(
    "spl-token",
    [
        "mint",
        nftMint.toBase58(),
        "1",
        nftTokenAccount.toBase58(),
        "--url",
        RPC_URL,
    ],
);

console.log(
    "✓ Real NFT fixture created",
);

/* =========================================================
 * 6. NFT MEMBERSHIP BINDING
 * ========================================================= */

const [
    nftMembership,
] = findMembershipPda(
    PROGRAM_ID,
    application,
    nftMember.publicKey,
);

await send(
    connection,
    buildRegisterMembershipInstruction({
        programId: PROGRAM_ID,
        application,
        membership:
            nftMembership,
        authority:
            authority.publicKey,
        member:
            nftMember.publicKey,
        tier: 5,
        expiresAt:
            now + 86_400n,
        renewable: true,
        autoExtend: false,
        renewalDuration:
            86_400n,
        membershipKind: 1,
        nftMint,
    }),
    [authority],
);

console.log(
    "✓ NFT Membership registered",
);
console.log(
    "✓ NFT mint binding succeeded",
);

/* =========================================================
 * 7. WRONG MEMBER REJECTION
 * ========================================================= */

await expectInstructionFailure(
    connection,
    buildVerifyNftMembershipInstruction({
        programId: PROGRAM_ID,
        application,
        membership:
            nftMembership,
        member:
            authority.publicKey,
        nftTokenAccount,
    }),
    [authority],
    "InvalidAuthority",
);

console.log(
    "✓ Wrong NFT member rejected",
);

/* =========================================================
 * 8. WRONG MINT REJECTION
 * ========================================================= */

const wrongMintOutput =
    run(
        "spl-token",
        [
            "create-token",
            "--decimals",
            "0",
            "--url",
            RPC_URL,
        ],
    );

const wrongMint =
    parseCreatedAddress(
        wrongMintOutput,
        "token",
    );

const wrongTokenOutput =
    run(
        "spl-token",
        [
            "create-account",
            wrongMint.toBase58(),
            "--owner",
            nftMemberFile,
            "--fee-payer",
            `${process.env.HOME}/.config/solana/id.json`,
            "--url",
            RPC_URL,
        ],
    );

const wrongTokenAccount =
    parseCreatedAddress(
        wrongTokenOutput,
        "account",
    );

run(
    "spl-token",
    [
        "mint",
        wrongMint.toBase58(),
        "1",
        wrongTokenAccount.toBase58(),
        "--url",
        RPC_URL,
    ],
);

await expectInstructionFailure(
    connection,
    buildVerifyNftMembershipInstruction({
        programId: PROGRAM_ID,
        application,
        membership:
            nftMembership,
        member:
            nftMember.publicKey,
        nftTokenAccount:
            wrongTokenAccount,
    }),
    [nftMember],
    "InvalidNftMint",
);

console.log(
    "✓ Wrong NFT mint rejected",
);

/* =========================================================
 * 9. VALID NFT OWNERSHIP
 * ========================================================= */

await send(
    connection,
    buildVerifyNftMembershipInstruction({
        programId: PROGRAM_ID,
        application,
        membership:
            nftMembership,
        member:
            nftMember.publicKey,
        nftTokenAccount,
    }),
    [nftMember],
);

console.log(
    "✓ NFT ownership verification succeeded",
);

/* =========================================================
 * 10. FINAL
 * ========================================================= */

console.log("");
console.log("✓ Standard Membership");
console.log("✓ Renewable");
console.log("✓ Auto Extend");
console.log("✓ Multi-tier");
console.log("✓ Dynamic Expiration");
console.log("✓ Manual Renewal");
console.log("✓ Non-renewable rejection");
console.log("✓ Auto Extend disabled rejection");
console.log("✓ Suspended Membership rejection");
console.log("✓ NFT Membership");
console.log("✓ NFT mint binding");
console.log("✓ Wrong NFT member rejection");
console.log("✓ Wrong NFT mint rejection");
console.log("✓ NFT ownership verification");

console.log("");
console.log(
    "PHASE4_MEMBERSHIP_E2E_PASS",
);
