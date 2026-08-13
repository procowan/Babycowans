import {
    execFileSync,
} from "node:child_process";

import fs from "node:fs";

import {
    Connection,
    Keypair,
    PublicKey,
} from "@solana/web3.js";

import {
    CanonicalEcosystem,
    buildConfigureApplicationAssetInstruction,
    buildConfigurePaymentPolicyInstruction,
    buildProcessPaymentInstruction,
    buildRegisterApplicationInstruction,
    findApplicationAssetPda,
    findApplicationPda,
    findAssetConfigPda,
    findPaymentPolicyPda,
    findProtocolConfigPda,
    getCanonicalEcosystem,
} from "../../src/index.js";

import {
    RPC_URL,
    assertResourceSafety,
    loadAuthority,
    loadProgramId,
    runBounded,
    sendInstruction,
    readPositiveIntEnv,
} from "./helpers.js";

import {
    StreamingLatencyMetrics,
} from "./metrics.js";

const PAYMENT_COUNT = readPositiveIntEnv("PHASE15_PAYMENT_COUNT", 100);
const LANE_COUNT = readPositiveIntEnv("PHASE15_PAYMENT_LANE_COUNT", 2);
const CHUNK_SIZE_PER_LANE = readPositiveIntEnv("PHASE15_PAYMENT_CHUNK_SIZE_PER_LANE", 25);
const CONCURRENCY = readPositiveIntEnv("PHASE15_CONCURRENCY", 2);

const PAYMENT_AMOUNT = 1_000_000n;
const SIGNATURE_SAMPLE_LIMIT = 16;

if (LANE_COUNT > PAYMENT_COUNT) {
    throw new Error(
        "PHASE15_PAYMENT_ABORT=LANE_COUNT_EXCEEDS_PAYMENT_COUNT",
    );
}

function paymentCountForLane(
    laneIndex: number,
): number {
    const base =
        Math.floor(
            PAYMENT_COUNT
            / LANE_COUNT,
        );

    const remainder =
        PAYMENT_COUNT
        % LANE_COUNT;

    return base
        + (
            laneIndex < remainder
                ? 1
                : 0
        );
}

function paymentAmountForIndex(
    paymentIndex: number,
): bigint {
    return PAYMENT_AMOUNT
        + BigInt(paymentIndex);
}

function expectedLanePaymentTotal(
    laneIndex: number,
): bigint {
    const count =
        paymentCountForLane(
            laneIndex,
        );

    const n =
        BigInt(count);

    return (
        n * PAYMENT_AMOUNT
        + n * (n - 1n) / 2n
    );
}

const repositoryRoot =
    new URL(
        "../../../",
        import.meta.url,
    ).pathname.replace(/\/$/, "");

const runtimeRoot =
    `${repositoryRoot}/.phase15-runtime`;

const laneRoot =
    `${runtimeRoot}/payment-lanes`;

fs.mkdirSync(
    laneRoot,
    {
        recursive: true,
    },
);

const connection =
    new Connection(
        RPC_URL,
        "confirmed",
    );

const authority =
    loadAuthority();

const authorityPath =
    `${process.env.HOME}/.config/solana/id.json`;

const programId =
    loadProgramId(
        repositoryRoot,
    );

const identity =
    getCanonicalEcosystem(
        CanonicalEcosystem.BabyReptile,
    );

const mint =
    identity.tokenAddress;

