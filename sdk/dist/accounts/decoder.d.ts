import { PublicKey } from "@solana/web3.js";
declare function readU16(buffer: Buffer, offset: number): number;
declare function readU64(buffer: Buffer, offset: number): bigint;
declare function readI64(buffer: Buffer, offset: number): bigint;
declare function readPublicKey(buffer: Buffer, offset: number): PublicKey;
declare function readBool(buffer: Buffer, offset: number): boolean;
declare function readOptionPublicKey(buffer: Buffer, offset: number): {
    value: PublicKey | null;
    nextOffset: number;
};
export { readBool, readI64, readOptionPublicKey, readPublicKey, readU16, readU64, };
//# sourceMappingURL=decoder.d.ts.map