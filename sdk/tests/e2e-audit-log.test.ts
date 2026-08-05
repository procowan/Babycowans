import fs from "node:fs";

import {
    Connection,
    Keypair,
    PublicKey,
    sendAndConfirmTransaction,
    Transaction,
} from "@solana/web3.js";

import {
    buildRecordAuditLogInstruction,
    findApplicationPda,
    findAuditLogPda,
    findRewardPda,
} from "../src/index.js";

const RPC_URL = "http://127.0.0.1:8899";

const PROGRAM_ID = new PublicKey(
    "BSZkHJyqBW19HQ2tTgooKxPc5FEehgm5uxL44Ggxjucp",
);

const APPLICATION_ID = 1785944594341n;
const AUDIT_NONCE = BigInt(Date.now());
const PROCESS_PAYMENT_ACTION = 4;

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

const [auditLog] = findAuditLogPda(
    PROGRAM_ID,
    application,
    authority.publicKey,
    AUDIT_NONCE,
);

const existingAuditLog =
    await connection.getAccountInfo(auditLog);

if (existingAuditLog !== null) {
    throw new Error(
        `AuditLog already exists at ${auditLog.toBase58()}.`,
    );
}

const instruction = buildRecordAuditLogInstruction({
    programId: PROGRAM_ID,
    application,
    auditLog,
    authority: authority.publicKey,
    nonce: AUDIT_NONCE,
    action: PROCESS_PAYMENT_ACTION,
    reference: reward,
});

const signature = await sendAndConfirmTransaction(
    connection,
    new Transaction().add(instruction),
    [authority],
    {
        commitment: "confirmed",
    },
);

const auditLogAccount =
    await connection.getAccountInfo(auditLog);

if (auditLogAccount === null) {
    throw new Error(
        "record_audit_log succeeded, but AuditLog was not created.",
    );
}

if (!auditLogAccount.owner.equals(PROGRAM_ID)) {
    throw new Error(
        "AuditLog account is not owned by the Babycowans program.",
    );
}

console.log("✓ record_audit_log executed successfully");
console.log(`✓ Transaction: ${signature}`);
console.log(`✓ Audit nonce: ${AUDIT_NONCE}`);
console.log(`✓ AuditLog PDA: ${auditLog.toBase58()}`);
console.log(`✓ Reference: ${reward.toBase58()}`);
console.log(`✓ Account owner: ${auditLogAccount.owner.toBase58()}`);
