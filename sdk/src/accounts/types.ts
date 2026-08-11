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
    selectedEcosystem: number;
    status: number;
    name: string;
    bump: number;
}

export interface ApplicationConfigAccount {
    version: number;
    application: PublicKey;
    websiteUri: string;
    logoUri: string;
    supportUri: string;
    description: string;
    metadataUri: string;
    createdAt: bigint;
    updatedAt: bigint;
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

export interface ApplicationPaymentPolicyAccount {
    version: number;
    application: PublicKey;
    applicationAsset: PublicKey;
    minimumAmount: bigint;
    maximumAmount: bigint;
    paymentsEnabled: boolean;
    protocolFeeBps: number;
    applicationFeeBps: number;
    treasury: PublicKey;
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
    tier: number;
    status: number;
    membershipKind: number;
    nftMint: PublicKey;
    nftVerified: boolean;
    expiresAt: bigint;
    renewable: boolean;
    autoExtend: boolean;
    renewalDuration: bigint;
    renewalCount: number;
    createdAt: bigint;
    updatedAt: bigint;
    bump: number;
}

export interface RewardAccount {
    version: number;
    application: PublicKey;
    beneficiary: PublicKey;
    rewardId: bigint;
    asset: PublicKey;
    amount: bigint;
    status: number;
    createdAt: bigint;
    claimableAt: bigint;
    expiresAt: bigint;
    claimedAt: bigint;
    cancelledAt: bigint;
    category: number;
    reason: string;
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
    eventSchemaVersion: number;
    authority: PublicKey;
    application: PublicKey;
    action: number;
    category: number;
    severity: number;
    reference: PublicKey;
    indexedReferences: [PublicKey, PublicKey, PublicKey];
    metadata: string;
    createdAt: bigint;
    bump: number;
}


export interface GateConditionAccount {
    group: number;
    conditionType: number;
    mint: PublicKey;
    minimumAmount: bigint;
    minimumTier: number;
}

export interface GatePolicyAccount {
    version: number;
    application: PublicKey;
    applicationAsset: PublicKey;
    conditions: GateConditionAccount[];
    enabled: boolean;
    createdAt: bigint;
    updatedAt: bigint;
    bump: number;
}
