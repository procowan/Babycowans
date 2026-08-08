import {
    Keypair,
    PublicKey,
    SystemProgram,
} from "@solana/web3.js";

import { CanonicalEcosystem } from "../src/ecosystems/index.js";

import {
    buildInitializeProtocolInstruction,
    buildRegisterApplicationInstruction,
    buildRegisterAssetInstruction,
    buildConfigureApplicationAssetInstruction,
    buildConfigurePaymentPolicyInstruction,
    buildUpdatePaymentPolicyInstruction,
    buildProcessPaymentInstruction,
    buildRegisterMembershipInstruction,
    buildUpdateApplicationStatusInstruction,
    buildCreateRewardInstruction,
    buildClaimRewardInstruction,
    instructionDiscriminator,
} from "../src/instructions/index.js";

function expect(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(message);
    }
}

function sameBuffer(a: Buffer, b: Buffer): boolean {
    return a.equals(b);
}

const programId = Keypair.generate().publicKey;
const authority = Keypair.generate().publicKey;
const mint = Keypair.generate().publicKey;
const application = Keypair.generate().publicKey;
const applicationAsset = Keypair.generate().publicKey;
const assetConfig = Keypair.generate().publicKey;
const paymentDestination = Keypair.generate().publicKey;
const tokenProgram = Keypair.generate().publicKey;
const payer = Keypair.generate().publicKey;
const payerTokenAccount = Keypair.generate().publicKey;
const destinationTokenAccount = Keypair.generate().publicKey;
const membership = Keypair.generate().publicKey;
const member = Keypair.generate().publicKey;
const reward = Keypair.generate().publicKey;
const beneficiary = Keypair.generate().publicKey;
const asset = Keypair.generate().publicKey;

const initializeIx = buildInitializeProtocolInstruction({
    programId,
    authority,
});

expect(
    sameBuffer(
        initializeIx.data.subarray(0, 8),
        instructionDiscriminator("initialize_protocol"),
    ),
    "initialize_protocol discriminator mismatch",
);

expect(initializeIx.keys.length === 3, "initialize_protocol account count");
expect(initializeIx.keys[0].isWritable, "protocol config must be writable");
expect(initializeIx.keys[1].isSigner, "authority must sign");
expect(
    initializeIx.keys[2].pubkey.equals(SystemProgram.programId),
    "system program mismatch",
);

const registerApplicationIx = buildRegisterApplicationInstruction({
    programId,
    authority,
    applicationId: 1n,
    name: "Example App",
    selectedEcosystem: CanonicalEcosystem.BabyReptile,
});

expect(
    sameBuffer(
        registerApplicationIx.data.subarray(0, 8),
        instructionDiscriminator("register_application"),
    ),
    "register_application discriminator mismatch",
);

expect(
    registerApplicationIx.keys.length === 4,
    "register_application account count",
);

const updateApplicationStatusIx =
    buildUpdateApplicationStatusInstruction({
        programId,
        application,
        authority,
        newStatus: 2,
    });

expect(
    sameBuffer(
        updateApplicationStatusIx.data.subarray(0, 8),
        instructionDiscriminator("update_application_status"),
    ),
    "update_application_status discriminator mismatch",
);

expect(
    updateApplicationStatusIx.keys.length === 2,
    "update_application_status account count",
);

expect(
    updateApplicationStatusIx.keys[0].isWritable,
    "application must be writable",
);

expect(
    updateApplicationStatusIx.keys[1].isSigner,
    "application authority must sign",
);

const registerAssetIx = buildRegisterAssetInstruction({
    programId,
    authority,
    mint,
    assetCode: "BRC",
    domain: 4,
});

expect(
    sameBuffer(
        registerAssetIx.data.subarray(0, 8),
        instructionDiscriminator("register_asset"),
    ),
    "register_asset discriminator mismatch",
);

expect(registerAssetIx.keys.length === 5, "register_asset account count");

const configureApplicationAssetIx =
    buildConfigureApplicationAssetInstruction({
        programId,
        application,
        assetConfig,
        mint,
        paymentDestination,
        authority,
        tokenProgram,
        paymentsEnabled: true,
        gatingEnabled: true,
        rewardsEnabled: true,
    });

expect(
    sameBuffer(
        configureApplicationAssetIx.data.subarray(0, 8),
        instructionDiscriminator("configure_application_asset"),
    ),
    "configure_application_asset discriminator mismatch",
);

expect(
    configureApplicationAssetIx.keys.length === 8,
    "configure_application_asset account count",
);

