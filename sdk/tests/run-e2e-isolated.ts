import {
    spawn,
    spawnSync,
    type ChildProcess,
} from "node:child_process";

import {
    closeSync,
    mkdtempSync,
    openSync,
    readFileSync,
    rmSync,
} from "node:fs";

import {
    tmpdir,
} from "node:os";

import path from "node:path";

import {
    fileURLToPath,
} from "node:url";

const currentFile =
    fileURLToPath(import.meta.url);

const testsDirectory =
    path.dirname(currentFile);

const sdkRoot =
    path.resolve(
        testsDirectory,
        "..",
    );

const repositoryRoot =
    path.resolve(
        sdkRoot,
        "..",
    );

const protocolRoot =
    path.join(
        repositoryRoot,
        "protocol",
        "babycowans-protocol",
    );

const validatorScript =
    path.join(
        repositoryRoot,
        "scripts",
        "start-local-validator.sh",
    );

const programSo =
    path.join(
        protocolRoot,
        "target",
        "deploy",
        "babycowans_protocol.so",
    );

const programKeypair =
    path.join(
        protocolRoot,
        "target",
        "deploy",
        "babycowans_protocol-keypair.json",
    );

const anchorToml =
    path.join(
        protocolRoot,
        "Anchor.toml",
    );

const canonicalAssets =
    path.join(
        protocolRoot,
        "programs",
        "babycowans-protocol",
        "src",
        "canonical_assets.rs",
    );

const canonicalFixtureCache =
    process.env.BABYCOWANS_CANONICAL_FIXTURE_CACHE ??
    path.join(
        tmpdir(),
        "babycowans-canonical-fixtures",
    );

const legacyTokenProgram =
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

const token2022Program =
    "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

const e2eScripts =
    process.env.BABYCOWANS_ISOLATED_SUITE === "god"
        ? ["test:god"]
        : [
    "test:e2e:initialize",
    "test:e2e:application",
    "test:e2e:asset",
    "test:e2e:configure",
    "test:e2e:payment",
    "test:e2e:membership",
    "test:e2e:reward",
    "test:e2e:audit",
] as const;

type CanonicalFixture = {
    code: string;
    mint: string;
    path: string;
};

type PortPlan = {
    rpc: number;
    faucet: number;
    gossip: number;
    dynamicStart: number;
    dynamicEnd: number;
    sourceRpc: number;
    sourceFaucet: number;
    sourceGossip: number;
    sourceDynamicStart: number;
    sourceDynamicEnd: number;
};

function run(
    command: string,
    args: string[],
    options: {
        cwd?: string;
        env?: NodeJS.ProcessEnv;
    } = {},
): string {
    const result =
        spawnSync(
            command,
            args,
            {
                cwd:
                    options.cwd ??
                    repositoryRoot,
                env:
                    options.env ??
                    process.env,
                encoding:
                    "utf8",
                stdio:
                    [
                        "ignore",
                        "pipe",
                        "pipe",
                    ],
            },
        );

    if (
        result.status !== 0
    ) {
        throw new Error(
            [
                `Command failed: ${command} ${args.join(" ")}`,
                result.stdout ?? "",
                result.stderr ?? "",
            ].join("\n"),
        );
    }

    return (
        result.stdout ?? ""
    ).trim();
}

function usedPorts(): Set<number> {
    const output =
        run(
            "ss",
            [
                "-ltnuH",
            ],
        );

    const ports =
        new Set<number>();

    for (
        const match of output.matchAll(
            /:(\d+)\b/g,
        )
    ) {
        ports.add(
            Number(match[1]),
        );
    }

    return ports;
}

function range(
    start: number,
    end: number,
): number[] {
    const values: number[] = [];

    for (
        let value = start;
        value <= end;
        value += 1
    ) {
        values.push(value);
    }

    return values;
}

function portPlanFor(
    base: number,
): PortPlan {
    return {
        rpc:
            base,
        faucet:
            base + 3,
        gossip:
            base + 2,
        dynamicStart:
            base + 10,
        dynamicEnd:
            base + 109,

        sourceRpc:
            base + 200,
        sourceFaucet:
            base + 203,
        sourceGossip:
            base + 202,
        sourceDynamicStart:
            base + 210,
        sourceDynamicEnd:
            base + 309,
    };
}

