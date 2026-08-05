import { PublicKey } from "@solana/web3.js";
const PROTOCOL_SEED = Buffer.from("protocol");
const ASSET_SEED = Buffer.from("asset");
const APPLICATION_SEED = Buffer.from("application");
const APPLICATION_ASSET_SEED = Buffer.from("application_asset");
const APPLICATION_ROLE_SEED = Buffer.from("application_role");
const MEMBERSHIP_SEED = Buffer.from("membership");
const REWARD_SEED = Buffer.from("reward");
const TOKEN_GATE_SEED = Buffer.from("token_gate");
const AUDIT_LOG_SEED = Buffer.from("audit_log");
export function findProtocolConfigPda(programId) {
    return PublicKey.findProgramAddressSync([PROTOCOL_SEED], programId);
}
export function findAssetConfigPda(programId, mint) {
    return PublicKey.findProgramAddressSync([ASSET_SEED, mint.toBuffer()], programId);
}
export function findApplicationPda(programId, authority, applicationId) {
    const idBuffer = Buffer.alloc(8);
    idBuffer.writeBigUInt64LE(applicationId);
    return PublicKey.findProgramAddressSync([
        APPLICATION_SEED,
        authority.toBuffer(),
        idBuffer,
    ], programId);
}
export function findApplicationAssetPda(programId, application, mint) {
    return PublicKey.findProgramAddressSync([
        APPLICATION_ASSET_SEED,
        application.toBuffer(),
        mint.toBuffer(),
    ], programId);
}
export function findApplicationRolePda(programId, application, member) {
    return PublicKey.findProgramAddressSync([
        APPLICATION_ROLE_SEED,
        application.toBuffer(),
        member.toBuffer(),
    ], programId);
}
export function findMembershipPda(programId, application, member) {
    return PublicKey.findProgramAddressSync([
        MEMBERSHIP_SEED,
        application.toBuffer(),
        member.toBuffer(),
    ], programId);
}
export function findRewardPda(programId, application, beneficiary) {
    return PublicKey.findProgramAddressSync([
        REWARD_SEED,
        application.toBuffer(),
        beneficiary.toBuffer(),
    ], programId);
}
export function findTokenGatePda(programId, application, applicationAsset) {
    return PublicKey.findProgramAddressSync([
        TOKEN_GATE_SEED,
        application.toBuffer(),
        applicationAsset.toBuffer(),
    ], programId);
}
export function findAuditLogPda(programId, application, authority, nonce) {
    const nonceBuffer = Buffer.alloc(8);
    nonceBuffer.writeBigUInt64LE(nonce);
    return PublicKey.findProgramAddressSync([
        AUDIT_LOG_SEED,
        application.toBuffer(),
        authority.toBuffer(),
        nonceBuffer,
    ], programId);
}
//# sourceMappingURL=index.js.map