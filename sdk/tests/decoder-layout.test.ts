import { PublicKey } from "@solana/web3.js";

import {
    readBool,
    readI64,
    readOptionPublicKey,
    readPublicKey,
    readU16,
    readU64,
} from "../src/accounts/decoder.js";

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
expect(noKey.nextOffset === 118, "Option<Pubkey> None offset mismatch");

console.log("✓ Decoder layout tests passed");
