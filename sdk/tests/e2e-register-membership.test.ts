import fs from "node:fs";

import {
    Connection,
    Keypair,
    PublicKey,
    sendAndConfirmTransaction,
    Transaction,
} from "@solana/web3.js";

import {
    buildRegisterMembershipInstruction,
    findApplicationPda,
    findMembershipPda,
} from "../src/index.js";

const RPC_URL = "http://127.0.0.1:8899";

const PROGRAM_ID = new PublicKey(
    "BSZkHJyqBW19HQ2tTgooKxPc5FEehgm5uxL44Ggxjucp",
);

const BRC_MINT = new PublicKey(
    "25ZEDgK2R62VRnWbqzfKXire7Gdamkopkx6hqtBwpump",
);

const APPLICATION_ID = 1785944594341n;
const MEMBERSHIP_TIER = 1;
const EXPIRES_AT = 2_000_000_000n;

function loadKeypair(path: string): Keypair {
    const secretKey = Uint8Array.from(
        JSON.parse(fs.readFileSync(path, "utf8")),
    );

    return Keypair.fromSecretKey(secretKey);
}

const authority = loadKeypair(
    `${process.env.HOME}/.config/solana/id.json`,
);

const member = loadKeypair(
    "/tmp/babycowans-payer.json",
);

const connection = new Connection(RPC_URL, "confirmed");

const [application] = findApplicationPda(
    PROGRAM_ID,
    authority.publicKey,
    APPLICATION_ID,
);

const [membership] = findMembershipPda(
    PROGRAM_ID,
    application,
    member.publicKey,
);

const existingMembership =
    await connection.getAccountInfo(membership);

if (existingMembership !== null) {
    throw new Error(
        `Membership already exists at ${membership.toBase58()}.`,
    );
}

const instruction = buildRegisterMembershipInstruction({
    programId: PROGRAM_ID,
    application,
    membership,
    authority: authority.publicKey,
    member: member.publicKey,
    asset: BRC_MINT,
    tier: MEMBERSHIP_TIER,
    expiresAt: EXPIRES_AT,
});

const signature = await sendAndConfirmTransaction(
    connection,
    new Transaction().add(instruction),
    [authority],
    {
        commitment: "confirmed",
    },
);

const membershipAccount =
    await connection.getAccountInfo(membership);

if (membershipAccount === null) {
    throw new Error(
        "register_membership succeeded, but Membership was not created.",
    );
}

if (!membershipAccount.owner.equals(PROGRAM_ID)) {
    throw new Error(
        "Membership account is not owned by the Babycowans program.",
    );
}

console.log("✓ register_membership executed successfully");
console.log(`✓ Transaction: ${signature}`);
console.log(`✓ Member: ${member.publicKey.toBase58()}`);
console.log(`✓ Membership PDA: ${membership.toBase58()}`);
console.log(`✓ Tier: ${MEMBERSHIP_TIER}`);
console.log(`✓ Expires at: ${EXPIRES_AT}`);
console.log(`✓ Account owner: ${membershipAccount.owner.toBase58()}`);
