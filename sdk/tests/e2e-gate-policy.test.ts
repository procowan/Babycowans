import fs from "node:fs";
import { execFileSync } from "node:child_process";

import {
    Connection,
    Keypair,
    PublicKey,
    sendAndConfirmTransaction,
    Transaction,
    TransactionInstruction,
} from "@solana/web3.js";

import {
    buildConfigureGatePolicyInstruction,
    buildRegisterMembershipInstruction,
    buildUpdateMembershipInstruction,
    buildVerifyGatePolicyInstruction,
} from "../src/instructions/index.js";

import {
    findGatePolicyPda,
    findMembershipPda,
} from "../src/pda/index.js";


import {
    CanonicalEcosystem,
    getCanonicalEcosystem,
} from "../src/ecosystems/index.js";

const RPC_URL = "http://127.0.0.1:8899";

const PROGRAM_ID = new PublicKey(
    "BSZkHJyqBW19HQ2tTgooKxPc5FEehgm5uxL44Ggxjucp",
);

const BRC_MINT =
    getCanonicalEcosystem(
        CanonicalEcosystem.BabyReptile,
    ).tokenAddress;

function resolveGatePolicyBaseline(): {
    application: PublicKey;
    applicationAsset: PublicKey;
} {
    const applicationValue =
        process.env.BABYCOWANS_TEST_APPLICATION;

    const applicationAssetValue =
        process.env.BABYCOWANS_TEST_APPLICATION_ASSET;

    if (
        applicationValue &&
        applicationAssetValue
    ) {
        return {
            application:
                new PublicKey(
                    applicationValue,
                ),

            applicationAsset:
                new PublicKey(
                    applicationAssetValue,
                ),
        };
    }

    const output =
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

    const applicationMatch =
        output.match(
            /(?:^|\n).*?Application PDA:\s*([1-9A-HJ-NP-Za-km-z]{32,44})/u,
        );

    const applicationAssetMatch =
        output.match(
            /(?:^|\n).*?ApplicationAsset PDA:\s*([1-9A-HJ-NP-Za-km-z]{32,44})/u,
        );

    if (
        !applicationMatch ||
        !applicationAssetMatch
    ) {
        throw new Error(
            `GATE_POLICY_BASELINE_RESOLUTION_FAILED\n${output}`,
        );
    }

    console.log(
        "GATE_POLICY_BASELINE_SELF_BOOTSTRAPPED=1",
    );

    return {
        application:
            new PublicKey(
                applicationMatch[1],
            ),

        applicationAsset:
            new PublicKey(
                applicationAssetMatch[1],
            ),
    };
}

const {
    application,
    applicationAsset,
} = resolveGatePolicyBaseline();

function expect(
    condition: boolean,
    message: string,
): asserts condition {
    if (!condition) {
        throw new Error(message);
    }
}

function loadKeypair(path: string): Keypair {
    return Keypair.fromSecretKey(
        Uint8Array.from(
            JSON.parse(
                fs.readFileSync(path, "utf8"),
            ),
        ),
    );
}

const authority = loadKeypair(
    `${process.env.HOME}/.config/solana/id.json`,
);

const connection = new Connection(
    RPC_URL,
    "confirmed",
);

const wallet = Keypair.generate();

const walletPath =
    "/tmp/babycowans-phase5-gate-wallet.json";

fs.writeFileSync(
    walletPath,
    JSON.stringify(
        Array.from(wallet.secretKey),
    ),
);

function runCli(
    command: string,
    args: string[],
): string {
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
}

