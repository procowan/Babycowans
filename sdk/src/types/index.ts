import { Connection, PublicKey } from "@solana/web3.js";

export interface BabycowansSDKConfig {
    connection: Connection;
    programId: PublicKey;
}
