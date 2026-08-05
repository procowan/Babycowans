export declare const BABYCOWANS_IDL: {
    address: string;
    metadata: {
        name: string;
        version: string;
        spec: string;
        description: string;
    };
    instructions: ({
        name: string;
        discriminator: number[];
        accounts: ({
            name: string;
            writable: boolean;
            signer?: undefined;
        } | {
            name: string;
            signer: boolean;
            writable?: undefined;
        })[];
        args: never[];
    } | {
        name: string;
        discriminator: number[];
        accounts: ({
            name: string;
            writable?: undefined;
            pda?: undefined;
            signer?: undefined;
            relations?: undefined;
            address?: undefined;
        } | {
            name: string;
            writable: boolean;
            pda: {
                seeds: ({
                    kind: string;
                    value: number[];
                    path?: undefined;
                } | {
                    kind: string;
                    path: string;
                    value?: undefined;
                })[];
            };
            signer?: undefined;
            relations?: undefined;
            address?: undefined;
        } | {
            name: string;
            writable: boolean;
            signer: boolean;
            relations: string[];
            pda?: undefined;
            address?: undefined;
        } | {
            name: string;
            address: string;
            writable?: undefined;
            pda?: undefined;
            signer?: undefined;
            relations?: undefined;
        })[];
        args: ({
            name: string;
            type: {
                defined: {
                    name: string;
                };
            };
        } | {
            name: string;
            type: string;
        })[];
    } | {
        name: string;
        discriminator: number[];
        accounts: ({
            name: string;
            writable?: undefined;
            signer?: undefined;
        } | {
            name: string;
            writable: boolean;
            signer: boolean;
        } | {
            name: string;
            writable: boolean;
            signer?: undefined;
        })[];
        args: {
            name: string;
            type: string;
        }[];
    } | {
        name: string;
        discriminator: number[];
        accounts: ({
            name: string;
            writable: boolean;
            pda: {
                seeds: ({
                    kind: string;
                    value: number[];
                    path?: undefined;
                } | {
                    kind: string;
                    path: string;
                    value?: undefined;
                })[];
            };
            signer?: undefined;
            address?: undefined;
        } | {
            name: string;
            writable: boolean;
            signer: boolean;
            pda?: undefined;
            address?: undefined;
        } | {
            name: string;
            address: string;
            writable?: undefined;
            pda?: undefined;
            signer?: undefined;
        })[];
        args: {
            name: string;
            type: string;
        }[];
    } | {
        name: string;
        discriminator: number[];
        accounts: ({
            name: string;
            writable: boolean;
            pda: {
                seeds: ({
                    kind: string;
                    value: number[];
                    path?: undefined;
                } | {
                    kind: string;
                    path: string;
                    value?: undefined;
                })[];
            };
            signer?: undefined;
            relations?: undefined;
            address?: undefined;
        } | {
            name: string;
            writable?: undefined;
            pda?: undefined;
            signer?: undefined;
            relations?: undefined;
            address?: undefined;
        } | {
            name: string;
            writable: boolean;
            signer: boolean;
            relations: string[];
            pda?: undefined;
            address?: undefined;
        } | {
            name: string;
            address: string;
            writable?: undefined;
            pda?: undefined;
            signer?: undefined;
            relations?: undefined;
        })[];
        args: ({
            name: string;
            type: {
                array: (string | number)[];
                defined?: undefined;
            };
        } | {
            name: string;
            type: {
                defined: {
                    name: string;
                };
                array?: undefined;
            };
        })[];
    } | {
        name: string;
        discriminator: number[];
        accounts: ({
            name: string;
            writable?: undefined;
            pda?: undefined;
            signer?: undefined;
            relations?: undefined;
        } | {
            name: string;
            writable: boolean;
            pda: {
                seeds: ({
                    kind: string;
                    value: number[];
                    path?: undefined;
                    account?: undefined;
                } | {
                    kind: string;
                    path: string;
                    value?: undefined;
                    account?: undefined;
                } | {
                    kind: string;
                    path: string;
                    account: string;
                    value?: undefined;
                })[];
            };
            signer?: undefined;
            relations?: undefined;
        } | {
            name: string;
            signer: boolean;
            relations: string[];
            writable?: undefined;
            pda?: undefined;
        })[];
        args: ({
            name: string;
            type: {
                defined: {
                    name: string;
                };
            };
        } | {
            name: string;
            type: string;
        })[];
    } | {
        name: string;
        discriminator: number[];
        accounts: ({
            name: string;
            writable?: undefined;
            signer?: undefined;
            relations?: undefined;
        } | {
            name: string;
            writable: boolean;
            signer?: undefined;
            relations?: undefined;
        } | {
            name: string;
            signer: boolean;
            relations: string[];
            writable?: undefined;
        })[];
        args: ({
            name: string;
            type: string;
        } | {
            name: string;
            type: {
                defined: {
                    name: string;
                };
            };
        })[];
    } | {
        name: string;
        discriminator: number[];
        accounts: ({
            name: string;
            signer?: undefined;
        } | {
            name: string;
            signer: boolean;
        })[];
        args: never[];
    })[];
    accounts: {
        name: string;
        discriminator: number[];
    }[];
    events: {
        name: string;
        discriminator: number[];
    }[];
    errors: {
        code: number;
        name: string;
        msg: string;
    }[];
    types: ({
        name: string;
        type: {
            kind: string;
            fields: ({
                name: string;
                type: string;
            } | {
                name: string;
                type: {
                    option: string;
                    defined?: undefined;
                };
            } | {
                name: string;
                type: {
                    defined: {
                        name: string;
                    };
                    option?: undefined;
                };
            })[];
            variants?: undefined;
        };
    } | {
        name: string;
        type: {
            kind: string;
            variants: {
                name: string;
            }[];
            fields?: undefined;
        };
    } | {
        name: string;
        type: {
            kind: string;
            fields: ({
                name: string;
                type: string;
            } | {
                name: string;
                type: {
                    array: (string | number)[];
                    defined?: undefined;
                };
            } | {
                name: string;
                type: {
                    defined: {
                        name: string;
                    };
                    array?: undefined;
                };
            })[];
            variants?: undefined;
        };
    })[];
};
export type BabycowansIdl = typeof BABYCOWANS_IDL;
//# sourceMappingURL=index.d.ts.map