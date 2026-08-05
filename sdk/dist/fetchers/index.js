export class AccountFetcher {
    connection;
    constructor(connection) {
        this.connection = connection;
    }
    async fetch(address) {
        return this.connection.getAccountInfo(address);
    }
    async fetchMultiple(addresses) {
        return this.connection.getMultipleAccountsInfo(addresses);
    }
    async exists(address) {
        return (await this.fetch(address)) !== null;
    }
}
//# sourceMappingURL=index.js.map