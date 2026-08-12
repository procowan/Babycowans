import assert from "node:assert/strict";
import test from "node:test";

import {
    PublicKey,
} from "@solana/web3.js";

import {
    buildApplicationBootstrapPlan,
    buildCreateRewardBatchInstructions,
    decodeBabycowansEventLogs,
    findApplicationAssetPda,
    findApplicationPda,
    findMembershipPda,
    findPaymentPolicyPda,
    findRewardPda,
} from "../src/index.js";

import {
    encodeBool,
    encodeEnum,
    encodeFixedBytes3,
    encodeString,
    encodeU64,
} from "../src/instructions/codec.js";

class SeededRng {
    private state: number;

    constructor(seed: number) {
        this.state = seed >>> 0;
    }

    nextU32(): number {
        let x = this.state;

        x ^= x << 13;
        x ^= x >>> 17;
        x ^= x << 5;

        this.state = x >>> 0;

        return this.state;
    }

    nextByte(): number {
        return this.nextU32() & 0xff;
    }

    nextBool(): boolean {
        return (this.nextU32() & 1) === 1;
    }

    nextBytes(length: number): Buffer {
        const output = Buffer.alloc(length);

        for (let i = 0; i < length; i += 1) {
            output[i] = this.nextByte();
        }

        return output;
    }

    nextPublicKey(): PublicKey {
        return new PublicKey(
            this.nextBytes(32),
        );
    }

    nextBigInt(): bigint {
        const high =
            BigInt(this.nextU32());

        const low =
            BigInt(this.nextU32());

        return (high << 32n) | low;
    }

    nextAscii(maxLength: number): string {
        const length =
            this.nextU32() %
            (maxLength + 1);

        let value = "";

        for (
            let i = 0;
            i < length;
            i += 1
        ) {
            value += String.fromCharCode(
                32 +
                    (
                        this.nextByte()
                        % 95
                    ),
            );
        }

        return value;
    }
}

function deterministicPublicKey(
    rng: SeededRng,
): PublicKey {
    return rng.nextPublicKey();
}

test(
    "Phase 14 property — instruction serialization remains exact",
    () => {
        const rng =
            new SeededRng(0x14_11_2026);

        for (
            let i = 0;
            i < 5000;
            i += 1
        ) {
            const value =
                rng.nextBigInt();

            const encodedU64 =
                encodeU64(value);

            assert.equal(
                encodedU64.length,
                8,
            );

            assert.equal(
                encodedU64
                    .readBigUInt64LE(0),
                value,
            );

            const text =
                rng.nextAscii(128);

            const encodedString =
                encodeString(text);

            const utf8 =
                Buffer.from(
                    text,
                    "utf8",
                );

            assert.equal(
                encodedString
                    .readUInt32LE(0),
                utf8.length,
            );

            assert.deepEqual(
                encodedString
                    .subarray(4),
                utf8,
            );

            const boolean =
                rng.nextBool();

            assert.deepEqual(
                encodeBool(boolean),
                Buffer.from([
                    boolean ? 1 : 0,
                ]),
            );

            const enumValue =
                rng.nextByte();

            assert.deepEqual(
                encodeEnum(enumValue),
                Buffer.from([
                    enumValue,
                ]),
            );

            const fixed =
                rng.nextBytes(3);

            assert.deepEqual(
                encodeFixedBytes3(fixed),
                fixed,
            );
        }

        assert.throws(
            () =>
                encodeFixedBytes3(
                    Buffer.alloc(2),
                ),
        );

        assert.throws(
            () =>
                encodeFixedBytes3(
                    Buffer.alloc(4),
                ),
        );
    },
);

test(
    "Phase 14 property — PDA derivation is deterministic and domain-bound",
    () => {
        const rng =
            new SeededRng(0x1408);

        for (
            let i = 0;
            i < 3000;
            i += 1
        ) {
            const programId =
                deterministicPublicKey(rng);

            const authority =
                deterministicPublicKey(rng);

            const mint =
                deterministicPublicKey(rng);

            const member =
                deterministicPublicKey(rng);

            const beneficiary =
                deterministicPublicKey(rng);

            const applicationId =
                rng.nextBigInt();

            const rewardId =
                rng.nextBigInt();

            const [applicationA] =
                findApplicationPda(
                    programId,
                    authority,
                    applicationId,
                );

            const [applicationB] =
                findApplicationPda(
                    programId,
                    authority,
                    applicationId,
                );

            assert.ok(
                applicationA.equals(
                    applicationB,
                ),
            );

            const [applicationAsset] =
                findApplicationAssetPda(
                    programId,
                    applicationA,
                    mint,
                );

            const [membership] =
                findMembershipPda(
                    programId,
                    applicationA,
                    member,
                );

            const [reward] =
                findRewardPda(
                    programId,
                    applicationA,
                    beneficiary,
                    rewardId,
                );

            const [paymentPolicy] =
                findPaymentPolicyPda(
                    programId,
                    applicationA,
                    applicationAsset,
                );

            assert.ok(
                !applicationAsset.equals(
                    membership,
                ),
            );

            assert.ok(
                !applicationAsset.equals(
                    reward,
                ),
            );

            assert.ok(
                !paymentPolicy.equals(
                    membership,
                ),
            );

            const differentAuthority =
                deterministicPublicKey(
                    rng,
                );

            const [
                differentApplication,
            ] =
                findApplicationPda(
                    programId,
                    differentAuthority,
                    applicationId,
                );

            if (
                !authority.equals(
                    differentAuthority,
                )
            ) {
                assert.ok(
                    !applicationA.equals(
                        differentApplication,
                    ),
                );
            }
        }
    },
);

