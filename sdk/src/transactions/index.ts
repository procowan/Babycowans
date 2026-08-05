import {
    Connection,
    PublicKey,
    Transaction,
    TransactionInstruction,
    VersionedTransaction,
    TransactionMessage,
} from "@solana/web3.js";

export class TransactionHelper {
    constructor(
        readonly connection: Connection,
    ) {}

    async createTransaction(
        payer: PublicKey,
        instructions: TransactionInstruction[],
    ): Promise<Transaction> {
        const { blockhash } =
            await this.connection.getLatestBlockhash();

        const tx = new Transaction();

        tx.feePayer = payer;
        tx.recentBlockhash = blockhash;

        for (const ix of instructions) {
            tx.add(ix);
        }

        return tx;
    }

    async createVersionedTransaction(
        payer: PublicKey,
        instructions: TransactionInstruction[],
    ): Promise<VersionedTransaction> {
        const { blockhash } =
            await this.connection.getLatestBlockhash();

        const message = new TransactionMessage({
            payerKey: payer,
            recentBlockhash: blockhash,
            instructions,
        }).compileToV0Message();

        return new VersionedTransaction(message);
    }
}
