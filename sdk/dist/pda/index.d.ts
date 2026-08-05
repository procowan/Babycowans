import { PublicKey } from "@solana/web3.js";
export declare function findProtocolConfigPda(programId: PublicKey): [PublicKey, number];
export declare function findAssetConfigPda(programId: PublicKey, mint: PublicKey): [PublicKey, number];
export declare function findApplicationPda(programId: PublicKey, authority: PublicKey, applicationId: bigint): [PublicKey, number];
export declare function findApplicationAssetPda(programId: PublicKey, application: PublicKey, mint: PublicKey): [PublicKey, number];
export declare function findApplicationRolePda(programId: PublicKey, application: PublicKey, member: PublicKey): [PublicKey, number];
export declare function findMembershipPda(programId: PublicKey, application: PublicKey, member: PublicKey): [PublicKey, number];
export declare function findRewardPda(programId: PublicKey, application: PublicKey, beneficiary: PublicKey): [PublicKey, number];
export declare function findTokenGatePda(programId: PublicKey, application: PublicKey, applicationAsset: PublicKey): [PublicKey, number];
export declare function findAuditLogPda(programId: PublicKey, application: PublicKey, authority: PublicKey, nonce: bigint): [PublicKey, number];
//# sourceMappingURL=index.d.ts.map