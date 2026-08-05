import { Connection, PublicKey, Transaction, TransactionInstruction, VersionedTransaction } from "@solana/web3.js";
import type { BabycowansSDKConfig } from "../types/index.js";
import { AccountFetcher } from "../fetchers/index.js";
import { TransactionHelper } from "../transactions/index.js";
export declare class BabycowansSDK {
    readonly connection: Connection;
    readonly programId: PublicKey;
    readonly accounts: AccountFetcher;
    readonly transactions: TransactionHelper;
    constructor(config: BabycowansSDKConfig);
    findProtocolConfig(): [PublicKey, number];
    findAssetConfig(mint: PublicKey): [PublicKey, number];
    findApplication(authority: PublicKey, applicationId: bigint): [PublicKey, number];
    findApplicationAsset(application: PublicKey, mint: PublicKey): [PublicKey, number];
    findApplicationRole(application: PublicKey, member: PublicKey): [PublicKey, number];
    findMembership(application: PublicKey, member: PublicKey): [PublicKey, number];
    findReward(application: PublicKey, beneficiary: PublicKey): [PublicKey, number];
    findTokenGate(application: PublicKey, applicationAsset: PublicKey): [PublicKey, number];
    findAuditLog(application: PublicKey, authority: PublicKey, nonce: bigint): [PublicKey, number];
    accountExists(address: PublicKey): Promise<boolean>;
    buildTransaction(payer: PublicKey, instructions: TransactionInstruction[]): Promise<Transaction>;
    buildVersionedTransaction(payer: PublicKey, instructions: TransactionInstruction[]): Promise<VersionedTransaction>;
}
//# sourceMappingURL=BabycowansSDK.d.ts.map