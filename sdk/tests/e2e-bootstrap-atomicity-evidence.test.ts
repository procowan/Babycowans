import fs from "node:fs";
import assert from "node:assert/strict";

import {
    Connection,
    Keypair,
    PublicKey,
    Transaction,
    TransactionInstruction,
    sendAndConfirmTransaction,
} from "@solana/web3.js";

import {
    CanonicalEcosystem,
    buildApplicationBootstrapPlan,
    buildInitializeProtocolInstruction,
    decodeApplicationAccount,
    decodeApplicationConfigAccount,
    findProtocolConfigPda,
} from "../src/index.js";

const PROGRAM_ID = new PublicKey("BSZkHJyqBW19HQ2tTgooKxPc5FEehgm5uxL44Ggxjucp");
const SELECTED_ECOSYSTEM = CanonicalEcosystem.BabyReptile;
const RPC_URL = process.env.SOLANA_RPC_URL ?? "http://127.0.0.1:8899";
const COMMITMENT = "confirmed" as const;
const connection = new Connection(RPC_URL, COMMITMENT);

const authority = Keypair.fromSecretKey(
    Uint8Array.from(
        JSON.parse(
            fs.readFileSync(
                `${process.env.HOME}/.config/solana/id.json`,
                "utf8",
            ),
        ),
    ),
);

function readProtocolApplicationCount(data: Buffer): bigint {
    let offset = 8;
    offset += 2;
    offset += 32;

    const pendingAuthorityTag = data.readUInt8(offset);
    offset += 1;

    if (pendingAuthorityTag === 1) {
        offset += 32;
    } else if (pendingAuthorityTag !== 0) {
        throw new Error(
            `Unexpected pending_authority tag: ${pendingAuthorityTag}`,
        );
    }

    offset += 1;

    if (offset + 8 > data.length) {
        throw new Error("ProtocolConfig too short for application_count.");
    }

    return data.readBigUInt64LE(offset);
}

async function protocolApplicationCount(
    protocolConfig: PublicKey,
): Promise<bigint> {
    const info = await connection.getAccountInfo(protocolConfig, COMMITMENT);
    assert.ok(info !== null, "ProtocolConfig account is missing.");
    assert.ok(
        info.owner.equals(PROGRAM_ID),
        "ProtocolConfig owner is not Babycowans program.",
    );
    return readProtocolApplicationCount(Buffer.from(info.data));
}

function replaceExactlyOneAccountMeta(
    instruction: TransactionInstruction,
    expected: PublicKey,
    replacement: PublicKey,
): TransactionInstruction {
    let replaced = 0;
    const keys = instruction.keys.map((key) => {
        if (!key.pubkey.equals(expected)) {
            return key;
        }
        replaced += 1;
        return { ...key, pubkey: replacement };
    });

    assert.equal(
        replaced,
        1,
        "Expected exactly one Application relationship meta replacement.",
    );

    return new TransactionInstruction({
        programId: instruction.programId,
        keys,
        data: Buffer.from(instruction.data),
    });
}

async function sendSuccess(
    instructions: readonly TransactionInstruction[],
): Promise<string> {
    const tx = new Transaction();
    for (const ix of instructions) {
        tx.add(ix);
    }
    return sendAndConfirmTransaction(
        connection,
        tx,
        [authority],
        { commitment: COMMITMENT },
    );
}

type ProgramFailureEvidence = {
    signature: string;
    slot: number;
    instructionIndex: number;
    error: unknown;
    accountKeys: string[];
};

async function sendExpectedProgramFailure(
    instructions: readonly TransactionInstruction[],
): Promise<ProgramFailureEvidence> {
    const latest = await connection.getLatestBlockhash(COMMITMENT);

    const tx = new Transaction({
        feePayer: authority.publicKey,
        recentBlockhash: latest.blockhash,
    });
    for (const ix of instructions) {
        tx.add(ix);
    }
    tx.sign(authority);

    let signature: string;
    try {
        signature = await connection.sendRawTransaction(
            tx.serialize(),
            {
                skipPreflight: true,
                maxRetries: 0,
            },
        );
    } catch (error) {
        throw new Error(
            `R10_NEGATIVE_SIGNATURE_OR_TRANSPORT_FAILURE: ${String(error)}`,
        );
    }

    const deadline = Date.now() + 30_000;
    let observed:
        | Awaited<ReturnType<Connection["getTransaction"]>>
        | null = null;

    while (Date.now() < deadline) {
        try {
            observed = await connection.getTransaction(
                signature,
                {
                    commitment: COMMITMENT,
                    maxSupportedTransactionVersion: 0,
                },
            );
        } catch (error) {
            throw new Error(
                `R10_NEGATIVE_RPC_FAILURE: ${String(error)}`,
            );
        }

        if (observed !== null) {
            break;
        }

        await new Promise((resolve) => setTimeout(resolve, 250));
    }

    if (observed === null) {
        throw new Error(
            `R10_NEGATIVE_EXPIRED_OR_UNKNOWN_STATUS: signature=${signature}`,
        );
    }

    const err = observed.meta?.err;
    if (
        err === null ||
        err === undefined ||
        typeof err !== "object" ||
        !("InstructionError" in err)
    ) {
        throw new Error(
            `R10_NOT_A_PROGRAM_INSTRUCTION_FAILURE: ${JSON.stringify(err)}`,
        );
    }

    const raw = (
        err as { InstructionError?: unknown }
    ).InstructionError;

    if (
        !Array.isArray(raw) ||
        raw.length < 2 ||
        typeof raw[0] !== "number"
    ) {
        throw new Error(
            `R10_INVALID_INSTRUCTION_ERROR_SHAPE: ${JSON.stringify(err)}`,
        );
    }

    const accountKeys = observed.transaction.message
        .getAccountKeys()
        .staticAccountKeys
        .map((key) => key.toBase58());

    assert.ok(
        accountKeys.includes(PROGRAM_ID.toBase58()),
        "Failed transaction is not bound to Babycowans Program ID.",
    );

    return {
        signature,
        slot: observed.slot,
        instructionIndex: raw[0],
        error: err,
        accountKeys,
    };
}

