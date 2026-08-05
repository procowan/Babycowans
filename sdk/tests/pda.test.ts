import { Keypair } from "@solana/web3.js";

import {
    findApplicationPda,
    findApplicationAssetPda,
    findApplicationRolePda,
    findAssetConfigPda,
    findAuditLogPda,
    findMembershipPda,
    findProtocolConfigPda,
    findRewardPda,
    findTokenGatePda,
} from "../src/pda/index.js";

function expect(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(message);
    }
}

const programId = Keypair.generate().publicKey;
const authority = Keypair.generate().publicKey;
const member = Keypair.generate().publicKey;
const beneficiary = Keypair.generate().publicKey;
const mint = Keypair.generate().publicKey;

const [protocol] = findProtocolConfigPda(programId);
const [asset] = findAssetConfigPda(programId, mint);
const [application] = findApplicationPda(programId, authority, 1n);
const [applicationAsset] =
    findApplicationAssetPda(programId, application, mint);
const [role] =
    findApplicationRolePda(programId, application, member);
const [membership] =
    findMembershipPda(programId, application, member);
const [reward] =
    findRewardPda(programId, application, beneficiary);
const [gate] =
    findTokenGatePda(programId, application, applicationAsset);
const [audit] =
    findAuditLogPda(programId, application, authority, 1n);

expect(protocol !== undefined, "protocol");
expect(asset !== undefined, "asset");
expect(application !== undefined, "application");
expect(applicationAsset !== undefined, "application asset");
expect(role !== undefined, "role");
expect(membership !== undefined, "membership");
expect(reward !== undefined, "reward");
expect(gate !== undefined, "gate");
expect(audit !== undefined, "audit");

console.log("✓ PDA integration tests passed");
