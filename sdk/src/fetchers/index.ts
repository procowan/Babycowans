import {
    Connection,
    PublicKey,
    AccountInfo,
} from "@solana/web3.js";

export class AccountFetcher {
    constructor(
        readonly connection: Connection,
    ) {}

    async fetch(
        address: PublicKey,
    ): Promise<AccountInfo<Buffer> | null> {
        return this.connection.getAccountInfo(address);
    }

    async fetchMultiple(
        addresses: PublicKey[],
    ): Promise<(AccountInfo<Buffer> | null)[]> {
        return this.connection.getMultipleAccountsInfo(addresses);
    }

    async exists(
        address: PublicKey,
    ): Promise<boolean> {
        return (await this.fetch(address)) !== null;
    }
}
