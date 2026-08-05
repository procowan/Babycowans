import { TransactionInstruction } from "@solana/web3.js";
export function createInstruction(config) {
    return new TransactionInstruction({
        programId: config.programId,
        keys: config.keys,
        data: config.data ?? Buffer.alloc(0),
    });
}
export function createReadonlyKey(pubkey) {
    return {
        pubkey,
        isSigner: false,
        isWritable: false,
    };
}
export function createWritableKey(pubkey) {
    return {
        pubkey,
        isSigner: false,
        isWritable: true,
    };
}
export function createSignerKey(pubkey) {
    return {
        pubkey,
        isSigner: true,
        isWritable: true,
    };
}
//# sourceMappingURL=index.js.map