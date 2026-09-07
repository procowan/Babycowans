import {
    PublicKey,
} from "@solana/web3.js";

import {
    encodeU16,
    encodeU8,
} from "../src/instructions/codec.js";

import {
    buildConfigureGatePolicyInstruction,
    buildConfigurePaymentPolicyInstruction,
    buildConfigureTokenGateInstruction,
    buildRegisterMembershipInstruction,
    buildUpdateMembershipInstruction,
} from "../src/instructions/factory.js";

function assert(
    condition: unknown,
    message: string,
): asserts condition {
    if (!condition) {
        throw new Error(message);
    }
}

function assertThrows(
    label: string,
    action: () => unknown,
): void {
    let threw = false;

    try {
        action();
    } catch {
        threw = true;
    }

    assert(
        threw,
        `${label} must reject invalid numeric input.`,
    );
}

const key = PublicKey.default;

const invalidU16 = [
    -1,
    65536,
    1.9,
    Number.NaN,
    Number.POSITIVE_INFINITY,
];

for (const value of invalidU16) {
    assertThrows(
        `encodeU16 ${String(value)}`,
        () => encodeU16(value),
    );

    assertThrows(
        `register tier ${String(value)}`,
        () =>
            buildRegisterMembershipInstruction({
                programId: key,
                application: key,
                membership: key,
                authority: key,
                member: key,
                tier: value,
                expiresAt: 1n,
            }),
    );

    assertThrows(
        `update tier ${String(value)}`,
        () =>
            buildUpdateMembershipInstruction({
                programId: key,
                application: key,
                membership: key,
                authority: key,
                tier: value,
                status: 0,
                expiresAt: 1n,
                renewable: false,
                autoExtend: false,
                renewalDuration: 0n,
            }),
    );

    assertThrows(
        `token gate tier ${String(value)}`,
        () =>
            buildConfigureTokenGateInstruction({
                programId: key,
                application: key,
                applicationAsset: key,
                tokenGate: key,
                authority: key,
                gateType: 0,
                minimumAmount: 0n,
                minimumTier: value,
                enabled: true,
            }),
    );

    assertThrows(
        `gate policy tier ${String(value)}`,
        () =>
            buildConfigureGatePolicyInstruction({
                programId: key,
                application: key,
                applicationAsset: key,
                gatePolicy: key,
                authority: key,
                conditions: [
                    {
                        group: 0,
                        conditionType: 1,
                        mint: key,
                        minimumTier: value,
                    },
                ],
                enabled: true,
            }),
    );

    assertThrows(
        `protocol fee ${String(value)}`,
        () =>
            buildConfigurePaymentPolicyInstruction({
                programId: key,
                protocol: key,
                application: key,
                applicationAsset: key,
                paymentPolicy: key,
                authority: key,
                minimumAmount: 0n,
                maximumAmount: 1n,
                paymentsEnabled: true,
                protocolFeeBps: value,
                applicationFeeBps: 0,
                treasury: key,
            }),
    );
}

const invalidU8 = [
    -1,
    256,
    257,
    -256,
    1.9,
    Number.NaN,
    Number.POSITIVE_INFINITY,
];

for (const value of invalidU8) {
    assertThrows(
        `encodeU8 ${String(value)}`,
        () => encodeU8(value),
    );

    assertThrows(
        `gate group ${String(value)}`,
        () =>
            buildConfigureGatePolicyInstruction({
                programId: key,
                application: key,
                applicationAsset: key,
                gatePolicy: key,
                authority: key,
                conditions: [
                    {
                        group: value,
                        conditionType: 0,
                        mint: key,
                        minimumAmount: 1n,
                    },
                ],
                enabled: true,
            }),
    );
}

assert(
    encodeU16(0).readUInt16LE(0) === 0,
    "U16 zero boundary mismatch.",
);

assert(
    encodeU16(65535).readUInt16LE(0) === 65535,
    "U16 maximum boundary mismatch.",
);

assert(
    encodeU8(0)[0] === 0,
    "U8 zero boundary mismatch.",
);

assert(
    encodeU8(255)[0] === 255,
    "U8 maximum boundary mismatch.",
);

console.log(
    "F01_NUMERIC_BOUNDARY_REGRESSION=PASS",
);
