import { createHash } from "node:crypto";
export function instructionDiscriminator(name) {
    return createHash("sha256")
        .update(`global:${name}`)
        .digest()
        .subarray(0, 8);
}
export function encodeU64(value) {
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64LE(value);
    return buffer;
}
export function encodeU16(value) {
    const buffer = Buffer.alloc(2);
    buffer.writeUInt16LE(value);
    return buffer;
}
export function encodeBool(value) {
    return Buffer.from([value ? 1 : 0]);
}
export function encodePublicKey(value) {
    return value.toBuffer();
}
export function encodeString(value) {
    const encoded = Buffer.from(value, "utf8");
    const length = Buffer.alloc(4);
    length.writeUInt32LE(encoded.length);
    return Buffer.concat([length, encoded]);
}
export function encodeFixedBytes3(value) {
    const encoded = Buffer.from(value, "ascii");
    if (encoded.length !== 3) {
        throw new Error("Asset code must contain exactly three ASCII bytes.");
    }
    return encoded;
}
export function encodeEnum(value) {
    if (!Number.isInteger(value) || value < 0 || value > 255) {
        throw new Error("Enum value must be an unsigned 8-bit integer.");
    }
    return Buffer.from([value]);
}
//# sourceMappingURL=codec.js.map