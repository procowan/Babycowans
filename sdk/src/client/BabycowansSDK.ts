import {
    Connection,
    PublicKey,
    Transaction,
    TransactionInstruction,
    VersionedTransaction,
} from "@solana/web3.js";

import type { BabycowansSDKConfig } from "../types/index.js";

import {
    findApplicationAssetPda,
    findApplicationPda,
    findApplicationRolePda,
    findAssetConfigPda,
    findAuditLogPda,
    findMembershipPda,
    findProtocolConfigPda,
    findRewardPda,
    findTokenGatePda,
} from "../pda/index.js";

import { AccountFetcher } from "../fetchers/index.js";
import { TransactionHelper } from "../transactions/index.js";

export class BabycowansSDK {
    readonly connection: Connection;
    readonly programId: PublicKey;
    readonly accounts: AccountFetcher;
    readonly transactions: TransactionHelper;

    constructor(config: BabycowansSDKConfig) {
        this.connection = config.connection;
        this.programId = new PublicKey(config.programId);
        this.accounts = new AccountFetcher(this.connection);
        this.transactions = new TransactionHelper(this.connection);
    }

    findProtocolConfig(): [PublicKey, number] {
        return findProtocolConfigPda(this.programId);
    }

    findAssetConfig(
        mint: PublicKey,
    ): [PublicKey, number] {
        return findAssetConfigPda(
            this.programId,
            mint,
        );
    }

    findApplication(
        authority: PublicKey,
        applicationId: bigint,
    ): [PublicKey, number] {
        return findApplicationPda(
            this.programId,
            authority,
            applicationId,
        );
    }

    findApplicationAsset(
        application: PublicKey,
        mint: PublicKey,
    ): [PublicKey, number] {
        return findApplicationAssetPda(
            this.programId,
            application,
            mint,
        );
    }

    findApplicationRole(
        application: PublicKey,
        member: PublicKey,
    ): [PublicKey, number] {
        return findApplicationRolePda(
            this.programId,
            application,
            member,
        );
    }

    findMembership(
        application: PublicKey,
        member: PublicKey,
    ): [PublicKey, number] {
        return findMembershipPda(
            this.programId,
            application,
            member,
        );
    }

    findReward(
        application: PublicKey,
        beneficiary: PublicKey,
        rewardId: bigint = 0n,
    ): [PublicKey, number] {
        return findRewardPda(
            this.programId,
            application,
            beneficiary,
            rewardId,
        );
    }

    findTokenGate(
        application: PublicKey,
        applicationAsset: PublicKey,
    ): [PublicKey, number] {
        return findTokenGatePda(
            this.programId,
            application,
            applicationAsset,
        );
    }

    findAuditLog(
        application: PublicKey,
        authority: PublicKey,
        nonce: bigint,
    ): [PublicKey, number] {
        return findAuditLogPda(
            this.programId,
            application,
            authority,
            nonce,
        );
    }

    async accountExists(
        address: PublicKey,
    ): Promise<boolean> {
        return this.accounts.exists(address);
    }

    async buildTransaction(
        payer: PublicKey,
        instructions: TransactionInstruction[],
    ): Promise<Transaction> {
        return this.transactions.createTransaction(
            payer,
            instructions,
        );
    }

    async buildVersionedTransaction(
        payer: PublicKey,
        instructions: TransactionInstruction[],
    ): Promise<VersionedTransaction> {
        return this.transactions.createVersionedTransaction(
            payer,
            instructions,
        );
    }
}