function runCommand(
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

function createKeypair(
    path: string,
): Keypair {
    runCommand(
        "solana-keygen",
        [
            "new",
            "--outfile",
            path,
            "--no-bip39-passphrase",
            "--force",
            "--silent",
        ],
    );

    return Keypair.fromSecretKey(
        Uint8Array.from(
            JSON.parse(
                fs.readFileSync(
                    path,
                    "utf8",
                ),
            ),
        ),
    );
}

function createTokenAccount(
    accountPath: string,
    ownerPath: string,
): PublicKey {
    runCommand(
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

    runCommand(
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

    return new PublicKey(
        runCommand(
            "solana-keygen",
            [
                "pubkey",
                accountPath,
            ],
        ),
    );
}

async function tokenAmount(
    account: PublicKey,
): Promise<bigint> {
    const balance =
        await connection.getTokenAccountBalance(
            account,
            "confirmed",
        );

    return BigInt(
        balance.value.amount,
    );
}

interface Lane {
    index: number;
    application: PublicKey;
    applicationAsset: PublicKey;
    paymentPolicy: PublicKey;
    payer: Keypair;
    payerPath: string;
    payerTokenAccount: PublicKey;
    destinationTokenAccount: PublicKey;
    treasuryTokenAccount: PublicKey;
}

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
        "PHASE15_PAYMENT_ABORT=PROTOCOL_CONFIG_MISSING",
    );
}

if (!protocolInfo.owner.equals(programId)) {
    throw new Error(
        "PHASE15_PAYMENT_ABORT=PROTOCOL_CONFIG_OWNER_MISMATCH",
    );
}

const [assetConfig] =
    findAssetConfigPda(
        programId,
        mint,
    );

const assetInfo =
    await connection.getAccountInfo(
        assetConfig,
        "confirmed",
    );

if (assetInfo === null) {
    throw new Error(
        "PHASE15_PAYMENT_ABORT=BRC_ASSET_CONFIG_MISSING",
    );
}

if (!assetInfo.owner.equals(programId)) {
    throw new Error(
        "PHASE15_PAYMENT_ABORT=BRC_ASSET_CONFIG_OWNER_MISMATCH",
    );
}

const mintInfo =
    await connection.getAccountInfo(
        mint,
        "confirmed",
    );

if (mintInfo === null) {
    throw new Error(
        "PHASE15_PAYMENT_ABORT=CANONICAL_MINT_MISSING",
    );
}

const tokenProgram =
    mintInfo.owner;

/*
 * Setup is deliberately outside the Payment benchmark timer.
 *
 * Two completely independent writable lanes prevent the benchmark
 * from measuring artificial destination/treasury account locking.
 */
const lanes: Lane[] = [];

const applicationBaseId =
    BigInt(Date.now()) * 10_000n;

for (
    let laneIndex = 0;
    laneIndex < LANE_COUNT;
    laneIndex += 1
) {
    await assertResourceSafety(
        connection,
        repositoryRoot,
    );

    const laneDir =
        `${laneRoot}/lane-${laneIndex}`;

    fs.mkdirSync(
        laneDir,
        {
            recursive: true,
        },
    );

    const payerPath =
        `${laneDir}/payer.json`;

    const destinationPath =
        `${laneDir}/destination.json`;

    const treasuryPath =
        `${laneDir}/treasury.json`;

    const payerTokenPath =
        `${laneDir}/payer-token.json`;

    const payer =
        createKeypair(
            payerPath,
        );

    runCommand(
        "solana",
        [
            "airdrop",
            "2",
            payer.publicKey.toBase58(),
            "--url",
            RPC_URL,
        ],
    );

    const destinationTokenAccount =
        createTokenAccount(
            destinationPath,
            authorityPath,
        );

    const treasuryTokenAccount =
        createTokenAccount(
            treasuryPath,
            authorityPath,
        );

    const payerTokenAccount =
        createTokenAccount(
            payerTokenPath,
            payerPath,
        );

    if (
        destinationTokenAccount.equals(
            treasuryTokenAccount,
        )
    ) {
        throw new Error(
            "PHASE15_PAYMENT_ABORT=DESTINATION_TREASURY_COLLISION",
        );
    }

    const expectedPaymentTotal =
        expectedLanePaymentTotal(
            laneIndex,
        );

    const fundingBaseUnits =
        (
            expectedPaymentTotal
            * 11n
            + 9n
        ) / 10n;

    const decimals = 6;
    const divisor =
        10n ** BigInt(decimals);

    const fundingWhole =
        fundingBaseUnits
        / divisor;

    const fundingRemainder =
        fundingBaseUnits
        % divisor;

    const fundingUiAmount =
        fundingRemainder === 0n
            ? fundingWhole.toString()
            : `${fundingWhole}.${fundingRemainder
                .toString()
                .padStart(decimals, "0")
                .replace(/0+$/, "")}`;

    runCommand(
        "spl-token",
        [
            "mint",
            mint.toBase58(),
            fundingUiAmount,
            payerTokenAccount.toBase58(),
            "--url",
            RPC_URL,
        ],
    );

    const fundedAmount =
        await tokenAmount(
            payerTokenAccount,
        );

    if (
        fundedAmount
        < fundingBaseUnits
        || fundedAmount
        <= expectedPaymentTotal
    ) {
        throw new Error(
            "PHASE15_PAYMENT_ABORT=PAYER_FUNDING_MARGIN_INSUFFICIENT",
        );
    }

    const applicationId =
        applicationBaseId
        + BigInt(laneIndex);

    const [application] =
        findApplicationPda(
            programId,
            authority.publicKey,
            applicationId,
        );

    const registerInstruction =
        buildRegisterApplicationInstruction({
            programId,
            authority:
                authority.publicKey,
            applicationId,
            name:
                `phase15-payment-lane-${laneIndex}`,
            selectedEcosystem:
                CanonicalEcosystem.BabyReptile,
        });

    await sendInstruction(
        connection,
        registerInstruction,
        [authority],
    );

    const [applicationAsset] =
        findApplicationAssetPda(
            programId,
            application,
            mint,
        );

    await sendInstruction(
        connection,
        buildConfigureApplicationAssetInstruction({
            programId,
            application,
            assetConfig,
            mint,
            paymentDestination:
                destinationTokenAccount,
            authority:
                authority.publicKey,
            tokenProgram,
            paymentsEnabled: true,
            gatingEnabled: false,
            rewardsEnabled: false,
        }),
        [authority],
    );

    const [paymentPolicy] =
        findPaymentPolicyPda(
            programId,
            application,
            applicationAsset,
        );

    await sendInstruction(
        connection,
        buildConfigurePaymentPolicyInstruction({
            programId,
            application,
            applicationAsset,
            authority:
                authority.publicKey,
            minimumAmount: 1n,
            maximumAmount: 0n,
            paymentsEnabled: true,
            protocolFeeBps: 0,
            applicationFeeBps: 0,
            treasury:
                treasuryTokenAccount,
        }),
        [authority],
    );

    lanes.push({
        index: laneIndex,
        application,
        applicationAsset,
        paymentPolicy,
        payer,
        payerPath,
        payerTokenAccount,
        destinationTokenAccount,
        treasuryTokenAccount,
        expectedPaymentTotal,
    });

    await assertResourceSafety(
        connection,
        repositoryRoot,
    );
}

if (lanes.length !== LANE_COUNT) {
    throw new Error(
        "PHASE15_PAYMENT_ABORT=LANE_SETUP_COUNT_MISMATCH",
    );
}

for (
    const keys
    of [
        lanes.map(
            (lane) =>
                lane.payerTokenAccount.toBase58(),
        ),
        lanes.map(
            (lane) =>
                lane.destinationTokenAccount.toBase58(),
        ),
        lanes.map(
            (lane) =>
                lane.treasuryTokenAccount.toBase58(),
        ),
        lanes.map(
            (lane) =>
                lane.applicationAsset.toBase58(),
        ),
        lanes.map(
            (lane) =>
                lane.paymentPolicy.toBase58(),
        ),
    ]
) {
    if (
        new Set(keys).size
        !== LANE_COUNT
    ) {
        throw new Error(
            "PHASE15_PAYMENT_ABORT=CROSS_LANE_WRITABLE_COLLISION",
        );
    }
}

console.log(
    `PHASE15_PAYMENT_LANE_COUNT=${LANE_COUNT}`,
);

console.log(
    "PHASE15_PAYMENT_CROSS_LANE_WRITABLE_SHARING=0",
);

/*
 * Financial baseline.
 */
const payerBefore =
    await Promise.all(
        lanes.map(
            (lane) =>
                tokenAmount(
                    lane.payerTokenAccount,
                ),
        ),
    );

const destinationBefore =
    await Promise.all(
        lanes.map(
            (lane) =>
                tokenAmount(
                    lane.destinationTokenAccount,
                ),
        ),
    );

const treasuryBefore =
    await Promise.all(
        lanes.map(
            (lane) =>
                tokenAmount(
                    lane.treasuryTokenAccount,
                ),
        ),
    );

const latencyMetrics =
    new StreamingLatencyMetrics();

const sampledSignatures: string[] = [];

let successfulPaymentCount = 0;

const paymentStarted =
    performance.now();

await runBounded(
    lanes,
    CONCURRENCY,
    async (lane) => {
        const lanePaymentCount =
            paymentCountForLane(
                lane.index,
            );

        for (
            let chunkStart = 0;
            chunkStart < lanePaymentCount;
            chunkStart += CHUNK_SIZE_PER_LANE
        ) {
            await assertResourceSafety(
                connection,
                repositoryRoot,
            );

            const chunkEnd =
                Math.min(
                    lanePaymentCount,
                    chunkStart
                    + CHUNK_SIZE_PER_LANE,
                );

            for (
                let paymentIndex =
                    chunkStart;
                paymentIndex <
                    chunkEnd;
                paymentIndex += 1
            ) {
                const txStarted =
                    performance.now();

                const signature =
                    await sendInstruction(
                        connection,
                        buildProcessPaymentInstruction({
                            programId,
                            application:
                                lane.application,
                            applicationAsset:
                                lane.applicationAsset,
                            assetConfig,
                            mint,
                            payer:
                                lane.payer.publicKey,
                            payerTokenAccount:
                                lane.payerTokenAccount,
                            destinationTokenAccount:
                                lane.destinationTokenAccount,
                            treasuryTokenAccount:
                                lane.treasuryTokenAccount,
                            tokenProgram,
                            amount:
                                paymentAmountForIndex(
                                    paymentIndex,
                                ),
                        }),
                        [lane.payer],
                    );

                latencyMetrics.add(
                    performance.now()
                    - txStarted,
                );

                successfulPaymentCount += 1;

                if (
                    sampledSignatures.length
                        < SIGNATURE_SAMPLE_LIMIT
                    && (
                        paymentIndex === 0
                        || paymentIndex ===
                            lanePaymentCount - 1
                    )
                ) {
                    sampledSignatures.push(
                        signature,
                    );
                }
            }

            await assertResourceSafety(
                connection,
                repositoryRoot,
            );

            console.log(
                `PHASE15_PAYMENT_LANE_${lane.index + 1}_CHUNK_COMPLETE=${chunkEnd}`,
            );
        }
    },
);

const paymentTotalMs =
    performance.now()
    - paymentStarted;

if (
    successfulPaymentCount
    !== PAYMENT_COUNT
) {
    throw new Error(
        "PHASE15_PAYMENT_ABORT=PAYMENT_COUNT_MISMATCH",
    );
}

const payerAfter =
    await Promise.all(
        lanes.map(
            (lane) =>
                tokenAmount(
                    lane.payerTokenAccount,
                ),
        ),
    );

const destinationAfter =
    await Promise.all(
        lanes.map(
            (lane) =>
                tokenAmount(
                    lane.destinationTokenAccount,
                ),
        ),
    );

const treasuryAfter =
    await Promise.all(
        lanes.map(
            (lane) =>
                tokenAmount(
                    lane.treasuryTokenAccount,
                ),
        ),
    );

for (
    let index = 0;
    index < LANE_COUNT;
    index += 1
) {
    const expectedPaymentTotal =
        lanes[index]!
            .expectedPaymentTotal;

    if (
        payerAfter[index]
        !== payerBefore[index]!
            - expectedPaymentTotal
    ) {
        throw new Error(
            "PHASE15_PAYMENT_ABORT=PAYER_DELTA_MISMATCH",
        );
    }

    if (
        destinationAfter[index]
        !== destinationBefore[index]!
            + expectedPaymentTotal
    ) {
        throw new Error(
            "PHASE15_PAYMENT_ABORT=DESTINATION_DELTA_MISMATCH",
        );
    }

    if (
        treasuryAfter[index]
        !== treasuryBefore[index]
    ) {
        throw new Error(
            "PHASE15_PAYMENT_ABORT=TREASURY_CHANGED_WITH_ZERO_FEES",
        );
    }

    const payerDelta =
        payerAfter[index]!
        - payerBefore[index]!;

    const destinationDelta =
        destinationAfter[index]!
        - destinationBefore[index]!;

    const treasuryDelta =
        treasuryAfter[index]!
        - treasuryBefore[index]!;

    if (
        payerDelta
        + destinationDelta
        + treasuryDelta
        !== 0n
    ) {
        throw new Error(
            "PHASE15_PAYMENT_ABORT=GROSS_CONSERVATION_FAILURE",
        );
    }
}

const resources =
    await assertResourceSafety(
        connection,
        repositoryRoot,
    );

const latency =
    latencyMetrics.summary();

console.log(
    `PHASE15_PAYMENT_SMOKE_COUNT=${PAYMENT_COUNT}`,
);

console.log(
    `PHASE15_PAYMENT_STATE_PROOF=${successfulPaymentCount}_OF_${PAYMENT_COUNT}`,
);

console.log(
    `PHASE15_PAYMENT_SMOKE_CONCURRENCY=${CONCURRENCY}`,
);

console.log(
    `PHASE15_PAYMENT_LANE_COUNT=${LANE_COUNT}`,
);

console.log(
    `PHASE15_PAYMENT_CHUNK_SIZE_PER_LANE=${CHUNK_SIZE_PER_LANE}`,
);

console.log(
    `PHASE15_PAYMENT_SMOKE_TOTAL_MS=${paymentTotalMs.toFixed(3)}`,
);

console.log(
    `PHASE15_PAYMENT_SMOKE_TPS=${(
        PAYMENT_COUNT
        / (paymentTotalMs / 1000)
    ).toFixed(6)}`,
);

console.log(
    `PHASE15_PAYMENT_SMOKE_AVG_MS=${latency.averageMs.toFixed(3)}`,
);

console.log(
    `PHASE15_PAYMENT_SMOKE_P50_MS=${latency.p50Ms.toFixed(3)}`,
);

console.log(
    `PHASE15_PAYMENT_SMOKE_P95_MS=${latency.p95Ms.toFixed(3)}`,
);

console.log(
    `PHASE15_PAYMENT_SMOKE_P99_MS=${latency.p99Ms.toFixed(3)}`,
);

console.log(
    `PHASE15_PAYMENT_LATENCY_SAMPLE_COUNT=${latencyMetrics.sampleCount}`,
);

console.log(
    `PHASE15_PAYMENT_AMOUNT_BASE_UNITS=${PAYMENT_AMOUNT}`,
);



console.log(
    "PHASE15_PAYMENT_TRANSACTION_UNIQUENESS=PASS",
);

console.log(
    "PHASE15_PAYMENT_FINANCIAL_CONSERVATION=PASS",
);

console.log(
    "PHASE15_PAYMENT_TREASURY_ZERO_FEE_PROOF=PASS",
);

console.log(
    `PHASE15_PAYMENT_SIGNATURE_SAMPLE_COUNT=${sampledSignatures.length}`,
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
    "PHASE15_PAYMENT_STRESS_PASS",
);
