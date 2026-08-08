import { createHash } from "node:crypto";
import fs from "node:fs";

import {
    Connection,
    Keypair,
    PublicKey,
    sendAndConfirmTransaction,
    Transaction,
    TransactionInstruction,
} from "@solana/web3.js";

import {
    buildRecordAuditLogInstruction,
    findAuditLogPda,
} from "../src/index.js";

const RPC_URL = "http://127.0.0.1:8899";

const PROGRAM_ID = new PublicKey(
    "BSZkHJyqBW19HQ2tTgooKxPc5FEehgm5uxL44Ggxjucp",
);

const PROCESS_PAYMENT_ACTION = 4;
const PAYMENT_CATEGORY = 2;
const NOTICE_SEVERITY = 1;

const ACCOUNT_VERSION = 1;
const AUDIT_EVENT_SCHEMA_VERSION = 1;

function loadKeypair(path: string): Keypair {
    const secretKey = Uint8Array.from(
        JSON.parse(fs.readFileSync(path, "utf8")),
    );

    return Keypair.fromSecretKey(secretKey);
}

function accountDiscriminator(name: string): Buffer {
    return createHash("sha256")
        .update(`account:${name}`)
        .digest()
        .subarray(0, 8);
}

async function findAuthorityApplication(
    connection: Connection,
    authority: PublicKey,
): Promise<PublicKey> {
    const discriminator = accountDiscriminator("Application");

    const accounts = await connection.getProgramAccounts(
        PROGRAM_ID,
    );

    for (const item of accounts) {
        const data = item.account.data;

        if (data.length < 50) {
            continue;
        }

        if (!data.subarray(0, 8).equals(discriminator)) {
            continue;
        }

        const storedAuthority = new PublicKey(
            data.subarray(18, 50),
        );

        if (storedAuthority.equals(authority)) {
            return item.pubkey;
        }
    }

    throw new Error(
        "No Application owned by the local authority exists on the validator. " +
        "Run the Golden Path or application registration before this Audit E2E.",
    );
}

async function expectInstructionFailure(
    connection: Connection,
    instruction: TransactionInstruction,
    authority: Keypair,
    expectedError: string,
): Promise<void> {
    try {
        await sendAndConfirmTransaction(
            connection,
            new Transaction().add(instruction),
            [authority],
            {
                commitment: "confirmed",
            },
        );
    } catch (error: unknown) {
        const typed = error as {
            message?: string;
            logs?: string[];
            transactionLogs?: string[];
        };

        const combined = [
            String(error),
            typed.message ?? "",
            ...(typed.logs ?? []),
            ...(typed.transactionLogs ?? []),
        ].join("\n");

        if (!combined.includes(expectedError)) {
            throw new Error(
                `Expected ${expectedError}, but received:\n${combined}`,
            );
        }

        return;
    }

    throw new Error(
        `Expected ${expectedError}, but instruction succeeded.`,
    );
}

function readPublicKey(
    data: Buffer,
    offset: number,
): [PublicKey, number] {
    const end = offset + 32;

    if (end > data.length) {
        throw new Error(
            "AuditLog decoding exceeded account data.",
        );
    }

    return [
        new PublicKey(data.subarray(offset, end)),
        end,
    ];
}

const authority = loadKeypair(
    `${process.env.HOME}/.config/solana/id.json`,
);

const connection = new Connection(
    RPC_URL,
    "confirmed",
);

const application = await findAuthorityApplication(
    connection,
    authority.publicKey,
);

const reference = Keypair.generate().publicKey;

const indexedReferences: [
    PublicKey,
    PublicKey,
    PublicKey,
] = [
    reference,
    application,
    authority.publicKey,
];

const metadata = JSON.stringify({
    event: "payment_processed",
    source: "standalone_audit_log_e2e",
    correlationId: reference.toBase58(),
    version: AUDIT_EVENT_SCHEMA_VERSION,
});

if (Buffer.byteLength(metadata, "utf8") > 256) {
    throw new Error(
        "Positive-path Audit metadata unexpectedly exceeds 256 bytes.",
    );
}

const nonceBase =
    BigInt(Date.now()) * 1_000n +
    BigInt(Math.floor(Math.random() * 1_000));

const successNonce = nonceBase;
const oversizedNonce = nonceBase + 1n;
const invalidReferenceNonce = nonceBase + 2n;

const [auditLog] = findAuditLogPda(
    PROGRAM_ID,
    application,
    authority.publicKey,
    successNonce,
);

if (
    await connection.getAccountInfo(auditLog)
    !== null
) {
    throw new Error(
        `AuditLog already exists at ${auditLog.toBase58()}.`,
    );
}

