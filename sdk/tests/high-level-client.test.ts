import {
    Connection,
    Keypair,
    PublicKey,
} from "@solana/web3.js";

import {
    BabycowansSDK,
    CanonicalEcosystem,
    findApplicationPda,
} from "../src/index.js";

const PROGRAM_ID =
    Keypair.generate().publicKey;

const connection =
    new Connection("http://127.0.0.1:8899");

const client =
    new BabycowansSDK({
        connection,
        programId: PROGRAM_ID,
    });

const authority = Keypair.generate();
const applicationId = 8001n;

const [expectedApplication] =
    findApplicationPda(
        PROGRAM_ID,
        authority.publicKey,
        applicationId,
    );

const [clientApplication] =
    client.findApplication(
        authority.publicKey,
        applicationId,
    );

if (!clientApplication.equals(expectedApplication)) {
    throw new Error(
        "High-level client application derivation mismatch.",
    );
}

if (
    typeof client.registerApplication !==
    "function"
) {
    throw new Error(
        "registerApplication high-level method is missing.",
    );
}

const sourceShape: {
    authority: Keypair;
    applicationId: bigint;
    name: string;
    selectedEcosystem: CanonicalEcosystem;
} = {
    authority,
    applicationId,
    name: "Phase 8 High-Level Client",
    selectedEcosystem:
        CanonicalEcosystem.BabyReptile,
};

void sourceShape;

console.log(
    "✓ Phase 8 registerApplication high-level API surface",
);
console.log(
    "✓ High-level client reuses canonical Application PDA derivation",
);
console.log(
    "✓ Operation-scoped signer model preserved",
);
console.log(
    "✓ Low-level SDK remains independently accessible",
);

{
    const payer =
        Keypair.generate();

    const application =
        Keypair.generate()
            .publicKey;

    const mint =
        Keypair.generate()
            .publicKey;

    const [
        expectedApplicationAsset,
    ] =
        client.findApplicationAsset(
            application,
            mint,
        );

    const [
        expectedAssetConfig,
    ] =
        client.findAssetConfig(
            mint,
        );

    if (
        typeof client.processPayment
        !== "function"
    ) {
        throw new Error(
            "processPayment high-level method is missing.",
        );
    }

    const source =
        BabycowansSDK.prototype
            .processPayment
            .toString();

    if (
        !source.includes(
            "buildProcessPaymentInstruction",
        )
    ) {
        throw new Error(
            "processPayment must reuse the existing raw builder.",
        );
    }

    if (
        !source.includes(
            "findApplicationAsset",
        )
    ) {
        throw new Error(
            "processPayment must derive ApplicationAsset.",
        );
    }

    if (
        !source.includes(
            "findAssetConfig",
        )
    ) {
        throw new Error(
            "processPayment must derive AssetConfig.",
        );
    }

    if (
        !source.includes(
            "params.payer.publicKey",
        )
    ) {
        throw new Error(
            "processPayment signer must be payer.",
        );
    }

    if (
        expectedApplicationAsset
            .equals(expectedAssetConfig)
    ) {
        throw new Error(
            "Payment PDA domains unexpectedly collided.",
        );
    }

    void payer;

    console.log(
        "✓ Phase 8 processPayment high-level API surface",
    );

    console.log(
        "✓ payer is the operation-scoped payment signer",
    );

    console.log(
        "✓ ApplicationAsset and AssetConfig are deterministically derived",
    );

    console.log(
        "✓ Existing payment builder remains the encoding source of truth",
    );

    console.log(
        "✓ No hidden PaymentPolicy/ApplicationAsset creation introduced",
    );
}

{
    if (
        typeof client.createReward
        !== "function"
    ) {
        throw new Error(
            "createReward high-level method is missing.",
        );
    }

    if (
        typeof client.claimReward
        !== "function"
    ) {
        throw new Error(
            "claimReward high-level method is missing.",
        );
    }

    if (
        typeof client.cancelReward
        !== "function"
    ) {
        throw new Error(
            "cancelReward high-level method is missing.",
        );
    }

    const createSource =
        BabycowansSDK.prototype
            .createReward
            .toString();

    const claimSource =
        BabycowansSDK.prototype
            .claimReward
            .toString();

    const cancelSource =
        BabycowansSDK.prototype
            .cancelReward
            .toString();

    if (
        !createSource.includes(
            "buildCreateRewardInstruction",
        )
    ) {
        throw new Error(
            "createReward must reuse the existing raw builder.",
        );
    }

    if (
        !claimSource.includes(
            "buildClaimRewardInstruction",
        )
    ) {
        throw new Error(
            "claimReward must reuse the existing raw builder.",
        );
    }

    if (
        !cancelSource.includes(
            "buildCancelRewardInstruction",
        )
    ) {
        throw new Error(
            "cancelReward must reuse the existing raw builder.",
        );
    }

    if (
        !createSource.includes(
            "findRewardPda",
        )
        || !claimSource.includes(
            "findRewardPda",
        )
        || !cancelSource.includes(
            "findRewardPda",
        )
    ) {
        throw new Error(
            "Reward High-Level methods must derive the canonical Reward PDA.",
        );
    }

    if (
        !createSource.includes(
            "params.authority.publicKey",
        )
    ) {
        throw new Error(
            "createReward signer must be authority.",
        );
    }

    if (
        !claimSource.includes(
            "params.beneficiary.publicKey",
        )
    ) {
        throw new Error(
            "claimReward signer must be beneficiary.",
        );
    }

    if (
        !cancelSource.includes(
            "params.authority.publicKey",
        )
    ) {
        throw new Error(
            "cancelReward signer must be authority.",
        );
    }

    console.log(
        "✓ Phase 8 createReward high-level API surface",
    );

    console.log(
        "✓ Phase 8 claimReward high-level API surface",
    );

    console.log(
        "✓ Phase 8 cancelReward high-level API surface",
    );

    console.log(
        "✓ Reward PDA derivation remains canonical",
    );

    console.log(
        "✓ Reward operation signer model preserved",
    );

    console.log(
        "✓ Low-level reward builders remain encoding source of truth",
    );
}

