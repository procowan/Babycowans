import {
    Connection,
    Keypair,
    PublicKey,
} from "@solana/web3.js";

import {
    CANONICAL_ECOSYSTEMS,
    buildRegisterApplicationInstruction,
    buildRegisterMembershipInstruction,
    decodeMembershipAccount,
    findApplicationPda,
    findMembershipPda,
    findProtocolConfigPda,
} from "../../src/index.js";

import {
    RPC_URL,
    assertResourceSafety,
    loadAuthority,
    loadProgramId,
    readPositiveIntEnv,
    runBoundedCount,
    sendInstruction,
} from "./helpers.js";

import {
    StreamingLatencyMetrics,
} from "./metrics.js";

const APPLICATION_COUNT =
    readPositiveIntEnv(
        "PHASE15_APPLICATION_COUNT",
        5,
    );

const MEMBERSHIP_COUNT =
    readPositiveIntEnv(
        "PHASE15_MEMBERSHIP_COUNT",
        20,
    );

const CHUNK_SIZE =
    readPositiveIntEnv(
        "PHASE15_MEMBERSHIP_CHUNK_SIZE",
        10,
    );

const CONCURRENCY =
    readPositiveIntEnv(
        "PHASE15_CONCURRENCY",
        2,
    );

const SIGNATURE_SAMPLE_LIMIT = 8;

const repositoryRoot =
    new URL(
        "../../../",
        import.meta.url,
    ).pathname.replace(/\/$/, "");

const connection =
    new Connection(
        RPC_URL,
        "confirmed",
    );

const authority =
    loadAuthority();

const programId =
    loadProgramId(
        repositoryRoot,
    );

const [protocolConfig] =
    findProtocolConfigPda(
        programId,
    );

const protocolInfo =
    await connection.getAccountInfo(
        protocolConfig,
        "confirmed",
    );

if (protocolInfo === null) {
    throw new Error(
        "PHASE15_MEMBERSHIP_SMOKE_ABORT=PROTOCOL_CONFIG_MISSING",
    );
}

if (
    !protocolInfo.owner.equals(
        programId,
    )
) {
    throw new Error(
        "PHASE15_MEMBERSHIP_SMOKE_ABORT=PROTOCOL_CONFIG_OWNER_MISMATCH",
    );
}

await assertResourceSafety(
    connection,
    repositoryRoot,
);

const applicationBaseId =
    BigInt(Date.now())
    * 10_000n;

function applicationForIndex(
    index: number,
): PublicKey {
    const applicationId =
        applicationBaseId
        + BigInt(index);

    return findApplicationPda(
        programId,
        authority.publicKey,
        applicationId,
    )[0];
}

function memberForIndex(
    index: number,
): Keypair {
    const seed =
        Buffer.alloc(32);

    seed.writeBigUInt64LE(
        BigInt.asUintN(
            64,
            applicationBaseId,
        ),
        0,
    );

    seed.writeBigUInt64LE(
        BigInt(index),
        8,
    );

    Buffer.from(
        "phase15-member",
        "utf8",
    ).copy(
        seed,
        16,
        0,
        14,
    );

    return Keypair.fromSeed(
        seed,
    );
}

for (
    let index = 0;
    index < APPLICATION_COUNT;
    index += 1
) {
    await assertResourceSafety(
        connection,
        repositoryRoot,
    );

    const identity =
        CANONICAL_ECOSYSTEMS[
            index
            % CANONICAL_ECOSYSTEMS.length
        ]!;

    const applicationId =
        applicationBaseId
        + BigInt(index);

    const application =
        applicationForIndex(
            index,
        );

    if (
        await connection.getAccountInfo(
            application,
            "confirmed",
        )
        !== null
    ) {
        throw new Error(
            "PHASE15_MEMBERSHIP_SMOKE_ABORT=APPLICATION_COLLISION",
        );
    }

    await sendInstruction(
        connection,
        buildRegisterApplicationInstruction({
            programId,
            authority:
                authority.publicKey,
            applicationId,
            name:
                `phase15-membership-app-${index}`,
            selectedEcosystem:
                identity.ecosystem,
        }),
        [authority],
    );
}

await assertResourceSafety(
    connection,
    repositoryRoot,
);

console.log(
    `PHASE15_MEMBERSHIP_APPLICATION_FIXTURE_COUNT=${APPLICATION_COUNT}`,
);

const latencyMetrics =
    new StreamingLatencyMetrics();

const signatureSample: string[] = [];

const started =
    performance.now();

