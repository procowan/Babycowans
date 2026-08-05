import { PublicKey } from "@solana/web3.js";

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

export {
    readBool,
    readI64,
    readOptionPublicKey,
    readPublicKey,
    readU16,
    readU64,
};