function tokenAccountAddress(
    mint: PublicKey,
    ownerPath: string,
): PublicKey {
    /*
     * spl-token-cli 5.5.0 requires --verbose when
     * --token and --owner are supplied to `address`.
     */
    const output = runCli(
        "spl-token",
        [
            "address",
            "--verbose",
            "--token",
            mint.toBase58(),
            "--owner",
            ownerPath,
            "--url",
            RPC_URL,
            "--output",
            "json",
        ],
    );

    try {
        const value = JSON.parse(output);

        const candidates = [
            value?.commandOutput?.address,
            value?.commandOutput?.associatedTokenAddress,
            value?.address,
            value?.associatedTokenAddress,
        ];

        for (const candidate of candidates) {
            if (
                typeof candidate === "string"
                && candidate.length > 0
            ) {
                return new PublicKey(candidate);
            }
        }

        const serialized =
            JSON.stringify(value);

        const matches =
            serialized.match(
                /[1-9A-HJ-NP-Za-km-z]{32,44}/g,
            ) ?? [];

        const candidate =
            matches.find(
                (entry) =>
                    entry !== mint.toBase58(),
            );

        if (candidate) {
            return new PublicKey(candidate);
        }
    } catch {
        // Fall through to textual extraction.
    }

    const matches =
        output.match(
            /[1-9A-HJ-NP-Za-km-z]{32,44}/g,
        ) ?? [];

    const candidate =
        matches.find(
            (entry) =>
                entry !== mint.toBase58(),
        );

    if (!candidate) {
        throw new Error(
            `Unable to discover token account for ${mint.toBase58()}: ${output}`,
        );
    }

    return new PublicKey(candidate);
}

async function fund(
    pubkey: PublicKey,
): Promise<void> {
    const signature =
        await connection.requestAirdrop(
            pubkey,
            2_000_000_000,
        );

    await connection.confirmTransaction(
        signature,
        "confirmed",
    );
}

async function send(
    instructions: TransactionInstruction[],
    signers: Keypair[],
): Promise<string> {
    return sendAndConfirmTransaction(
        connection,
        new Transaction().add(
            ...instructions,
        ),
        signers,
        {
            commitment: "confirmed",
        },
    );
}

async function expectRejected(
    label: string,
    operation: () => Promise<unknown>,
): Promise<void> {
    let rejected = false;

    try {
        await operation();
    } catch {
        rejected = true;
    }

    expect(
        rejected,
        `${label} should have been rejected`,
    );

    console.log(`✓ ${label} rejected`);
}

console.log(
    "===== PHASE 5 REAL GATE POLICY E2E =====",
);

await fund(wallet.publicKey);

const applicationInfo =
    await connection.getAccountInfo(
        application,
    );

const applicationAssetInfo =
    await connection.getAccountInfo(
        applicationAsset,
    );

expect(
    applicationInfo !== null,
    "Golden Application is missing",
);

expect(
    applicationAssetInfo !== null,
    "Golden ApplicationAsset is missing",
);

console.log(
    "✓ BRC application baseline detected",
);

/*
 * ----------------------------------------------------------
 * Membership evidence — Tier 3
 * ----------------------------------------------------------
 */

const [membership] =
    findMembershipPda(
        PROGRAM_ID,
        application,
        wallet.publicKey,
    );

await send(
    [
        buildRegisterMembershipInstruction({
            programId: PROGRAM_ID,
            application,
            membership,
            authority: authority.publicKey,
            member: wallet.publicKey,
            tier: 3,
            expiresAt: BigInt(
                Math.floor(Date.now() / 1000)
                + 3600,
            ),
        }),
    ],
    [authority],
);

console.log(
    "✓ Tier 3 membership created",
);

/*
 * ----------------------------------------------------------
 * Canonical BRC evidence.
 *
 * The six-canonical validator deliberately makes canonical
 * fixtures locally mintable by the configured authority.
 * ----------------------------------------------------------
 */

try {
    runCli(
        "spl-token",
        [
            "create-account",
            BRC_MINT.toBase58(),
            "--owner",
            walletPath,
            "--url",
            RPC_URL,
        ],
    );
} catch {
    /*
     * Idempotent reruns may find the ATA already created by
     * an earlier failed E2E attempt. Discovery below is the
     * authoritative check.
     */
}

const brcTokenAccount =
    tokenAccountAddress(
        BRC_MINT,
        walletPath,
    );

runCli(
    "spl-token",
    [
        "mint",
        BRC_MINT.toBase58(),
        "10",
        brcTokenAccount.toBase58(),
        "--url",
        RPC_URL,
    ],
);

console.log(
    "✓ Canonical BRC ownership fixture funded",
);

/*
 * ----------------------------------------------------------
 * NFT ownership evidence.
 *
 * This creates a 0-decimal mint, exactly one token, owned by
 * the test wallet. The GatePolicy verifies ownership of the
 * configured mint through the token account.
 * ----------------------------------------------------------
 */

