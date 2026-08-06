import { PublicKey } from "@solana/web3.js";

export enum CanonicalEcosystem {
    BabyReptile = 0,
    BabyEagle = 1,
    BabyGoat = 2,
    BabyLion = 3,
    BabyBee = 4,
    BabyAgent = 5,
}

export interface CanonicalEcosystemIdentity {
    ecosystem: CanonicalEcosystem;
    fullName: string;
    ticker: string;
    tokenAddress: PublicKey;
    mission: string;
}
