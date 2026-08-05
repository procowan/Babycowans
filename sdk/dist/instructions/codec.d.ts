import { PublicKey } from "@solana/web3.js";
export declare function instructionDiscriminator(name: string): Buffer;
export declare function encodeU64(value: bigint): Buffer;
export declare function encodeU16(value: number): Buffer;
export declare function encodeBool(value: boolean): Buffer;
export declare function encodePublicKey(value: PublicKey): Buffer;
export declare function encodeString(value: string): Buffer;
export declare function encodeFixedBytes3(value: string): Buffer;
export declare function encodeEnum(value: number): Buffer;
//# sourceMappingURL=codec.d.ts.map