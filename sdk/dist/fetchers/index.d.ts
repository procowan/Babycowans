import { Connection, PublicKey, AccountInfo } from "@solana/web3.js";
export declare class AccountFetcher {
    readonly connection: Connection;
    constructor(connection: Connection);
    fetch(address: PublicKey): Promise<AccountInfo<Buffer> | null>;
    fetchMultiple(addresses: PublicKey[]): Promise<(AccountInfo<Buffer> | null)[]>;
    exists(address: PublicKey): Promise<boolean>;
}
//# sourceMappingURL=index.d.ts.map