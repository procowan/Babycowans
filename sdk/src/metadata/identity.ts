import {
    CanonicalEcosystem,
    getCanonicalEcosystem,
} from "../ecosystems/index.js";

import type {
    ApplicationMetadata,
    CanonicalTokenIdentity,
} from "./types.js";

export function resolveCanonicalEcosystemIdentity(
    ecosystem: CanonicalEcosystem,
    tokenMetadata?: ApplicationMetadata,
    metadataUri?: string,
): CanonicalTokenIdentity {
    const canonical =
        getCanonicalEcosystem(ecosystem);

    return {
        ecosystem: canonical.ecosystem,
        fullName: canonical.fullName,
        ticker: canonical.ticker,
        tokenAddress: canonical.tokenAddress,
        mission: canonical.mission,

        metadataUri,

        image: tokenMetadata?.image,

        description:
            tokenMetadata?.description,
    };
}
