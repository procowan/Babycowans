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
    findApplicationConfigPda,
    findGatePolicyPda,
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


{
    const programId = Keypair.generate().publicKey;
    const applicationAsset =
        Keypair.generate().publicKey;

    const [first, firstBump] =
        findGatePolicyPda(
            programId,
            applicationAsset,
        );

    const [second, secondBump] =
        findGatePolicyPda(
            programId,
            applicationAsset,
        );

    expect(
        first.equals(second),
        "Gate Policy PDA derivation must be deterministic",
    );

    expect(
        firstBump === secondBump,
        "Gate Policy PDA bump must be deterministic",
    );

    console.log(
        "✓ Gate Policy PDA derivation",
    );
}

/*
 * Phase 6 ApplicationConfig PDA
 */
{
    const application =
        Keypair.generate().publicKey;

    const [first, firstBump] =
        findApplicationConfigPda(
            programId,
            application,
        );

    const [second, secondBump] =
        findApplicationConfigPda(
            programId,
            application,
        );

    expect(
        first.equals(second),
        "ApplicationConfig PDA derivation must be deterministic",
    );

    expect(
        firstBump === secondBump,
        "ApplicationConfig PDA bump must be deterministic",
    );

    const [manual] =
        await import("@solana/web3.js").then(
            ({ PublicKey }) =>
                PublicKey.findProgramAddressSync(
                    [
                        Buffer.from(
                            "application_config",
                        ),
                        application.toBuffer(),
                    ],
                    programId,
                ),
        );

    expect(
        first.equals(manual),
        "ApplicationConfig PDA must use application_config + application seeds",
    );

    console.log(
        "✓ Phase 6 ApplicationConfig PDA",
    );
}
