import {
    PublicKey,
    SystemProgram,
    TransactionInstruction,
} from "@solana/web3.js";
import { CanonicalEcosystem } from "../ecosystems/index.js";

import {
    createReadonlyKey,
    createSignerKey,
    createWritableKey,
} from "../builders/index.js";

import {
    encodeBool,
    encodeEnum,
    encodeFixedBytes3,
    encodeString,
    encodeU64,
    instructionDiscriminator,
} from "./codec.js";

import {
    findApplicationAssetPda,
    findPaymentPolicyPda,
    findApplicationPda,
    findAssetConfigPda,
    findProtocolConfigPda,
} from "../pda/index.js";

export interface InitializeProtocolInstructionParams {
    programId: PublicKey;
    authority: PublicKey;
}

export function buildInitializeProtocolInstruction(
    params: InitializeProtocolInstructionParams,
): TransactionInstruction {
    const [protocolConfig] = findProtocolConfigPda(params.programId);

    return new TransactionInstruction({
        programId: params.programId,
        keys: [
            createWritableKey(protocolConfig),
            createSignerKey(params.authority),
            createReadonlyKey(SystemProgram.programId),
        ],
        data: instructionDiscriminator("initialize_protocol"),
    });
}

export interface RegisterApplicationInstructionParams {
    programId: PublicKey;
    authority: PublicKey;
    applicationId: bigint;
    name: string;
    selectedEcosystem: CanonicalEcosystem;
}

export function buildRegisterApplicationInstruction(
    params: RegisterApplicationInstructionParams,
): TransactionInstruction {
    const [protocolConfig] = findProtocolConfigPda(params.programId);

    const [application] = findApplicationPda(
        params.programId,
        params.authority,
        params.applicationId,
    );

    const data = Buffer.concat([
        instructionDiscriminator("register_application"),
        encodeU64(params.applicationId),
        encodeString(params.name),
        encodeEnum(params.selectedEcosystem),
    ]);

    return new TransactionInstruction({
        programId: params.programId,
        keys: [
            createWritableKey(protocolConfig),
            createWritableKey(application),
            createSignerKey(params.authority),
            createReadonlyKey(SystemProgram.programId),
        ],
        data,
    });
}

export interface RegisterAssetInstructionParams {
    programId: PublicKey;
    authority: PublicKey;
    mint: PublicKey;
    assetCode: string;
    domain: number;
}

export function buildRegisterAssetInstruction(
    params: RegisterAssetInstructionParams,
): TransactionInstruction {
    const [protocolConfig] = findProtocolConfigPda(params.programId);

    const [assetConfig] = findAssetConfigPda(
        params.programId,
        params.mint,
    );

    const data = Buffer.concat([
        instructionDiscriminator("register_asset"),
        encodeFixedBytes3(params.assetCode),
        encodeEnum(params.domain),
    ]);

    return new TransactionInstruction({
        programId: params.programId,
        keys: [
            createWritableKey(protocolConfig),
            createWritableKey(assetConfig),
            createReadonlyKey(params.mint),
            createSignerKey(params.authority),
            createReadonlyKey(SystemProgram.programId),
        ],
        data,
    });
}

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

export function buildConfigureApplicationAssetInstruction(
    params: ConfigureApplicationAssetInstructionParams,
): TransactionInstruction {
    const [applicationAsset] = findApplicationAssetPda(
        params.programId,
        params.application,
        params.mint,
    );

    const data = Buffer.concat([
        instructionDiscriminator("configure_application_asset"),
        encodeBool(params.paymentsEnabled),
        encodeBool(params.gatingEnabled),
        encodeBool(params.rewardsEnabled),
    ]);

    return new TransactionInstruction({
        programId: params.programId,
        keys: [
            createReadonlyKey(params.application),
            createReadonlyKey(params.assetConfig),
            createReadonlyKey(params.mint),
            createWritableKey(applicationAsset),
            createReadonlyKey(params.paymentDestination),
            createSignerKey(params.authority),
            createReadonlyKey(params.tokenProgram),
            createReadonlyKey(SystemProgram.programId),
        ],
        data,
    });
}

export interface ConfigurePaymentPolicyInstructionParams {
    programId: PublicKey;
    application: PublicKey;
    applicationAsset: PublicKey;
    authority: PublicKey;
    minimumAmount: bigint;
    maximumAmount: bigint;
    paymentsEnabled: boolean;
    protocolFeeBps: number;
    applicationFeeBps: number;
    treasury: PublicKey;
}

