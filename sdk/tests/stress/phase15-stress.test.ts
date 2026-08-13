import {
    Connection,
} from "@solana/web3.js";

import {
    CANONICAL_ECOSYSTEMS,
    buildRegisterApplicationInstruction,
    decodeApplicationAccount,
    findApplicationPda,
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

const APPLICATION_SMOKE_COUNT =
    readPositiveIntEnv(
        "PHASE15_APPLICATION_COUNT",
        5,
    );

const CONCURRENCY =
    readPositiveIntEnv(
        "PHASE15_CONCURRENCY",
        2,
    );

const SIGNATURE_SAMPLE_LIMIT = 4;

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
        "PHASE15_SMOKE_ABORT=PROTOCOL_CONFIG_MISSING",
    );
}

if (
    !protocolInfo.owner.equals(
        programId,
    )
) {
    throw new Error(
        "PHASE15_SMOKE_ABORT=PROTOCOL_CONFIG_OWNER_MISMATCH",
    );
}

await assertResourceSafety(
    connection,
    repositoryRoot,
);

const baseApplicationId =
    BigInt(Date.now())
    * 10_000n;

const latencyMetrics =
    new StreamingLatencyMetrics();

const signatureSample: string[] = [];

const started =
    performance.now();

await runBoundedCount(
    APPLICATION_SMOKE_COUNT,
    CONCURRENCY,
    async (index) => {
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
            baseApplicationId
            + BigInt(index);

        const name =
            `phase15-smoke-app-${index}`;

        const instruction =
            buildRegisterApplicationInstruction({
                programId,
                authority:
                    authority.publicKey,
                applicationId,
                name,
                selectedEcosystem:
                    identity.ecosystem,
            });

        const txStarted =
            performance.now();

        const signature =
            await sendInstruction(
                connection,
                instruction,
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

const totalMs =
    performance.now() - started;

await runBoundedCount(
    APPLICATION_SMOKE_COUNT,
    CONCURRENCY,
    async (index) => {
        const identity =
            CANONICAL_ECOSYSTEMS[
                index
                % CANONICAL_ECOSYSTEMS.length
            ]!;

        const applicationId =
            baseApplicationId
            + BigInt(index);

        const name =
            `phase15-smoke-app-${index}`;

        const [application] =
            findApplicationPda(
                programId,
                authority.publicKey,
                applicationId,
            );

        const account =
            await connection.getAccountInfo(
                application,
                "confirmed",
            );

        if (account === null) {
            throw new Error(
                "PHASE15_SMOKE_ABORT=APPLICATION_ACCOUNT_MISSING",
            );
        }

        if (
            !account.owner.equals(
                programId,
            )
        ) {
            throw new Error(
                "PHASE15_SMOKE_ABORT=APPLICATION_OWNER_MISMATCH",
            );
        }

        const decoded =
            decodeApplicationAccount(
                account.data,
            );

        if (
            decoded.applicationId
                !== applicationId
            || !decoded.authority.equals(
                authority.publicKey,
            )
            || decoded.selectedEcosystem
                !== identity.ecosystem
            || decoded.status !== 1
            || decoded.name !== name
        ) {
            throw new Error(
                "PHASE15_SMOKE_ABORT=APPLICATION_STATE_MISMATCH",
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
    `PHASE15_APPLICATION_SMOKE_COUNT=${APPLICATION_SMOKE_COUNT}`,
);

console.log(
    `PHASE15_APPLICATION_STATE_PROOF=${APPLICATION_SMOKE_COUNT}_OF_${APPLICATION_SMOKE_COUNT}`,
);

console.log(
    `PHASE15_APPLICATION_SMOKE_CONCURRENCY=${CONCURRENCY}`,
);

console.log(
    `PHASE15_APPLICATION_SMOKE_TOTAL_MS=${totalMs.toFixed(3)}`,
);

console.log(
    `PHASE15_APPLICATION_SMOKE_TPS=${(
        APPLICATION_SMOKE_COUNT
        / (totalMs / 1000)
    ).toFixed(6)}`,
);

console.log(
    `PHASE15_APPLICATION_SMOKE_AVG_MS=${latency.averageMs.toFixed(3)}`,
);

console.log(
    `PHASE15_APPLICATION_SMOKE_P50_MS=${latency.p50Ms.toFixed(3)}`,
);

console.log(
    `PHASE15_APPLICATION_SMOKE_P95_MS=${latency.p95Ms.toFixed(3)}`,
);

console.log(
    `PHASE15_APPLICATION_SMOKE_P99_MS=${latency.p99Ms.toFixed(3)}`,
);

console.log(
    `PHASE15_APPLICATION_LATENCY_SAMPLE_COUNT=${latencyMetrics.sampleCount}`,
);

console.log(
    `PHASE15_APPLICATION_SIGNATURE_SAMPLE_COUNT=${signatureSample.length}`,
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
    "PHASE15_APPLICATION_STRESS_PASS",
);