const nftMintKeypair =
    Keypair.generate();

const nftMintPath =
    "/tmp/babycowans-phase5-nft-mint.json";

fs.writeFileSync(
    nftMintPath,
    JSON.stringify(
        Array.from(
            nftMintKeypair.secretKey,
        ),
    ),
);

runCli(
    "spl-token",
    [
        "create-token",
        nftMintPath,
        "--decimals",
        "0",
        "--mint-authority",
        authority.publicKey.toBase58(),
        "--url",
        RPC_URL,
    ],
);

const nftMint =
    nftMintKeypair.publicKey;

runCli(
    "spl-token",
    [
        "create-account",
        nftMint.toBase58(),
        "--owner",
        walletPath,
        "--url",
        RPC_URL,
    ],
);

const nftTokenAccount =
    tokenAccountAddress(
        nftMint,
        walletPath,
    );

runCli(
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
    "✓ NFT ownership fixture created",
);

/*
 * ----------------------------------------------------------
 * Policy:
 *
 * Group 0:
 *   Hold BRC AND Membership Tier >= 3
 *
 * OR
 *
 * Group 1:
 *   Hold NFT
 * ----------------------------------------------------------
 */

const [gatePolicy] =
    findGatePolicyPda(
        PROGRAM_ID,
        applicationAsset,
    );

await send(
    [
        buildConfigureGatePolicyInstruction({
            programId: PROGRAM_ID,
            application,
            applicationAsset,
            gatePolicy,
            authority: authority.publicKey,
            enabled: true,
            conditions: [
                {
                    group: 0,
                    conditionType: 0,
                    mint: BRC_MINT,
                    minimumAmount:
                        1_000_000n,
                    minimumTier: 0,
                },
                {
                    group: 0,
                    conditionType: 1,
                    mint: PublicKey.default,
                    minimumAmount: 0n,
                    minimumTier: 3,
                },
                {
                    group: 1,
                    conditionType: 2,
                    mint: nftMint,
                    minimumAmount: 0n,
                    minimumTier: 0,
                },
            ],
        }),
    ],
    [authority],
);

console.log(
    "✓ OR-of-AND Gate Policy configured",
);

/*
 * ----------------------------------------------------------
 * X8.7 security regressions:
 * malformed GatePolicy condition structures must fail closed
 * in the on-chain configure handler.
 * ----------------------------------------------------------
 */

await expectRejected(
    "Zero HoldAmount threshold",
    () =>
        send(
            [
                buildConfigureGatePolicyInstruction({
                    programId: PROGRAM_ID,
                    application,
                    applicationAsset,
                    gatePolicy,
                    authority: authority.publicKey,
                    enabled: true,
                    conditions: [
                        {
                            group: 0,
                            conditionType: 0,
                            mint: BRC_MINT,
                            minimumAmount: 0n,
                            minimumTier: 0,
                        },
                    ],
                }),
            ],
            [authority],
        ),
);

await expectRejected(
    "Wrong HoldAmount mint",
    () =>
        send(
            [
                buildConfigureGatePolicyInstruction({
                    programId: PROGRAM_ID,
                    application,
                    applicationAsset,
                    gatePolicy,
                    authority: authority.publicKey,
                    enabled: true,
                    conditions: [
                        {
                            group: 0,
                            conditionType: 0,
                            mint: nftMint,
                            minimumAmount: 1n,
                            minimumTier: 0,
                        },
                    ],
                }),
            ],
            [authority],
        ),
);

await expectRejected(
    "Zero MembershipTier threshold",
    () =>
        send(
            [
                buildConfigureGatePolicyInstruction({
                    programId: PROGRAM_ID,
                    application,
                    applicationAsset,
                    gatePolicy,
                    authority: authority.publicKey,
                    enabled: true,
                    conditions: [
                        {
                            group: 0,
                            conditionType: 1,
                            mint: PublicKey.default,
                            minimumAmount: 0n,
                            minimumTier: 0,
                        },
                    ],
                }),
            ],
            [authority],
        ),
);