export function buildConfigurePaymentPolicyInstruction(
    params: ConfigurePaymentPolicyInstructionParams,
): TransactionInstruction {
    const [paymentPolicy] = findPaymentPolicyPda(
        params.programId,
        params.application,
        params.applicationAsset,
    );

    const protocolFeeBps = Buffer.alloc(2);
    protocolFeeBps.writeUInt16LE(params.protocolFeeBps);

    const applicationFeeBps = Buffer.alloc(2);
    applicationFeeBps.writeUInt16LE(params.applicationFeeBps);

    const data = Buffer.concat([
        instructionDiscriminator("configure_payment_policy"),
        encodeU64(params.minimumAmount),
        encodeU64(params.maximumAmount),
        encodeBool(params.paymentsEnabled),
        protocolFeeBps,
        applicationFeeBps,
        params.treasury.toBuffer(),
    ]);

    return new TransactionInstruction({
        programId: params.programId,
        keys: [
            createReadonlyKey(params.application),
            createReadonlyKey(params.applicationAsset),
            createWritableKey(paymentPolicy),
            createSignerKey(params.authority),
            createReadonlyKey(SystemProgram.programId),
        ],
        data,
    });
}

export interface UpdatePaymentPolicyInstructionParams {
    programId: PublicKey;
    application: PublicKey;
    applicationAsset: PublicKey;
    authority: PublicKey;
    minimumAmount: bigint;
    maximumAmount: bigint;
    paymentsEnabled: boolean;
    protocolFeeBps: number;
    applicationFeeBps: number;
    treasury: PublicKey;
}

export function buildUpdatePaymentPolicyInstruction(
    params: UpdatePaymentPolicyInstructionParams,
): TransactionInstruction {
    const [paymentPolicy] = findPaymentPolicyPda(
        params.programId,
        params.application,
        params.applicationAsset,
    );

    const protocolFeeBps = Buffer.alloc(2);
    protocolFeeBps.writeUInt16LE(params.protocolFeeBps);

    const applicationFeeBps = Buffer.alloc(2);
    applicationFeeBps.writeUInt16LE(params.applicationFeeBps);

    const data = Buffer.concat([
        instructionDiscriminator("update_payment_policy"),
        encodeU64(params.minimumAmount),
        encodeU64(params.maximumAmount),
        encodeBool(params.paymentsEnabled),
        protocolFeeBps,
        applicationFeeBps,
        params.treasury.toBuffer(),
    ]);

    return new TransactionInstruction({
        programId: params.programId,
        keys: [
            createReadonlyKey(params.application),
            createWritableKey(paymentPolicy),
            createSignerKey(params.authority),
        ],
        data,
    });
}

export interface ProcessPaymentInstructionParams {
    programId: PublicKey;
    application: PublicKey;
    applicationAsset: PublicKey;
    assetConfig: PublicKey;
    mint: PublicKey;
    payer: PublicKey;
    payerTokenAccount: PublicKey;
    destinationTokenAccount: PublicKey;
    treasuryTokenAccount: PublicKey;
    tokenProgram: PublicKey;
    amount: bigint;
}

export function buildProcessPaymentInstruction(
    params: ProcessPaymentInstructionParams,
): TransactionInstruction {
    const [protocolConfig] = findProtocolConfigPda(params.programId);
    const [paymentPolicy] = findPaymentPolicyPda(
        params.programId,
        params.application,
        params.applicationAsset,
    );

    const data = Buffer.concat([
        instructionDiscriminator("process_payment"),
        encodeU64(params.amount),
    ]);

    return new TransactionInstruction({
        programId: params.programId,
        keys: [
            createReadonlyKey(protocolConfig),
            createReadonlyKey(params.application),
            createReadonlyKey(params.applicationAsset),
            createReadonlyKey(paymentPolicy),
            createReadonlyKey(params.assetConfig),
            createReadonlyKey(params.mint),
            createSignerKey(params.payer),
            createWritableKey(params.payerTokenAccount),
            createWritableKey(params.destinationTokenAccount),
            createWritableKey(params.treasuryTokenAccount),
            createReadonlyKey(params.tokenProgram),
        ],
        data,
    });
}

export interface RegisterMembershipInstructionParams {
    programId: PublicKey;
    application: PublicKey;
    membership: PublicKey;
    authority: PublicKey;
    member: PublicKey;
    tier: number;
    expiresAt: bigint;
    renewable?: boolean;
    autoExtend?: boolean;
    renewalDuration?: bigint;
    membershipKind?: number;
    nftMint?: PublicKey;
}

