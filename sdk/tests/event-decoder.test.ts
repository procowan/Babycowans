import assert from "node:assert/strict";
import test from "node:test";

import { PublicKey } from "@solana/web3.js";

import {
    BABYCOWANS_IDL,
    decodeBabycowansEventLogs,
} from "../src/index.js";

type EventDefinition = {
    name: string;
    discriminator: number[];
};

function findEvent(name: string): EventDefinition {
    const events = BABYCOWANS_IDL.events as readonly EventDefinition[];
    const event = events.find((candidate) => candidate.name === name);

    assert.ok(event, `IDL event ${name} must exist`);

    return event;
}

function encodeU64(value: bigint): Buffer {
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64LE(value);
    return buffer;
}

function encodeI64(value: bigint): Buffer {
    const buffer = Buffer.alloc(8);
    buffer.writeBigInt64LE(value);
    return buffer;
}

function encodeString(value: string): Buffer {
    const bytes = Buffer.from(value, "utf8");
    const length = Buffer.alloc(4);

    length.writeUInt32LE(bytes.length);

    return Buffer.concat([length, bytes]);
}

function eventLog(
    name: string,
    data: readonly Buffer[],
): string {
    const event = findEvent(name);

    return `Program data: ${Buffer.concat([
        Buffer.from(event.discriminator),
        ...data,
    ]).toString("base64")}`;
}

test("returns an empty array for missing or unrelated logs", () => {
    assert.deepEqual(decodeBabycowansEventLogs(undefined), []);
    assert.deepEqual(decodeBabycowansEventLogs(null), []);
    assert.deepEqual(decodeBabycowansEventLogs([]), []);

    assert.deepEqual(
        decodeBabycowansEventLogs([
            "Program log: Instruction: SomethingElse",
            "Program 11111111111111111111111111111111 invoke [1]",
            "Program 11111111111111111111111111111111 success",
        ]),
        [],
    );
});

test("ignores an unrelated Program data discriminator", () => {
    const payload = Buffer.concat([
        Buffer.from([255, 255, 255, 255, 255, 255, 255, 255]),
        Buffer.from([1, 2, 3, 4]),
    ]);

    const events = decodeBabycowansEventLogs([
        `Program data: ${payload.toString("base64")}`,
    ]);

    assert.deepEqual(events, []);
});

test("decodes ProtocolPauseChanged with PublicKey, bool and i64 fidelity", () => {
    const authority = new PublicKey(
        Buffer.from(Array.from({ length: 32 }, (_, i) => i + 1)),
    );

    const timestamp = -1234567890123n;

    const events = decodeBabycowansEventLogs([
        eventLog("ProtocolPauseChanged", [
            authority.toBuffer(),
            Buffer.from([1]),
            encodeI64(timestamp),
        ]),
    ]);

    assert.equal(events.length, 1);
    assert.equal(events[0]?.name, "ProtocolPauseChanged");

    const data = events[0]?.data as {
        authority: PublicKey;
        paused: boolean;
        timestamp: bigint;
    };

    assert.ok(data.authority instanceof PublicKey);
    assert.equal(data.authority.toBase58(), authority.toBase58());
    assert.equal(data.paused, true);
    assert.equal(data.timestamp, timestamp);
});

test("decodes RewardCreated without losing u64/i64/string fidelity", () => {
    const application = new PublicKey(
        Buffer.alloc(32, 11),
    );

    const beneficiary = new PublicKey(
        Buffer.alloc(32, 22),
    );

    const asset = new PublicKey(
        Buffer.alloc(32, 33),
    );

    const rewardId = 9_007_199_254_740_993n;
    const amount = 18_446_744_073_709_551_000n;
    const claimableAt = 1_800_000_000n;
    const expiresAt = 1_900_000_000n;
    const category = 7;
    const reason = "Phase 9 decoder semantic proof";
    const timestamp = 1_700_000_000n;

    const events = decodeBabycowansEventLogs([
        eventLog("RewardCreated", [
            application.toBuffer(),
            beneficiary.toBuffer(),
            encodeU64(rewardId),
            asset.toBuffer(),
            encodeU64(amount),
            encodeI64(claimableAt),
            encodeI64(expiresAt),
            Buffer.from([category]),
            encodeString(reason),
            encodeI64(timestamp),
        ]),
    ]);

    assert.equal(events.length, 1);
    assert.equal(events[0]?.name, "RewardCreated");

    const data = events[0]?.data as {
        application: PublicKey;
        beneficiary: PublicKey;
        reward_id: bigint;
        asset: PublicKey;
        amount: bigint;
        claimable_at: bigint;
        expires_at: bigint;
        category: number;
        reason: string;
        timestamp: bigint;
    };

    assert.equal(
        data.application.toBase58(),
        application.toBase58(),
    );

    assert.equal(
        data.beneficiary.toBase58(),
        beneficiary.toBase58(),
    );

    assert.equal(
        data.asset.toBase58(),
        asset.toBase58(),
    );

    assert.equal(data.reward_id, rewardId);
    assert.equal(data.amount, amount);
    assert.equal(data.claimable_at, claimableAt);
    assert.equal(data.expires_at, expiresAt);
    assert.equal(data.category, category);
    assert.equal(data.reason, reason);
    assert.equal(data.timestamp, timestamp);
});