await expectRejected(
    "Non-default MembershipTier mint",
    () =>
        send(
            [
                buildConfigureGatePolicyInstruction({
                    programId: PROGRAM_ID,
                    application,
                    applicationAsset,
                    gatePolicy,
                    authority: authority.publicKey,
                    enabled: true,
                    conditions: [
                        {
                            group: 0,
                            conditionType: 1,
                            mint: BRC_MINT,
                            minimumAmount: 0n,
                            minimumTier: 1,
                        },
                    ],
                }),
            ],
            [authority],
        ),
);

await expectRejected(
    "Duplicate condition kind in group",
    () =>
        send(
            [
                buildConfigureGatePolicyInstruction({
                    programId: PROGRAM_ID,
                    application,
                    applicationAsset,
                    gatePolicy,
                    authority: authority.publicKey,
                    enabled: true,
                    conditions: [
                        {
                            group: 0,
                            conditionType: 1,
                            mint: PublicKey.default,
                            minimumAmount: 0n,
                            minimumTier: 1,
                        },
                        {
                            group: 0,
                            conditionType: 1,
                            mint: PublicKey.default,
                            minimumAmount: 0n,
                            minimumTier: 2,
                        },
                    ],
                }),
            ],
            [authority],
        ),
);

await expectRejected(
    "Non-contiguous GatePolicy groups",
    () =>
        send(
            [
                buildConfigureGatePolicyInstruction({
                    programId: PROGRAM_ID,
                    application,
                    applicationAsset,
                    gatePolicy,
                    authority: authority.publicKey,
                    enabled: true,
                    conditions: [
                        {
                            group: 0,
                            conditionType: 1,
                            mint: PublicKey.default,
                            minimumAmount: 0n,
                            minimumTier: 1,
                        },
                        {
                            group: 2,
                            conditionType: 2,
                            mint: nftMint,
                            minimumAmount: 0n,
                            minimumTier: 0,
                        },
                    ],
                }),
            ],
            [authority],
        ),
);

console.log("X8_7_STRUCTURAL_REJECTIONS=PASS");
/*
 * ----------------------------------------------------------
 * X8.7 — independent fixture for HoldAmount equality and
 * cross-application substitution.
 *
 * Reuse the existing repository bootstrap to create a second
 * real Application/ApplicationAsset pair. Its GatePolicy PDA
 * is independent from the primary GatePolicy, so no existing
 * account is re-initialized.
 * ----------------------------------------------------------
 */

const {
    application: x8ForeignApplication,
    applicationAsset: x8ForeignApplicationAsset,
} = resolveGatePolicyBaseline();

expect(
    !x8ForeignApplication.equals(application),
    "X8.7 foreign Application must differ from primary",
);

expect(
    !x8ForeignApplicationAsset.equals(applicationAsset),
    "X8.7 foreign ApplicationAsset must differ from primary",
);

const [x8ForeignGatePolicy] =
    findGatePolicyPda(
        PROGRAM_ID,
        x8ForeignApplicationAsset,
    );

const brcRawBalance =
    await connection.getTokenAccountBalance(
        brcTokenAccount,
        "confirmed",
    );

const holdEqualityAmount =
    BigInt(brcRawBalance.value.amount);

expect(
    holdEqualityAmount > 0n,
    "X8.7 HoldAmount equality fixture must be non-zero",
);

await send(
    [
        buildConfigureGatePolicyInstruction({
            programId: PROGRAM_ID,
            application: x8ForeignApplication,
            applicationAsset:
                x8ForeignApplicationAsset,
            gatePolicy:
                x8ForeignGatePolicy,
            authority: authority.publicKey,
            enabled: true,
            conditions: [
                {
                    group: 0,
                    conditionType: 0,
                    mint: BRC_MINT,
                    minimumAmount:
                        holdEqualityAmount,
                    minimumTier: 0,
                },
            ],
        }),
    ],
    [authority],
);

expect(
    await connection.getAccountInfo(
        x8ForeignGatePolicy,
    ) !== null,
    "X8.7 foreign GatePolicy fixture missing",
);

await send(
    [
        buildVerifyGatePolicyInstruction({
            programId: PROGRAM_ID,
            application: x8ForeignApplication,
            applicationAsset:
                x8ForeignApplicationAsset,
            gatePolicy:
                x8ForeignGatePolicy,
            wallet: wallet.publicKey,
            holdTokenAccount:
                brcTokenAccount,
        }),
    ],
    [wallet],
);