const instruction = buildRecordAuditLogInstruction({
    programId: PROGRAM_ID,
    application,
    auditLog,
    authority: authority.publicKey,
    nonce: successNonce,
    action: PROCESS_PAYMENT_ACTION,
    category: PAYMENT_CATEGORY,
    severity: NOTICE_SEVERITY,
    reference,
    indexedReferences,
    metadata,
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

const data = Buffer.from(
    auditLogAccount.data,
);

const expectedDiscriminator =
    accountDiscriminator("AuditLog");

if (
    !data.subarray(0, 8).equals(
        expectedDiscriminator,
    )
) {
    throw new Error(
        "AuditLog discriminator mismatch.",
    );
}

let offset = 8;

const version =
    data.readUInt16LE(offset);
offset += 2;

const eventSchemaVersion =
    data.readUInt16LE(offset);
offset += 2;

let storedAuthority: PublicKey;
[storedAuthority, offset] =
    readPublicKey(data, offset);

let storedApplication: PublicKey;
[storedApplication, offset] =
    readPublicKey(data, offset);

const storedAction = data.readUInt8(offset);
offset += 1;

const storedCategory = data.readUInt8(offset);
offset += 1;

const storedSeverity = data.readUInt8(offset);
offset += 1;

let storedReference: PublicKey;
[storedReference, offset] =
    readPublicKey(data, offset);

const storedIndexedReferences: PublicKey[] = [];

for (let index = 0; index < 3; index += 1) {
    let stored: PublicKey;

    [stored, offset] =
        readPublicKey(data, offset);

    storedIndexedReferences.push(stored);
}

const metadataLength =
    data.readUInt32LE(offset);
offset += 4;

const metadataEnd =
    offset + metadataLength;

if (metadataEnd > data.length) {
    throw new Error(
        "AuditLog metadata length exceeds account data.",
    );
}

const storedMetadata =
    data.subarray(
        offset,
        metadataEnd,
    ).toString("utf8");

offset = metadataEnd;

if (offset + 9 > data.length) {
    throw new Error(
        "AuditLog timestamp/bump fields are missing.",
    );
}

const createdAt =
    data.readBigInt64LE(offset);
offset += 8;

const bump =
    data.readUInt8(offset);

if (version !== ACCOUNT_VERSION) {
    throw new Error(
        `Unexpected AuditLog account version: ${version}`,
    );
}

if (eventSchemaVersion !== AUDIT_EVENT_SCHEMA_VERSION) {
    throw new Error(
        `Unexpected Audit event schema version: ${eventSchemaVersion}`,
    );
}

if (!storedAuthority.equals(authority.publicKey)) {
    throw new Error(
        "AuditLog authority persistence mismatch.",
    );
}

if (!storedApplication.equals(application)) {
    throw new Error(
        "AuditLog application persistence mismatch.",
    );
}

if (storedAction !== PROCESS_PAYMENT_ACTION) {
    throw new Error(
        "AuditLog action persistence mismatch.",
    );
}

if (storedCategory !== PAYMENT_CATEGORY) {
    throw new Error(
        "AuditLog category persistence mismatch.",
    );
}

if (storedSeverity !== NOTICE_SEVERITY) {
    throw new Error(
        "AuditLog severity persistence mismatch.",
    );
}

if (!storedReference.equals(reference)) {
    throw new Error(
        "AuditLog primary reference persistence mismatch.",
    );
}

for (let index = 0; index < 3; index += 1) {
    if (
        !storedIndexedReferences[index].equals(
            indexedReferences[index],
        )
    ) {
        throw new Error(
            `AuditLog indexed reference ${index} persistence mismatch.`,
        );
    }
}

if (storedMetadata !== metadata) {
    throw new Error(
        "AuditLog metadata persistence mismatch.",
    );
}

if (createdAt <= 0n) {
    throw new Error(
        "AuditLog created_at was not persisted correctly.",
    );
}

if (bump > 255) {
    throw new Error(
        "AuditLog bump is invalid.",
    );
}

const oversizedMetadata =
    "x".repeat(257);

const [oversizedAuditLog] =
    findAuditLogPda(
        PROGRAM_ID,
        application,
        authority.publicKey,
        oversizedNonce,
    );

await expectInstructionFailure(
    connection,
    buildRecordAuditLogInstruction({
        programId: PROGRAM_ID,
        application,
        auditLog: oversizedAuditLog,
        authority: authority.publicKey,
        nonce: oversizedNonce,
        action: PROCESS_PAYMENT_ACTION,
        category: PAYMENT_CATEGORY,
        severity: NOTICE_SEVERITY,
        reference,
        indexedReferences,
        metadata: oversizedMetadata,
    }),
    authority,
    "AuditMetadataTooLong",
);

if (
    await connection.getAccountInfo(
        oversizedAuditLog,
    ) !== null
) {
    throw new Error(
        "Oversized metadata failure left an AuditLog account behind.",
    );
}

const [invalidReferenceAuditLog] =
    findAuditLogPda(
        PROGRAM_ID,
        application,
        authority.publicKey,
        invalidReferenceNonce,
    );

const invalidReference =
    new PublicKey(
        "11111111111111111111111111111111",
    );

await expectInstructionFailure(
    connection,
    buildRecordAuditLogInstruction({
        programId: PROGRAM_ID,
        application,
        auditLog: invalidReferenceAuditLog,
        authority: authority.publicKey,
        nonce: invalidReferenceNonce,
        action: PROCESS_PAYMENT_ACTION,
        category: PAYMENT_CATEGORY,
        severity: NOTICE_SEVERITY,
        reference: invalidReference,
        indexedReferences,
        metadata,
    }),
    authority,
    "InvalidAuditReference",
);

if (
    await connection.getAccountInfo(
        invalidReferenceAuditLog,
    ) !== null
) {
    throw new Error(
        "Invalid reference failure left an AuditLog account behind.",
    );
}

console.log("✓ Audit Log executed successfully");
console.log("✓ Audit event schema version 1 persisted");
console.log("✓ Audit category persisted");
console.log("✓ Audit severity persisted");
console.log("✓ Three indexed references persisted");
console.log("✓ Rich metadata persisted");
console.log("✓ Oversized metadata was rejected");
console.log("✓ Invalid audit reference was rejected");
console.log("✓ Failed audit writes left no accounts");
console.log(`✓ Transaction: ${signature}`);
console.log(`✓ Application: ${application.toBase58()}`);
console.log(`✓ AuditLog PDA: ${auditLog.toBase58()}`);
console.log(`✓ Reference: ${reference.toBase58()}`);
