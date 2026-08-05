import fs from "node:fs";

import {
    Connection,
    Keypair,
    PublicKey,
    sendAndConfirmTransaction,
    Transaction,
} from "@solana/web3.js";

import {
    buildInitializeProtocolInstruction,
    findProtocolConfigPda,
} from "../src/index.js";

const RPC_URL = "http://127.0.0.1:8899";
const PROGRAM_ID = new PublicKey(
    "BSZkHJyqBW19HQ2tTgooKxPc5FEehgm5uxL44Ggxjucp",
);

const secretKey = Uint8Array.from(
    JSON.parse(
        fs.readFileSync(
            `${process.env.HOME}/.config/solana/id.json`,
            "utf8",
        ),
    ),
);

const authority = Keypair.fromSecretKey(secretKey);
const connection = new Connection(RPC_URL, "confirmed");

const [protocolConfig] = findProtocolConfigPda(PROGRAM_ID);

const existingAccount =
    await connection.getAccountInfo(protocolConfig);

if (existingAccount !== null) {
    throw new Error(
        `ProtocolConfig already exists at ${protocolConfig.toBase58()}. Reset the local validator before rerunning this test.`,
    );
}

const instruction = buildInitializeProtocolInstruction({
    programId: PROGRAM_ID,
    authority: authority.publicKey,
});

const transaction = new Transaction().add(instruction);

const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [authority],
    {
        commitment: "confirmed",
    },
);

const protocolAccount =
    await connection.getAccountInfo(protocolConfig);

if (protocolAccount === null) {
    throw new Error(
        "initialize_protocol transaction succeeded, but ProtocolConfig was not created.",
    );
}

if (!protocolAccount.owner.equals(PROGRAM_ID)) {
    throw new Error(
        "ProtocolConfig is not owned by the Babycowans program.",
    );
}

console.log("✓ initialize_protocol executed successfully");
console.log(`✓ Transaction: ${signature}`);
console.log(`✓ ProtocolConfig PDA: ${protocolConfig.toBase58()}`);
console.log(`✓ Account owner: ${protocolAccount.owner.toBase58()}`);
