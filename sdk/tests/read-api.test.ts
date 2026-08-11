import assert from "node:assert/strict";
import test from "node:test";

import {
    Connection,
    PublicKey,
} from "@solana/web3.js";

import {
    BABYCOWANS_IDL,
    BabycowansSDK,
    findApplicationPda,
    findMembershipPda,
    findRewardPda,
} from "../src/index.js";

type AccountDefinition = {
    name: string;
    discriminator: number[];
};

function discriminator(
    name: string,
): Buffer {
    const accounts =
        BABYCOWANS_IDL.accounts as
            readonly AccountDefinition[];

    const account =
        accounts.find(
            (candidate) =>
                candidate.name === name,
        );

    assert.ok(
        account,
        `IDL account ${name} missing`,
    );

    return Buffer.from(
        account.discriminator,
    );
}

function u8(value: number): Buffer {
    return Buffer.from([value]);
}

function u16(value: number): Buffer {
    const buffer = Buffer.alloc(2);
    buffer.writeUInt16LE(value);
    return buffer;
}

function u32(value: number): Buffer {
    const buffer = Buffer.alloc(4);
    buffer.writeUInt32LE(value);
    return buffer;
}

function u64(value: bigint): Buffer {
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64LE(value);
    return buffer;
}

function i64(value: bigint): Buffer {
    const buffer = Buffer.alloc(8);
    buffer.writeBigInt64LE(value);
    return buffer;
}

function stringValue(
    value: string,
): Buffer {
    const bytes =
        Buffer.from(value, "utf8");

    return Buffer.concat([
        u32(bytes.length),
        bytes,
    ]);
}

function nonePubkey(): Buffer {
    return Buffer.from([0]);
}

function applicationBuffer(params: {
    authority: PublicKey;
    applicationId: bigint;
    selectedEcosystem: number;
    status: number;
    name: string;
    bump: number;
}): Buffer {
    return Buffer.concat([
        discriminator("Application"),
        u16(1),
        u64(params.applicationId),
        params.authority.toBuffer(),
        nonePubkey(),
        u8(params.selectedEcosystem),
        u8(params.status),
        stringValue(params.name),
        u8(params.bump),
    ]);
}

function membershipBuffer(params: {
    application: PublicKey;
    member: PublicKey;
    nftMint: PublicKey;
}): Buffer {
    return Buffer.concat([
        discriminator("Membership"),
        u16(1),
        params.application.toBuffer(),
        params.member.toBuffer(),
        u16(3),
        u8(0),
        u8(0),
        params.nftMint.toBuffer(),
        u8(0),
        i64(2_000_000_000n),
        u8(1),
        u8(1),
        i64(86_400n),
        u32(7),
        i64(1_700_000_000n),
        i64(1_700_000_100n),
        u8(201),
    ]);
}

function rewardBuffer(params: {
    application: PublicKey;
    beneficiary: PublicKey;
    rewardId: bigint;
    asset: PublicKey;
}): Buffer {
    return Buffer.concat([
        discriminator("Reward"),
        u16(1),
        params.application.toBuffer(),
        params.beneficiary.toBuffer(),
        u64(params.rewardId),
        params.asset.toBuffer(),
        u64(9_007_199_254_740_993n),
        u8(1),
        i64(1_700_000_000n),
        i64(1_700_000_100n),
        i64(1_900_000_000n),
        i64(0n),
        i64(0n),
        u8(7),
        stringValue("Phase 10 Read API"),
        u8(202),
    ]);
}

function auditBuffer(params: {
    authority: PublicKey;
    application: PublicKey;
    reference: PublicKey;
    indexedReferences:
        [PublicKey, PublicKey, PublicKey];
    metadata: string;
    createdAt: bigint;
    bump: number;
}): Buffer {
    return Buffer.concat([
        discriminator("AuditLog"),
        u16(1),
        u16(1),
        params.authority.toBuffer(),
        params.application.toBuffer(),
        u8(4),
        u8(2),
        u8(1),
        params.reference.toBuffer(),
        params.indexedReferences[0].toBuffer(),
        params.indexedReferences[1].toBuffer(),
        params.indexedReferences[2].toBuffer(),
        stringValue(params.metadata),
        i64(params.createdAt),
        u8(params.bump),
    ]);
}

function accountInfo(
    owner: PublicKey,
    data: Buffer,
) {
    return {
        executable: false,
        owner,
        lamports: 1,
        data,
        rentEpoch: 0,
    };
}

