import type { PublicKey } from "@solana/web3.js";

export interface ReadAccount<T> {
    address: PublicKey;
    data: T;
}

export interface GetApplicationParams {
    authority: PublicKey;
    applicationId: bigint;
}

export interface GetMembershipParams {
    application: PublicKey;
    member: PublicKey;
}

export interface GetRewardParams {
    application: PublicKey;
    beneficiary: PublicKey;
    rewardId: bigint;
}

export interface GetAuditHistoryParams {
    application: PublicKey;
}
