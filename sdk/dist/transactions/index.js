import { Transaction, VersionedTransaction, TransactionMessage, } from "@solana/web3.js";
export class TransactionHelper {
    connection;
    constructor(connection) {
        this.connection = connection;
    }
    async createTransaction(payer, instructions) {
        const { blockhash } = await this.connection.getLatestBlockhash();
        const tx = new Transaction();
        tx.feePayer = payer;
        tx.recentBlockhash = blockhash;
        for (const ix of instructions) {
            tx.add(ix);
        }
        return tx;
    }
    async createVersionedTransaction(payer, instructions) {
        const { blockhash } = await this.connection.getLatestBlockhash();
        const message = new TransactionMessage({
            payerKey: payer,
            recentBlockhash: blockhash,
            instructions,
        }).compileToV0Message();
        return new VersionedTransaction(message);
    }
}
//# sourceMappingURL=index.js.map