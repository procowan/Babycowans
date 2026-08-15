import fs from "node:fs";

import {
    Connection,
    Keypair,
    PublicKey,
    sendAndConfirmTransaction,
    Transaction,
} from "@solana/web3.js";

import {
    CanonicalEcosystem,
    buildRegisterApplicationInstruction,
    findApplicationPda,
    findProtocolConfigPda,
} from "../src/index.js";

const RPC_URL =
    process.env.BABYCOWANS_RPC_URL ??
    "http://127.0.0.1:8899";

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

const protocolAccount =
    await connection.getAccountInfo(protocolConfig);

if (protocolAccount === null) {
    throw new Error(
        "ProtocolConfig does not exist. Run the initialize E2E test first.",
    );
}

const applicationId = BigInt(Date.now());
const applicationName = "Babycowans E2E Application";

const [application] = findApplicationPda(
    PROGRAM_ID,
    authority.publicKey,
    applicationId,
);

const instruction = buildRegisterApplicationInstruction({
    programId: PROGRAM_ID,
    authority: authority.publicKey,
    applicationId,
    name: applicationName,
    selectedEcosystem: CanonicalEcosystem.BabyReptile,
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

const applicationAccount =
    await connection.getAccountInfo(application);

if (applicationAccount === null) {
    throw new Error(
        "register_application succeeded, but the Application account was not created.",
    );
}

if (!applicationAccount.owner.equals(PROGRAM_ID)) {
    throw new Error(
        "Application account is not owned by the Babycowans program.",
    );
}

console.log("✓ register_application executed successfully");
console.log(`✓ Transaction: ${signature}`);
console.log(`✓ Application ID: ${applicationId}`);
console.log(`✓ Application PDA: ${application.toBase58()}`);
console.log(`✓ Account owner: ${applicationAccount.owner.toBase58()}`);