export function buildRegisterMembershipInstruction(
    params: RegisterMembershipInstructionParams,
): TransactionInstruction {
    const renewable = params.renewable ?? false;
    const autoExtend = params.autoExtend ?? false;
    const renewalDuration = params.renewalDuration ?? 0n;
    const membershipKind = params.membershipKind ?? 0;
    const nftMint = params.nftMint ?? PublicKey.default;

    const data = Buffer.concat([
        instructionDiscriminator("register_membership"),
        params.member.toBuffer(),
        Buffer.from(Uint8Array.of(
            params.tier & 0xff,
            (params.tier >> 8) & 0xff,
        )),
        encodeU64(params.expiresAt),
        encodeBool(renewable),
        encodeBool(autoExtend),
        encodeU64(renewalDuration),
        encodeEnum(membershipKind),
        nftMint.toBuffer(),
    ]);

    return new TransactionInstruction({
        programId: params.programId,
        keys: [
            createReadonlyKey(params.application),
            createWritableKey(params.membership),
            createSignerKey(params.authority),
            createReadonlyKey(SystemProgram.programId),
        ],
        data,
    });
}

export interface UpdateMembershipInstructionParams {
    programId: PublicKey;
    application: PublicKey;
    membership: PublicKey;
    authority: PublicKey;
    tier: number;
    status: number;
    expiresAt: bigint;
    renewable: boolean;
    autoExtend: boolean;
    renewalDuration: bigint;
}

export function buildUpdateMembershipInstruction(
    params: UpdateMembershipInstructionParams,
): TransactionInstruction {
    return new TransactionInstruction({
        programId: params.programId,
        keys: [
            createReadonlyKey(params.application),
            createWritableKey(params.membership),
            createSignerKey(params.authority),
        ],
        data: Buffer.concat([
            instructionDiscriminator("update_membership"),
            Buffer.from(Uint8Array.of(
                params.tier & 0xff,
                (params.tier >> 8) & 0xff,
            )),
            encodeEnum(params.status),
            encodeU64(params.expiresAt),
            encodeBool(params.renewable),
            encodeBool(params.autoExtend),
            encodeU64(params.renewalDuration),
        ]),
    });
}

export interface RenewMembershipInstructionParams {
    programId: PublicKey;
    application: PublicKey;
    membership: PublicKey;
    authority: PublicKey;
    requestedExpiresAt?: bigint;
}

export function buildRenewMembershipInstruction(
    params: RenewMembershipInstructionParams,
): TransactionInstruction {
    return new TransactionInstruction({
        programId: params.programId,
        keys: [
            createReadonlyKey(params.application),
            createWritableKey(params.membership),
            createSignerKey(params.authority),
        ],
        data: Buffer.concat([
            instructionDiscriminator("renew_membership"),
            encodeU64(params.requestedExpiresAt ?? 0n),
        ]),
    });
}

export interface VerifyNftMembershipInstructionParams {
    programId: PublicKey;
    application: PublicKey;
    membership: PublicKey;
    member: PublicKey;
    nftTokenAccount: PublicKey;
}

export function buildVerifyNftMembershipInstruction(
    params: VerifyNftMembershipInstructionParams,
): TransactionInstruction {
    return new TransactionInstruction({
        programId: params.programId,
        keys: [
            createReadonlyKey(params.application),
            createWritableKey(params.membership),
            createSignerKey(params.member),
            createReadonlyKey(params.nftTokenAccount),
        ],
        data: instructionDiscriminator(
            "verify_nft_membership",
        ),
    });
}

export interface CreateRewardInstructionParams {
    programId: PublicKey;
    application: PublicKey;
    reward: PublicKey;
    authority: PublicKey;
    beneficiary: PublicKey;
    rewardId?: bigint;
    asset: PublicKey;
    amount: bigint;
    claimableAt?: bigint;
    expiresAt?: bigint;
    category?: number;
    reason?: string;
}

