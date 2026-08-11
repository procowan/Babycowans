import { PublicKey } from "@solana/web3.js";

import { BABYCOWANS_IDL } from "../idl/index.js";

import type {
    ApplicationAccount,
    ApplicationConfigAccount,
    AuditLogAccount,
    MembershipAccount,
    RewardAccount,
} from "./types.js";

type IdlAccountDefinition = {
    name: string;
    discriminator: number[];
};

function requireBytes(
    buffer: Buffer,
    offset: number,
    length: number,
): void {
    if (
        !Number.isSafeInteger(offset) ||
        !Number.isSafeInteger(length) ||
        offset < 0 ||
        length < 0 ||
        offset + length > buffer.length
    ) {
        throw new RangeError(
            "Account buffer is truncated",
        );
    }
}

function readU8(
    buffer: Buffer,
    offset: number,
): number {
    requireBytes(buffer, offset, 1);
    return buffer.readUInt8(offset);
}

function readU16(
    buffer: Buffer,
    offset: number,
): number {
    requireBytes(buffer, offset, 2);
    return buffer.readUInt16LE(offset);
}

function readU32(
    buffer: Buffer,
    offset: number,
): number {
    requireBytes(buffer, offset, 4);
    return buffer.readUInt32LE(offset);
}

function readU64(
    buffer: Buffer,
    offset: number,
): bigint {
    requireBytes(buffer, offset, 8);
    return buffer.readBigUInt64LE(offset);
}

function readI64(
    buffer: Buffer,
    offset: number,
): bigint {
    requireBytes(buffer, offset, 8);
    return buffer.readBigInt64LE(offset);
}

function readPublicKey(
    buffer: Buffer,
    offset: number,
): PublicKey {
    requireBytes(buffer, offset, 32);

    return new PublicKey(
        buffer.subarray(
            offset,
            offset + 32,
        ),
    );
}

function readString(
    buffer: Buffer,
    offset: number,
): {
    value: string;
    nextOffset: number;
} {
    const length =
        readU32(buffer, offset);

    const start =
        offset + 4;

    const end =
        start + length;

    requireBytes(
        buffer,
        start,
        length,
    );

    return {
        value:
            buffer
                .subarray(start, end)
                .toString("utf8"),
        nextOffset: end,
    };
}

function readBool(
    buffer: Buffer,
    offset: number,
): boolean {
    const value =
        readU8(buffer, offset);

    if (value !== 0 && value !== 1) {
        throw new Error(
            `Invalid Borsh bool value: ${value}`,
        );
    }

    return value === 1;
}

function readOptionPublicKey(
    buffer: Buffer,
    offset: number,
): {
    value: PublicKey | null;
    nextOffset: number;
} {
    const tag =
        readU8(buffer, offset);

    if (tag === 0) {
        return {
            value: null,
            nextOffset: offset + 1,
        };
    }

    if (tag !== 1) {
        throw new Error(
            `Invalid Option<Pubkey> tag: ${tag}`,
        );
    }

    return {
        value:
            readPublicKey(
                buffer,
                offset + 1,
            ),
        nextOffset:
            offset + 33,
    };
}

function accountDefinition(
    name: string,
): IdlAccountDefinition {
    const accounts =
        BABYCOWANS_IDL.accounts as
            readonly IdlAccountDefinition[];

    const account =
        accounts.find(
            (candidate) =>
                candidate.name === name,
        );

    if (!account) {
        throw new Error(
            `IDL account not found: ${name}`,
        );
    }

    return account;
}

export function matchesAccountDiscriminator(
    buffer: Buffer,
    name: string,
): boolean {
    if (buffer.length < 8) {
        return false;
    }

    const expected =
        Buffer.from(
            accountDefinition(name).discriminator,
        );

    return buffer
        .subarray(0, 8)
        .equals(expected);
}

function assertAccountDiscriminator(
    buffer: Buffer,
    name: string,
): void {
    if (
        !matchesAccountDiscriminator(
            buffer,
            name,
        )
    ) {
        throw new Error(
            `Account discriminator mismatch: ${name}`,
        );
    }
}

export function decodeApplicationAccount(
    buffer: Buffer,
): ApplicationAccount {
    assertAccountDiscriminator(
        buffer,
        "Application",
    );

    let offset = 8;

    const version =
        readU16(buffer, offset);
    offset += 2;

    const applicationId =
        readU64(buffer, offset);
    offset += 8;

    const authority =
        readPublicKey(buffer, offset);
    offset += 32;

    const pendingAuthority =
        readOptionPublicKey(
            buffer,
            offset,
        );
    offset =
        pendingAuthority.nextOffset;

    const selectedEcosystem =
        readU8(buffer, offset);
    offset += 1;

    const status =
        readU8(buffer, offset);
    offset += 1;

    const name =
        readString(buffer, offset);
    offset =
        name.nextOffset;

    const bump =
        readU8(buffer, offset);

    return {
        version,
        applicationId,
        authority,
        pendingAuthority:
            pendingAuthority.value,
        selectedEcosystem,
        status,
        name: name.value,
        bump,
    };
}

