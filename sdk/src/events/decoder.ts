import { PublicKey } from "@solana/web3.js";

import { BABYCOWANS_IDL } from "../idl/index.js";

import type {
    DecodeEventLogsOptions,
    DecodedBabycowansEvent,
} from "./types.js";

const PROGRAM_DATA_PREFIX = "Program data: ";
const EVENT_DISCRIMINATOR_SIZE = 8;

const PROGRAM_INVOKE_PATTERN =
    /^Program ([1-9A-HJ-NP-Za-km-z]{32,44}) invoke \[(\d+)\]$/u;

const PROGRAM_COMPLETE_PATTERN =
    /^Program ([1-9A-HJ-NP-Za-km-z]{32,44}) (?:success|failed: .+)$/u;

interface IdlDefinedType {
    defined: {
        name: string;
    };
}

interface IdlArrayType {
    array: [IdlType, number];
}

type IdlType =
    | "bool"
    | "u8"
    | "u16"
    | "u32"
    | "u64"
    | "i64"
    | "string"
    | "pubkey"
    | IdlDefinedType
    | IdlArrayType;

interface IdlField {
    name: string;
    type: IdlType;
}

interface IdlStructType {
    name: string;
    type: {
        kind: "struct";
        fields: IdlField[];
    };
}

interface IdlEnumVariant {
    name: string;
}

interface IdlEnumType {
    name: string;
    type: {
        kind: "enum";
        variants: IdlEnumVariant[];
    };
}

type IdlNamedType = IdlStructType | IdlEnumType;

interface IdlEvent {
    name: string;
    discriminator: number[];
}

interface EventIdl {
    events?: IdlEvent[];
    types?: IdlNamedType[];
}

class EventBufferReader {
    private offset = 0;

    constructor(private readonly buffer: Buffer) {}

    remaining(): number {
        return this.buffer.length - this.offset;
    }

    readU8(): number {
        this.require(1);
        const value = this.buffer.readUInt8(this.offset);
        this.offset += 1;
        return value;
    }

    readU16(): number {
        this.require(2);
        const value = this.buffer.readUInt16LE(this.offset);
        this.offset += 2;
        return value;
    }

    readU32(): number {
        this.require(4);
        const value = this.buffer.readUInt32LE(this.offset);
        this.offset += 4;
        return value;
    }

    readU64(): bigint {
        this.require(8);
        const value = this.buffer.readBigUInt64LE(this.offset);
        this.offset += 8;
        return value;
    }

    readI64(): bigint {
        this.require(8);
        const value = this.buffer.readBigInt64LE(this.offset);
        this.offset += 8;
        return value;
    }

    readBool(): boolean {
        const value = this.readU8();

        if (value !== 0 && value !== 1) {
            throw new Error(`Invalid Borsh bool value: ${value}`);
        }

        return value === 1;
    }

    readPublicKey(): PublicKey {
        this.require(32);

        const value = new PublicKey(
            this.buffer.subarray(this.offset, this.offset + 32),
        );

        this.offset += 32;
        return value;
    }

    readString(): string {
        const length = this.readU32();
        this.require(length);

        const value = this.buffer
            .subarray(this.offset, this.offset + length)
            .toString("utf8");

        this.offset += length;
        return value;
    }

    private require(length: number): void {
        if (
            !Number.isSafeInteger(length) ||
            length < 0 ||
            this.offset + length > this.buffer.length
        ) {
            throw new Error("Truncated Babycowans event payload");
        }
    }
}

function isDefinedType(value: IdlType): value is IdlDefinedType {
    return (
        typeof value === "object" &&
        value !== null &&
        "defined" in value
    );
}

function isArrayType(value: IdlType): value is IdlArrayType {
    return (
        typeof value === "object" &&
        value !== null &&
        "array" in value
    );
}

function getIdl(): EventIdl {
    return BABYCOWANS_IDL as unknown as EventIdl;
}

function findNamedType(name: string): IdlNamedType {
    const type = getIdl().types?.find((candidate) => candidate.name === name);

    if (!type) {
        throw new Error(`IDL type not found: ${name}`);
    }

    return type;
}

function decodeDefinedType(
    reader: EventBufferReader,
    name: string,
): unknown {
    const type = findNamedType(name);

    if (type.type.kind === "enum") {
        const index = reader.readU8();
        const variant = type.type.variants[index];

        if (!variant) {
            throw new Error(
                `Invalid ${name} enum variant index: ${index}`,
            );
        }

        // Preserve the repository's existing Anchor-style enum semantics.
        const key =
            variant.name.length === 0
                ? variant.name
                : variant.name[0].toLowerCase() + variant.name.slice(1);

        return { [key]: {} };
    }

    const value: Record<string, unknown> = {};

    for (const field of type.type.fields) {
        value[field.name] = decodeIdlType(reader, field.type);
    }

    return value;
}