export function buildCreateRewardInstruction(
    params: CreateRewardInstructionParams,
): TransactionInstruction {
    const rewardId = params.rewardId ?? 0n;
    const claimableAt = params.claimableAt ?? 0n;
    const expiresAt = params.expiresAt ?? 0n;
    const category = params.category ?? 0;
    const reason = params.reason ?? "";

    if (!Number.isInteger(category) || category < 0 || category > 255) {
        throw new Error("Reward category must be an unsigned 8-bit integer.");
    }

    const claimableAtBuffer = Buffer.alloc(8);
    claimableAtBuffer.writeBigInt64LE(claimableAt);

    const expiresAtBuffer = Buffer.alloc(8);
    expiresAtBuffer.writeBigInt64LE(expiresAt);

    const data = Buffer.concat([
        instructionDiscriminator("create_reward"),
        params.beneficiary.toBuffer(),
        encodeU64(rewardId),
        params.asset.toBuffer(),
        encodeU64(params.amount),
        claimableAtBuffer,
        expiresAtBuffer,
        Buffer.from([category]),
        encodeString(reason),
    ]);

    return new TransactionInstruction({
        programId: params.programId,
        keys: [
            createReadonlyKey(params.application),
            createWritableKey(params.reward),
            createSignerKey(params.authority),
            createReadonlyKey(SystemProgram.programId),
        ],
        data,
    });
}

export function buildCreateRewardBatchInstructions(
    rewards: readonly CreateRewardInstructionParams[],
): TransactionInstruction[] {
    if (rewards.length === 0) {
        throw new Error("Reward batch must contain at least one reward.");
    }

    return rewards.map((reward) =>
        buildCreateRewardInstruction(reward),
    );
}

export interface ClaimRewardInstructionParams {
    programId: PublicKey;
    reward: PublicKey;
    beneficiary: PublicKey;
}

export function buildClaimRewardInstruction(
    params: ClaimRewardInstructionParams,
): TransactionInstruction {
    return new TransactionInstruction({
        programId: params.programId,
        keys: [
            createWritableKey(params.reward),
            createSignerKey(params.beneficiary),
        ],
        data: instructionDiscriminator("claim_reward"),
    });
}

export interface CancelRewardInstructionParams {
    programId: PublicKey;
    application: PublicKey;
    reward: PublicKey;
    authority: PublicKey;
}

export function buildCancelRewardInstruction(
    params: CancelRewardInstructionParams,
): TransactionInstruction {
    return new TransactionInstruction({
        programId: params.programId,
        keys: [
            createReadonlyKey(params.application),
            createWritableKey(params.reward),
            createSignerKey(params.authority),
        ],
        data: instructionDiscriminator("cancel_reward"),
    });
}

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

export function buildConfigureTokenGateInstruction(
    params: ConfigureTokenGateInstructionParams,
): TransactionInstruction {
    const minimumTier = Buffer.alloc(2);
    minimumTier.writeUInt16LE(params.minimumTier);

    const data = Buffer.concat([
        instructionDiscriminator("configure_token_gate"),
        encodeEnum(params.gateType),
        encodeU64(params.minimumAmount),
        minimumTier,
        encodeBool(params.enabled),
    ]);

    return new TransactionInstruction({
        programId: params.programId,
        keys: [
            createReadonlyKey(params.application),
            createReadonlyKey(params.applicationAsset),
            createWritableKey(params.tokenGate),
            createSignerKey(params.authority),
            createReadonlyKey(SystemProgram.programId),
        ],
        data,
    });
}

export interface VerifyGateAccessInstructionParams {
    programId: PublicKey;
    application: PublicKey;
    applicationAsset: PublicKey;
    tokenGate: PublicKey;
    wallet: PublicKey;
    userTokenAccount: PublicKey;
}

export function buildVerifyGateAccessInstruction(
    params: VerifyGateAccessInstructionParams,
): TransactionInstruction {
    return new TransactionInstruction({
        programId: params.programId,
        keys: [
            createReadonlyKey(params.application),
            createReadonlyKey(params.applicationAsset),
            createReadonlyKey(params.tokenGate),
            createSignerKey(params.wallet),
            createReadonlyKey(params.userTokenAccount),
        ],
        data: instructionDiscriminator("verify_gate_access"),
    });
}

export interface AssignApplicationRoleInstructionParams {
    programId: PublicKey;
    application: PublicKey;
    applicationRole: PublicKey;
    member: PublicKey;
    authority: PublicKey;
    role: number;
}

export function buildAssignApplicationRoleInstruction(
    params: AssignApplicationRoleInstructionParams,
): TransactionInstruction {
    const data = Buffer.concat([
        instructionDiscriminator("assign_application_role"),
        encodeEnum(params.role),
    ]);

    return new TransactionInstruction({
        programId: params.programId,
        keys: [
            createReadonlyKey(params.application),
            createWritableKey(params.applicationRole),
            createReadonlyKey(params.member),
            createSignerKey(params.authority),
            createReadonlyKey(SystemProgram.programId),
        ],
        data,
    });
}

