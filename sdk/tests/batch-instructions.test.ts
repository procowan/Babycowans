import assert from "node:assert/strict";
import test from "node:test";

import {
    Keypair,
    PublicKey,
} from "@solana/web3.js";

import {
    CanonicalEcosystem,
    TransactionHelper,
    buildApplicationBootstrapPlan,
    findApplicationConfigPda,
    findApplicationPda,
    findApplicationRolePda,
    instructionDiscriminator,
} from "../src/index.js";

function discriminator(
    instructionData: Buffer,
): Buffer {
    return instructionData.subarray(
        0,
        8,
    );
}

const programId =
    new PublicKey(
        Buffer.alloc(32, 111),
    );

const authority =
    new PublicKey(
        Buffer.alloc(32, 112),
    );

const member =
    new PublicKey(
        Buffer.alloc(32, 113),
    );

const applicationId =
    9_007_199_254_740_993n;

const config = {
    websiteUri:
        "https://babycowans.example",
    logoUri:
        "https://babycowans.example/logo.png",
    supportUri:
        "https://babycowans.example/support",
    description:
        "Phase 11 batch semantic proof",
    metadataUri:
        "https://babycowans.example/meta.json",
};

test(
    "application bootstrap composes Register → Config in deterministic order",
    () => {
        const plan =
            buildApplicationBootstrapPlan({
                programId,
                authority,
                applicationId,
                name:
                    "Phase 11 Batch",
                selectedEcosystem:
                    CanonicalEcosystem.BabyReptile,
                config,
            });

        const [application] =
            findApplicationPda(
                programId,
                authority,
                applicationId,
            );

        const [applicationConfig] =
            findApplicationConfigPda(
                programId,
                application,
            );

        assert.ok(
            plan.application.equals(
                application,
            ),
        );

        assert.ok(
            plan.applicationConfig.equals(
                applicationConfig,
            ),
        );

        assert.equal(
            plan.applicationRole,
            undefined,
        );

        assert.equal(
            plan.instructions.length,
            2,
        );

        assert.deepEqual(
            discriminator(
                plan.instructions[0]!.data,
            ),
            instructionDiscriminator(
                "register_application",
            ),
        );

        assert.deepEqual(
            discriminator(
                plan.instructions[1]!.data,
            ),
            instructionDiscriminator(
                "configure_application_config",
            ),
        );
    },
);

test(
    "optional role extends bootstrap to exactly three ordered instructions",
    () => {
        const plan =
            buildApplicationBootstrapPlan({
                programId,
                authority,
                applicationId:
                    applicationId + 1n,
                name:
                    "Phase 11 Batch Role",
                selectedEcosystem:
                    CanonicalEcosystem.BabyReptile,
                config,
                role: {
                    member,
                    role: 2,
                },
            });

        const [expectedRole] =
            findApplicationRolePda(
                programId,
                plan.application,
                member,
            );

        assert.equal(
            plan.instructions.length,
            3,
        );

        assert.ok(
            plan.applicationRole?.equals(
                expectedRole,
            ),
        );

        assert.deepEqual(
            discriminator(
                plan.instructions[0]!.data,
            ),
            instructionDiscriminator(
                "register_application",
            ),
        );

        assert.deepEqual(
            discriminator(
                plan.instructions[1]!.data,
            ),
            instructionDiscriminator(
                "configure_application_config",
            ),
        );

        assert.deepEqual(
            discriminator(
                plan.instructions[2]!.data,
            ),
            instructionDiscriminator(
                "assign_application_role",
            ),
        );
    },
);

test(
    "every bootstrap instruction uses the same authority signer",
    () => {
        const plan =
            buildApplicationBootstrapPlan({
                programId,
                authority,
                applicationId:
                    applicationId + 2n,
                name:
                    "Phase 11 Signer",
                selectedEcosystem:
                    CanonicalEcosystem.BabyReptile,
                config,
                role: {
                    member,
                    role: 3,
                },
            });

        for (
            const instruction
            of plan.instructions
        ) {
            const signerKeys =
                instruction.keys.filter(
                    (key) =>
                        key.isSigner,
                );

            assert.equal(
                signerKeys.length,
                1,
            );

            assert.ok(
                signerKeys[0]!.pubkey.equals(
                    authority,
                ),
            );
        }
    },
);

test(
    "TransactionHelper preserves canonical batch instruction ordering",
    async () => {
        const plan =
            buildApplicationBootstrapPlan({
                programId,
                authority,
                applicationId:
                    applicationId + 3n,
                name:
                    "Phase 11 Ordering",
                selectedEcosystem:
                    CanonicalEcosystem.BabyReptile,
                config,
                role: {
                    member,
                    role: 1,
                },
            });

        const blockhash =
            Keypair.generate()
                .publicKey
                .toBase58();

        const connection = {
            getLatestBlockhash:
                async () => ({
                    blockhash,
                    lastValidBlockHeight:
                        1,
                }),
        };

        const helper =
            new TransactionHelper(
                connection as never,
            );

        const transaction =
            await helper.createTransaction(
                authority,
                plan.instructions,
            );

        assert.equal(
            transaction.instructions.length,
            3,
        );

        for (
            let index = 0;
            index <
                plan.instructions.length;
            index += 1
        ) {
            assert.strictEqual(
                transaction.instructions[
                    index
                ],
                plan.instructions[index],
            );
        }

        assert.ok(
            transaction.feePayer?.equals(
                authority,
            ),
        );
    },
);