console.log(
    "X8_7_HOLD_EQUALITY_BOUNDARY=PASS",
);

/*
 * Hybridize the foreign Application with the primary
 * ApplicationAsset/GatePolicy. The ApplicationAsset parent
 * binding must reject the cross-application substitution.
 */
await expectRejected(
    "Cross-application GatePolicy substitution",
    () =>
        send(
            [
                buildVerifyGatePolicyInstruction({
                    programId: PROGRAM_ID,
                    application:
                        x8ForeignApplication,
                    applicationAsset,
                    gatePolicy,
                    wallet: wallet.publicKey,
                    holdTokenAccount:
                        brcTokenAccount,
                    membership,
                }),
            ],
            [wallet],
        ),
);

console.log(
    "X8_7_CROSS_APPLICATION_GATE_POLICY_REJECTED=PASS",
);




expect(
    await connection.getAccountInfo(
        gatePolicy,
    ) !== null,
    "GatePolicy account missing",
);

console.log(
    "✓ Gate Policy account exists",
);

/*
 * ----------------------------------------------------------
 * Negative matrix
 * ----------------------------------------------------------
 */

await expectRejected(
    "Empty evidence",
    () =>
        send(
            [
                buildVerifyGatePolicyInstruction({
                    programId: PROGRAM_ID,
                    application,
                    applicationAsset,
                    gatePolicy,
                    wallet: wallet.publicKey,
                }),
            ],
            [wallet],
        ),
);

/*
 * ----------------------------------------------------------
 * Security regression:
 * foreign-program account supplied as token evidence.
 *
 * `wallet.publicKey` is a funded system-owned account, not
 * an SPL Token / Token-2022 account. Anchor must reject it
 * while deserializing InterfaceAccount<TokenAccount>, before
 * GatePolicy condition evaluation can trust its contents.
 * ----------------------------------------------------------
 */
await expectRejected(
    "Foreign-program hold token evidence",
    () =>
        send(
            [
                buildVerifyGatePolicyInstruction({
                    programId: PROGRAM_ID,
                    application,
                    applicationAsset,
                    gatePolicy,
                    wallet: wallet.publicKey,
                    holdTokenAccount:
                        wallet.publicKey,
                    membership,
                }),
            ],
            [wallet],
        ),
);

console.log(
    "X8_6_FOREIGN_TOKEN_EVIDENCE_REJECTED=PASS",
);

await expectRejected(
    "Membership-only evidence",
    () =>
        send(
            [
                buildVerifyGatePolicyInstruction({
                    programId: PROGRAM_ID,
                    application,
                    applicationAsset,
                    gatePolicy,
                    wallet: wallet.publicKey,
                    membership,
                }),
            ],
            [wallet],
        ),
);

await expectRejected(
    "Hold-only evidence",
    () =>
        send(
            [
                buildVerifyGatePolicyInstruction({
                    programId: PROGRAM_ID,
                    application,
                    applicationAsset,
                    gatePolicy,
                    wallet: wallet.publicKey,
                    holdTokenAccount:
                        brcTokenAccount,
                }),
            ],
            [wallet],
        ),
);


/*
 * ----------------------------------------------------------
 * XRAY X8.8 — MembershipTier runtime security matrix.
 * ----------------------------------------------------------
 */

const x8WrongMember = Keypair.generate();

await expectRejected(
    "Wrong-member Membership evidence",
    () =>
        send(
            [
                buildVerifyGatePolicyInstruction({
                    programId: PROGRAM_ID,
                    application,
                    applicationAsset,
                    gatePolicy,
                    wallet: x8WrongMember.publicKey,
                    membership,
                }),
            ],
            [x8WrongMember],
        ),
);

console.log("X8_8_WRONG_MEMBER_REJECTED=PASS");

await expectRejected(
    "Cross-application Membership evidence",
    () =>
        send(
            [
                buildVerifyGatePolicyInstruction({
                    programId: PROGRAM_ID,
                    application: x8ForeignApplication,
                    applicationAsset: x8ForeignApplicationAsset,
                    gatePolicy: x8ForeignGatePolicy,
                    wallet: wallet.publicKey,
                    membership,
                }),
            ],
            [wallet],
        ),
);