export interface UpdateApplicationRoleInstructionParams {
    programId: PublicKey;
    application: PublicKey;
    applicationRole: PublicKey;
    authority: PublicKey;
    role: number;
    active: boolean;
}

export function buildUpdateApplicationRoleInstruction(
    params: UpdateApplicationRoleInstructionParams,
): TransactionInstruction {
    const data = Buffer.concat([
        instructionDiscriminator("update_application_role"),
        encodeEnum(params.role),
        encodeBool(params.active),
    ]);

    return new TransactionInstruction({
        programId: params.programId,
        keys: [
            createReadonlyKey(params.application),
            createWritableKey(params.applicationRole),
            createSignerKey(params.authority),
        ],
        data,
    });
}

export interface UpdateApplicationStatusInstructionParams {
    programId: PublicKey;
    application: PublicKey;
    authority: PublicKey;
    newStatus: number;
}

export function buildUpdateApplicationStatusInstruction(
    params: UpdateApplicationStatusInstructionParams,
): TransactionInstruction {
    return new TransactionInstruction({
        programId: params.programId,
        keys: [
            createWritableKey(params.application),
            createSignerKey(params.authority),
        ],
        data: Buffer.concat([
            instructionDiscriminator("update_application_status"),
            encodeEnum(params.newStatus),
        ]),
    });
}

export interface SetProtocolPauseInstructionParams {
    programId: PublicKey;
    protocolConfig: PublicKey;
    authority: PublicKey;
    paused: boolean;
}

export function buildSetProtocolPauseInstruction(
    params: SetProtocolPauseInstructionParams,
): TransactionInstruction {
    const data = Buffer.concat([
        instructionDiscriminator("set_protocol_pause"),
        encodeBool(params.paused),
    ]);

    return new TransactionInstruction({
        programId: params.programId,
        keys: [
            createWritableKey(params.protocolConfig),
            createSignerKey(params.authority),
        ],
        data,
    });
}

export interface NominateProtocolAuthorityInstructionParams {
    programId: PublicKey;
    protocolConfig: PublicKey;
    authority: PublicKey;
    newAuthority: PublicKey;
}

export function buildNominateProtocolAuthorityInstruction(
    params: NominateProtocolAuthorityInstructionParams,
): TransactionInstruction {
    const data = Buffer.concat([
        instructionDiscriminator("nominate_protocol_authority"),
        params.newAuthority.toBuffer(),
    ]);

    return new TransactionInstruction({
        programId: params.programId,
        keys: [
            createWritableKey(params.protocolConfig),
            createSignerKey(params.authority),
        ],
        data,
    });
}

export interface AcceptProtocolAuthorityInstructionParams {
    programId: PublicKey;
    protocolConfig: PublicKey;
    pendingAuthority: PublicKey;
}

export function buildAcceptProtocolAuthorityInstruction(
    params: AcceptProtocolAuthorityInstructionParams,
): TransactionInstruction {
    return new TransactionInstruction({
        programId: params.programId,
        keys: [
            createWritableKey(params.protocolConfig),
            createSignerKey(params.pendingAuthority),
        ],
        data: instructionDiscriminator("accept_protocol_authority"),
    });
}

export interface RecordAuditLogInstructionParams {
    programId: PublicKey;
    application: PublicKey;
    auditLog: PublicKey;
    authority: PublicKey;
    nonce: bigint;
    action: number;
    category: number;
    severity: number;
    reference: PublicKey;
    indexedReferences: [PublicKey, PublicKey, PublicKey];
    metadata: string;
}

export function buildRecordAuditLogInstruction(
    params: RecordAuditLogInstructionParams,
): TransactionInstruction {
    const data = Buffer.concat([
        instructionDiscriminator("record_audit_log"),
        encodeU64(params.nonce),
        encodeEnum(params.action),
        encodeEnum(params.category),
        encodeEnum(params.severity),
        params.reference.toBuffer(),
        ...params.indexedReferences.map((reference) =>
            reference.toBuffer()
        ),
        encodeString(params.metadata),
    ]);

    return new TransactionInstruction({
        programId: params.programId,
        keys: [
            createReadonlyKey(params.application),
            createWritableKey(params.auditLog),
            createSignerKey(params.authority),
            createReadonlyKey(SystemProgram.programId),
        ],
        data,
    });
}
