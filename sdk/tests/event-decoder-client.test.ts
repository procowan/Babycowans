import assert from "node:assert/strict";
import test from "node:test";

import {
    Connection,
    PublicKey,
} from "@solana/web3.js";

import {
    BABYCOWANS_IDL,
    BabycowansSDK,
} from "../src/index.js";

type EventDefinition = {
    name: string;
    discriminator: number[];
};

function eventDefinition(name: string): EventDefinition {
    const events =
        BABYCOWANS_IDL.events as readonly EventDefinition[];

    const event =
        events.find((candidate) => candidate.name === name);

    assert.ok(event);

    return event;
}

function encodeI64(value: bigint): Buffer {
    const buffer = Buffer.alloc(8);
    buffer.writeBigInt64LE(value);
    return buffer;
}

function buildEventLog(
    name: string,
    fields: readonly Buffer[],
): string {
    const event = eventDefinition(name);

    return `Program data: ${Buffer.concat([
        Buffer.from(event.discriminator),
        ...fields,
    ]).toString("base64")}`;
}

test("decodeEvents fetches and decodes transaction events", async () => {
    const connection =
        new Connection(
            "http://127.0.0.1:8899",
            "confirmed",
        );

    const programId =
        new PublicKey(Buffer.alloc(32, 91));

    const authority =
        new PublicKey(Buffer.alloc(32, 92));

    let requestedSignature = "";

    connection.getTransaction =
        (async (signature: string) => {
            requestedSignature = signature;

            return {
                meta: {
                    logMessages: [
                        "Program log: unrelated",
                        `Program ${programId.toBase58()} invoke [1]`,
                        buildEventLog(
                            "ProtocolPauseChanged",
                            [
                                authority.toBuffer(),
                                Buffer.from([1]),
                                encodeI64(777n),
                            ],
                        ),
                        `Program ${programId.toBase58()} success`,
                    ],
                },
            };
        }) as typeof connection.getTransaction;

    const sdk =
        new BabycowansSDK({
            connection,
            programId,
        });

    const events =
        await sdk.decodeEvents(
            "phase9-test-signature",
        );

    assert.equal(
        requestedSignature,
        "phase9-test-signature",
    );

    assert.equal(events.length, 1);
    assert.equal(
        events[0]?.name,
        "ProtocolPauseChanged",
    );

    const data =
        events[0]?.data as {
            authority: PublicKey;
            paused: boolean;
            timestamp: bigint;
        };

    assert.equal(
        data.authority.toBase58(),
        authority.toBase58(),
    );

    assert.equal(data.paused, true);
    assert.equal(data.timestamp, 777n);
});

test("decodeEvents returns [] when transaction is missing", async () => {
    const connection =
        new Connection(
            "http://127.0.0.1:8899",
            "confirmed",
        );

    connection.getTransaction =
        (async () => null) as
            typeof connection.getTransaction;

    const sdk =
        new BabycowansSDK({
            connection,
            programId:
                new PublicKey(
                    Buffer.alloc(32, 93),
                ),
        });

    assert.deepEqual(
        await sdk.decodeEvents(
            "missing-signature",
        ),
        [],
    );
});
