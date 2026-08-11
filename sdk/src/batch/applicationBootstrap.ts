import type {
    PublicKey,
    TransactionInstruction,
} from "@solana/web3.js";

import type {
    AssignApplicationRoleInstructionParams,
    ConfigureApplicationConfigInstructionParams,
    RegisterApplicationInstructionParams,
} from "../instructions/index.js";

import {
    buildAssignApplicationRoleInstruction,
    buildConfigureApplicationConfigInstruction,
    buildRegisterApplicationInstruction,
} from "../instructions/index.js";

import {
    findApplicationConfigPda,
    findApplicationPda,
    findApplicationRolePda,
} from "../pda/index.js";

export type ApplicationBootstrapConfig =
    Omit<
        ConfigureApplicationConfigInstructionParams,
        "programId" | "application" | "authority"
    >;

export type ApplicationBootstrapRole =
    Omit<
        AssignApplicationRoleInstructionParams,
        | "programId"
        | "application"
        | "applicationRole"
        | "authority"
    >;

export interface ApplicationBootstrapInstructionParams
    extends RegisterApplicationInstructionParams {
    config: ApplicationBootstrapConfig;
    role?: ApplicationBootstrapRole;
}

export interface ApplicationBootstrapPlan {
    application: PublicKey;
    applicationConfig: PublicKey;
    applicationRole?: PublicKey;
    instructions: TransactionInstruction[];
}

/**
 * Composes the canonical Babycowans application bootstrap flow:
 *
 * RegisterApplication
 * → ConfigureApplicationConfig
 * → optional AssignApplicationRole
 *
 * The returned instruction order is intentional and must be preserved
 * when submitted as one Solana transaction.
 */
export function buildApplicationBootstrapPlan(
    params: ApplicationBootstrapInstructionParams,
): ApplicationBootstrapPlan {
    const [application] =
        findApplicationPda(
            params.programId,
            params.authority,
            params.applicationId,
        );

    const [applicationConfig] =
        findApplicationConfigPda(
            params.programId,
            application,
        );

    const instructions: TransactionInstruction[] = [
        buildRegisterApplicationInstruction({
            programId:
                params.programId,
            authority:
                params.authority,
            applicationId:
                params.applicationId,
            name:
                params.name,
            selectedEcosystem:
                params.selectedEcosystem,
        }),

        buildConfigureApplicationConfigInstruction({
            programId:
                params.programId,
            application,
            authority:
                params.authority,
            ...params.config,
        }),
    ];

    let applicationRole:
        PublicKey | undefined;

    if (params.role !== undefined) {
        [applicationRole] =
            findApplicationRolePda(
                params.programId,
                application,
                params.role.member,
            );

        instructions.push(
            buildAssignApplicationRoleInstruction({
                programId:
                    params.programId,
                application,
                applicationRole,
                member:
                    params.role.member,
                authority:
                    params.authority,
                role:
                    params.role.role,
            }),
        );
    }

    return {
        application,
        applicationConfig,
        applicationRole,
        instructions,
    };
}