function decodeIdlType(
    reader: EventBufferReader,
    type: IdlType,
): unknown {
    if (typeof type === "string") {
        switch (type) {
            case "bool":
                return reader.readBool();

            case "u8":
                return reader.readU8();

            case "u16":
                return reader.readU16();

            case "u32":
                return reader.readU32();

            case "u64":
                return reader.readU64();

            case "i64":
                return reader.readI64();

            case "string":
                return reader.readString();

            case "pubkey":
                return reader.readPublicKey();

            default:
                throw new Error(`Unsupported event IDL type: ${type}`);
        }
    }

    if (isDefinedType(type)) {
        return decodeDefinedType(reader, type.defined.name);
    }

    if (isArrayType(type)) {
        const [elementType, length] = type.array;

        return Array.from(
            { length },
            () => decodeIdlType(reader, elementType),
        );
    }

    throw new Error("Unsupported Babycowans event IDL type");
}

function discriminatorKey(discriminator: readonly number[]): string {
    return Buffer.from(discriminator).toString("hex");
}

function decodeEventPayload(
    payload: Buffer,
): DecodedBabycowansEvent | null {
    if (payload.length < EVENT_DISCRIMINATOR_SIZE) {
        throw new Error("Truncated Babycowans event discriminator");
    }

    const idl = getIdl();

    const discriminator = payload.subarray(
        0,
        EVENT_DISCRIMINATOR_SIZE,
    );

    const event = idl.events?.find(
        (candidate) =>
            discriminatorKey(candidate.discriminator) ===
            discriminator.toString("hex"),
    );

    if (!event) {
        return null;
    }

    const eventType = findNamedType(event.name);

    if (eventType.type.kind !== "struct") {
        throw new Error(
            `Babycowans event ${event.name} does not have a struct layout`,
        );
    }

    const reader = new EventBufferReader(
        payload.subarray(EVENT_DISCRIMINATOR_SIZE),
    );

    const data: Record<string, unknown> = {};

    for (const field of eventType.type.fields) {
        data[field.name] = decodeIdlType(reader, field.type);
    }

    if (reader.remaining() !== 0) {
        throw new Error(
            `Unexpected trailing bytes in Babycowans event ${event.name}`,
        );
    }

    return {
        name: event.name,
        data,
    };
}

/**
 * Decodes Babycowans Anchor events from Solana transaction log messages.
 *
 * Only `Program data:` payloads whose discriminator belongs to the current
 * Babycowans IDL are returned. Unrelated Solana logs and unrelated Anchor
 * events are ignored while original event ordering is preserved.
 */
export function decodeBabycowansEventLogs(
    logMessages: readonly string[] | null | undefined,
    options: DecodeEventLogsOptions = {},
): DecodedBabycowansEvent[] {
    if (!logMessages || logMessages.length === 0) {
        return [];
    }

    const decoded: DecodedBabycowansEvent[] = [];
    const invocationStack: string[] = [];

    const targetProgramId =
        options.programId?.toBase58();

    for (const log of logMessages) {
        const invokeMatch =
            PROGRAM_INVOKE_PATTERN.exec(log);

        if (invokeMatch) {
            invocationStack.push(invokeMatch[1]);
            continue;
        }

        const completeMatch =
            PROGRAM_COMPLETE_PATTERN.exec(log);

        if (completeMatch) {
            const completedProgram =
                completeMatch[1];

            for (
                let index = invocationStack.length - 1;
                index >= 0;
                index -= 1
            ) {
                if (invocationStack[index] === completedProgram) {
                    invocationStack.length = index;
                    break;
                }
            }

            continue;
        }

        if (!log.startsWith(PROGRAM_DATA_PREFIX)) {
            continue;
        }

        if (
            targetProgramId !== undefined &&
            invocationStack.at(-1) !== targetProgramId
        ) {
            continue;
        }

        const encoded =
            log.slice(PROGRAM_DATA_PREFIX.length).trim();

        if (!encoded) {
            continue;
        }

        try {
            const payload = Buffer.from(encoded, "base64");

            // Node's base64 decoder is intentionally permissive. Reject
            // malformed encodings before discriminator decoding.
            const canonicalBase64 =
                payload.toString("base64");

            let canonicalEnd = canonicalBase64.length;
            while (
                canonicalEnd > 0 &&
                canonicalBase64.charCodeAt(canonicalEnd - 1) === 61
            ) {
                canonicalEnd -= 1;
            }

            let encodedEnd = encoded.length;
            while (
                encodedEnd > 0 &&
                encoded.charCodeAt(encodedEnd - 1) === 61
            ) {
                encodedEnd -= 1;
            }

            if (
                payload.length === 0 ||
                canonicalBase64.slice(0, canonicalEnd) !==
                    encoded.slice(0, encodedEnd)
            ) {
                throw new Error(
                    "Malformed Babycowans event base64 payload",
                );
            }

            const event = decodeEventPayload(payload);

            if (event) {
                decoded.push(event);
            }
        } catch (error) {
            if (options.strict) {
                throw error;
            }
        }
    }

    return decoded;
}
