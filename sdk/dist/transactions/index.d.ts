import { Connection, PublicKey, Transaction, TransactionInstruction, VersionedTransaction } from "@solana/web3.js";
export declare class TransactionHelper {
    readonly connection: Connection;
    constructor(connection: Connection);
    createTransaction(payer: PublicKey, instructions: TransactionInstruction[]): Promise<Transaction>;
    createVersionedTransaction(payer: PublicKey, instructions: TransactionInstruction[]): Promise<VersionedTransaction>;
}
//# sourceMappingURL=index.d.ts.map