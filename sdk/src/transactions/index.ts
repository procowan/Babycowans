import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  VersionedTransaction,
  TransactionMessage,
} from "@solana/web3.js";

export interface WalletNeutralTransactionPlan {
  readonly payer: PublicKey;
  readonly instructions: readonly TransactionInstruction[];
}

export function createWalletNeutralTransactionPlan(
  payer: PublicKey,
  instructions: readonly TransactionInstruction[]
): WalletNeutralTransactionPlan {
  return {
    payer,
    instructions: [...instructions],
  };
}

export type TransactionConfirmationStatus =
  | "processed"
  | "confirmed"
  | "finalized"
  | null;

export interface BabycowansTransactionReceipt {
  readonly signature: string;
  readonly slot: number | null;
  readonly confirmationStatus: TransactionConfirmationStatus;
  readonly succeeded: boolean | null;
  readonly error: unknown | null;
}

export async function resolveTransactionReceipt(
  connection: Connection,
  signature: string
): Promise<BabycowansTransactionReceipt> {
  const response = await connection.getSignatureStatuses([signature], {
    searchTransactionHistory: true,
  });

  const status = response.value[0] ?? null;

  if (status === null) {
    return {
      signature,
      slot: null,
      confirmationStatus: null,
      succeeded: null,
      error: null,
    };
  }

  return {
    signature,
    slot: status.slot,
    confirmationStatus: status.confirmationStatus ?? null,
    succeeded: status.err === null,
    error: status.err,
  };
}

export class TransactionHelper {
  constructor(readonly connection: Connection) {}

  async createTransaction(
    payer: PublicKey,
    instructions: TransactionInstruction[]
  ): Promise<Transaction> {
    const { blockhash } = await this.connection.getLatestBlockhash();

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
    instructions: TransactionInstruction[]
  ): Promise<VersionedTransaction> {
    const { blockhash } = await this.connection.getLatestBlockhash();

    const message = new TransactionMessage({
      payerKey: payer,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message();

    return new VersionedTransaction(message);
  }
}