const treasury = Keypair.generate().publicKey;

const configurePaymentPolicyIx =
    buildConfigurePaymentPolicyInstruction({
        programId,
        application,
        applicationAsset,
        authority,
        minimumAmount: 100n,
        maximumAmount: 10_000n,
        paymentsEnabled: true,
        protocolFeeBps: 100,
        applicationFeeBps: 200,
        treasury,
    });
const updatePaymentPolicyIx =
    buildUpdatePaymentPolicyInstruction({
        programId,
        application,
        applicationAsset,
        authority,
        minimumAmount: 10n,
        maximumAmount: 1_000n,
        paymentsEnabled: true,
        protocolFeeBps: 100,
        applicationFeeBps: 200,
        treasury,
    });

expect(
    updatePaymentPolicyIx.data.subarray(0, 8),
    instructionDiscriminator("update_payment_policy"),
);

expect(
    updatePaymentPolicyIx.keys.length === 3,
    "update payment policy must have 3 accounts",
);

expect(
    updatePaymentPolicyIx.keys[1].isWritable,
    "payment policy must be writable",
);

expect(
    updatePaymentPolicyIx.keys[2].isSigner,
    "authority must sign update payment policy",
);


expect(
    sameBuffer(
        configurePaymentPolicyIx.data.subarray(0, 8),
        instructionDiscriminator("configure_payment_policy"),
    ),
    "configure_payment_policy discriminator mismatch",
);

expect(
    configurePaymentPolicyIx.keys.length === 5,
    "configure_payment_policy account count",
);

expect(
    configurePaymentPolicyIx.keys[2].isWritable,
    "payment policy must be writable",
);

expect(
    configurePaymentPolicyIx.keys[3].isSigner,
    "payment policy authority must sign",
);

const processPaymentIx = buildProcessPaymentInstruction({
    programId,
    application,
    applicationAsset,
    assetConfig,
    mint,
    payer,
    payerTokenAccount,
    destinationTokenAccount,
    treasuryTokenAccount: destinationTokenAccount,
    tokenProgram,
    amount: 1_000_000n,
});

expect(
    sameBuffer(
        processPaymentIx.data.subarray(0, 8),
        instructionDiscriminator("process_payment"),
    ),
    "process_payment discriminator mismatch",
);

expect(processPaymentIx.keys.length === 11, "process_payment account count");
expect(processPaymentIx.keys[6].isSigner, "payer must sign");
expect(processPaymentIx.keys[7].isWritable, "payer token account writable");
expect(
    processPaymentIx.keys[8].isWritable,
    "destination token account writable",
);

const registerMembershipIx = buildRegisterMembershipInstruction({
    programId,
    application,
    membership,
    authority,
    member,
    asset,
    tier: 2,
    expiresAt: 2_000_000_000n,
});

expect(
    sameBuffer(
        registerMembershipIx.data.subarray(0, 8),
        instructionDiscriminator("register_membership"),
    ),
    "register_membership discriminator mismatch",
);

expect(
    registerMembershipIx.keys.length === 4,
    "register_membership account count",
);

const createRewardIx = buildCreateRewardInstruction({
    programId,
    application,
    reward,
    authority,
    beneficiary,
    asset,
    amount: 500n,
});

expect(
    sameBuffer(
        createRewardIx.data.subarray(0, 8),
        instructionDiscriminator("create_reward"),
    ),
    "create_reward discriminator mismatch",
);

expect(createRewardIx.keys.length === 4, "create_reward account count");

const claimRewardIx = buildClaimRewardInstruction({
    programId,
    reward,
    beneficiary,
});

expect(
    sameBuffer(
        claimRewardIx.data.subarray(0, 8),
        instructionDiscriminator("claim_reward"),
    ),
    "claim_reward discriminator mismatch",
);

expect(claimRewardIx.keys.length === 2, "claim_reward account count");
expect(claimRewardIx.keys[0].isWritable, "reward must be writable");
expect(claimRewardIx.keys[1].isSigner, "beneficiary must sign");

const invalidAssetCode = () =>
    buildRegisterAssetInstruction({
        programId,
        authority,
        mint,
        assetCode: "TOO-LONG",
        domain: 0,
    });

let rejectedInvalidCode = false;

try {
    invalidAssetCode();
} catch {
    rejectedInvalidCode = true;
}

expect(rejectedInvalidCode, "invalid asset code must be rejected");

console.log("✓ Instruction integration tests passed");
