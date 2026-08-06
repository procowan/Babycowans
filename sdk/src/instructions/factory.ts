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

export function buildProcessPaymentInstruction(
    params: ProcessPaymentInstructionParams,
): TransactionInstruction {
    const data = Buffer.concat([
        instructionDiscriminator("process_payment"),
        encodeU64(params.amount),
    ]);

    return new TransactionInstruction({
        programId: params.programId,
        keys: [
            createReadonlyKey(params.application),
            createReadonlyKey(params.applicationAsset),
            createReadonlyKey(params.assetConfig),
            createReadonlyKey(params.mint),
            createSignerKey(params.payer),
            createWritableKey(params.payerTokenAccount),
            createWritableKey(params.destinationTokenAccount),
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
}

export function buildRegisterMembershipInstruction(
    params: RegisterMembershipInstructionParams,
): TransactionInstruction {
    const data = Buffer.concat([
        instructionDiscriminator("register_membership"),
        Buffer.concat([
            params.member.toBuffer(),
            Buffer.from(Uint8Array.of(
                params.tier & 0xff,
                (params.tier >> 8) & 0xff,
            )),
            encodeU64(params.expiresAt),
        ]),
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

export interface CreateRewardInstructionParams {
    programId: PublicKey;
    application: PublicKey;
    reward: PublicKey;
    authority: PublicKey;
    beneficiary: PublicKey;
    asset: PublicKey;
    amount: bigint;
}

export function buildCreateRewardInstruction(
    params: CreateRewardInstructionParams,
): TransactionInstruction {
    const data = Buffer.concat([
        instructionDiscriminator("create_reward"),
        params.beneficiary.toBuffer(),
        params.asset.toBuffer(),
        encodeU64(params.amount),
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
    reference: PublicKey;
}

export function buildRecordAuditLogInstruction(
    params: RecordAuditLogInstructionParams,
): TransactionInstruction {
    const data = Buffer.concat([
        instructionDiscriminator("record_audit_log"),
        encodeU64(params.nonce),
        encodeEnum(params.action),
        params.reference.toBuffer(),
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