function selectPortPlan(): PortPlan {
    const occupied =
        usedPorts();

    const candidates = [
        21000,
        25000,
        29000,
        33000,
        37000,
        41000,
        45000,
        49000,
        53000,
        57000,
    ];

    for (
        const base of candidates
    ) {
        const plan =
            portPlanFor(base);

        const required = [
            plan.rpc,
            plan.rpc + 1,
            plan.faucet,
            plan.gossip,
            ...range(
                plan.dynamicStart,
                plan.dynamicEnd,
            ),
            plan.sourceRpc,
            plan.sourceRpc + 1,
            plan.sourceFaucet,
            plan.sourceGossip,
            ...range(
                plan.sourceDynamicStart,
                plan.sourceDynamicEnd,
            ),
        ];

        if (
            required.every(
                (port) =>
                    !occupied.has(port),
            )
        ) {
            return plan;
        }
    }

    throw new Error(
        "No isolated validator port block is available.",
    );
}

function sleep(
    milliseconds: number,
): Promise<void> {
    return new Promise(
        (resolve) => {
            setTimeout(
                resolve,
                milliseconds,
            );
        },
    );
}

async function waitForHealth(
    rpcUrl: string,
    validator: ChildProcess,
    logPath: string,
): Promise<void> {
    for (
        let attempt = 0;
        attempt < 180;
        attempt += 1
    ) {
        if (
            validator.exitCode !== null
        ) {
            const log =
                readFileSync(
                    logPath,
                    "utf8",
                );

            throw new Error(
                [
                    "Isolated validator exited before health check.",
                    log.slice(-12000),
                ].join("\n"),
            );
        }

        try {
            const response =
                await fetch(
                    rpcUrl,
                    {
                        method:
                            "POST",
                        headers: {
                            "content-type":
                                "application/json",
                        },
                        body:
                            JSON.stringify({
                                jsonrpc:
                                    "2.0",
                                id:
                                    1,
                                method:
                                    "getHealth",
                            }),
                    },
                );

            const value =
                await response.json() as {
                    result?: string;
                };

            if (
                value.result === "ok"
            ) {
                return;
            }
        } catch {
            // Validator is still starting.
        }

        await sleep(1000);
    }

    const log =
        readFileSync(
            logPath,
            "utf8",
        );

    throw new Error(
        [
            "Timed out waiting for isolated validator.",
            log.slice(-12000),
        ].join("\n"),
    );
}

function processGroupExists(
    pid: number,
): boolean {
    try {
        process.kill(
            -pid,
            0,
        );

        return true;
    } catch {
        return false;
    }
}

async function stopOwnedProcessGroup(
    pid: number,
): Promise<void> {
    if (
        !processGroupExists(pid)
    ) {
        return;
    }

    try {
        process.kill(
            -pid,
            "SIGTERM",
        );
    } catch {
        return;
    }

    for (
        let attempt = 0;
        attempt < 30;
        attempt += 1
    ) {
        if (
            !processGroupExists(pid)
        ) {
            return;
        }

        await sleep(100);
    }

    if (
        processGroupExists(pid)
    ) {
        process.kill(
            -pid,
            "SIGKILL",
        );
    }
}

function deriveProgramId(): string {
    return run(
        "solana",
        [
            "address",
            "-k",
            programKeypair,
        ],
    );
}

function anchorProgramId(): string {
    const source =
        readFileSync(
            anchorToml,
            "utf8",
        );

    const match =
        source.match(
            /^[ \t]*babycowans_protocol[ \t]*=[ \t]*"([^"]+)"/m,
        );

    if (
        match === null
    ) {
        throw new Error(
            "Unable to resolve Babycowans program ID from Anchor.toml.",
        );
    }

    return match[1];
}