console.log("X8_8_WRONG_APPLICATION_MEMBERSHIP_REJECTED=PASS");

await send(
    [
        buildUpdateMembershipInstruction({
            programId: PROGRAM_ID,
            application,
            membership,
            authority: authority.publicKey,
            tier: 2,
            status: 0,
            expiresAt: BigInt(Math.floor(Date.now() / 1000) + 3600),
            renewable: false,
            autoExtend: false,
            renewalDuration: 0n,
        }),
    ],
    [authority],
);

await expectRejected(
    "Insufficient Membership tier",
    () =>
        send(
            [
                buildVerifyGatePolicyInstruction({
                    programId: PROGRAM_ID,
                    application,
                    applicationAsset,
                    gatePolicy,
                    wallet: wallet.publicKey,
                    holdTokenAccount: brcTokenAccount,
                    membership,
                }),
            ],
            [wallet],
        ),
);

console.log("X8_8_INSUFFICIENT_TIER_REJECTED=PASS");

await send(
    [
        buildUpdateMembershipInstruction({
            programId: PROGRAM_ID,
            application,
            membership,
            authority: authority.publicKey,
            tier: 3,
            status: 0,
            expiresAt: BigInt(Math.floor(Date.now() / 1000) + 3600),
            renewable: false,
            autoExtend: false,
            renewalDuration: 0n,
        }),
    ],
    [authority],
);

await send(
    [
        buildVerifyGatePolicyInstruction({
            programId: PROGRAM_ID,
            application,
            applicationAsset,
            gatePolicy,
            wallet: wallet.publicKey,
            holdTokenAccount: brcTokenAccount,
            membership,
        }),
    ],
    [wallet],
);

console.log("X8_8_EXACT_TIER_ACCEPTED=PASS");

await send(
    [
        buildUpdateMembershipInstruction({
            programId: PROGRAM_ID,
            application,
            membership,
            authority: authority.publicKey,
            tier: 4,
            status: 0,
            expiresAt: BigInt(Math.floor(Date.now() / 1000) + 3600),
            renewable: false,
            autoExtend: false,
            renewalDuration: 0n,
        }),
    ],
    [authority],
);

await send(
    [
        buildVerifyGatePolicyInstruction({
            programId: PROGRAM_ID,
            application,
            applicationAsset,
            gatePolicy,
            wallet: wallet.publicKey,
            holdTokenAccount: brcTokenAccount,
            membership,
        }),
    ],
    [wallet],
);

console.log("X8_8_HIGHER_TIER_ACCEPTED=PASS");

await send(
    [
        buildUpdateMembershipInstruction({
            programId: PROGRAM_ID,
            application,
            membership,
            authority: authority.publicKey,
            tier: 3,
            status: 2,
            expiresAt: BigInt(Math.floor(Date.now() / 1000) + 3600),
            renewable: false,
            autoExtend: false,
            renewalDuration: 0n,
        }),
    ],
    [authority],
);

await expectRejected(
    "Suspended Membership evidence",
    () =>
        send(
            [
                buildVerifyGatePolicyInstruction({
                    programId: PROGRAM_ID,
                    application,
                    applicationAsset,
                    gatePolicy,
                    wallet: wallet.publicKey,
                    holdTokenAccount: brcTokenAccount,
                    membership,
                }),
            ],
            [wallet],
        ),
);

console.log("X8_8_SUSPENDED_MEMBERSHIP_REJECTED=PASS");

await send(
    [
        buildUpdateMembershipInstruction({
            programId: PROGRAM_ID,
            application,
            membership,
            authority: authority.publicKey,
            tier: 3,
            status: 0,
            expiresAt: BigInt(Math.floor(Date.now() / 1000) + 3600),
            renewable: false,
            autoExtend: false,
            renewalDuration: 0n,
        }),
    ],
    [authority],
);

await send(
    [
        buildVerifyGatePolicyInstruction({
            programId: PROGRAM_ID,
            application,
            applicationAsset,
            gatePolicy,
            wallet: wallet.publicKey,
            holdTokenAccount: brcTokenAccount,
            membership,
        }),
    ],
    [wallet],
);


