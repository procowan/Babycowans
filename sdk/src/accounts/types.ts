import { PublicKey } from "@solana/web3.js";

export interface ProtocolConfigAccount {
    version: number;
    authority: PublicKey;
    pendingAuthority: PublicKey | null;
    paused: boolean;
    applicationCount: bigint;
    assetCount: number;
    bump: number;
}

export interface AssetConfigAccount {
    version: number;
    mint: PublicKey;
    tokenProgram: PublicKey;
    assetCode: string;
    domain: number;
    decimals: number;
    enabled: boolean;
    registeredAt: bigint;
    bump: number;
}

export interface ApplicationAccount {
    version: number;
    applicationId: bigint;
    authority: PublicKey;
    pendingAuthority: PublicKey | null;
    status: number;
    name: string;
    bump: number;
}

export interface ApplicationAssetAccount {
    version: number;
    application: PublicKey;
    assetConfig: PublicKey;
    mint: PublicKey;
    tokenProgram: PublicKey;
    paymentDestination: PublicKey;
    paymentsEnabled: boolean;
    gatingEnabled: boolean;
    rewardsEnabled: boolean;
    createdAt: bigint;
    updatedAt: bigint;
    bump: number;
}

export interface ApplicationRoleAccount {
    version: number;
    application: PublicKey;
    member: PublicKey;
    role: number;
    active: boolean;
    createdAt: bigint;
    updatedAt: bigint;
    bump: number;
}

export interface MembershipAccount {
    version: number;
    application: PublicKey;
    member: PublicKey;
    asset: PublicKey;
    tier: number;
    status: number;
    expiresAt: bigint;
    createdAt: bigint;
    bump: number;
}

export interface RewardAccount {
    version: number;
    application: PublicKey;
    beneficiary: PublicKey;
    asset: PublicKey;
    amount: bigint;
    status: number;
    createdAt: bigint;
    claimedAt: bigint;
    bump: number;
}

export interface TokenGateAccount {
    version: number;
    application: PublicKey;
    applicationAsset: PublicKey;
    gateType: number;
    minimumAmount: bigint;
    minimumTier: number;
    enabled: boolean;
    createdAt: bigint;
    updatedAt: bigint;
    bump: number;
}

export interface AuditLogAccount {
    version: number;
    authority: PublicKey;
    application: PublicKey;
    action: number;
    reference: PublicKey;
    createdAt: bigint;
    bump: number;
}
