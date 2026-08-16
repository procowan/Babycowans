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
    "accept_application_authority",
    "accept_protocol_authority",
    "assign_application_role",
    "cancel_reward",
    "claim_reward",
    "configure_application_asset",
    "configure_application_config",
    "configure_gate_policy",
    "configure_payment_policy",
    "configure_token_gate",
    "create_reward",
    "initialize_protocol",
    "nominate_application_authority",
    "nominate_protocol_authority",
    "process_payment",
    "record_audit_log",
    "register_application",
    "register_asset",
    "register_membership",
    "renew_membership",
    "set_protocol_pause",
    "update_application_config",
    "update_application_role",
    "update_application_status",
    "update_membership",
    "update_payment_policy",
    "verify_gate_access",
    "verify_gate_policy",
    "verify_nft_membership",
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

    expect(
        Buffer.from(
            instruction.discriminator,
        ).equals(discriminator),
        `IDL discriminator mismatch: ${instructionName}`,
    );
}

expect(
    requiredInstructions.length === idlInstructions.size,
    `IDL instruction count mismatch: expected ${requiredInstructions.length}, found ${idlInstructions.size}`,
);

console.log("✓ IDL and builder consistency tests passed");

const applicationConfigAccount =
    BABYCOWANS_IDL.accounts.find(
        (account) =>
            account.name === "ApplicationConfig",
    );

expect(
    applicationConfigAccount !== undefined,
    "IDL account missing: ApplicationConfig",
);

const applicationConfigType =
    BABYCOWANS_IDL.types.find(
        (type) =>
            type.name === "ApplicationConfig",
    );

expect(
    applicationConfigType !== undefined,
    "IDL type missing: ApplicationConfig",
);

if (
    applicationConfigType !== undefined
    && applicationConfigType.type.kind === "struct"
) {
    const fields =
        applicationConfigType.type.fields.map(
            (field) => field.name,
        );

    const expectedFields = [
        "version",
        "application",
        "website_uri",
        "logo_uri",
        "support_uri",
        "description",
        "metadata_uri",
        "created_at",
        "updated_at",
        "bump",
    ];

    expect(
        fields.length === expectedFields.length
            && fields.every(
                (field, index) =>
                    field === expectedFields[index],
            ),
        "IDL ApplicationConfig field layout mismatch",
    );
}

console.log(
    "✓ Phase 6 ApplicationConfig IDL consistency",
);
