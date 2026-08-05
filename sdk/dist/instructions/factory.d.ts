import { PublicKey, TransactionInstruction } from "@solana/web3.js";
export interface InitializeProtocolInstructionParams {
    programId: PublicKey;
    authority: PublicKey;
}
export declare function buildInitializeProtocolInstruction(params: InitializeProtocolInstructionParams): TransactionInstruction;
export interface RegisterApplicationInstructionParams {
    programId: PublicKey;
    authority: PublicKey;
    applicationId: bigint;
    name: string;
}
export declare function buildRegisterApplicationInstruction(params: RegisterApplicationInstructionParams): TransactionInstruction;
export interface RegisterAssetInstructionParams {
    programId: PublicKey;
    authority: PublicKey;
    mint: PublicKey;
    assetCode: string;
    domain: number;
}
export declare function buildRegisterAssetInstruction(params: RegisterAssetInstructionParams): TransactionInstruction;
export interface ConfigureApplicationAssetInstructionParams {
    programId: PublicKey;
    application: PublicKey;
    assetConfig: PublicKey;
    mint: PublicKey;
    paymentDestination: PublicKey;
    authority: PublicKey;
    tokenProgram: PublicKey;
    paymentsEnabled: boolean;
    gatingEnabled: boolean;
    rewardsEnabled: boolean;
}
export declare function buildConfigureApplicationAssetInstruction(params: ConfigureApplicationAssetInstructionParams): TransactionInstruction;
export interface ProcessPaymentInstructionParams {
    programId: PublicKey;
    application: PublicKey;
    applicationAsset: PublicKey;
    assetConfig: PublicKey;
    mint: PublicKey;
    payer: PublicKey;
    payerTokenAccount: PublicKey;
    destinationTokenAccount: PublicKey;
    tokenProgram: PublicKey;
    amount: bigint;
}
export declare function buildProcessPaymentInstruction(params: ProcessPaymentInstructionParams): TransactionInstruction;
export interface RegisterMembershipInstructionParams {
    programId: PublicKey;
    application: PublicKey;
    membership: PublicKey;
    authority: PublicKey;
    member: PublicKey;
    asset: PublicKey;
    tier: number;
    expiresAt: bigint;
}
export declare function buildRegisterMembershipInstruction(params: RegisterMembershipInstructionParams): TransactionInstruction;
export interface CreateRewardInstructionParams {
    programId: PublicKey;
    application: PublicKey;
    reward: PublicKey;
    authority: PublicKey;
    beneficiary: PublicKey;
    asset: PublicKey;
    amount: bigint;
}
export declare function buildCreateRewardInstruction(params: CreateRewardInstructionParams): TransactionInstruction;
export interface ClaimRewardInstructionParams {
    programId: PublicKey;
    reward: PublicKey;
    beneficiary: PublicKey;
}
export declare function buildClaimRewardInstruction(params: ClaimRewardInstructionParams): TransactionInstruction;
export interface ConfigureTokenGateInstructionParams {
    programId: PublicKey;
    application: PublicKey;
    applicationAsset: PublicKey;
    tokenGate: PublicKey;
    authority: PublicKey;
    gateType: number;
    minimumAmount: bigint;
    minimumTier: number;
    enabled: boolean;
}
export declare function buildConfigureTokenGateInstruction(params: ConfigureTokenGateInstructionParams): TransactionInstruction;
export interface VerifyGateAccessInstructionParams {
    programId: PublicKey;
    application: PublicKey;
    applicationAsset: PublicKey;
    tokenGate: PublicKey;
    wallet: PublicKey;
    userTokenAccount: PublicKey;
}
export declare function buildVerifyGateAccessInstruction(params: VerifyGateAccessInstructionParams): TransactionInstruction;
export interface AssignApplicationRoleInstructionParams {
    programId: PublicKey;
    application: PublicKey;
    applicationRole: PublicKey;
    member: PublicKey;
    authority: PublicKey;
    role: number;
}
export declare function buildAssignApplicationRoleInstruction(params: AssignApplicationRoleInstructionParams): TransactionInstruction;
export interface UpdateApplicationRoleInstructionParams {
    programId: PublicKey;
    application: PublicKey;
    applicationRole: PublicKey;
    authority: PublicKey;
    role: number;
    active: boolean;
}
export declare function buildUpdateApplicationRoleInstruction(params: UpdateApplicationRoleInstructionParams): TransactionInstruction;
export interface SetProtocolPauseInstructionParams {
    programId: PublicKey;
    protocolConfig: PublicKey;
    authority: PublicKey;
    paused: boolean;
}
export declare function buildSetProtocolPauseInstruction(params: SetProtocolPauseInstructionParams): TransactionInstruction;
export interface NominateProtocolAuthorityInstructionParams {
    programId: PublicKey;
    protocolConfig: PublicKey;
    authority: PublicKey;
    newAuthority: PublicKey;
}
export declare function buildNominateProtocolAuthorityInstruction(params: NominateProtocolAuthorityInstructionParams): TransactionInstruction;
export interface AcceptProtocolAuthorityInstructionParams {
    programId: PublicKey;
    protocolConfig: PublicKey;
    pendingAuthority: PublicKey;
}
export declare function buildAcceptProtocolAuthorityInstruction(params: AcceptProtocolAuthorityInstructionParams): TransactionInstruction;
export interface RecordAuditLogInstructionParams {
    programId: PublicKey;
    application: PublicKey;
    auditLog: PublicKey;
    authority: PublicKey;
    nonce: bigint;
    action: number;
    reference: PublicKey;
}
export declare function buildRecordAuditLogInstruction(params: RecordAuditLogInstructionParams): TransactionInstruction;
//# sourceMappingURL=factory.d.ts.map