export function decodeApplicationConfigAccount(
    buffer: Buffer,
): ApplicationConfigAccount {
    assertAccountDiscriminator(
        buffer,
        "ApplicationConfig",
    );

    let offset = 8;

    const version =
        readU16(buffer, offset);
    offset += 2;

    const application =
        readPublicKey(buffer, offset);
    offset += 32;

    const websiteUri =
        readString(buffer, offset);
    offset =
        websiteUri.nextOffset;

    const logoUri =
        readString(buffer, offset);
    offset =
        logoUri.nextOffset;

    const supportUri =
        readString(buffer, offset);
    offset =
        supportUri.nextOffset;

    const description =
        readString(buffer, offset);
    offset =
        description.nextOffset;

    const metadataUri =
        readString(buffer, offset);
    offset =
        metadataUri.nextOffset;

    const createdAt =
        readI64(buffer, offset);
    offset += 8;

    const updatedAt =
        readI64(buffer, offset);
    offset += 8;

    const bump =
        readU8(buffer, offset);

    return {
        version,
        application,
        websiteUri:
            websiteUri.value,
        logoUri:
            logoUri.value,
        supportUri:
            supportUri.value,
        description:
            description.value,
        metadataUri:
            metadataUri.value,
        createdAt,
        updatedAt,
        bump,
    };
}

export function decodeMembershipAccount(
    buffer: Buffer,
): MembershipAccount {
    assertAccountDiscriminator(
        buffer,
        "Membership",
    );

    let offset = 8;

    const version =
        readU16(buffer, offset);
    offset += 2;

    const application =
        readPublicKey(buffer, offset);
    offset += 32;

    const member =
        readPublicKey(buffer, offset);
    offset += 32;

    const tier =
        readU16(buffer, offset);
    offset += 2;

    const status =
        readU8(buffer, offset);
    offset += 1;

    const membershipKind =
        readU8(buffer, offset);
    offset += 1;

    const nftMint =
        readPublicKey(buffer, offset);
    offset += 32;

    const nftVerified =
        readBool(buffer, offset);
    offset += 1;

    const expiresAt =
        readI64(buffer, offset);
    offset += 8;

    const renewable =
        readBool(buffer, offset);
    offset += 1;

    const autoExtend =
        readBool(buffer, offset);
    offset += 1;

    const renewalDuration =
        readI64(buffer, offset);
    offset += 8;

    const renewalCount =
        readU32(buffer, offset);
    offset += 4;

    const createdAt =
        readI64(buffer, offset);
    offset += 8;

    const updatedAt =
        readI64(buffer, offset);
    offset += 8;

    const bump =
        readU8(buffer, offset);

    return {
        version,
        application,
        member,
        tier,
        status,
        membershipKind,
        nftMint,
        nftVerified,
        expiresAt,
        renewable,
        autoExtend,
        renewalDuration,
        renewalCount,
        createdAt,
        updatedAt,
        bump,
    };
}

export function decodeRewardAccount(
    buffer: Buffer,
): RewardAccount {
    assertAccountDiscriminator(
        buffer,
        "Reward",
    );

    let offset = 8;

    const version =
        readU16(buffer, offset);
    offset += 2;

    const application =
        readPublicKey(buffer, offset);
    offset += 32;

    const beneficiary =
        readPublicKey(buffer, offset);
    offset += 32;

    const rewardId =
        readU64(buffer, offset);
    offset += 8;

    const asset =
        readPublicKey(buffer, offset);
    offset += 32;

    const amount =
        readU64(buffer, offset);
    offset += 8;

    const status =
        readU8(buffer, offset);
    offset += 1;

    const createdAt =
        readI64(buffer, offset);
    offset += 8;

    const claimableAt =
        readI64(buffer, offset);
    offset += 8;

    const expiresAt =
        readI64(buffer, offset);
    offset += 8;

    const claimedAt =
        readI64(buffer, offset);
    offset += 8;

    const cancelledAt =
        readI64(buffer, offset);
    offset += 8;

    const category =
        readU8(buffer, offset);
    offset += 1;

    const reason =
        readString(buffer, offset);
    offset =
        reason.nextOffset;

    const bump =
        readU8(buffer, offset);

    return {
        version,
        application,
        beneficiary,
        rewardId,
        asset,
        amount,
        status,
        createdAt,
        claimableAt,
        expiresAt,
        claimedAt,
        cancelledAt,
        category,
        reason:
            reason.value,
        bump,
    };
}

export function decodeAuditLogAccount(
    buffer: Buffer,
): AuditLogAccount {
    assertAccountDiscriminator(
        buffer,
        "AuditLog",
    );

    let offset = 8;

    const version =
        readU16(buffer, offset);
    offset += 2;

    const eventSchemaVersion =
        readU16(buffer, offset);
    offset += 2;

    const authority =
        readPublicKey(buffer, offset);
    offset += 32;

    const application =
        readPublicKey(buffer, offset);
    offset += 32;

    const action =
        readU8(buffer, offset);
    offset += 1;

    const category =
        readU8(buffer, offset);
    offset += 1;

    const severity =
        readU8(buffer, offset);
    offset += 1;

    const reference =
        readPublicKey(buffer, offset);
    offset += 32;

    const indexedReferences:
        [PublicKey, PublicKey, PublicKey] =
        [
            readPublicKey(
                buffer,
                offset,
            ),
            readPublicKey(
                buffer,
                offset + 32,
            ),
            readPublicKey(
                buffer,
                offset + 64,
            ),
        ];

    offset += 96;

    const metadata =
        readString(buffer, offset);
    offset =
        metadata.nextOffset;

    const createdAt =
        readI64(buffer, offset);
    offset += 8;

    const bump =
        readU8(buffer, offset);

    return {
        version,
        eventSchemaVersion,
        authority,
        application,
        action,
        category,
        severity,
        reference,
        indexedReferences,
        metadata:
            metadata.value,
        createdAt,
        bump,
    };
}

export {
    readBool,
    readI64,
    readOptionPublicKey,
    readPublicKey,
    readString,
    readU8,
    readU16,
    readU32,
    readU64,
};
