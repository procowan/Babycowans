import { PublicKey, } from "@solana/web3.js";
import { findApplicationAssetPda, findApplicationPda, findApplicationRolePda, findAssetConfigPda, findAuditLogPda, findMembershipPda, findProtocolConfigPda, findRewardPda, findTokenGatePda, } from "../pda/index.js";
import { AccountFetcher } from "../fetchers/index.js";
import { TransactionHelper } from "../transactions/index.js";
export class BabycowansSDK {
    connection;
    programId;
    accounts;
    transactions;
    constructor(config) {
        this.connection = config.connection;
        this.programId = new PublicKey(config.programId);
        this.accounts = new AccountFetcher(this.connection);
        this.transactions = new TransactionHelper(this.connection);
    }
    findProtocolConfig() {
        return findProtocolConfigPda(this.programId);
    }
    findAssetConfig(mint) {
        return findAssetConfigPda(this.programId, mint);
    }
    findApplication(authority, applicationId) {
        return findApplicationPda(this.programId, authority, applicationId);
    }
    findApplicationAsset(application, mint) {
        return findApplicationAssetPda(this.programId, application, mint);
    }
    findApplicationRole(application, member) {
        return findApplicationRolePda(this.programId, application, member);
    }
    findMembership(application, member) {
        return findMembershipPda(this.programId, application, member);
    }
    findReward(application, beneficiary) {
        return findRewardPda(this.programId, application, beneficiary);
    }
    findTokenGate(application, applicationAsset) {
        return findTokenGatePda(this.programId, application, applicationAsset);
    }
    findAuditLog(application, authority, nonce) {
        return findAuditLogPda(this.programId, application, authority, nonce);
    }
    async accountExists(address) {
        return this.accounts.exists(address);
    }
    async buildTransaction(payer, instructions) {
        return this.transactions.createTransaction(payer, instructions);
    }
    async buildVersionedTransaction(payer, instructions) {
        return this.transactions.createVersionedTransaction(payer, instructions);
    }
}
//# sourceMappingURL=BabycowansSDK.js.map