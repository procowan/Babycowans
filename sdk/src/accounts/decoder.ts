import { PublicKey } from "@solana/web3.js";

import type { ApplicationConfigAccount } from "./types.js";

function readU16(buffer: Buffer, offset: number): number {
    return buffer.readUInt16LE(offset);
}

function readU64(buffer: Buffer, offset: number): bigint {
    return buffer.readBigUInt64LE(offset);
}

function readI64(buffer: Buffer, offset: number): bigint {
    return buffer.readBigInt64LE(offset);
}

function readPublicKey(buffer: Buffer, offset: number): PublicKey {
    return new PublicKey(buffer.subarray(offset, offset + 32));
}

function readString(
    buffer: Buffer,
    offset: number,
): { value: string; nextOffset: number } {
    const length = buffer.readUInt32LE(offset);
    const start = offset + 4;
    const end = start + length;

    if (end > buffer.length) {
        throw new RangeError("String exceeds account buffer");
    }

    return {
        value: buffer.subarray(start, end).toString("utf8"),
        nextOffset: end,
    };
}

function readBool(buffer: Buffer, offset: number): boolean {
    return buffer[offset] === 1;
}

function readOptionPublicKey(
    buffer: Buffer,
    offset: number,
): { value: PublicKey | null; nextOffset: number } {
    const tag = buffer[offset];

    if (tag === 0) {
        return {
            value: null,
            nextOffset: offset + 33,
        };
    }

    return {
        value: readPublicKey(buffer, offset + 1),
        nextOffset: offset + 33,
    };
}

export function decodeApplicationConfigAccount(
    buffer: Buffer,
): ApplicationConfigAccount {
    let offset = 8;

    const version = readU16(buffer, offset);
    offset += 2;

    const application = readPublicKey(buffer, offset);
    offset += 32;

    const websiteUri = readString(buffer, offset);
    offset = websiteUri.nextOffset;

    const logoUri = readString(buffer, offset);
    offset = logoUri.nextOffset;

    const supportUri = readString(buffer, offset);
    offset = supportUri.nextOffset;

    const description = readString(buffer, offset);
    offset = description.nextOffset;

    const metadataUri = readString(buffer, offset);
    offset = metadataUri.nextOffset;

    const createdAt = readI64(buffer, offset);
    offset += 8;

    const updatedAt = readI64(buffer, offset);
    offset += 8;

    const bump = buffer[offset];

    return {
        version,
        application,
        websiteUri: websiteUri.value,
        logoUri: logoUri.value,
        supportUri: supportUri.value,
        description: description.value,
        metadataUri: metadataUri.value,
        createdAt,
        updatedAt,
        bump,
    };
}

export {
    readBool,
    readI64,
    readOptionPublicKey,
    readPublicKey,
    readString,
    readU16,
    readU64,
};