async function accountExists(address: PublicKey): Promise<boolean> {
    return (
        (await connection.getAccountInfo(address, COMMITMENT)) !== null
    );
}

async function assertAbsent(
    label: string,
    address: PublicKey | undefined,
): Promise<void> {
    if (address === undefined) return;
    assert.equal(
        await accountExists(address),
        false,
        `${label} unexpectedly exists.`,
    );
}

const [protocolConfig] = findProtocolConfigPda(PROGRAM_ID);

const programInfo = await connection.getAccountInfo(PROGRAM_ID);
assert.ok(
    programInfo !== null && programInfo.executable,
    "Babycowans program is not deployed.",
);

if (!(await accountExists(protocolConfig))) {
    await sendSuccess([
        buildInitializeProtocolInstruction({
            programId: PROGRAM_ID,
            authority: authority.publicKey,
        }),
    ]);
}

const baseId = BigInt(Date.now()) * 100_000n;
const config = {
    websiteUri: "https://babycowans.example",
    logoUri: "https://babycowans.example/logo.png",
    supportUri: "https://babycowans.example/support",
    description: "P100-F R10 atomic rollback evidence",
    metadataUri: "https://babycowans.example/metadata.json",
};

//
// B1 — canonical two-instruction success.
//
const b1Before = await protocolApplicationCount(protocolConfig);
const b1 = buildApplicationBootstrapPlan({
    programId: PROGRAM_ID,
    authority: authority.publicKey,
    applicationId: baseId + 1n,
    name: "P100-F R10 B1",
    selectedEcosystem: SELECTED_ECOSYSTEM,
    config,
});
assert.equal(b1.instructions.length, 2);

const b1Signature = await sendSuccess(b1.instructions);
const b1AppInfo = await connection.getAccountInfo(b1.application, COMMITMENT);
const b1CfgInfo = await connection.getAccountInfo(b1.applicationConfig, COMMITMENT);
assert.ok(b1AppInfo !== null);
assert.ok(b1CfgInfo !== null);

const b1App = decodeApplicationAccount(Buffer.from(b1AppInfo.data));
const b1Cfg = decodeApplicationConfigAccount(Buffer.from(b1CfgInfo.data));
assert.ok(b1App.authority.equals(authority.publicKey));
assert.ok(b1Cfg.application.equals(b1.application));

const b1After = await protocolApplicationCount(protocolConfig);
assert.equal(b1After, b1Before + 1n);

console.log(
    "R10_B1_EVIDENCE_JSON=" +
        JSON.stringify({
            signature: b1Signature,
            instructionCount: b1.instructions.length,
            application: b1.application.toBase58(),
            applicationConfig: b1.applicationConfig.toBase58(),
            counterBefore: b1Before.toString(),
            counterAfter: b1After.toString(),
        }),
);

//
// B2 — canonical three-instruction success.
//
const b2Member = Keypair.generate().publicKey;
const b2Before = await protocolApplicationCount(protocolConfig);
const b2 = buildApplicationBootstrapPlan({
    programId: PROGRAM_ID,
    authority: authority.publicKey,
    applicationId: baseId + 2n,
    name: "P100-F R10 B2",
    selectedEcosystem: SELECTED_ECOSYSTEM,
    config,
    role: {
        member: b2Member,
        role: 1,
    },
});
assert.equal(b2.instructions.length, 3);
assert.ok(b2.applicationRole !== undefined);

const b2Signature = await sendSuccess(b2.instructions);
assert.equal(await accountExists(b2.application), true);
assert.equal(await accountExists(b2.applicationConfig), true);
assert.equal(await accountExists(b2.applicationRole!), true);

