import type { PublicKey } from "@solana/web3.js";

export interface DecodedBabycowansEvent<
    TName extends string = string,
    TData = Record<string, unknown>,
> {
    name: TName;
    data: TData;
}

export interface DecodeEventLogsOptions {
    /**
     * Restricts event decoding to logs emitted while this exact Solana
     * program is executing. High-Level BabycowansSDK always supplies it.
     */
    programId?: PublicKey;

    /**
     * When true, malformed Babycowans event payloads cause decoding to throw.
     *
     * By default malformed or unknown payloads are ignored, matching the
     * decoder's role as a safe transaction-log observer.
     */
    strict?: boolean;
}
