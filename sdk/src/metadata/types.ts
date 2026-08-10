import { PublicKey } from "@solana/web3.js";
import type { CanonicalEcosystem } from "../ecosystems/types.js";
import type { ApplicationConfigAccount } from "../accounts/types.js";

export interface MetadataAttribute {
    traitType: string;
    value: string | number | boolean;
}

export interface MetadataFile {
    uri: string;
    type?: string;
}

export interface MetadataProperties {
    category?: string;
    files?: MetadataFile[];
    [key: string]: unknown;
}

export interface ApplicationMetadata {
    name: string;
    symbol?: string;
    description?: string;
    image?: string;
    animationUrl?: string;
    externalUrl?: string;
    attributes?: MetadataAttribute[];
    properties?: MetadataProperties;
}

export interface CanonicalTokenIdentity {
    ecosystem: CanonicalEcosystem;
    fullName: string;
    ticker: string;
    tokenAddress: PublicKey;
    mission: string;
    metadataUri?: string;
    image?: string;
    description?: string;
}

export interface ResolvedApplicationMetadata {
    uri: string;
    metadata: ApplicationMetadata;
}

export interface ResolvedCanonicalTokenIdentity
    extends CanonicalTokenIdentity {
    metadataPda: PublicKey;
    onchainName: string;
    onchainSymbol: string;
    externalUrl?: string;
}

export interface ResolvedApplicationExperience {
    ecosystem: ResolvedCanonicalTokenIdentity;
    application: {
        config: ApplicationConfigAccount;
        metadata?: ResolvedApplicationMetadata;
    };
}