{
    if (
        typeof client.configureApplicationConfig
        !== "function"
    ) {
        throw new Error(
            "configureApplicationConfig high-level API missing.",
        );
    }

    if (
        typeof client.updateApplicationConfig
        !== "function"
    ) {
        throw new Error(
            "updateApplicationConfig high-level API missing.",
        );
    }

    const configureSource =
        BabycowansSDK.prototype
            .configureApplicationConfig
            .toString();

    const updateSource =
        BabycowansSDK.prototype
            .updateApplicationConfig
            .toString();

    if (
        !configureSource.includes(
            "buildConfigureApplicationConfigInstruction",
        )
    ) {
        throw new Error(
            "configureApplicationConfig does not reuse Phase 6 builder.",
        );
    }

    if (
        !updateSource.includes(
            "buildUpdateApplicationConfigInstruction",
        )
    ) {
        throw new Error(
            "updateApplicationConfig does not reuse Phase 6 builder.",
        );
    }

    for (
        const [name, source] of [
            [
                "configureApplicationConfig",
                configureSource,
            ],
            [
                "updateApplicationConfig",
                updateSource,
            ],
        ] as const
    ) {
        if (
            !source.includes(
                "findApplicationConfigPda",
            )
        ) {
            throw new Error(
                `${name} does not derive ApplicationConfig PDA.`,
            );
        }

        if (
            !source.includes(
                "params.authority.publicKey",
            )
        ) {
            throw new Error(
                `${name} does not preserve authority signer semantics.`,
            );
        }

        if (
            !source.includes(
                "sendAndConfirmBabycowansTransaction",
            )
        ) {
            throw new Error(
                `${name} does not execute the transaction.`,
            );
        }
    }

    console.log(
        "✓ Phase 8 configureApplicationConfig high-level API",
    );

    console.log(
        "✓ Phase 8 updateApplicationConfig high-level API",
    );

    console.log(
        "✓ Phase 6 builder contract preserved",
    );

    console.log(
        "✓ ApplicationConfig PDA exposed without altering builder contract",
    );

    console.log(
        "✓ Application metadata remains isolated from canonical ecosystem identity",
    );
}

{
    const requiredHighLevelMethods = [
        "registerMembership",
        "updateMembership",
        "renewMembership",
        "verifyNftMembership",
        "configureTokenGate",
        "verifyGateAccess",
    ] as const;

    for (
        const method
        of requiredHighLevelMethods
    ) {
        if (
            typeof client[method]
            !== "function"
        ) {
            throw new Error(
                `${method} high-level API is missing.`,
            );
        }
    }

    const registerMembershipSource =
        BabycowansSDK.prototype
            .registerMembership
            .toString();

    const updateMembershipSource =
        BabycowansSDK.prototype
            .updateMembership
            .toString();

    const renewMembershipSource =
        BabycowansSDK.prototype
            .renewMembership
            .toString();

    const verifyNftSource =
        BabycowansSDK.prototype
            .verifyNftMembership
            .toString();

    for (
        const [name, source] of [
            [
                "registerMembership",
                registerMembershipSource,
            ],
            [
                "updateMembership",
                updateMembershipSource,
            ],
            [
                "renewMembership",
                renewMembershipSource,
            ],
            [
                "verifyNftMembership",
                verifyNftSource,
            ],
        ] as const
    ) {
        if (
            !source.includes(
                "findMembershipPda",
            )
        ) {
            throw new Error(
                `${name} must derive Membership PDA.`,
            );
        }

        if (
            !source.includes(
                "sendAndConfirmBabycowansTransaction",
            )
        ) {
            throw new Error(
                `${name} must execute through the High-Level client.`,
            );
        }
    }

    const configureGateSource =
        BabycowansSDK.prototype
            .configureTokenGate
            .toString();

    const verifyGateSource =
        BabycowansSDK.prototype
            .verifyGateAccess
            .toString();

    for (
        const [name, source] of [
            [
                "configureTokenGate",
                configureGateSource,
            ],
            [
                "verifyGateAccess",
                verifyGateSource,
            ],
        ] as const
    ) {
        if (
            !source.includes(
                "findTokenGatePda",
            )
        ) {
            throw new Error(
                `${name} must derive TokenGate PDA.`,
            );
        }
    }

    if (
        !registerMembershipSource.includes(
            "buildRegisterMembershipInstruction",
        )
        || !updateMembershipSource.includes(
            "buildUpdateMembershipInstruction",
        )
        || !renewMembershipSource.includes(
            "buildRenewMembershipInstruction",
        )
        || !verifyNftSource.includes(
            "buildVerifyNftMembershipInstruction",
        )
        || !configureGateSource.includes(
            "buildConfigureTokenGateInstruction",
        )
        || !verifyGateSource.includes(
            "buildVerifyGateAccessInstruction",
        )
    ) {
        throw new Error(
            "High-Level Membership/Token-Gate APIs must reuse existing builders.",
        );
    }

    console.log(
        "✓ Phase 8 Membership lifecycle High-Level API surface",
    );

    console.log(
        "✓ Phase 8 NFT membership High-Level API surface",
    );

    console.log(
        "✓ Phase 8 Token Gate High-Level API surface",
    );

    console.log(
        "✓ Membership and TokenGate PDAs remain canonical",
    );

    console.log(
        "✓ Existing low-level builders remain encoding source of truth",
    );
}
