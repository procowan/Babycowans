import fs from "node:fs";

import {
    Connection,
    Keypair,
    PublicKey,
    sendAndConfirmTransaction,
    Transaction,
} from "@solana/web3.js";

import {
    buildClaimRewardInstruction,
    buildCreateRewardInstruction,
    findApplicationPda,
    findRewardPda,
} from "../src/index.js";

const RPC_URL = "http://127.0.0.1:8899";

const PROGRAM_ID = new PublicKey(
    "BSZkHJyqBW19HQ2tTgooKxPc5FEehgm5uxL44Ggxjucp",
);

const BRC_MINT = new PublicKey(
    "25ZEDgK2R62VRnWbqzfKXire7Gdamkopkx6hqtBwpump",
);

const APPLICATION_ID = 1785944594341n;
const REWARD_AMOUNT = 500_000_000n;

function loadKeypair(path: string): Keypair {
    const secretKey = Uint8Array.from(
        JSON.parse(fs.readFileSync(path, "utf8")),
    );

    return Keypair.fromSecretKey(secretKey);
}

const authority = loadKeypair(
    `${process.env.HOME}/.config/solana/id.json`,
);

const beneficiary = loadKeypair(
    "/tmp/babycowans-payer.json",
);

const connection = new Connection(RPC_URL, "confirmed");

const [application] = findApplicationPda(
    PROGRAM_ID,
    authority.publicKey,
    APPLICATION_ID,
);

const [reward] = findRewardPda(
    PROGRAM_ID,
    application,
    beneficiary.publicKey,
);

const existingReward = await connection.getAccountInfo(reward);

if (existingReward !== null) {
    throw new Error(
        `Reward already exists at ${reward.toBase58()}.`,
    );
}

const createInstruction = buildCreateRewardInstruction({
    programId: PROGRAM_ID,
    application,
    reward,
    authority: authority.publicKey,
    beneficiary: beneficiary.publicKey,
    asset: BRC_MINT,
    amount: REWARD_AMOUNT,
});

const createSignature = await sendAndConfirmTransaction(
    connection,
    new Transaction().add(createInstruction),
    [authority],
    {
        commitment: "confirmed",
    },
);

const rewardAfterCreate = await connection.getAccountInfo(reward);

if (rewardAfterCreate === null) {
    throw new Error(
        "create_reward succeeded, but Reward was not created.",
    );
}

if (!rewardAfterCreate.owner.equals(PROGRAM_ID)) {
    throw new Error(
        "Reward account is not owned by the Babycowans program.",
    );
}

const claimInstruction = buildClaimRewardInstruction({
    programId: PROGRAM_ID,
    reward,
    beneficiary: beneficiary.publicKey,
});

const claimSignature = await sendAndConfirmTransaction(
    connection,
    new Transaction().add(claimInstruction),
    [beneficiary],
    {
        commitment: "confirmed",
    },
);

const rewardAfterClaim = await connection.getAccountInfo(reward);

if (rewardAfterClaim === null) {
    throw new Error(
        "Reward account disappeared after claim.",
    );
}

console.log("✓ create_reward executed successfully");
console.log(`✓ Create transaction: ${createSignature}`);
console.log("✓ claim_reward executed successfully");
console.log(`✓ Claim transaction: ${claimSignature}`);
console.log(`✓ Beneficiary: ${beneficiary.publicKey.toBase58()}`);
console.log(`✓ Reward PDA: ${reward.toBase58()}`);
console.log(`✓ Reward amount: ${REWARD_AMOUNT}`);
console.log(`✓ Account owner: ${rewardAfterClaim.owner.toBase58()}`);