console.log("X8_8_LIFECYCLE_RESTORED_ACTIVE=PASS");

/*
 * ----------------------------------------------------------
 * XRAY X8.8 — Real expiration transition.
 *
 * Establish a short-lived ACTIVE Membership, prove that it is
 * accepted before expiry, wait until the validator clock passes
 * expiresAt, then prove the same Membership evidence is rejected.
 * ----------------------------------------------------------
 */

const x8ExpirationUnix =
    BigInt(Math.floor(Date.now() / 1000) + 4);

await send(
    [
        buildUpdateMembershipInstruction({
            programId: PROGRAM_ID,
            application,
            membership,
            authority: authority.publicKey,
            tier: 3,
            status: 0,
            expiresAt: x8ExpirationUnix,
            renewable: false,
            autoExtend: false,
            renewalDuration: 0n,
        }),
    ],
    [authority],
);

await send(
    [
        buildVerifyGatePolicyInstruction({
            programId: PROGRAM_ID,
            application,
            applicationAsset,
            gatePolicy,
            wallet: wallet.publicKey,
            holdTokenAccount: brcTokenAccount,
            membership,
        }),
    ],
    [wallet],
);

console.log("X8_8_PRE_EXPIRATION_MEMBERSHIP_ACCEPTED=PASS");

const x8ExpirationDeadlineMs =
    Number(x8ExpirationUnix) * 1000;

while (Date.now() <= x8ExpirationDeadlineMs + 1500) {
    await new Promise((resolve) => setTimeout(resolve, 250));
}

await expectRejected(
    "Expired Membership evidence",
    () =>
        send(
            [
                buildVerifyGatePolicyInstruction({
                    programId: PROGRAM_ID,
                    application,
                    applicationAsset,
                    gatePolicy,
                    wallet: wallet.publicKey,
                    holdTokenAccount: brcTokenAccount,
                    membership,
                }),
            ],
            [wallet],
        ),
);

console.log("X8_8_EXPIRED_MEMBERSHIP_REJECTED=PASS");

await send(
    [
        buildUpdateMembershipInstruction({
            programId: PROGRAM_ID,
            application,
            membership,
            authority: authority.publicKey,
            tier: 3,
            status: 0,
            expiresAt:
                BigInt(Math.floor(Date.now() / 1000) + 3600),
            renewable: false,
            autoExtend: false,
            renewalDuration: 0n,
        }),
    ],
    [authority],
);

await send(
    [
        buildVerifyGatePolicyInstruction({
            programId: PROGRAM_ID,
            application,
            applicationAsset,
            gatePolicy,
            wallet: wallet.publicKey,
            holdTokenAccount: brcTokenAccount,
            membership,
        }),
    ],
    [wallet],
);

console.log("X8_8_POST_EXPIRATION_RECOVERY=PASS");

console.log("X8_8_MEMBERSHIP_BOUNDARY_MATRIX=PASS");

/*
 * ----------------------------------------------------------
 * Positive AND path:
 * Hold BRC + Tier >= 3
 * ----------------------------------------------------------
 */

await send(
    [
        buildVerifyGatePolicyInstruction({
            programId: PROGRAM_ID,
            application,
            applicationAsset,
            gatePolicy,
            wallet: wallet.publicKey,
            holdTokenAccount:
                brcTokenAccount,
            membership,
        }),
    ],
    [wallet],
);

console.log(
    "✓ AND branch succeeded: Hold BRC + Tier >= 3",
);


/*
 * ----------------------------------------------------------
 * XRAY X8.9 — NftOwnership adversarial runtime matrix.
 * ----------------------------------------------------------
 */

/*
 * Wrong owner.
 *
 * The NFT token account is valid and funded, but it belongs
 * to the baseline wallet. A different signer cannot present
 * it as its own NFT evidence.
 */
const x8NftWrongOwner = Keypair.generate();

await expectRejected(
    "Wrong-owner NFT evidence",
    () =>
        send(
            [
                buildVerifyGatePolicyInstruction({
                    programId: PROGRAM_ID,
                    application,
                    applicationAsset,
                    gatePolicy,
                    wallet: x8NftWrongOwner.publicKey,
                    nftTokenAccount,
                }),
            ],
            [x8NftWrongOwner],
        ),
);