function resolveCanonicalFixtures():
    CanonicalFixture[] | null {
    const source =
        readFileSync(
            canonicalAssets,
            "utf8",
        );

    const pattern =
        /pub const (BRC|BEC|BGC|BLC|BBC|BAC)_MINT:\s*Pubkey\s*=\s*pubkey!\("([^"]+)"\)/gu;

    const pairs =
        Array.from(
            source.matchAll(pattern),
            (match) => ({
                code:
                    match[1],
                mint:
                    match[2],
            }),
        );

    const expectedCodes = [
        "BRC",
        "BEC",
        "BGC",
        "BLC",
        "BBC",
        "BAC",
    ];

    if (
        pairs.length !==
        expectedCodes.length
    ) {
        throw new Error(
            `Canonical mint extraction failed: ${pairs.length}`,
        );
    }

    for (
        let index = 0;
        index < expectedCodes.length;
        index += 1
    ) {
        if (
            pairs[index].code !==
            expectedCodes[index]
        ) {
            throw new Error(
                `Canonical mint ordering mismatch at ${index}.`,
            );
        }
    }

    const fixtures:
        CanonicalFixture[] = [];

    for (
        const pair of pairs
    ) {
        const fixturePath =
            path.join(
                canonicalFixtureCache,
                `${pair.code}.json`,
            );

        let raw: string;

        try {
            raw =
                readFileSync(
                    fixturePath,
                    "utf8",
                );
        } catch {
            return null;
        }

        let value: unknown;

        try {
            value =
                JSON.parse(raw);
        } catch {
            return null;
        }

        if (
            typeof value !== "object" ||
            value === null
        ) {
            return null;
        }

        const record =
            value as {
                pubkey?: unknown;
                account?: unknown;
            };

        if (
            record.pubkey !==
            pair.mint
        ) {
            return null;
        }

        if (
            typeof record.account !==
                "object" ||
            record.account === null
        ) {
            return null;
        }

        const account =
            record.account as {
                owner?: unknown;
                data?: unknown;
                lamports?: unknown;
            };

        if (
            account.owner !==
                legacyTokenProgram &&
            account.owner !==
                token2022Program
        ) {
            return null;
        }

        if (
            account.data === undefined ||
            typeof account.lamports !==
                "number"
        ) {
            return null;
        }

        fixtures.push({
            code:
                pair.code,
            mint:
                pair.mint,
            path:
                fixturePath,
        });
    }

    return fixtures;
}

