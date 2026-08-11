import { PublicKey } from "@solana/web3.js";

import {
    decodeApplicationConfigAccount,
    readBool,
    readI64,
    readOptionPublicKey,
    readPublicKey,
    readU16,
    readU64,
} from "../src/accounts/decoder.js";

import {
    BABYCOWANS_IDL,
} from "../src/idl/index.js";

function expect(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(message);
    }
}

const buffer = Buffer.alloc(128);

const key = new PublicKey(
    Buffer.from(Array.from({ length: 32 }, (_, index) => index + 1)),
);

buffer.writeUInt16LE(513, 0);
buffer.writeBigUInt64LE(9_876_543_210n, 2);
buffer.writeBigInt64LE(-123_456_789n, 10);
key.toBuffer().copy(buffer, 18);
buffer[50] = 1;

buffer[51] = 1;
key.toBuffer().copy(buffer, 52);

expect(readU16(buffer, 0) === 513, "readU16 mismatch");
expect(readU64(buffer, 2) === 9_876_543_210n, "readU64 mismatch");
expect(readI64(buffer, 10) === -123_456_789n, "readI64 mismatch");
expect(readPublicKey(buffer, 18).equals(key), "readPublicKey mismatch");
expect(readBool(buffer, 50), "readBool mismatch");

const someKey = readOptionPublicKey(buffer, 51);

expect(
    someKey.value !== null && someKey.value.equals(key),
    "Option<Pubkey> Some mismatch",
);

expect(someKey.nextOffset === 84, "Option<Pubkey> Some offset mismatch");

buffer[85] = 0;

const noKey = readOptionPublicKey(buffer, 85);

expect(noKey.value === null, "Option<Pubkey> None mismatch");
expect(noKey.nextOffset === 86, "Option<Pubkey> None offset mismatch");

console.log("✓ Decoder layout tests passed");

{
    const application = new PublicKey(
        Buffer.from(
            Array.from(
                { length: 32 },
                (_, index) => 200 - index,
            ),
        ),
    );

    const strings = [
        "https://babycowans.example",
        "https://babycowans.example/logo.png",
        "https://babycowans.example/support",
        "Babycowans application metadata",
        "https://babycowans.example/metadata.json",
    ];

    const encodedStrings = strings.map((value) => {
        const bytes = Buffer.from(value, "utf8");
        const encoded = Buffer.alloc(4 + bytes.length);

        encoded.writeUInt32LE(bytes.length, 0);
        bytes.copy(encoded, 4);

        return encoded;
    });

    const applicationConfigDefinition =
        BABYCOWANS_IDL.accounts.find(
            (account) =>
                account.name === "ApplicationConfig",
        );

    expect(
        applicationConfigDefinition !== undefined,
        "ApplicationConfig IDL account definition missing",
    );

    const accountData = Buffer.concat([
        Buffer.from(
            applicationConfigDefinition.discriminator,
        ),
        Buffer.from([1, 0]),
        application.toBuffer(),
        ...encodedStrings,
        (() => {
            const value = Buffer.alloc(8);
            value.writeBigInt64LE(1_700_000_000n);
            return value;
        })(),
        (() => {
            const value = Buffer.alloc(8);
            value.writeBigInt64LE(1_700_000_100n);
            return value;
        })(),
        Buffer.from([254]),
    ]);

    const decoded =
        decodeApplicationConfigAccount(accountData);

    expect(
        decoded.version === 1,
        "ApplicationConfig version mismatch",
    );

    expect(
        decoded.application.equals(application),
        "ApplicationConfig application mismatch",
    );

    expect(
        decoded.websiteUri === strings[0],
        "ApplicationConfig websiteUri mismatch",
    );

    expect(
        decoded.logoUri === strings[1],
        "ApplicationConfig logoUri mismatch",
    );

    expect(
        decoded.supportUri === strings[2],
        "ApplicationConfig supportUri mismatch",
    );

    expect(
        decoded.description === strings[3],
        "ApplicationConfig description mismatch",
    );

    expect(
        decoded.metadataUri === strings[4],
        "ApplicationConfig metadataUri mismatch",
    );

    expect(
        decoded.createdAt === 1_700_000_000n,
        "ApplicationConfig createdAt mismatch",
    );

    expect(
        decoded.updatedAt === 1_700_000_100n,
        "ApplicationConfig updatedAt mismatch",
    );

    expect(
        decoded.bump === 254,
        "ApplicationConfig bump mismatch",
    );

    console.log(
        "✓ Phase 6 ApplicationConfig decoder layout",
    );
}