for (
    let chunkStart = 0;
    chunkStart < MEMBERSHIP_COUNT;
    chunkStart += CHUNK_SIZE
) {
    const chunkCount =
        Math.min(
            CHUNK_SIZE,
            MEMBERSHIP_COUNT
            - chunkStart,
        );

    await assertResourceSafety(
        connection,
        repositoryRoot,
    );

    await runBoundedCount(
        chunkCount,
        CONCURRENCY,
        async (chunkIndex) => {
            const workIndex =
                chunkStart
                + chunkIndex;

            const applicationIndex =
                workIndex
                % APPLICATION_COUNT;

            const application =
                applicationForIndex(
                    applicationIndex,
                );

            const member =
                memberForIndex(
                    workIndex,
                );

            const [membership] =
                findMembershipPda(
                    programId,
                    application,
                    member.publicKey,
                );

            if (
                await connection.getAccountInfo(
                    membership,
                    "confirmed",
                )
                !== null
            ) {
                throw new Error(
                    "PHASE15_MEMBERSHIP_SMOKE_ABORT=MEMBERSHIP_COLLISION",
                );
            }

            const txStarted =
                performance.now();

            const signature =
                await sendInstruction(
                    connection,
                    buildRegisterMembershipInstruction({
                        programId,
                        application,
                        membership,
                        authority:
                            authority.publicKey,
                        member:
                            member.publicKey,
                        tier: 1,
                        expiresAt: 0n,
                        renewable: false,
                        autoExtend: false,
                        renewalDuration: 0n,
                        membershipKind: 0,
                        nftMint:
                            PublicKey.default,
                    }),
                    [authority],
                );

            latencyMetrics.add(
                performance.now()
                - txStarted,
            );

            if (
                signatureSample.length
                < SIGNATURE_SAMPLE_LIMIT
            ) {
                signatureSample.push(
                    signature,
                );
            }

            await assertResourceSafety(
                connection,
                repositoryRoot,
            );
        },
    );

    console.log(
        `PHASE15_MEMBERSHIP_CHUNK_COMPLETE=${Math.min(
            chunkStart + chunkCount,
            MEMBERSHIP_COUNT,
        )}_OF_${MEMBERSHIP_COUNT}`,
    );
}

const totalMs =
    performance.now()
    - started;

await runBoundedCount(
    MEMBERSHIP_COUNT,
    CONCURRENCY,
    async (index) => {
        const applicationIndex =
            index
            % APPLICATION_COUNT;

        const application =
            applicationForIndex(
                applicationIndex,
            );

        const member =
            memberForIndex(
                index,
            );

        const [membership] =
            findMembershipPda(
                programId,
                application,
                member.publicKey,
            );

        const account =
            await connection.getAccountInfo(
                membership,
                "confirmed",
            );

        if (account === null) {
            throw new Error(
                "PHASE15_MEMBERSHIP_SMOKE_ABORT=ACCOUNT_MISSING",
            );
        }

        if (
            !account.owner.equals(
                programId,
            )
        ) {
            throw new Error(
                "PHASE15_MEMBERSHIP_SMOKE_ABORT=OWNER_MISMATCH",
            );
        }

        const decoded =
            decodeMembershipAccount(
                account.data,
            );

        if (
            !decoded.application.equals(
                application,
            )
            || !decoded.member.equals(
                member.publicKey,
            )
            || decoded.tier !== 1
            || decoded.status !== 0
            || decoded.membershipKind !== 0
            || decoded.renewable !== false
            || decoded.autoExtend !== false
            || decoded.renewalDuration !== 0n
        ) {
            throw new Error(
                "PHASE15_MEMBERSHIP_SMOKE_ABORT=STATE_MISMATCH",
            );
        }
    },
);

const resources =
    await assertResourceSafety(
        connection,
        repositoryRoot,
    );

const latency =
    latencyMetrics.summary();

console.log(
    `PHASE15_MEMBERSHIP_SMOKE_COUNT=${MEMBERSHIP_COUNT}`,
);

console.log(
    `PHASE15_MEMBERSHIP_STATE_PROOF=${MEMBERSHIP_COUNT}_OF_${MEMBERSHIP_COUNT}`,
);

console.log(
    `PHASE15_MEMBERSHIP_SMOKE_CONCURRENCY=${CONCURRENCY}`,
);

console.log(
    `PHASE15_MEMBERSHIP_SMOKE_CHUNK_SIZE=${CHUNK_SIZE}`,
);

console.log(
    `PHASE15_MEMBERSHIP_SMOKE_TOTAL_MS=${totalMs.toFixed(3)}`,
);

console.log(
    `PHASE15_MEMBERSHIP_SMOKE_TPS=${(
        MEMBERSHIP_COUNT
        / (totalMs / 1000)
    ).toFixed(6)}`,
);

console.log(
    `PHASE15_MEMBERSHIP_SMOKE_AVG_MS=${latency.averageMs.toFixed(3)}`,
);

console.log(
    `PHASE15_MEMBERSHIP_SMOKE_P50_MS=${latency.p50Ms.toFixed(3)}`,
);

console.log(
    `PHASE15_MEMBERSHIP_SMOKE_P95_MS=${latency.p95Ms.toFixed(3)}`,
);

console.log(
    `PHASE15_MEMBERSHIP_SMOKE_P99_MS=${latency.p99Ms.toFixed(3)}`,
);

console.log(
    `PHASE15_MEMBERSHIP_LATENCY_SAMPLE_COUNT=${latencyMetrics.sampleCount}`,
);

console.log(
    `PHASE15_MEMBERSHIP_SIGNATURE_SAMPLE_COUNT=${signatureSample.length}`,
);

console.log(
    `PHASE15_MEM_AVAILABLE_KB=${resources.memAvailableKb}`,
);

console.log(
    `PHASE15_SWAP_USED_KB=${resources.swapUsedKb}`,
);

console.log(
    `PHASE15_DISK_AVAILABLE_KB=${resources.diskAvailableKb}`,
);

console.log(
    "PHASE15_MEMBERSHIP_STRESS_PASS",
);
