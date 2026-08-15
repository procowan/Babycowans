import assert from "node:assert/strict";
import test from "node:test";

import {
    PublicKey,
} from "@solana/web3.js";

import {
    findApplicationPda,
    findMembershipPda,
} from "../src/index.js";

/*
 * X19 SDK generative property suite.
 *
 * No protocol logic is reimplemented here.
 * The tests exercise exported SDK PDA primitives over generated,
 * deterministic input domains.
 */

function generatedPublicKey(
    counter: number,
    domain: number,
): PublicKey {
    const bytes = new Uint8Array(32);

    let state =
        (
            Math.imul(
                counter + 1,
                0x9e3779b1,
            )
            + domain
        ) >>> 0;

    for (
        let index = 0;
        index < bytes.length;
        index += 1
    ) {
        state =
            (
                Math.imul(
                    state ^ (state >>> 16),
                    0x85ebca6b,
                )
                + index
                + domain
            ) >>> 0;

        bytes[index] =
            (
                state
                >>> (
                    (index % 4) * 8
                )
            ) & 0xff;
    }

    return new PublicKey(bytes);
}

test(
    "property-based: Application PDA is deterministic and domain separated",
    () => {
        const programA =
            generatedPublicKey(
                1,
                0x11,
            );

        const programB =
            generatedPublicKey(
                1,
                0x91,
            );

        const authorityA =
            generatedPublicKey(
                2,
                0x31,
            );

        const authorityB =
            generatedPublicKey(
                2,
                0x71,
            );

        const observed =
            new Set<string>();

        for (
            let index = 0;
            index < 512;
            index += 1
        ) {
            const applicationId =
                BigInt(index + 1);

            const [
                applicationA,
                bumpA,
            ] =
                findApplicationPda(
                    programA,
                    authorityA,
                    applicationId,
                );

            const [
                repeatedApplicationA,
                repeatedBumpA,
            ] =
                findApplicationPda(
                    programA,
                    authorityA,
                    applicationId,
                );

            assert.equal(
                repeatedApplicationA.toBase58(),
                applicationA.toBase58(),
            );

            assert.equal(
                repeatedBumpA,
                bumpA,
            );

            assert.equal(
                observed.has(
                    applicationA.toBase58(),
                ),
                false,
                `Application PDA alias at generated index ${index}`,
            );

            observed.add(
                applicationA.toBase58(),
            );

            const [
                otherProgramApplication,
            ] =
                findApplicationPda(
                    programB,
                    authorityA,
                    applicationId,
                );

            assert.notEqual(
                otherProgramApplication.toBase58(),
                applicationA.toBase58(),
                `Program-domain alias at generated index ${index}`,
            );

            const [
                otherAuthorityApplication,
            ] =
                findApplicationPda(
                    programA,
                    authorityB,
                    applicationId,
                );

            assert.notEqual(
                otherAuthorityApplication.toBase58(),
                applicationA.toBase58(),
                `Authority-domain alias at generated index ${index}`,
            );
        }

        assert.equal(
            observed.size,
            512,
        );
    },
);

test(
    "property-based: Membership PDA preserves application and member domains",
    () => {
        const programId =
            generatedPublicKey(
                7,
                0x42,
            );

        const authority =
            generatedPublicKey(
                9,
                0x52,
            );

        const observed =
            new Set<string>();

        for (
            let index = 0;
            index < 256;
            index += 1
        ) {
            const [
                applicationA,
            ] =
                findApplicationPda(
                    programId,
                    authority,
                    BigInt(index + 1),
                );

            const [
                applicationB,
            ] =
                findApplicationPda(
                    programId,
                    authority,
                    BigInt(index + 10_001),
                );

            const memberA =
                generatedPublicKey(
                    index,
                    0x21,
                );

            const memberB =
                generatedPublicKey(
                    index,
                    0x61,
                );

            const [
                membershipA,
                bumpA,
            ] =
                findMembershipPda(
                    programId,
                    applicationA,
                    memberA,
                );

            const [
                repeatedMembershipA,
                repeatedBumpA,
            ] =
                findMembershipPda(
                    programId,
                    applicationA,
                    memberA,
                );

            assert.equal(
                repeatedMembershipA.toBase58(),
                membershipA.toBase58(),
            );

            assert.equal(
                repeatedBumpA,
                bumpA,
            );

            const [
                otherMemberMembership,
            ] =
                findMembershipPda(
                    programId,
                    applicationA,
                    memberB,
                );

            assert.notEqual(
                otherMemberMembership.toBase58(),
                membershipA.toBase58(),
                `Member-domain alias at generated index ${index}`,
            );

            const [
                otherApplicationMembership,
            ] =
                findMembershipPda(
                    programId,
                    applicationB,
                    memberA,
                );

            assert.notEqual(
                otherApplicationMembership.toBase58(),
                membershipA.toBase58(),
                `Application-domain alias at generated index ${index}`,
            );

            assert.notEqual(
                membershipA.toBase58(),
                applicationA.toBase58(),
                `PDA-domain alias at generated index ${index}`,
            );

            assert.equal(
                observed.has(
                    membershipA.toBase58(),
                ),
                false,
                `Membership PDA alias at generated index ${index}`,
            );

            observed.add(
                membershipA.toBase58(),
            );
        }

        assert.equal(
            observed.size,
            256,
        );
    },
);