test("preserves event ordering across multiple event logs", () => {
    const authority = new PublicKey(Buffer.alloc(32, 44));

    const first = eventLog("ProtocolPauseChanged", [
        authority.toBuffer(),
        Buffer.from([0]),
        encodeI64(100n),
    ]);

    const second = eventLog("ProtocolPauseChanged", [
        authority.toBuffer(),
        Buffer.from([1]),
        encodeI64(101n),
    ]);

    const events = decodeBabycowansEventLogs([
        "Program log: before",
        first,
        "Program log: between",
        second,
        "Program log: after",
    ]);

    assert.equal(events.length, 2);

    assert.equal(
        (events[0]?.data as { paused: boolean }).paused,
        false,
    );

    assert.equal(
        (events[1]?.data as { paused: boolean }).paused,
        true,
    );

    assert.equal(
        (events[0]?.data as { timestamp: bigint }).timestamp,
        100n,
    );

    assert.equal(
        (events[1]?.data as { timestamp: bigint }).timestamp,
        101n,
    );
});

test("ignores malformed known Babycowans payloads by default", () => {
    const event = findEvent("RewardCreated");

    const truncated = Buffer.concat([
        Buffer.from(event.discriminator),
        Buffer.from([1, 2, 3]),
    ]);

    assert.deepEqual(
        decodeBabycowansEventLogs([
            `Program data: ${truncated.toString("base64")}`,
        ]),
        [],
    );
});

test("throws for malformed known Babycowans payloads in strict mode", () => {
    const event = findEvent("RewardCreated");

    const truncated = Buffer.concat([
        Buffer.from(event.discriminator),
        Buffer.from([1, 2, 3]),
    ]);

    assert.throws(
        () =>
            decodeBabycowansEventLogs(
                [
                    `Program data: ${truncated.toString(
                        "base64",
                    )}`,
                ],
                { strict: true },
            ),
        /Truncated Babycowans event payload/,
    );
});

test("rejects trailing bytes for a known event", () => {
    const authority = new PublicKey(Buffer.alloc(32, 55));

    const log = eventLog("ProtocolPauseChanged", [
        authority.toBuffer(),
        Buffer.from([1]),
        encodeI64(123n),
        Buffer.from([99]),
    ]);

    assert.deepEqual(
        decodeBabycowansEventLogs([log]),
        [],
    );

    assert.throws(
        () =>
            decodeBabycowansEventLogs(
                [log],
                { strict: true },
            ),
        /Unexpected trailing bytes/,
    );
});


test("program scoping ignores matching discriminators from unrelated programs", () => {
    const babycowansProgram =
        new PublicKey(Buffer.alloc(32, 61));

    const unrelatedProgram =
        new PublicKey(Buffer.alloc(32, 62));

    const authority =
        new PublicKey(Buffer.alloc(32, 63));

    const matchingEvent = eventLog(
        "ProtocolPauseChanged",
        [
            authority.toBuffer(),
            Buffer.from([1]),
            encodeI64(500n),
        ],
    );

    const events = decodeBabycowansEventLogs(
        [
            `Program ${unrelatedProgram.toBase58()} invoke [1]`,
            matchingEvent,
            `Program ${unrelatedProgram.toBase58()} success`,
            `Program ${babycowansProgram.toBase58()} invoke [1]`,
            matchingEvent,
            `Program ${babycowansProgram.toBase58()} success`,
        ],
        {
            programId: babycowansProgram,
        },
    );

    assert.equal(events.length, 1);
    assert.equal(
        events[0]?.name,
        "ProtocolPauseChanged",
    );

    assert.equal(
        (events[0]?.data as { timestamp: bigint }).timestamp,
        500n,
    );
});
