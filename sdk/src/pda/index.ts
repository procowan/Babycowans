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

export function findProtocolConfigPda(
    programId: PublicKey,
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [PROTOCOL_SEED],
        programId,
    );
}

export function findAssetConfigPda(
    programId: PublicKey,
    mint: PublicKey,
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [ASSET_SEED, mint.toBuffer()],
        programId,
    );
}

export function findApplicationPda(
    programId: PublicKey,
    authority: PublicKey,
    applicationId: bigint,
): [PublicKey, number] {
    const idBuffer = Buffer.alloc(8);
    idBuffer.writeBigUInt64LE(applicationId);

    return PublicKey.findProgramAddressSync(
        [
            APPLICATION_SEED,
            authority.toBuffer(),
            idBuffer,
        ],
        programId,
    );
}

export function findApplicationAssetPda(
    programId: PublicKey,
    application: PublicKey,
    mint: PublicKey,
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            APPLICATION_ASSET_SEED,
            application.toBuffer(),
            mint.toBuffer(),
        ],
        programId,
    );
}

export function findApplicationRolePda(
    programId: PublicKey,
    application: PublicKey,
    member: PublicKey,
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            APPLICATION_ROLE_SEED,
            application.toBuffer(),
            member.toBuffer(),
        ],
        programId,
    );
}

export function findMembershipPda(
    programId: PublicKey,
    application: PublicKey,
    member: PublicKey,
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            MEMBERSHIP_SEED,
            application.toBuffer(),
            member.toBuffer(),
        ],
        programId,
    );
}

export function findRewardPda(
    programId: PublicKey,
    application: PublicKey,
    beneficiary: PublicKey,
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            REWARD_SEED,
            application.toBuffer(),
            beneficiary.toBuffer(),
        ],
        programId,
    );
}

export function findTokenGatePda(
    programId: PublicKey,
    application: PublicKey,
    applicationAsset: PublicKey,
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            TOKEN_GATE_SEED,
            application.toBuffer(),
            applicationAsset.toBuffer(),
        ],
        programId,
    );
}

export function findAuditLogPda(
    programId: PublicKey,
    application: PublicKey,
    authority: PublicKey,
    nonce: bigint,
): [PublicKey, number] {
    const nonceBuffer = Buffer.alloc(8);
    nonceBuffer.writeBigUInt64LE(nonce);

    return PublicKey.findProgramAddressSync(
        [
            AUDIT_LOG_SEED,
            application.toBuffer(),
            authority.toBuffer(),
            nonceBuffer,
        ],
        programId,
    );
}