console.log("X8_9_WRONG_OWNER_REJECTED=PASS");

/*
 * Wrong mint / substituted token account.
 *
 * brcTokenAccount is a valid SPL token account owned by the
 * correct wallet and has positive balance, but its mint is BRC
 * rather than the NFT mint configured by the policy.
 */
await expectRejected(
    "Wrong-mint NFT token-account substitution",
    () =>
        send(
            [
                buildVerifyGatePolicyInstruction({
                    programId: PROGRAM_ID,
                    application,
                    applicationAsset,
                    gatePolicy,
                    wallet: wallet.publicKey,
                    nftTokenAccount:
                        brcTokenAccount,
                }),
            ],
            [wallet],
        ),
);

console.log("X8_9_WRONG_MINT_REJECTED=PASS");
console.log("X8_9_SUBSTITUTED_TOKEN_ACCOUNT_REJECTED=PASS");

/*
 * Foreign-program account.
 *
 * wallet.publicKey is System Program owned, not an SPL Token
 * or Token-2022 account. InterfaceAccount<TokenAccount> must
 * reject it before NFT condition evaluation.
 */
await expectRejected(
    "Foreign-program NFT evidence",
    () =>
        send(
            [
                buildVerifyGatePolicyInstruction({
                    programId: PROGRAM_ID,
                    application,
                    applicationAsset,
                    gatePolicy,
                    wallet: wallet.publicKey,
                    nftTokenAccount:
                        wallet.publicKey,
                }),
            ],
            [wallet],
        ),
);

console.log("X8_9_FOREIGN_PROGRAM_NFT_REJECTED=PASS");

/*
 * Zero balance.
 *
 * Burn the single NFT unit from the correct account. The same
 * owner and mint must no longer satisfy NftOwnership.
 */
runCli(
    "spl-token",
    [
        "burn",
        nftTokenAccount.toBase58(),
        "1",
        "--owner",
        walletPath,
        "--url",
        RPC_URL,
    ],
);

const x8ZeroNftBalance =
    await connection.getTokenAccountBalance(
        nftTokenAccount,
        "confirmed",
    );

expect(
    x8ZeroNftBalance.value.amount === "0",
    "X8.9 NFT zero-balance fixture was not established",
);

await expectRejected(
    "Zero-balance NFT evidence",
    () =>
        send(
            [
                buildVerifyGatePolicyInstruction({
                    programId: PROGRAM_ID,
                    application,
                    applicationAsset,
                    gatePolicy,
                    wallet: wallet.publicKey,
                    nftTokenAccount,
                }),
            ],
            [wallet],
        ),
);

console.log("X8_9_ZERO_BALANCE_REJECTED=PASS");

/*
 * Restore the NFT fixture and prove the same account becomes
 * valid again after positive balance is restored.
 */
runCli(
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

const x8RestoredNftBalance =
    await connection.getTokenAccountBalance(
        nftTokenAccount,
        "confirmed",
    );

expect(
    BigInt(x8RestoredNftBalance.value.amount) > 0n,
    "X8.9 NFT balance recovery failed",
);

await send(
    [
        buildVerifyGatePolicyInstruction({
            programId: PROGRAM_ID,
            application,
            applicationAsset,
            gatePolicy,
            wallet: wallet.publicKey,
            nftTokenAccount,
        }),
    ],
    [wallet],
);

console.log("X8_9_NFT_BALANCE_RECOVERY=PASS");
console.log("X8_9_NFT_ADVERSARIAL_MATRIX=PASS");

/*
 * ----------------------------------------------------------
 * Positive OR path:
 * NFT ownership alone.
 * ----------------------------------------------------------
 */

await send(
    [
        buildVerifyGatePolicyInstruction({
            programId: PROGRAM_ID,
            application,
            applicationAsset,
            gatePolicy,
            wallet: wallet.publicKey,
            nftTokenAccount,
        }),
    ],
    [wallet],
);

console.log(
    "✓ OR branch succeeded: NFT ownership",
);

console.log(
    "✓ AND semantics validated",
);

console.log(
    "✓ OR semantics validated",
);

console.log(
    "PHASE5_GATE_POLICY_E2E_PASS",
);
