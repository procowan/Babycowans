import {
    PublicKey,
    SystemProgram,
} from "@solana/web3.js";

import {
    buildRecordAuditLogInstruction,
} from "../src/index.js";

const programId = new PublicKey(
    "BSZkHJyqBW19HQ2tTgooKxPc5FEehgm5uxL44Ggxjucp",
);

const application = new PublicKey(
    "11111111111111111111111111111111",
);

const auditLog = new PublicKey(
    "SysvarRent111111111111111111111111111111111",
);

const authority = new PublicKey(
    "SysvarC1ock11111111111111111111111111111111",
);

const reference = new PublicKey(
    "SysvarRecentB1ockHashes11111111111111111111",
);

const indexedReferences: [
    PublicKey,
    PublicKey,
    PublicKey,
] = [
    reference,
    application,
    authority,
];

const metadata = '{"event":"payment_processed","version":2}';

const nonce = 0x0102030405060708n;
const action = 4;
const category = 2;
const severity = 1;

const instruction = buildRecordAuditLogInstruction({
    programId,
    application,
    auditLog,
    authority,
    nonce,
    action,
    category,
    severity,
    reference,
    indexedReferences,
    metadata,
});

if (!instruction.programId.equals(programId)) {
    throw new Error("Audit Log program id mismatch.");
}

if (instruction.keys.length !== 4) {
    throw new Error(
        `Expected 4 Audit Log accounts, received ${instruction.keys.length}.`,
    );
}

if (!instruction.keys[0].pubkey.equals(application)) {
    throw new Error("Application account ordering mismatch.");
}

if (instruction.keys[0].isWritable) {
    throw new Error("Application must remain readonly.");
}

if (!instruction.keys[1].pubkey.equals(auditLog)) {
    throw new Error("AuditLog account ordering mismatch.");
}

if (!instruction.keys[1].isWritable) {
    throw new Error("AuditLog must remain writable.");
}

if (!instruction.keys[2].pubkey.equals(authority)) {
    throw new Error("Authority account ordering mismatch.");
}

if (!instruction.keys[2].isSigner) {
    throw new Error("Authority must remain a signer.");
}

if (!instruction.keys[3].pubkey.equals(SystemProgram.programId)) {
    throw new Error("System Program ordering mismatch.");
}

const data = instruction.data;

let offset = 8;

const storedNonce = data.readBigUInt64LE(offset);
offset += 8;

if (storedNonce !== nonce) {
    throw new Error("Audit Log nonce encoding mismatch.");
}

const storedAction = data.readUInt8(offset);
offset += 1;

if (storedAction !== action) {
    throw new Error("Audit Log action encoding mismatch.");
}

const storedCategory = data.readUInt8(offset);
offset += 1;

if (storedCategory !== category) {
    throw new Error("Audit Log category encoding mismatch.");
}

const storedSeverity = data.readUInt8(offset);
offset += 1;

if (storedSeverity !== severity) {
    throw new Error("Audit Log severity encoding mismatch.");
}

const storedReference = new PublicKey(
    data.subarray(offset, offset + 32),
);
offset += 32;

if (!storedReference.equals(reference)) {
    throw new Error("Audit Log primary reference encoding mismatch.");
}

for (let index = 0; index < 3; index += 1) {
    const storedIndexedReference = new PublicKey(
        data.subarray(offset, offset + 32),
    );

    offset += 32;

    if (
        !storedIndexedReference.equals(
            indexedReferences[index],
        )
    ) {
        throw new Error(
            `Audit Log indexed reference ${index} encoding mismatch.`,
        );
    }
}

const metadataLength = data.readUInt32LE(offset);
offset += 4;

const expectedMetadataLength =
    Buffer.byteLength(metadata, "utf8");

if (metadataLength !== expectedMetadataLength) {
    throw new Error("Audit Log metadata length encoding mismatch.");
}

const storedMetadata = data
    .subarray(offset, offset + metadataLength)
    .toString("utf8");

offset += metadataLength;

if (storedMetadata !== metadata) {
    throw new Error("Audit Log metadata encoding mismatch.");
}

if (offset !== data.length) {
    throw new Error(
        `Unexpected trailing Audit Log instruction bytes: ${data.length - offset}`,
    );
}

console.log("✓ Audit Log SDK binary layout is stable");
console.log("✓ Audit category ABI is encoded");
console.log("✓ Audit severity ABI is encoded");
console.log("✓ Three indexed references are encoded");
console.log("✓ Rich metadata Borsh layout is encoded");
console.log("✓ Audit account metas are stable");
