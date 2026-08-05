import { BABYCOWANS_IDL } from "../src/idl/index.js";

import {
    instructionDiscriminator,
} from "../src/instructions/codec.js";

function expect(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(message);
    }
}

const idlInstructions = new Map(
    BABYCOWANS_IDL.instructions.map((instruction) => [
        instruction.name,
        instruction,
    ]),
);

const requiredInstructions = [
    "initialize_protocol",
    "register_asset",
    "register_application",
    "nominate_application_authority",
    "accept_application_authority",
    "configure_application_asset",
    "process_payment",
    "assign_application_role",
    "update_application_role",
    "register_membership",
    "update_membership",
    "create_reward",
    "claim_reward",
    "configure_token_gate",
    "verify_gate_access",
    "set_protocol_pause",
    "nominate_protocol_authority",
    "accept_protocol_authority",
    "record_audit_log",
] as const;

for (const instructionName of requiredInstructions) {
    const instruction = idlInstructions.get(instructionName);

    expect(
        instruction !== undefined,
        `IDL instruction missing: ${instructionName}`,
    );

    const discriminator = instructionDiscriminator(instructionName);

    expect(
        discriminator.length === 8,
        `Invalid discriminator length: ${instructionName}`,
    );
}

expect(
    requiredInstructions.length === idlInstructions.size,
    `IDL instruction count mismatch: expected ${requiredInstructions.length}, found ${idlInstructions.size}`,
);

console.log("✓ IDL and builder consistency tests passed");
