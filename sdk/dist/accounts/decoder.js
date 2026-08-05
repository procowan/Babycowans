import { PublicKey } from "@solana/web3.js";
function readU16(buffer, offset) {
    return buffer.readUInt16LE(offset);
}
function readU64(buffer, offset) {
    return buffer.readBigUInt64LE(offset);
}
function readI64(buffer, offset) {
    return buffer.readBigInt64LE(offset);
}
function readPublicKey(buffer, offset) {
    return new PublicKey(buffer.subarray(offset, offset + 32));
}
function readBool(buffer, offset) {
    return buffer[offset] === 1;
}
function readOptionPublicKey(buffer, offset) {
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
export { readBool, readI64, readOptionPublicKey, readPublicKey, readU16, readU64, };
//# sourceMappingURL=decoder.js.map