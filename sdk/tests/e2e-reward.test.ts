import fs from "node:fs";

import {
    Connection,
    Keypair,
    PublicKey,
    sendAndConfirmTransaction,
    Transaction,
    TransactionInstruction,
} from "@solana/web3.js";

import {
    buildCancelRewardInstruction,
    buildClaimRewardInstruction,
    buildCreateRewardBatchInstructions,
    buildCreateRewardInstruction,
    buildInitializeProtocolInstruction,
    buildRegisterApplicationInstruction,
    CanonicalEcosystem,
    findApplicationPda,
    findProtocolConfigPda,
    findRewardPda,
} from "../src/index.js";

const RPC_URL = "http://127.0.0.1:8899";

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

/*
 * Repository deployment artifact is the source of truth
 * for the local Program ID.
 */
const programKeypair = loadKeypair(
    "../protocol/babycowans-protocol/target/deploy/babycowans_protocol-keypair.json",
);

const PROGRAM_ID = programKeypair.publicKey;

const connection = new Connection(
    RPC_URL,
    "confirmed",
);

const sleep = (ms: number) =>
    new Promise<void>((resolve) =>
        setTimeout(resolve, ms),
    );

async function fund(
    pubkey: PublicKey,
): Promise<void> {
    const balance =
        await connection.getBalance(pubkey);

    if (balance >= 1_000_000_000) {
        return;
    }

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

async function expectFailure(
    transaction: Transaction,
    signers: Keypair[],
    expectedError: string,
): Promise<void> {
    try {
        await sendAndConfirmTransaction(
            connection,
            transaction,
            signers,
            {
                commitment: "confirmed",
            },
        );
    } catch (error: unknown) {
        const message =
            error instanceof Error
                ? error.message
                : String(error);

        const logs =
            typeof error === "object" &&
            error !== null &&
            "logs" in error &&
            Array.isArray(
                (error as { logs?: unknown[] })
                    .logs,
            )
                ? (
                      error as {
                          logs: unknown[];
                      }
                  ).logs
                      .map(String)
                      .join("\n")
                : "";

        const complete =
            `${message}\n${logs}`;

        if (
            !complete.includes(expectedError)
        ) {
            throw new Error(
                `Expected ${expectedError}, received:\n${complete}`,
            );
        }

        return;
    }

    throw new Error(
        `Expected transaction failure: ${expectedError}`,
    );
}

interface RewardSnapshot {
    rewardId: bigint;
    amount: bigint;
    status: number;
    createdAt: bigint;
    claimableAt: bigint;
    expiresAt: bigint;
    claimedAt: bigint;
    cancelledAt: bigint;
    category: number;
    reason: string;
}

async function readReward(
    reward: PublicKey,
): Promise<RewardSnapshot> {
    const account =
        await connection.getAccountInfo(
            reward,
        );

    if (account === null) {
        throw new Error(
            `Reward account missing: ${reward.toBase58()}`,
        );
    }

    if (!account.owner.equals(PROGRAM_ID)) {
        throw new Error(
            "Reward account has unexpected owner.",
        );
    }

    const data = account.data;

    /*
     * Anchor account layout:
     * discriminator                  0..8
     * version                        8..10
     * application                   10..42
     * beneficiary                   42..74
     * reward_id                     74..82
     * asset                         82..114
     * amount                        114..122
     * status                        122
     * created_at                    123..131
     * claimable_at                  131..139
     * expires_at                    139..147
     * claimed_at                    147..155
     * cancelled_at                  155..163
     * category                      163
     * reason length                 164..168
     */
    const reasonLength =
        data.readUInt32LE(164);

    const reasonStart = 168;
    const reasonEnd =
        reasonStart + reasonLength;

    if (reasonEnd > data.length) {
        throw new Error(
            "Reward reason exceeds account bounds.",
        );
    }

    return {
        rewardId:
            data.readBigUInt64LE(74),

        amount:
            data.readBigUInt64LE(114),

        status:
            data.readUInt8(122),

        createdAt:
            data.readBigInt64LE(123),

        claimableAt:
            data.readBigInt64LE(131),

        expiresAt:
            data.readBigInt64LE(139),

        claimedAt:
            data.readBigInt64LE(147),

        cancelledAt:
            data.readBigInt64LE(155),

        category:
            data.readUInt8(163),

        reason:
            data
                .subarray(
                    reasonStart,
                    reasonEnd,
                )
                .toString("utf8"),
    };
}

console.log(
    "===== PHASE 3 REWARD ENGINE E2E =====",
);

console.log(
    `Program ID: ${PROGRAM_ID.toBase58()}`,
);

await fund(authority.publicKey);

const programAccount =
    await connection.getAccountInfo(
        PROGRAM_ID,
    );

if (
    programAccount === null ||
    !programAccount.executable
) {
    throw new Error(
        "Babycowans program is not deployed on local validator.",
    );
}

console.log(
    "✓ Program deployment detected",
);

/*
 * Protocol
 */
const [protocolConfig] =
    findProtocolConfigPda(PROGRAM_ID);

if (
    (await connection.getAccountInfo(
        protocolConfig,
    )) === null
) {
    await send(
        buildInitializeProtocolInstruction({
            programId: PROGRAM_ID,
            authority:
                authority.publicKey,
        }),
        [authority],
    );

    console.log(
        "✓ Protocol initialized",
    );
} else {
    console.log(
        "✓ Existing protocol configuration detected",
    );
}

/*
 * Dedicated application for this E2E run.
 */
const applicationId =
    BigInt(Date.now());

const [application] =
    findApplicationPda(
        PROGRAM_ID,
        authority.publicKey,
        applicationId,
    );

await send(
    buildRegisterApplicationInstruction({
        programId: PROGRAM_ID,
        authority:
            authority.publicKey,
        applicationId,
        name:
            "Phase 3 Reward Engine E2E",
        selectedEcosystem:
            CanonicalEcosystem.BabyReptile,
    }),
    [authority],
);

console.log(
    "✓ Phase 3 test application registered",
);

const beneficiary =
    Keypair.generate();

await fund(
    beneficiary.publicKey,
);

/*
 * Asset identity is opaque to Reward itself.
 * Canonical-asset validation remains exercised
 * by the Golden Path regression.
 */
const asset =
    Keypair.generate().publicKey;

/* =========================================================
 * 1. Immediate reward / Create + Claim / Reason / Category
 * ======================================================= */

const immediateId = 1n;

const [immediateReward] =
    findRewardPda(
        PROGRAM_ID,
        application,
        beneficiary.publicKey,
        immediateId,
    );

await send(
    buildCreateRewardInstruction({
        programId: PROGRAM_ID,
        application,
        reward: immediateReward,
        authority:
            authority.publicKey,
        beneficiary:
            beneficiary.publicKey,
        rewardId: immediateId,
        asset,
        amount: 500n,
        claimableAt: 0n,
        expiresAt: 0n,
        category: 3,
        reason: "immediate-e2e",
    }),
    [authority],
);

const immediateBefore =
    await readReward(
        immediateReward,
    );

if (
    immediateBefore.rewardId !==
        immediateId ||
    immediateBefore.amount !== 500n ||
    immediateBefore.status !== 1 ||
    immediateBefore.category !== 3 ||
    immediateBefore.reason !==
        "immediate-e2e"
) {
    throw new Error(
        "Immediate reward state mismatch.",
    );
}

await send(
    buildClaimRewardInstruction({
        programId: PROGRAM_ID,
        reward: immediateReward,
        beneficiary:
            beneficiary.publicKey,
    }),
    [beneficiary],
);

const immediateAfter =
    await readReward(
        immediateReward,
    );

if (
    immediateAfter.status !== 2 ||
    immediateAfter.claimedAt <= 0n
) {
    throw new Error(
        "Immediate reward claim state mismatch.",
    );
}

console.log(
    "✓ Immediate reward + reason/category + claim succeeded",
);

/* =========================================================
 * 2. Scheduled reward
 * ======================================================= */

const scheduledId = 2n;

const scheduledAt =
    BigInt(
        Math.floor(
            Date.now() / 1000,
        ),
    ) + 5n;

const [scheduledReward] =
    findRewardPda(
        PROGRAM_ID,
        application,
        beneficiary.publicKey,
        scheduledId,
    );

await send(
    buildCreateRewardInstruction({
        programId: PROGRAM_ID,
        application,
        reward: scheduledReward,
        authority:
            authority.publicKey,
        beneficiary:
            beneficiary.publicKey,
        rewardId: scheduledId,
        asset,
        amount: 600n,
        claimableAt:
            scheduledAt,
        expiresAt: 0n,
        category: 4,
        reason: "scheduled-e2e",
    }),
    [authority],
);

const scheduledBefore =
    await readReward(
        scheduledReward,
    );

if (
    scheduledBefore.rewardId !==
        scheduledId ||
    scheduledBefore.status !== 0 ||
    scheduledBefore.claimableAt !==
        scheduledAt
) {
    throw new Error(
        "Scheduled reward initial state mismatch.",
    );
}

await expectFailure(
    new Transaction().add(
        buildClaimRewardInstruction({
            programId: PROGRAM_ID,
            reward:
                scheduledReward,
            beneficiary:
                beneficiary.publicKey,
        }),
    ),
    [beneficiary],
    "RewardNotYetClaimable",
);

console.log(
    "✓ Scheduled reward rejected early claim",
);

await sleep(6500);

await send(
    buildClaimRewardInstruction({
        programId: PROGRAM_ID,
        reward: scheduledReward,
        beneficiary:
            beneficiary.publicKey,
    }),
    [beneficiary],
);

const scheduledAfter =
    await readReward(
        scheduledReward,
    );

if (
    scheduledAfter.status !== 2 ||
    scheduledAfter.claimedAt <= 0n
) {
    throw new Error(
        "Scheduled reward did not claim after schedule.",
    );
}

console.log(
    "✓ Scheduled reward claim succeeded after schedule",
);

/* =========================================================
 * 3. Expiration
 * ======================================================= */

const expiredId = 3n;

const expiresAt =
    BigInt(
        Math.floor(
            Date.now() / 1000,
        ),
    ) + 4n;

const [expiredReward] =
    findRewardPda(
        PROGRAM_ID,
        application,
        beneficiary.publicKey,
        expiredId,
    );

await send(
    buildCreateRewardInstruction({
        programId: PROGRAM_ID,
        application,
        reward: expiredReward,
        authority:
            authority.publicKey,
        beneficiary:
            beneficiary.publicKey,
        rewardId: expiredId,
        asset,
        amount: 700n,
        claimableAt: 0n,
        expiresAt,
        category: 5,
        reason: "expiration-e2e",
    }),
    [authority],
);

await sleep(5500);

await expectFailure(
    new Transaction().add(
        buildClaimRewardInstruction({
            programId: PROGRAM_ID,
            reward: expiredReward,
            beneficiary:
                beneficiary.publicKey,
        }),
    ),
    [beneficiary],
    "RewardExpired",
);

console.log(
    "✓ Expired reward rejected claim",
);

/* =========================================================
 * 4. Cancel Reward
 * ======================================================= */

const cancelledId = 4n;

const [cancelledReward] =
    findRewardPda(
        PROGRAM_ID,
        application,
        beneficiary.publicKey,
        cancelledId,
    );

await send(
    buildCreateRewardInstruction({
        programId: PROGRAM_ID,
        application,
        reward:
            cancelledReward,
        authority:
            authority.publicKey,
        beneficiary:
            beneficiary.publicKey,
        rewardId: cancelledId,
        asset,
        amount: 800n,
        claimableAt: 0n,
        expiresAt: 0n,
        category: 6,
        reason: "cancel-e2e",
    }),
    [authority],
);

await send(
    buildCancelRewardInstruction({
        programId: PROGRAM_ID,
        application,
        reward:
            cancelledReward,
        authority:
            authority.publicKey,
    }),
    [authority],
);

const cancelled =
    await readReward(
        cancelledReward,
    );

if (
    cancelled.status !== 3 ||
    cancelled.cancelledAt <= 0n
) {
    throw new Error(
        "Cancelled reward state mismatch.",
    );
}

await expectFailure(
    new Transaction().add(
        buildClaimRewardInstruction({
            programId: PROGRAM_ID,
            reward:
                cancelledReward,
            beneficiary:
                beneficiary.publicKey,
        }),
    ),
    [beneficiary],
    "InvalidRewardStatus",
);

console.log(
    "✓ Cancelled reward rejected claim",
);

/* =========================================================
 * 5. Multiple Rewards + Batch atomic creation
 * ======================================================= */

const batchIdA = 10n;
const batchIdB = 11n;

const [batchRewardA] =
    findRewardPda(
        PROGRAM_ID,
        application,
        beneficiary.publicKey,
        batchIdA,
    );

const [batchRewardB] =
    findRewardPda(
        PROGRAM_ID,
        application,
        beneficiary.publicKey,
        batchIdB,
    );

if (
    batchRewardA.equals(
        batchRewardB,
    )
) {
    throw new Error(
        "Different reward IDs produced same PDA.",
    );
}

if (
    batchRewardA.equals(
        immediateReward,
    ) ||
    batchRewardB.equals(
        immediateReward,
    )
) {
    throw new Error(
        "Reward identity collision detected.",
    );
}

const batchInstructions =
    buildCreateRewardBatchInstructions(
        [
            {
                programId:
                    PROGRAM_ID,
                application,
                reward:
                    batchRewardA,
                authority:
                    authority.publicKey,
                beneficiary:
                    beneficiary.publicKey,
                rewardId:
                    batchIdA,
                asset,
                amount: 900n,
                claimableAt: 0n,
                expiresAt: 0n,
                category: 7,
                reason: "batch-a",
            },
            {
                programId:
                    PROGRAM_ID,
                application,
                reward:
                    batchRewardB,
                authority:
                    authority.publicKey,
                beneficiary:
                    beneficiary.publicKey,
                rewardId:
                    batchIdB,
                asset,
                amount: 1000n,
                claimableAt: 0n,
                expiresAt: 0n,
                category: 8,
                reason: "batch-b",
            },
        ],
    );

if (
    batchInstructions.length !== 2
) {
    throw new Error(
        "Batch builder instruction count mismatch.",
    );
}

/*
 * One transaction = atomic batch creation.
 * If any instruction fails, neither creation commits.
 */
await sendAndConfirmTransaction(
    connection,
    new Transaction().add(
        ...batchInstructions,
    ),
    [authority],
    {
        commitment: "confirmed",
    },
);

const batchA =
    await readReward(
        batchRewardA,
    );

const batchB =
    await readReward(
        batchRewardB,
    );

if (
    batchA.rewardId !==
        batchIdA ||
    batchB.rewardId !==
        batchIdB ||
    batchA.amount !== 900n ||
    batchB.amount !== 1000n ||
    batchA.category !== 7 ||
    batchB.category !== 8 ||
    batchA.reason !==
        "batch-a" ||
    batchB.reason !==
        "batch-b"
) {
    throw new Error(
        "Batch reward state mismatch.",
    );
}

console.log(
    "✓ Multiple independent rewards created for one beneficiary",
);

console.log(
    "✓ Batch rewards created atomically in one transaction",
);

/*
 * PHASE13_REWARD_ADVERSARIAL_CASES_3_TO_7
 *
 * CASE 3 — a terminal Cancelled reward cannot be cancelled again.
 * CASE 4 — a terminal Claimed reward cannot be cancelled.
 * CASE 5 — a signer without Application authority cannot cancel.
 * CASE 6 — a signer other than the Reward beneficiary cannot claim.
 * CASE 7 — a Reward belonging to one Application cannot be supplied
 *          to another Application's cancel flow.
 *
 * Every rejected operation must fail before mutating Reward state.
 */

/* ---------------------------------------------------------
 * CASE 3 — double cancellation
 * ------------------------------------------------------ */
await expectFailure(
    new Transaction().add(
        buildCancelRewardInstruction({
            programId: PROGRAM_ID,
            application,
            reward: cancelledReward,
            authority: authority.publicKey,
        }),
    ),
    [authority],
    "InvalidRewardStatus",
);

const cancelledAfterReplay =
    await readReward(cancelledReward);

if (
    cancelledAfterReplay.status !== 3 ||
    cancelledAfterReplay.cancelledAt !==
        cancelled.cancelledAt
) {
    throw new Error(
        "Double-cancel rejection mutated cancelled reward state.",
    );
}

console.log(
    "✓ Double reward cancellation was rejected without state mutation",
);

/* ---------------------------------------------------------
 * CASE 4 — cancel after claim
 * ------------------------------------------------------ */
await expectFailure(
    new Transaction().add(
        buildCancelRewardInstruction({
            programId: PROGRAM_ID,
            application,
            reward: immediateReward,
            authority: authority.publicKey,
        }),
    ),
    [authority],
    "InvalidRewardStatus",
);

const immediateAfterCancelAttempt =
    await readReward(immediateReward);

if (
    immediateAfterCancelAttempt.status !== 2 ||
    immediateAfterCancelAttempt.claimedAt !==
        immediateAfter.claimedAt ||
    immediateAfterCancelAttempt.cancelledAt !== 0n
) {
    throw new Error(
        "Cancel-after-claim rejection mutated claimed reward state.",
    );
}

console.log(
    "✓ Cancel-after-claim was rejected without state mutation",
);

/* ---------------------------------------------------------
 * CASE 5 — non-authority cancellation
 * ------------------------------------------------------ */
const unauthorizedCanceller = Keypair.generate();
await fund(unauthorizedCanceller.publicKey);

await expectFailure(
    new Transaction().add(
        buildCancelRewardInstruction({
            programId: PROGRAM_ID,
            application,
            reward: batchRewardA,
            authority: unauthorizedCanceller.publicKey,
        }),
    ),
    [unauthorizedCanceller],
    "ConstraintHasOne",
);

const batchAAfterUnauthorizedCancel =
    await readReward(batchRewardA);

if (
    batchAAfterUnauthorizedCancel.status !== batchA.status ||
    batchAAfterUnauthorizedCancel.cancelledAt !==
        batchA.cancelledAt
) {
    throw new Error(
        "Unauthorized cancel attempt mutated reward state.",
    );
}

console.log(
    "✓ Non-authority reward cancellation was rejected without state mutation",
);

/* ---------------------------------------------------------
 * CASE 6 — wrong beneficiary claim
 * ------------------------------------------------------ */
const wrongBeneficiary = Keypair.generate();
await fund(wrongBeneficiary.publicKey);

await expectFailure(
    new Transaction().add(
        buildClaimRewardInstruction({
            programId: PROGRAM_ID,
            reward: batchRewardA,
            beneficiary: wrongBeneficiary.publicKey,
        }),
    ),
    [wrongBeneficiary],
    "InvalidAuthority",
);

const batchAAfterWrongBeneficiary =
    await readReward(batchRewardA);

if (
    batchAAfterWrongBeneficiary.status !== batchA.status ||
    batchAAfterWrongBeneficiary.claimedAt !==
        batchA.claimedAt
) {
    throw new Error(
        "Wrong-beneficiary claim attempt mutated reward state.",
    );
}

console.log(
    "✓ Wrong reward beneficiary claim was rejected without state mutation",
);

/* ---------------------------------------------------------
 * CASE 7 — cross-application Reward substitution
 *
 * Create an independent Application owned by the same authority.
 * This deliberately allows Application.has_one(authority) to pass,
 * so the test reaches the Reward.application relationship check.
 * ------------------------------------------------------ */
const foreignApplicationId =
    applicationId + 1_000_000_000n;

const [foreignApplication] =
    findApplicationPda(
        PROGRAM_ID,
        authority.publicKey,
        foreignApplicationId,
    );

await send(
    buildRegisterApplicationInstruction({
        programId: PROGRAM_ID,
        authority: authority.publicKey,
        applicationId: foreignApplicationId,
        name: "Phase 13 Foreign Reward Application",
        selectedEcosystem:
            CanonicalEcosystem.BabyReptile,
    }),
    [authority],
);

await expectFailure(
    new Transaction().add(
        buildCancelRewardInstruction({
            programId: PROGRAM_ID,
            application: foreignApplication,
            reward: batchRewardB,
            authority: authority.publicKey,
        }),
    ),
    [authority],
    "InvalidApplication",
);

const batchBAfterCrossApplication =
    await readReward(batchRewardB);

if (
    batchBAfterCrossApplication.status !== batchB.status ||
    batchBAfterCrossApplication.cancelledAt !==
        batchB.cancelledAt
) {
    throw new Error(
        "Cross-application reward substitution mutated reward state.",
    );
}

console.log(
    "✓ Cross-application reward substitution was rejected without state mutation",
);

/*
 * PHASE13_BATCH_ADVERSARIAL_SECURITY
 *
 * Security properties:
 *
 * CASE 2 — repeated reward identity resolves deterministically to
 *          the same PDA and cannot be redirected to alternate state.
 *
 * CASE 3 — a multi-instruction transaction is atomic: if a later
 *          malicious instruction fails, an earlier valid creation
 *          must not commit.
 *
 * CASE 4 — SDK batch ordering must preserve caller ordering.
 *
 * CASE 5 — a mixed/cross-Application instruction cannot bypass the
 *          underlying CreateReward PDA/Application relationship.
 *
 * CASE 6 — the same reward ID cannot create independent state at an
 *          attacker-selected PDA.
 */

/* ---------------------------------------------------------
 * Deterministic order + identity
 * ------------------------------------------------------ */
const batchSecurityIdA = 20n;
const batchSecurityIdB = 21n;

const [batchSecurityRewardA] =
    findRewardPda(
        PROGRAM_ID,
        application,
        beneficiary.publicKey,
        batchSecurityIdA,
    );

const [batchSecurityRewardB] =
    findRewardPda(
        PROGRAM_ID,
        application,
        beneficiary.publicKey,
        batchSecurityIdB,
    );

const [batchSecurityRewardARepeated] =
    findRewardPda(
        PROGRAM_ID,
        application,
        beneficiary.publicKey,
        batchSecurityIdA,
    );

if (
    !batchSecurityRewardA.equals(
        batchSecurityRewardARepeated,
    )
) {
    throw new Error(
        "Repeated reward identity produced a different PDA.",
    );
}

if (
    batchSecurityRewardA.equals(
        batchSecurityRewardB,
    )
) {
    throw new Error(
        "Distinct reward IDs collided in batch security test.",
    );
}

const orderedSecurityBatch =
    buildCreateRewardBatchInstructions([
        {
            programId: PROGRAM_ID,
            application,
            reward: batchSecurityRewardA,
            authority: authority.publicKey,
            beneficiary: beneficiary.publicKey,
            rewardId: batchSecurityIdA,
            asset,
            amount: 1200n,
            claimableAt: 0n,
            expiresAt: 0n,
            category: 9,
            reason: "phase13-batch-order-a",
        },
        {
            programId: PROGRAM_ID,
            application,
            reward: batchSecurityRewardB,
            authority: authority.publicKey,
            beneficiary: beneficiary.publicKey,
            rewardId: batchSecurityIdB,
            asset,
            amount: 1300n,
            claimableAt: 0n,
            expiresAt: 0n,
            category: 10,
            reason: "phase13-batch-order-b",
        },
    ]);

if (orderedSecurityBatch.length !== 2) {
    throw new Error(
        "Phase 13 ordered batch instruction count mismatch.",
    );
}

/*
 * create_reward account order is:
 * application, reward, authority, system_program.
 * Therefore keys[1] is the Reward PDA.
 */
if (
    !orderedSecurityBatch[0]?.keys[1]?.pubkey.equals(
        batchSecurityRewardA,
    ) ||
    !orderedSecurityBatch[1]?.keys[1]?.pubkey.equals(
        batchSecurityRewardB,
    )
) {
    throw new Error(
        "Reward batch builder did not preserve caller ordering.",
    );
}

console.log(
    "✓ Reward batch ordering and repeated identity were deterministic",
);

/* ---------------------------------------------------------
 * Atomic rollback + cross-Application relationship attack
 * ------------------------------------------------------ */
const atomicRollbackId = 22n;

const [atomicRollbackReward] =
    findRewardPda(
        PROGRAM_ID,
        application,
        beneficiary.publicKey,
        atomicRollbackId,
    );

const maliciousForeignId = 23n;

/*
 * Deliberately derive this Reward for the PRIMARY Application,
 * then provide it to a CreateReward instruction targeting the
 * independent foreignApplication. Anchor seed validation must
 * reject the second instruction.
 */
const [maliciousForeignReward] =
    findRewardPda(
        PROGRAM_ID,
        application,
        beneficiary.publicKey,
        maliciousForeignId,
    );

const atomicFailureBatch =
    buildCreateRewardBatchInstructions([
        {
            programId: PROGRAM_ID,
            application,
            reward: atomicRollbackReward,
            authority: authority.publicKey,
            beneficiary: beneficiary.publicKey,
            rewardId: atomicRollbackId,
            asset,
            amount: 1400n,
            claimableAt: 0n,
            expiresAt: 0n,
            category: 11,
            reason: "phase13-atomic-valid-first",
        },
        {
            programId: PROGRAM_ID,
            application: foreignApplication,
            reward: maliciousForeignReward,
            authority: authority.publicKey,
            beneficiary: beneficiary.publicKey,
            rewardId: maliciousForeignId,
            asset,
            amount: 1500n,
            claimableAt: 0n,
            expiresAt: 0n,
            category: 12,
            reason: "phase13-cross-app-malicious-second",
        },
    ]);

await expectFailure(
    new Transaction().add(
        ...atomicFailureBatch,
    ),
    [authority],
    "ConstraintSeeds",
);

/*
 * The first instruction was valid and executed before the malicious
 * second instruction. Transaction atomicity requires its creation
 * to be rolled back completely.
 */
const atomicRollbackAccount =
    await connection.getAccountInfo(
        atomicRollbackReward,
    );

if (atomicRollbackAccount !== null) {
    throw new Error(
        "Failed reward batch partially committed its first instruction.",
    );
}

const maliciousForeignAccount =
    await connection.getAccountInfo(
        maliciousForeignReward,
    );

if (maliciousForeignAccount !== null) {
    throw new Error(
        "Cross-application malicious Reward account unexpectedly exists.",
    );
}

console.log(
    "✓ Failed mixed-application reward batch rolled back atomically",
);
console.log(
    "✓ Cross-application batch Reward seed substitution was rejected",
);

/* ---------------------------------------------------------
 * Same reward ID cannot be redirected to attacker-selected PDA
 * ------------------------------------------------------ */
const repeatedIdentityId = 24n;

const [canonicalRepeatedIdentityReward] =
    findRewardPda(
        PROGRAM_ID,
        application,
        beneficiary.publicKey,
        repeatedIdentityId,
    );

const attackerSelectedReward =
    Keypair.generate().publicKey;

if (
    attackerSelectedReward.equals(
        canonicalRepeatedIdentityReward,
    )
) {
    throw new Error(
        "Unexpected attacker-selected Reward PDA collision.",
    );
}

await expectFailure(
    new Transaction().add(
        buildCreateRewardInstruction({
            programId: PROGRAM_ID,
            application,
            reward: attackerSelectedReward,
            authority: authority.publicKey,
            beneficiary: beneficiary.publicKey,
            rewardId: repeatedIdentityId,
            asset,
            amount: 1600n,
            claimableAt: 0n,
            expiresAt: 0n,
            category: 13,
            reason: "phase13-repeated-id-wrong-pda",
        }),
    ),
    [authority],
    "ConstraintSeeds",
);

if (
    (await connection.getAccountInfo(
        canonicalRepeatedIdentityReward,
    )) !== null
) {
    throw new Error(
        "Wrong-PDA repeated-ID attack created canonical Reward state.",
    );
}

console.log(
    "✓ Repeated reward ID could not be redirected to alternate state",
);





/* =========================================================
 * Final
 * ======================================================= */

console.log("");

console.log(
    "✓ Phase 3 Reward Engine E2E completed successfully",
);

console.log(
    `✓ Application: ${application.toBase58()}`,
);

console.log(
    `✓ Beneficiary: ${beneficiary.publicKey.toBase58()}`,
);