async function main(): Promise<void> {
    const programId =
        deriveProgramId();

    const configuredProgramId =
        anchorProgramId();

    if (
        programId !==
        configuredProgramId
    ) {
        throw new Error(
            `Program ID mismatch: ${programId} != ${configuredProgramId}`,
        );
    }

    const deployHelp =
        run(
            "solana",
            [
                "program",
                "deploy",
                "--help",
            ],
        );

    if (
        !deployHelp.includes(
            "--program-id",
        ) ||
        !deployHelp.includes(
            "--url",
        ) ||
        !deployHelp.includes(
            "--use-rpc",
        )
    ) {
        throw new Error(
            "Installed Solana CLI does not expose the required deploy contract.",
        );
    }

    const plan =
        selectPortPlan();

    if (
        plan.rpc === 8899
    ) {
        throw new Error(
            "Isolated runner attempted to use the primary validator port.",
        );
    }

    const runtimeRoot =
        mkdtempSync(
            path.join(
                tmpdir(),
                "babycowans-e2e-isolated-",
            ),
        );

    const ledger =
        path.join(
            runtimeRoot,
            "ledger",
        );

    const validatorLog =
        path.join(
            runtimeRoot,
            "validator.log",
        );

    const logFd =
        openSync(
            validatorLog,
            "w",
        );

    const rpcUrl =
        `http://127.0.0.1:${plan.rpc}`;

    const validatorEnvironment: NodeJS.ProcessEnv = {
        ...process.env,

        BABYCOWANS_LEDGER:
            ledger,

        BABYCOWANS_FIXTURE_DIR:
            canonicalFixtureCache,

        BABYCOWANS_RPC_PORT:
            String(plan.rpc),

        BABYCOWANS_FAUCET_PORT:
            String(plan.faucet),

        BABYCOWANS_GOSSIP_PORT:
            String(plan.gossip),

        BABYCOWANS_DYNAMIC_PORT_RANGE:
            `${plan.dynamicStart}-${plan.dynamicEnd}`,

        BABYCOWANS_FIXTURE_RPC_PORT:
            String(plan.sourceRpc),

        BABYCOWANS_FIXTURE_FAUCET_PORT:
            String(plan.sourceFaucet),

        BABYCOWANS_FIXTURE_GOSSIP_PORT:
            String(plan.sourceGossip),

        BABYCOWANS_FIXTURE_DYNAMIC_PORT_RANGE:
            `${plan.sourceDynamicStart}-${plan.sourceDynamicEnd}`,
    };

    const canonicalFixtures =
        resolveCanonicalFixtures();

    let validatorCommand: string;
    let validatorArguments: string[];

    if (
        canonicalFixtures !== null
    ) {
        validatorCommand =
            "solana-test-validator";

        validatorArguments = [
            "--reset",
            "--ledger",
            ledger,
            "--rpc-port",
            String(plan.rpc),
            "--faucet-port",
            String(plan.faucet),
            "--gossip-port",
            String(plan.gossip),
            "--dynamic-port-range",
            `${plan.dynamicStart}-${plan.dynamicEnd}`,
        ];

        for (
            const fixture of
            canonicalFixtures
        ) {
            validatorArguments.push(
                "--account",
                fixture.mint,
                fixture.path,
            );
        }

        console.log(
            "X21_CANONICAL_FIXTURE_MODE=VALIDATED_CACHE_REUSE",
        );

        console.log(
            `X21_VALIDATED_FIXTURE_COUNT=${canonicalFixtures.length}`,
        );
    } else {
        validatorCommand =
            "bash";

        validatorArguments = [
            validatorScript,
        ];

        console.log(
            "X21_CANONICAL_FIXTURE_MODE=REPOSITORY_BOOTSTRAP_FALLBACK",
        );
    }

    const validator =
        spawn(
            validatorCommand,
            validatorArguments,
            {
                cwd:
                    repositoryRoot,
                env:
                    validatorEnvironment,
                detached:
                    true,
                stdio:
                    [
                        "ignore",
                        logFd,
                        logFd,
                    ],
            },
        );

    if (
        validator.pid === undefined
    ) {
        closeSync(logFd);

        rmSync(
            runtimeRoot,
            {
                recursive:
                    true,
                force:
                    true,
            },
        );

        throw new Error(
            "Unable to obtain isolated validator process ID.",
        );
    }

    try {
        console.log(
            `X21_ISOLATED_RPC_URL=${rpcUrl}`,
        );

        console.log(
            `X21_ISOLATED_VALIDATOR_PROCESS_GROUP=${validator.pid}`,
        );

        await waitForHealth(
            rpcUrl,
            validator,
            validatorLog,
        );

        console.log(
            "X21_ISOLATED_VALIDATOR_HEALTH=PASS",
        );

        if (
            resolveCanonicalFixtures() ===
            null
        ) {
            throw new Error(
                "Canonical fixture cache validation failed after validator startup.",
            );
        }

        console.log(
            "X21_CANONICAL_FIXTURE_VALIDATION=PASS",
        );

        const authority =
            run(
                "solana",
                [
                    "address",
                ],
            );

        run(
            "solana",
            [
                "airdrop",
                "20",
                authority,
                "--url",
                rpcUrl,
            ],
        );

        console.log(
            "X21_ISOLATED_AUTHORITY_FUNDING=PASS",
        );

        const deployOutput =
            run(
                "solana",
                [
                    "program",
                    "deploy",
                    programSo,
                    "--program-id",
                    programKeypair,
                    "--url",
                    rpcUrl,
                    "--use-rpc",
                ],
        );

        console.log(
            deployOutput,
        );

        const programShow =
            run(
                "solana",
                [
                    "program",
                    "show",
                    programId,
                    "--url",
                    rpcUrl,
                ],
        );

        if (
            !programShow.includes(
                programId,
            )
        ) {
            throw new Error(
                "Deployed program identity verification failed.",
            );
        }

        console.log(
            `X21_ISOLATED_PROGRAM_ID=${programId}`,
        );

        console.log(
            "X21_ISOLATED_PROGRAM_DEPLOY=PASS",
        );

        const testEnvironment: NodeJS.ProcessEnv = {
            ...process.env,
            BABYCOWANS_RPC_URL:
                rpcUrl,
        };

        for (
            const script of e2eScripts
        ) {
            console.log(
                `X21_E2E_STEP_START=${script}`,
            );

            const output =
                run(
                    "yarn",
                    [
                        script,
                    ],
                    {
                        cwd:
                            sdkRoot,
                        env:
                            testEnvironment,
                    },
                );

            if (
                output.length > 0
            ) {
                console.log(
                    output,
                );
            }

            console.log(
                `X21_E2E_STEP_PASS=${script}`,
            );
        }

        console.log(
            "X21_ISOLATED_E2E_SEQUENCE=PASS",
        );
    } finally {
        await stopOwnedProcessGroup(
            validator.pid,
        );

        closeSync(logFd);

        rmSync(
            runtimeRoot,
            {
                recursive:
                    true,
                force:
                    true,
            },
        );

        console.log(
            "X21_ISOLATED_RUNTIME_CLEANUP=PASS",
        );
    }
}

await main();
