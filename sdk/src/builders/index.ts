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

export function createInstruction(
    config: InstructionBuilderConfig,
): TransactionInstruction {
    return new TransactionInstruction({
        programId: config.programId,
        keys: config.keys,
        data: config.data ?? Buffer.alloc(0),
    });
}

export function createReadonlyKey(pubkey: PublicKey) {
    return {
        pubkey,
        isSigner: false,
        isWritable: false,
    };
}

export function createWritableKey(pubkey: PublicKey) {
    return {
        pubkey,
        isSigner: false,
        isWritable: true,
    };
}

export function createSignerKey(pubkey: PublicKey) {
    return {
        pubkey,
        isSigner: true,
        isWritable: true,
    };
}