test(
    "Phase 14 property — malformed unrelated event logs remain safe",
    () => {
        const rng =
            new SeededRng(0x1409);

        for (
            let i = 0;
            i < 5000;
            i += 1
        ) {
            const random =
                rng.nextBytes(
                    rng.nextU32()
                    % 96,
                );

            const arbitraryLog =
                `Program log: ${random.toString(
                    "hex",
                )}`;

            assert.doesNotThrow(
                () =>
                    decodeBabycowansEventLogs(
                        [
                            arbitraryLog,
                        ],
                    ),
            );

            const result =
                decodeBabycowansEventLogs(
                    [
                        arbitraryLog,
                    ],
                );

            assert.ok(
                Array.isArray(result),
            );
        }
    },
);

test(
    "Phase 14 property — malformed Program data stays bounded in lenient mode",
    () => {
        const rng =
            new SeededRng(0x1410);

        for (
            let i = 0;
            i < 5000;
            i += 1
        ) {
            const bytes =
                rng.nextBytes(
                    rng.nextU32()
                    % 128,
                );

            const encoded =
                bytes.toString(
                    "base64",
                );

            assert.doesNotThrow(
                () =>
                    decodeBabycowansEventLogs(
                        [
                            `Program data: ${encoded}`,
                        ],
                    ),
            );
        }
    },
);

test(
    "Phase 14 property — application bootstrap preserves deterministic ordering",
    () => {
        const rng =
            new SeededRng(0x1412);

        for (
            let i = 0;
            i < 3000;
            i += 1
        ) {
            const programId =
                rng.nextPublicKey();

            const authority =
                rng.nextPublicKey();

            const applicationId =
                rng.nextBigInt();

            const base = {
                programId,
                authority,
                applicationId,
                name:
                    `phase14-${i}`,
                selectedEcosystem: 0,
                config: {
                    websiteUri:
                        "",
                    logoUri:
                        "",
                    supportUri:
                        "",
                    description:
                        "",
                    metadataUri:
                        "",
                },
            };

            const noRole =
                buildApplicationBootstrapPlan(
                    base,
                );

            assert.equal(
                noRole.instructions.length,
                2,
            );

            const roleMember =
                rng.nextPublicKey();

            const withRole =
                buildApplicationBootstrapPlan({
                    ...base,
                    role: {
                        member:
                            roleMember,
                        role:
                            rng.nextByte()
                            % 4,
                    },
                });

            assert.equal(
                withRole.instructions.length,
                3,
            );

            assert.deepEqual(
                withRole.instructions[0],
                noRole.instructions[0],
            );

            assert.deepEqual(
                withRole.instructions[1],
                noRole.instructions[1],
            );
        }
    },
);

test(
    "Phase 14 property — reward batch builder preserves input order deterministically",
    () => {
        const rng =
            new SeededRng(0x1413);

        for (
            let i = 0;
            i < 3000;
            i += 1
        ) {
            const programId =
                rng.nextPublicKey();

            const application =
                rng.nextPublicKey();

            const authority =
                rng.nextPublicKey();

            const beneficiary =
                rng.nextPublicKey();

            const asset =
                rng.nextPublicKey();

            const rewardA =
                rng.nextPublicKey();

            const rewardB =
                rng.nextPublicKey();

            const input = [
                {
                    programId,
                    application,
                    reward:
                        rewardA,
                    authority,
                    beneficiary,
                    rewardId:
                        rng.nextBigInt(),
                    asset,
                    amount:
                        rng.nextBigInt(),
                    claimableAt:
                        0n,
                    expiresAt:
                        0n,
                    category:
                        rng.nextByte(),
                    reason:
                        "a",
                },
                {
                    programId,
                    application,
                    reward:
                        rewardB,
                    authority,
                    beneficiary,
                    rewardId:
                        rng.nextBigInt(),
                    asset,
                    amount:
                        rng.nextBigInt(),
                    claimableAt:
                        0n,
                    expiresAt:
                        0n,
                    category:
                        rng.nextByte(),
                    reason:
                        "b",
                },
            ];

            const first =
                buildCreateRewardBatchInstructions(
                    input,
                );

            const second =
                buildCreateRewardBatchInstructions(
                    input,
                );

            assert.equal(
                first.length,
                input.length,
            );

            assert.equal(
                second.length,
                input.length,
            );

            for (
                let index = 0;
                index < input.length;
                index += 1
            ) {
                assert.deepEqual(
                    first[index],
                    second[index],
                );

                assert.ok(
                    first[index]!
                        .keys[1]!
                        .pubkey
                        .equals(
                            input[index]!
                                .reward,
                        ),
                );
            }
        }
    },
);
