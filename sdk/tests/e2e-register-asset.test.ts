import fs from "node:fs";

import {
    Connection,
    Keypair,
    PublicKey,
    sendAndConfirmTransaction,
    Transaction,
} from "@solana/web3.js";

import {
    buildRegisterAssetInstruction,
    findAssetConfigPda,
} from "../src/index.js";

const RPC_URL =
    process.env.BABYCOWANS_RPC_URL ??
    "http://127.0.0.1:8899";

const PROGRAM_ID = new PublicKey(
    "BSZkHJyqBW19HQ2tTgooKxPc5FEehgm5uxL44Ggxjucp",
);

const BRC_MINT = new PublicKey(
    "25ZEDgK2R62VRnWbqzfKXire7Gdamkopkx6hqtBwpump",
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

const mintAccount = await connection.getAccountInfo(BRC_MINT);

if (mintAccount === null) {
    throw new Error(
        "The canonical BRC mint is missing from the local validator.",
    );
}

const [assetConfig] = findAssetConfigPda(
    PROGRAM_ID,
    BRC_MINT,
);

const existingAsset =
    await connection.getAccountInfo(assetConfig);

if (existingAsset !== null) {
    throw new Error(
        `AssetConfig already exists at ${assetConfig.toBase58()}.`,
    );
}

const instruction = buildRegisterAssetInstruction({
    programId: PROGRAM_ID,
    authority: authority.publicKey,
    mint: BRC_MINT,
    assetCode: "BRC",
    domain: 4,
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

const assetAccount =
    await connection.getAccountInfo(assetConfig);

if (assetAccount === null) {
    throw new Error(
        "register_asset succeeded, but AssetConfig was not created.",
    );
}

if (!assetAccount.owner.equals(PROGRAM_ID)) {
    throw new Error(
        "AssetConfig is not owned by the Babycowans program.",
    );
}

console.log("✓ register_asset executed successfully");
console.log(`✓ Transaction: ${signature}`);
console.log(`✓ Canonical mint: ${BRC_MINT.toBase58()}`);
console.log(`✓ AssetConfig PDA: ${assetConfig.toBase58()}`);
console.log(`✓ Account owner: ${assetAccount.owner.toBase58()}`);
