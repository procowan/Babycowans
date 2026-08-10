import {
    PublicKey,
} from "@solana/web3.js";

import type {
    AccountInfo,
    Commitment,
    Connection,
} from "@solana/web3.js";

import {
    CanonicalEcosystem,
    getCanonicalEcosystem,
} from "../ecosystems/index.js";

import {
    fetchApplicationMetadata,
} from "./resolver.js";

import {
    resolveCanonicalEcosystemIdentity,
} from "./identity.js";

import type {
    ResolvedCanonicalTokenIdentity,
} from "./types.js";

export const TOKEN_METADATA_PROGRAM_ID =
    new PublicKey(
        "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
    );

export interface TokenMetadataAccountReader {
    getAccountInfo(
        address: PublicKey,
        commitment?: Commitment,
    ): Promise<AccountInfo<Buffer> | null>;
}

export interface ResolveCanonicalTokenMetadataOptions {
    commitment?: Commitment;
    signal?: AbortSignal;
}

interface TokenMetadataHeader {
    mint: PublicKey;
    name: string;
    symbol: string;
    uri: string;
}

function readBorshString(
    buffer: Buffer,
    offset: number,
): {
    value: string;
    nextOffset: number;
} {
    if (offset + 4 > buffer.length) {
        throw new RangeError(
            "Token metadata string length exceeds account buffer",
        );
    }

    const length =
        buffer.readUInt32LE(offset);

    const start =
        offset + 4;

    const end =
        start + length;

    if (end > buffer.length) {
        throw new RangeError(
            "Token metadata string exceeds account buffer",
        );
    }

    return {
        value:
            buffer
                .subarray(start, end)
                .toString("utf8")
                .replace(/\0+$/g, "")
                .trim(),
        nextOffset: end,
    };
}

export function findTokenMetadataPda(
    mint: PublicKey,
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from("metadata"),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            mint.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID,
    );
}

export function decodeTokenMetadataHeader(
    buffer: Buffer,
): TokenMetadataHeader {
    /*
     * Metaplex Metadata begins with:
     *
     * key              u8
     * update authority Pubkey
     * mint             Pubkey
     * data.name        String
     * data.symbol      String
     * data.uri         String
     */

    if (buffer.length < 65) {
        throw new RangeError(
            "Token metadata account is too small",
        );
    }

    let offset = 1;

    // update authority
    offset += 32;

    const mint =
        new PublicKey(
            buffer.subarray(
                offset,
                offset + 32,
            ),
        );

    offset += 32;

    const name =
        readBorshString(
            buffer,
            offset,
        );

    offset =
        name.nextOffset;

    const symbol =
        readBorshString(
            buffer,
            offset,
        );

    offset =
        symbol.nextOffset;

    const uri =
        readBorshString(
            buffer,
            offset,
        );

    return {
        mint,
        name: name.value,
        symbol: symbol.value,
        uri: uri.value,
    };
}

export async function resolveCanonicalTokenMetadata(
    connection:
        TokenMetadataAccountReader
        | Pick<Connection, "getAccountInfo">,
    ecosystem: CanonicalEcosystem,
    options:
        ResolveCanonicalTokenMetadataOptions = {},
): Promise<ResolvedCanonicalTokenIdentity> {
    const canonical =
        getCanonicalEcosystem(
            ecosystem,
        );

    const [metadataPda] =
        findTokenMetadataPda(
            canonical.tokenAddress,
        );

    const metadataAccount =
        await connection.getAccountInfo(
            metadataPda,
            options.commitment,
        );

    if (metadataAccount === null) {
        throw new Error(
            `Token metadata account not found for ${canonical.ticker}`,
        );
    }

    if (
        !metadataAccount.owner.equals(
            TOKEN_METADATA_PROGRAM_ID,
        )
    ) {
        throw new Error(
            `Invalid token metadata owner for ${canonical.ticker}`,
        );
    }

    const onchain =
        decodeTokenMetadataHeader(
            Buffer.from(
                metadataAccount.data,
            ),
        );

    if (
        !onchain.mint.equals(
            canonical.tokenAddress,
        )
    ) {
        throw new Error(
            `Token metadata mint mismatch for ${canonical.ticker}`,
        );
    }

    if (onchain.uri.length === 0) {
        throw new Error(
            `Token metadata URI is empty for ${canonical.ticker}`,
        );
    }

    const external =
        await fetchApplicationMetadata(
            onchain.uri,
            {
                signal:
                    options.signal,
            },
        );

    const identity =
        resolveCanonicalEcosystemIdentity(
            ecosystem,
            external.metadata,
            onchain.uri,
        );

    return {
        ...identity,

        metadataPda,

        onchainName:
            onchain.name,

        onchainSymbol:
            onchain.symbol,

        externalUrl:
            external.metadata
                .externalUrl,
    };
}
