import { PublicKey, TransactionInstruction } from "@solana/web3.js";
export interface InstructionBuilderConfig {
    programId: PublicKey;
    keys: {
        pubkey: PublicKey;
        isSigner: boolean;
        isWritable: boolean;
    }[];
    data?: Buffer;
}
export declare function createInstruction(config: InstructionBuilderConfig): TransactionInstruction;
export declare function createReadonlyKey(pubkey: PublicKey): {
    pubkey: PublicKey;
    isSigner: boolean;
    isWritable: boolean;
};
export declare function createWritableKey(pubkey: PublicKey): {
    pubkey: PublicKey;
    isSigner: boolean;
    isWritable: boolean;
};
export declare function createSignerKey(pubkey: PublicKey): {
    pubkey: PublicKey;
    isSigner: boolean;
    isWritable: boolean;
};
//# sourceMappingURL=index.d.ts.map