test(
    "getApplication derives PDA and preserves Application fidelity",
    async () => {
        const programId =
            new PublicKey(
                Buffer.alloc(32, 81),
            );

        const authority =
            new PublicKey(
                Buffer.alloc(32, 82),
            );

        const applicationId =
            9_007_199_254_740_993n;

        const [expectedAddress] =
            findApplicationPda(
                programId,
                authority,
                applicationId,
            );

        const connection =
            new Connection(
                "http://127.0.0.1:8899",
                "confirmed",
            );

        let requested:
            PublicKey | undefined;

        connection.getAccountInfo =
            (async (address: PublicKey) => {
                requested = address;

                return accountInfo(
                    programId,
                    applicationBuffer({
                        authority,
                        applicationId,
                        selectedEcosystem: 4,
                        status: 1,
                        name:
                            "Phase 10 Application",
                        bump: 199,
                    }),
                );
            }) as
                typeof connection.getAccountInfo;

        const client =
            new BabycowansSDK({
                connection,
                programId,
            });

        const result =
            await client.getApplication({
                authority,
                applicationId,
            });

        assert.ok(result);
        assert.ok(requested);
        assert.ok(
            requested.equals(
                expectedAddress,
            ),
        );

        assert.ok(
            result.address.equals(
                expectedAddress,
            ),
        );

        assert.equal(
            result.data.applicationId,
            applicationId,
        );

        assert.ok(
            result.data.authority.equals(
                authority,
            ),
        );

        assert.equal(
            result.data.pendingAuthority,
            null,
        );

        assert.equal(
            result.data.selectedEcosystem,
            4,
        );

        assert.equal(
            result.data.status,
            1,
        );

        assert.equal(
            result.data.name,
            "Phase 10 Application",
        );

        assert.equal(
            result.data.bump,
            199,
        );
    },
);

test(
    "single-account Read API returns null when PDA does not exist",
    async () => {
        const programId =
            new PublicKey(
                Buffer.alloc(32, 83),
            );

        const connection =
            new Connection(
                "http://127.0.0.1:8899",
                "confirmed",
            );

        connection.getAccountInfo =
            (async () => null) as
                typeof connection.getAccountInfo;

        const client =
            new BabycowansSDK({
                connection,
                programId,
            });

        assert.equal(
            await client.getApplication({
                authority:
                    new PublicKey(
                        Buffer.alloc(32, 84),
                    ),
                applicationId: 123n,
            }),
            null,
        );
    },
);

test(
    "Read API rejects an account owned by another program",
    async () => {
        const programId =
            new PublicKey(
                Buffer.alloc(32, 85),
            );

        const wrongOwner =
            new PublicKey(
                Buffer.alloc(32, 86),
            );

        const authority =
            new PublicKey(
                Buffer.alloc(32, 87),
            );

        const connection =
            new Connection(
                "http://127.0.0.1:8899",
                "confirmed",
            );

        connection.getAccountInfo =
            (async () =>
                accountInfo(
                    wrongOwner,
                    applicationBuffer({
                        authority,
                        applicationId: 1n,
                        selectedEcosystem: 0,
                        status: 1,
                        name: "wrong-owner",
                        bump: 1,
                    }),
                )) as
                typeof connection.getAccountInfo;

        const client =
            new BabycowansSDK({
                connection,
                programId,
            });

        await assert.rejects(
            () =>
                client.getApplication({
                    authority,
                    applicationId: 1n,
                }),
            /account owner mismatch/i,
        );
    },
);

test(
    "getMembership derives canonical PDA and decodes lifecycle state",
    async () => {
        const programId =
            new PublicKey(
                Buffer.alloc(32, 88),
            );

        const application =
            new PublicKey(
                Buffer.alloc(32, 89),
            );

        const member =
            new PublicKey(
                Buffer.alloc(32, 90),
            );

        const nftMint =
            new PublicKey(
                Buffer.alloc(32, 91),
            );

        const [expectedAddress] =
            findMembershipPda(
                programId,
                application,
                member,
            );

        const connection =
            new Connection(
                "http://127.0.0.1:8899",
                "confirmed",
            );

        connection.getAccountInfo =
            (async (address: PublicKey) => {
                assert.ok(
                    address.equals(
                        expectedAddress,
                    ),
                );

                return accountInfo(
                    programId,
                    membershipBuffer({
                        application,
                        member,
                        nftMint,
                    }),
                );
            }) as
                typeof connection.getAccountInfo;

        const client =
            new BabycowansSDK({
                connection,
                programId,
            });

        const result =
            await client.getMembership({
                application,
                member,
            });

        assert.ok(result);

        assert.ok(
            result.data.application.equals(
                application,
            ),
        );

        assert.ok(
            result.data.member.equals(
                member,
            ),
        );

        assert.equal(
            result.data.tier,
            3,
        );

        assert.equal(
            result.data.renewalCount,
            7,
        );

        assert.equal(
            result.data.renewalDuration,
            86_400n,
        );
    },
);

