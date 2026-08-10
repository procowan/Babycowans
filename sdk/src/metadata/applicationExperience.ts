import type {
    Connection,
} from "@solana/web3.js";

import type {
    ApplicationConfigAccount,
} from "../accounts/types.js";

import {
    CanonicalEcosystem,
} from "../ecosystems/index.js";

import {
    fetchApplicationMetadata,
} from "./resolver.js";

import {
    resolveCanonicalTokenMetadata,
} from "./tokenMetadata.js";

import type {
    ResolvedApplicationExperience,
} from "./types.js";

export interface ResolveApplicationExperienceOptions {
    signal?: AbortSignal;
}

export async function resolveApplicationExperience(
    connection: Pick<Connection, "getAccountInfo">,
    ecosystem: CanonicalEcosystem,
    config: ApplicationConfigAccount,
    options:
        ResolveApplicationExperienceOptions = {},
): Promise<ResolvedApplicationExperience> {
    const ecosystemIdentity =
        await resolveCanonicalTokenMetadata(
            connection,
            ecosystem,
            {
                signal:
                    options.signal,
            },
        );

    const metadataUri =
        config.metadataUri.trim();

    const applicationMetadata =
        metadataUri.length === 0
            ? undefined
            : await fetchApplicationMetadata(
                metadataUri,
                {
                    signal:
                        options.signal,
                },
            );

    return {
        ecosystem:
            ecosystemIdentity,

        application: {
            config,
            metadata:
                applicationMetadata,
        },
    };
}