const b2After = await protocolApplicationCount(protocolConfig);
assert.equal(b2After, b2Before + 1n);

console.log(
    "R10_B2_EVIDENCE_JSON=" +
        JSON.stringify({
            signature: b2Signature,
            instructionCount: b2.instructions.length,
            application: b2.application.toBase58(),
            applicationConfig: b2.applicationConfig.toBase58(),
            applicationRole: b2.applicationRole!.toBase58(),
            roleMember: b2Member.toBase58(),
            counterBefore: b2Before.toString(),
            counterAfter: b2After.toString(),
        }),
);

//
// B3 — second instruction fails; first instruction must roll back.
//
const b3Before = await protocolApplicationCount(protocolConfig);
const b3 = buildApplicationBootstrapPlan({
    programId: PROGRAM_ID,
    authority: authority.publicKey,
    applicationId: baseId + 3n,
    name: "P100-F R10 B3",
    selectedEcosystem: SELECTED_ECOSYSTEM,
    config,
});
assert.equal(b3.instructions.length, 2);

await assertAbsent("B3 Application pre-state", b3.application);
await assertAbsent("B3 Config pre-state", b3.applicationConfig);

const b3WrongApplication = Keypair.generate().publicKey;
const b3Instructions = [
    b3.instructions[0]!,
    replaceExactlyOneAccountMeta(
        b3.instructions[1]!,
        b3.application,
        b3WrongApplication,
    ),
];

const b3Failure = await sendExpectedProgramFailure(b3Instructions);
assert.equal(b3Failure.instructionIndex, 1);
await assertAbsent("B3 Application post-state", b3.application);
await assertAbsent("B3 Config post-state", b3.applicationConfig);
const b3After = await protocolApplicationCount(protocolConfig);
assert.equal(b3After, b3Before);

console.log(
    "R10_B3_EVIDENCE_JSON=" +
        JSON.stringify({
            signature: b3Failure.signature,
            slot: b3Failure.slot,
            instructionIndex: b3Failure.instructionIndex,
            error: b3Failure.error,
            programId: PROGRAM_ID.toBase58(),
            programIdPresentInAccountKeys:
                b3Failure.accountKeys.includes(PROGRAM_ID.toBase58()),
            intendedApplication: b3.application.toBase58(),
            substitutedApplication: b3WrongApplication.toBase58(),
            applicationExistsAfter: false,
            applicationConfigExistsAfter: false,
            counterBefore: b3Before.toString(),
            counterAfter: b3After.toString(),
        }),
);

//
// B4 — third instruction fails; first two instructions must roll back.
//
const b4Member = Keypair.generate().publicKey;
const b4Before = await protocolApplicationCount(protocolConfig);
const b4 = buildApplicationBootstrapPlan({
    programId: PROGRAM_ID,
    authority: authority.publicKey,
    applicationId: baseId + 4n,
    name: "P100-F R10 B4",
    selectedEcosystem: SELECTED_ECOSYSTEM,
    config,
    role: {
        member: b4Member,
        role: 1,
    },
});
assert.equal(b4.instructions.length, 3);
assert.ok(b4.applicationRole !== undefined);

await assertAbsent("B4 Application pre-state", b4.application);
await assertAbsent("B4 Config pre-state", b4.applicationConfig);
await assertAbsent("B4 Role pre-state", b4.applicationRole);

const b4WrongApplication = Keypair.generate().publicKey;
const b4Instructions = [
    b4.instructions[0]!,
    b4.instructions[1]!,
    replaceExactlyOneAccountMeta(
        b4.instructions[2]!,
        b4.application,
        b4WrongApplication,
    ),
];

const b4Failure = await sendExpectedProgramFailure(b4Instructions);
assert.equal(b4Failure.instructionIndex, 2);
await assertAbsent("B4 Application post-state", b4.application);
await assertAbsent("B4 Config post-state", b4.applicationConfig);
await assertAbsent("B4 Role post-state", b4.applicationRole);
const b4After = await protocolApplicationCount(protocolConfig);
assert.equal(b4After, b4Before);

console.log(
    "R10_B4_EVIDENCE_JSON=" +
        JSON.stringify({
            signature: b4Failure.signature,
            slot: b4Failure.slot,
            instructionIndex: b4Failure.instructionIndex,
            error: b4Failure.error,
            programId: PROGRAM_ID.toBase58(),
            programIdPresentInAccountKeys:
                b4Failure.accountKeys.includes(PROGRAM_ID.toBase58()),
            intendedApplication: b4.application.toBase58(),
            substitutedApplication: b4WrongApplication.toBase58(),
            applicationExistsAfter: false,
            applicationConfigExistsAfter: false,
            applicationRoleExistsAfter: false,
            counterBefore: b4Before.toString(),
            counterAfter: b4After.toString(),
        }),
);

console.log("R10_B1_B2_B3_B4_RUNTIME_PROOF=PASS");