test(
    "getReward preserves u64/i64/string/PublicKey fidelity",
    async () => {
        const programId =
            new PublicKey(
                Buffer.alloc(32, 92),
            );

        const application =
            new PublicKey(
                Buffer.alloc(32, 93),
            );

        const beneficiary =
            new PublicKey(
                Buffer.alloc(32, 94),
            );

        const asset =
            new PublicKey(
                Buffer.alloc(32, 95),
            );

        const rewardId =
            9_007_199_254_740_999n;

        const [expectedAddress] =
            findRewardPda(
                programId,
                application,
                beneficiary,
                rewardId,
            );

        const connection =
            new Connection(
                "http://127.0.0.1:8899",
                "confirmed",
            );

        connection.getAccountInfo =
            (async (address: PublicKey) => {
                assert.ok(
                    address.equals(
                        expectedAddress,
                    ),
                );

                return accountInfo(
                    programId,
                    rewardBuffer({
                        application,
                        beneficiary,
                        rewardId,
                        asset,
                    }),
                );
            }) as
                typeof connection.getAccountInfo;

        const client =
            new BabycowansSDK({
                connection,
                programId,
            });

        const result =
            await client.getReward({
                application,
                beneficiary,
                rewardId,
            });

        assert.ok(result);

        assert.equal(
            result.data.rewardId,
            rewardId,
        );

        assert.equal(
            result.data.amount,
            9_007_199_254_740_993n,
        );

        assert.ok(
            result.data.asset.equals(
                asset,
            ),
        );

        assert.equal(
            result.data.reason,
            "Phase 10 Read API",
        );

        assert.equal(
            result.data.claimableAt,
            1_700_000_100n,
        );
    },
);

test(
    "getAuditHistory uses application offset 44 and deterministic ordering",
    async () => {
        const programId =
            new PublicKey(
                Buffer.alloc(32, 96),
            );

        const application =
            new PublicKey(
                Buffer.alloc(32, 97),
            );

        const authority =
            new PublicKey(
                Buffer.alloc(32, 98),
            );

        const reference =
            new PublicKey(
                Buffer.alloc(32, 99),
            );

        const indexed:
            [PublicKey, PublicKey, PublicKey] =
            [
                new PublicKey(
                    Buffer.alloc(32, 100),
                ),
                new PublicKey(
                    Buffer.alloc(32, 101),
                ),
                new PublicKey(
                    Buffer.alloc(32, 102),
                ),
            ];

        const addressA =
            new PublicKey(
                Buffer.alloc(32, 103),
            );

        const addressB =
            new PublicKey(
                Buffer.alloc(32, 104),
            );

        const unrelatedAddress =
            new PublicKey(
                Buffer.alloc(32, 105),
            );

        const connection =
            new Connection(
                "http://127.0.0.1:8899",
                "confirmed",
            );

        connection.getProgramAccounts =
            (async (
                requestedProgramId:
                    PublicKey,
                config?: {
                    filters?: unknown[];
                },
            ) => {
                assert.ok(
                    requestedProgramId.equals(
                        programId,
                    ),
                );

                const filters =
                    config?.filters as Array<{
                        memcmp?: {
                            offset: number;
                            bytes: string;
                        };
                    }> | undefined;

                assert.equal(
                    filters?.[0]?.memcmp?.offset,
                    44,
                );

                assert.equal(
                    filters?.[0]?.memcmp?.bytes,
                    application.toBase58(),
                );

                return [
                    {
                        pubkey: addressB,
                        account: accountInfo(
                            programId,
                            auditBuffer({
                                authority,
                                application,
                                reference,
                                indexedReferences:
                                    indexed,
                                metadata: "later",
                                createdAt: 200n,
                                bump: 2,
                            }),
                        ),
                    },
                    {
                        pubkey:
                            unrelatedAddress,
                        account:
                            accountInfo(
                                programId,
                                Buffer.concat([
                                    Buffer.alloc(
                                        8,
                                        255,
                                    ),
                                    Buffer.alloc(
                                        300,
                                    ),
                                ]),
                            ),
                    },
                    {
                        pubkey: addressA,
                        account: accountInfo(
                            programId,
                            auditBuffer({
                                authority,
                                application,
                                reference,
                                indexedReferences:
                                    indexed,
                                metadata:
                                    "earlier",
                                createdAt: 100n,
                                bump: 1,
                            }),
                        ),
                    },
                ];
            }) as
                typeof connection.getProgramAccounts;

        const client =
            new BabycowansSDK({
                connection,
                programId,
            });

        const history =
            await client.getAuditHistory({
                application,
            });

        assert.equal(
            history.length,
            2,
        );

        assert.equal(
            history[0]?.data.metadata,
            "earlier",
        );

        assert.equal(
            history[1]?.data.metadata,
            "later",
        );

        assert.equal(
            history[0]?.data.createdAt,
            100n,
        );

        assert.equal(
            history[1]?.data.createdAt,
            200n,
        );
    },
);

test(
    "getAuditHistory returns [] when no AuditLog accounts exist",
    async () => {
        const programId =
            new PublicKey(
                Buffer.alloc(32, 106),
            );

        const connection =
            new Connection(
                "http://127.0.0.1:8899",
                "confirmed",
            );

        connection.getProgramAccounts =
            (async () => []) as
                typeof connection.getProgramAccounts;

        const client =
            new BabycowansSDK({
                connection,
                programId,
            });

        assert.deepEqual(
            await client.getAuditHistory({
                application:
                    new PublicKey(
                        Buffer.alloc(
                            32,
                            107,
                        ),
                    ),
            }),
            [],
        );
    },
);
