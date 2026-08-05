import { SystemProgram, TransactionInstruction, } from "@solana/web3.js";
import { createReadonlyKey, createSignerKey, createWritableKey, } from "../builders/index.js";
import { encodeBool, encodeEnum, encodeFixedBytes3, encodeString, encodeU64, instructionDiscriminator, } from "./codec.js";
import { findApplicationAssetPda, findApplicationPda, findAssetConfigPda, findProtocolConfigPda, } from "../pda/index.js";
export function buildInitializeProtocolInstruction(params) {
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
export function buildRegisterApplicationInstruction(params) {
    const [protocolConfig] = findProtocolConfigPda(params.programId);
    const [application] = findApplicationPda(params.programId, params.authority, params.applicationId);
    const data = Buffer.concat([
        instructionDiscriminator("register_application"),
        encodeU64(params.applicationId),
        encodeString(params.name),
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
export function buildRegisterAssetInstruction(params) {
    const [protocolConfig] = findProtocolConfigPda(params.programId);
    const [assetConfig] = findAssetConfigPda(params.programId, params.mint);
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
export function buildConfigureApplicationAssetInstruction(params) {
    const [applicationAsset] = findApplicationAssetPda(params.programId, params.application, params.mint);
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
export function buildProcessPaymentInstruction(params) {
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
export function buildRegisterMembershipInstruction(params) {
    const data = Buffer.concat([
        instructionDiscriminator("register_membership"),
        Buffer.concat([
            params.member.toBuffer(),
            params.asset.toBuffer(),
            Buffer.from(Uint8Array.of(params.tier & 0xff, (params.tier >> 8) & 0xff)),
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
export function buildCreateRewardInstruction(params) {
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
export function buildClaimRewardInstruction(params) {
    return new TransactionInstruction({
        programId: params.programId,
        keys: [
            createWritableKey(params.reward),
            createSignerKey(params.beneficiary),
        ],
        data: instructionDiscriminator("claim_reward"),
    });
}
export function buildConfigureTokenGateInstruction(params) {
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
export function buildVerifyGateAccessInstruction(params) {
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
export function buildAssignApplicationRoleInstruction(params) {
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
export function buildUpdateApplicationRoleInstruction(params) {
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
export function buildSetProtocolPauseInstruction(params) {
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
export function buildNominateProtocolAuthorityInstruction(params) {
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
export function buildAcceptProtocolAuthorityInstruction(params) {
    return new TransactionInstruction({
        programId: params.programId,
        keys: [
            createWritableKey(params.protocolConfig),
            createSignerKey(params.pendingAuthority),
        ],
        data: instructionDiscriminator("accept_protocol_authority"),
    });
}
export function buildRecordAuditLogInstruction(params) {
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
//# sourceMappingURL=factory.js.map