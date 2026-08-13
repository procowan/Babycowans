import fs from "node:fs";
import { statfs } from "node:fs/promises";

import {
    Connection,
    Keypair,
    PublicKey,
    sendAndConfirmTransaction,
    Transaction,
    TransactionInstruction,
} from "@solana/web3.js";

export const RPC_URL = "http://127.0.0.1:8899";

export const MIN_MEM_AVAILABLE_KB = 6 * 1024 * 1024;
export const MAX_SWAP_USED_KB = 0;
export const MIN_DISK_AVAILABLE_KB = 100 * 1024 * 1024;

export interface ResourceSnapshot {
    memAvailableKb: number;
    swapUsedKb: number;
    diskAvailableKb: number;
}

function readMemInfo(): Map<string, number> {
    const result = new Map<string, number>();

    for (
        const line of fs
            .readFileSync("/proc/meminfo", "utf8")
            .split("\n")
    ) {
        const match =
            /^([A-Za-z_]+):\s+(\d+)\s+kB$/.exec(line);

        if (match !== null) {
            result.set(
                match[1]!,
                Number(match[2]),
            );
        }
    }

    return result;
}

export async function resourceSnapshot(
    repositoryRoot: string,
): Promise<ResourceSnapshot> {
    const mem = readMemInfo();

    const memAvailableKb =
        mem.get("MemAvailable") ?? 0;

    const swapTotalKb =
        mem.get("SwapTotal") ?? 0;

    const swapFreeKb =
        mem.get("SwapFree") ?? 0;

    const stats =
        await statfs(repositoryRoot);

    const diskAvailableKb =
        Math.floor(
            Number(stats.bavail)
            * Number(stats.bsize)
            / 1024,
        );

    return {
        memAvailableKb,
        swapUsedKb:
            swapTotalKb - swapFreeKb,
        diskAvailableKb,
    };
}

export async function assertResourceSafety(
    connection: Connection,
    repositoryRoot: string,
): Promise<ResourceSnapshot> {
    const snapshot =
        await resourceSnapshot(repositoryRoot);

    if (
        snapshot.memAvailableKb
        < MIN_MEM_AVAILABLE_KB
    ) {
        throw new Error(
            "PHASE15_RESOURCE_STOP=MEMORY_PRESSURE",
        );
    }

    if (
        snapshot.swapUsedKb
        > MAX_SWAP_USED_KB
    ) {
        throw new Error(
            "PHASE15_RESOURCE_STOP=SWAP_USAGE",
        );
    }

    if (
        snapshot.diskAvailableKb
        < MIN_DISK_AVAILABLE_KB
    ) {
        throw new Error(
            "PHASE15_RESOURCE_STOP=DISK_PRESSURE",
        );
    }

    const version =
        await connection.getVersion();

    if (
        typeof version["solana-core"] !== "string"
    ) {
        throw new Error(
            "PHASE15_RESOURCE_STOP=VALIDATOR_UNHEALTHY",
        );
    }

    return snapshot;
}

export function loadAuthority(): Keypair {
    const secret =
        Uint8Array.from(
            JSON.parse(
                fs.readFileSync(
                    `${process.env.HOME}/.config/solana/id.json`,
                    "utf8",
                ),
            ),
        );

    return Keypair.fromSecretKey(secret);
}

export function loadProgramId(
    repositoryRoot: string,
): PublicKey {
    const path =
        `${repositoryRoot}`
        + "/protocol/babycowans-protocol"
        + "/target/deploy/"
        + "babycowans_protocol-keypair.json";

    const secret =
        Uint8Array.from(
            JSON.parse(
                fs.readFileSync(path, "utf8"),
            ),
        );

    return Keypair
        .fromSecretKey(secret)
        .publicKey;
}

export async function sendInstruction(
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

export async function runBounded<T>(
    values: readonly T[],
    concurrency: number,
    operation: (
        value: T,
        index: number,
    ) => Promise<void>,
): Promise<void> {
    if (
        !Number.isInteger(concurrency)
        || concurrency < 1
    ) {
        throw new Error(
            "Invalid bounded concurrency.",
        );
    }

    let nextIndex = 0;

    async function worker(): Promise<void> {
        while (true) {
            const index = nextIndex++;

            if (index >= values.length) {
                return;
            }

            await operation(
                values[index]!,
                index,
            );
        }
    }

    const workerCount =
        Math.min(
            concurrency,
            values.length,
        );

    await Promise.all(
        Array.from(
            { length: workerCount },
            () => worker(),
        ),
    );
}


export function readPositiveIntEnv(
    name: string,
    fallback: number,
): number {
    const raw = process.env[name];

    if (raw === undefined || raw.trim() === "") {
        return fallback;
    }

    const value = Number(raw);

    if (
        !Number.isSafeInteger(value)
        || value <= 0
    ) {
        throw new Error(
            `Invalid positive integer environment value: ${name}=${raw}`,
        );
    }

    return value;
}

export async function runBoundedCount(
    count: number,
    concurrency: number,
    operation: (
        index: number,
    ) => Promise<void>,
): Promise<void> {
    if (
        !Number.isSafeInteger(count)
        || count < 0
    ) {
        throw new Error(
            "Invalid bounded operation count.",
        );
    }

    if (
        !Number.isSafeInteger(concurrency)
        || concurrency < 1
    ) {
        throw new Error(
            "Invalid bounded concurrency.",
        );
    }

    if (count === 0) {
        return;
    }

    let nextIndex = 0;

    async function worker(): Promise<void> {
        while (true) {
            const index = nextIndex++;

            if (index >= count) {
                return;
            }

            await operation(index);
        }
    }

    const workerCount =
        Math.min(
            concurrency,
            count,
        );

    await Promise.all(
        Array.from(
            { length: workerCount },
            () => worker(),
        ),
    );
}
