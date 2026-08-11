import {
    Connection,
    PublicKey,
    Transaction,
    TransactionInstruction,
    VersionedTransaction,
    Signer,
    sendAndConfirmTransaction,
} from "@solana/web3.js";

import type { BabycowansSDKConfig } from "../types/index.js";

import type { ApplicationConfigAccount } from "../accounts/index.js";

import type { CanonicalEcosystem } from "../ecosystems/index.js";

import {
    buildRegisterMembershipInstruction,
    buildUpdateMembershipInstruction,
    buildRenewMembershipInstruction,
    buildVerifyNftMembershipInstruction,
    buildConfigureTokenGateInstruction,
    buildVerifyGateAccessInstruction,
    buildConfigureApplicationConfigInstruction,
    buildUpdateApplicationConfigInstruction,
    buildCancelRewardInstruction,
    buildClaimRewardInstruction,
    buildCreateRewardInstruction,
    buildProcessPaymentInstruction,
    buildRegisterApplicationInstruction,
} from "../instructions/index.js";

import type {
    ConfigureTokenGateInstructionParams,
    RegisterMembershipInstructionParams,
    RenewMembershipInstructionParams,
    UpdateMembershipInstructionParams,
    VerifyGateAccessInstructionParams,
    VerifyNftMembershipInstructionParams,
} from "../instructions/index.js";

import {
    findApplicationAssetPda,
    findApplicationConfigPda,
    findApplicationPda,
    findApplicationRolePda,
    findAssetConfigPda,
    findAuditLogPda,
    findMembershipPda,
    findProtocolConfigPda,
    findRewardPda,
    findTokenGatePda,
} from "../pda/index.js";

import {
    resolveApplicationExperience,
    resolveCanonicalTokenMetadata,
} from "../metadata/index.js";

import type {
    ResolvedApplicationExperience,
    ResolvedCanonicalTokenIdentity,
} from "../metadata/index.js";

import { AccountFetcher } from "../fetchers/index.js";
import { TransactionHelper } from "../transactions/index.js";

import { decodeBabycowansEventLogs } from "../events/index.js";

import type {
    DecodeEventLogsOptions,
    DecodedBabycowansEvent,
} from "../events/index.js";

import {
    decodeApplicationAccount,
    decodeAuditLogAccount,
    decodeMembershipAccount,
    decodeRewardAccount,
    matchesAccountDiscriminator,
} from "../accounts/index.js";

import type {
    ApplicationAccount,
    AuditLogAccount,
    MembershipAccount,
    RewardAccount,
} from "../accounts/index.js";

import type {
    GetApplicationParams,
    GetAuditHistoryParams,
    GetMembershipParams,
    GetRewardParams,
    ReadAccount,
} from "../read/index.js";

export interface RegisterApplicationParams {
    authority: Signer;
    applicationId: bigint;
    name: string;
    selectedEcosystem: CanonicalEcosystem;
}

export interface RegisterApplicationResult {
    signature: string;
    applicationId: bigint;
    application: PublicKey;
}

export interface ProcessPaymentParams {
    application: PublicKey;
    mint: PublicKey;
    payer: Signer;
    payerTokenAccount: PublicKey;
    destinationTokenAccount: PublicKey;
    treasuryTokenAccount: PublicKey;
    tokenProgram: PublicKey;
    amount: bigint;
}

export interface ProcessPaymentResult {
    signature: string;
    application: PublicKey;
    applicationAsset: PublicKey;
    assetConfig: PublicKey;
    mint: PublicKey;
    payer: PublicKey;
    amount: bigint;
}

export interface CreateRewardParams {
    application: PublicKey;
    authority: Signer;
    beneficiary: PublicKey;
    rewardId: bigint;
    asset: PublicKey;
    amount: bigint;
    claimableAt: bigint;
    expiresAt: bigint;
    category: number;
    reason: string;
}

export interface CreateRewardResult {
    signature: string;
    reward: PublicKey;
    application: PublicKey;
    beneficiary: PublicKey;
    rewardId: bigint;
    asset: PublicKey;
    amount: bigint;
    claimableAt: bigint;
    expiresAt: bigint;
    category: number;
    reason: string;
}

export interface ClaimRewardParams {
    application: PublicKey;
    beneficiary: Signer;
    rewardId: bigint;
}

export interface ClaimRewardResult {
    signature: string;
    reward: PublicKey;
    application: PublicKey;
    beneficiary: PublicKey;
    rewardId: bigint;
}

export interface CancelRewardParams {
    application: PublicKey;
    authority: Signer;
    beneficiary: PublicKey;
    rewardId: bigint;
}

export interface CancelRewardResult {
    signature: string;
    reward: PublicKey;
    application: PublicKey;
    beneficiary: PublicKey;
    rewardId: bigint;
}

export interface ApplicationConfigMetadataParams {
    websiteUri: string;
    logoUri: string;
    supportUri: string;
    description: string;
    metadataUri: string;
}

export interface ConfigureApplicationConfigParams
    extends ApplicationConfigMetadataParams {
    application: PublicKey;
    authority: Signer;
}

export interface ConfigureApplicationConfigResult
    extends ApplicationConfigMetadataParams {
    signature: string;
    application: PublicKey;
    applicationConfig: PublicKey;
}

export interface UpdateApplicationConfigParams
    extends ApplicationConfigMetadataParams {
    application: PublicKey;
    authority: Signer;
}

export interface UpdateApplicationConfigResult
    extends ApplicationConfigMetadataParams {
    signature: string;
    application: PublicKey;
    applicationConfig: PublicKey;
}

export type RegisterMembershipParams =
    Omit<
        RegisterMembershipInstructionParams,
        "programId" | "membership" | "authority"
    > & {
        authority: Signer;
    };

export interface RegisterMembershipResult {
    signature: string;
    application: PublicKey;
    membership: PublicKey;
    member: PublicKey;
}

export type UpdateMembershipParams =
    Omit<
        UpdateMembershipInstructionParams,
        "programId" | "membership" | "authority"
    > & {
        authority: Signer;
        member: PublicKey;
    };

export interface UpdateMembershipResult {
    signature: string;
    application: PublicKey;
    membership: PublicKey;
    member: PublicKey;
}

export type RenewMembershipParams =
    Omit<
        RenewMembershipInstructionParams,
        "programId" | "membership" | "authority"
    > & {
        authority: Signer;
        member: PublicKey;
    };

export interface RenewMembershipResult {
    signature: string;
    application: PublicKey;
    membership: PublicKey;
    member: PublicKey;
}

export type VerifyNftMembershipParams =
    Omit<
        VerifyNftMembershipInstructionParams,
        "programId" | "membership" | "member"
    > & {
        member: Signer;
    };

export interface VerifyNftMembershipResult {
    signature: string;
    application: PublicKey;
    membership: PublicKey;
    member: PublicKey;
}

export type ConfigureTokenGateParams =
    Omit<
        ConfigureTokenGateInstructionParams,
        "programId" | "authority"
    > & {
        authority: Signer;
    };

export interface ConfigureTokenGateResult {
    signature: string;
    application: PublicKey;
    applicationAsset: PublicKey;
    tokenGate: PublicKey;
}

export type VerifyGateAccessParams =
    Omit<
        VerifyGateAccessInstructionParams,
        "programId" | "wallet"
    > & {
        wallet: Signer;
    };

export interface VerifyGateAccessResult {
    signature: string;
    application: PublicKey;
    applicationAsset: PublicKey;
    tokenGate: PublicKey;
    wallet: PublicKey;
}

export class BabycowansSDK {
    readonly connection: Connection;
    readonly programId: PublicKey;
    readonly accounts: AccountFetcher;
    readonly transactions: TransactionHelper;

    constructor(config: BabycowansSDKConfig) {
        this.connection = config.connection;
        this.programId = new PublicKey(config.programId);
        this.accounts = new AccountFetcher(this.connection);
        this.transactions = new TransactionHelper(this.connection);
    }

    findProtocolConfig(): [PublicKey, number] {
        return findProtocolConfigPda(this.programId);
    }

    findAssetConfig(
        mint: PublicKey,
    ): [PublicKey, number] {
        return findAssetConfigPda(
            this.programId,
            mint,
        );
    }

    findApplication(
        authority: PublicKey,
        applicationId: bigint,
    ): [PublicKey, number] {
        return findApplicationPda(
            this.programId,
            authority,
            applicationId,
        );
    }

    findApplicationConfig(
        application: PublicKey,
    ): [PublicKey, number] {
        return findApplicationConfigPda(
            this.programId,
            application,
        );
    }

    findApplicationAsset(
        application: PublicKey,
        mint: PublicKey,
    ): [PublicKey, number] {
        return findApplicationAssetPda(
            this.programId,
            application,
            mint,
        );
    }

    findApplicationRole(
        application: PublicKey,
        member: PublicKey,
    ): [PublicKey, number] {
        return findApplicationRolePda(
            this.programId,
            application,
            member,
        );
    }

    findMembership(
        application: PublicKey,
        member: PublicKey,
    ): [PublicKey, number] {
        return findMembershipPda(
            this.programId,
            application,
            member,
        );
    }

    findReward(
        application: PublicKey,
        beneficiary: PublicKey,
        rewardId: bigint = 0n,
    ): [PublicKey, number] {
        return findRewardPda(
            this.programId,
            application,
            beneficiary,
            rewardId,
        );
    }

    findTokenGate(
        application: PublicKey,
        applicationAsset: PublicKey,
    ): [PublicKey, number] {
        return findTokenGatePda(
            this.programId,
            application,
            applicationAsset,
        );
    }

    findAuditLog(
        application: PublicKey,
        authority: PublicKey,
        nonce: bigint,
    ): [PublicKey, number] {
        return findAuditLogPda(
            this.programId,
            application,
            authority,
            nonce,
        );
    }

    async resolveApplicationExperience(
        ecosystem: CanonicalEcosystem,
        config: ApplicationConfigAccount,
        options?: {
            signal?: AbortSignal;
        },
    ): Promise<ResolvedApplicationExperience> {
        return resolveApplicationExperience(
            this.connection,
            ecosystem,
            config,
            {
                signal:
                    options?.signal,
            },
        );
    }

    async resolveCanonicalTokenMetadata(
        ecosystem: CanonicalEcosystem,
        options?: {
            signal?: AbortSignal;
        },
    ): Promise<ResolvedCanonicalTokenIdentity> {
        return resolveCanonicalTokenMetadata(
            this.connection,
            ecosystem,
            {
                signal:
                    options?.signal,
            },
        );
    }

    async registerApplication(
        params: RegisterApplicationParams,
    ): Promise<RegisterApplicationResult> {
        const [application] = this.findApplication(
            params.authority.publicKey,
            params.applicationId,
        );

        const instruction =
            buildRegisterApplicationInstruction({
                programId: this.programId,
                authority: params.authority.publicKey,
                applicationId: params.applicationId,
                name: params.name,
                selectedEcosystem:
                    params.selectedEcosystem,
            });

        const transaction =
            await this.transactions.createTransaction(
                params.authority.publicKey,
                [instruction],
            );

        const signature =
            await sendAndConfirmTransaction(
                this.connection,
                transaction,
                [params.authority],
                {
                    commitment: "confirmed",
                },
            );

        return {
            signature,
            applicationId: params.applicationId,
            application,
        };
    }

    async processPayment(
        params: ProcessPaymentParams,
    ): Promise<ProcessPaymentResult> {
        const [applicationAsset] =
            this.findApplicationAsset(
                params.application,
                params.mint,
            );

        const [assetConfig] =
            this.findAssetConfig(
                params.mint,
            );

        const instruction =
            buildProcessPaymentInstruction({
                programId:
                    this.programId,

                application:
                    params.application,

                applicationAsset,
                assetConfig,

                mint:
                    params.mint,

                payer:
                    params.payer.publicKey,

                payerTokenAccount:
                    params.payerTokenAccount,

                destinationTokenAccount:
                    params.destinationTokenAccount,

                treasuryTokenAccount:
                    params.treasuryTokenAccount,

                tokenProgram:
                    params.tokenProgram,

                amount:
                    params.amount,
            });

        const transaction =
            await this.transactions.createTransaction(
                params.payer.publicKey,
                [instruction],
            );

        const signature =
            await sendAndConfirmTransaction(
                this.connection,
                transaction,
                [params.payer],
                {
                    commitment:
                        "confirmed",
                },
            );

        return {
            signature,
            application:
                params.application,
            applicationAsset,
            assetConfig,
            mint:
                params.mint,
            payer:
                params.payer.publicKey,
            amount:
                params.amount,
        };
    }

    async createReward(
        params: CreateRewardParams,
    ): Promise<CreateRewardResult> {
        const [reward] =
            findRewardPda(
                this.programId,
                params.application,
                params.beneficiary,
                params.rewardId,
            );

        const instruction =
            buildCreateRewardInstruction({
                programId:
                    this.programId,

                application:
                    params.application,

                reward,

                authority:
                    params.authority.publicKey,

                beneficiary:
                    params.beneficiary,

                rewardId:
                    params.rewardId,

                asset:
                    params.asset,

                amount:
                    params.amount,

                claimableAt:
                    params.claimableAt,

                expiresAt:
                    params.expiresAt,

                category:
                    params.category,

                reason:
                    params.reason,
            });

        const transaction =
            await this.transactions.createTransaction(
                params.authority.publicKey,
                [instruction],
            );

        const signature =
            await sendAndConfirmTransaction(
                this.connection,
                transaction,
                [params.authority],
                {
                    commitment:
                        "confirmed",
                },
            );

        return {
            signature,
            reward,
            application:
                params.application,
            beneficiary:
                params.beneficiary,
            rewardId:
                params.rewardId,
            asset:
                params.asset,
            amount:
                params.amount,
            claimableAt:
                params.claimableAt,
            expiresAt:
                params.expiresAt,
            category:
                params.category,
            reason:
                params.reason,
        };
    }

    async claimReward(
        params: ClaimRewardParams,
    ): Promise<ClaimRewardResult> {
        const [reward] =
            findRewardPda(
                this.programId,
                params.application,
                params.beneficiary.publicKey,
                params.rewardId,
            );

        const instruction =
            buildClaimRewardInstruction({
                programId:
                    this.programId,
                reward,
                beneficiary:
                    params.beneficiary.publicKey,
            });

        const transaction =
            await this.transactions.createTransaction(
                params.beneficiary.publicKey,
                [instruction],
            );

        const signature =
            await sendAndConfirmTransaction(
                this.connection,
                transaction,
                [params.beneficiary],
                {
                    commitment:
                        "confirmed",
                },
            );

        return {
            signature,
            reward,
            application:
                params.application,
            beneficiary:
                params.beneficiary.publicKey,
            rewardId:
                params.rewardId,
        };
    }

    async cancelReward(
        params: CancelRewardParams,
    ): Promise<CancelRewardResult> {
        const [reward] =
            findRewardPda(
                this.programId,
                params.application,
                params.beneficiary,
                params.rewardId,
            );

        const instruction =
            buildCancelRewardInstruction({
                programId:
                    this.programId,
                application:
                    params.application,
                reward,
                authority:
                    params.authority.publicKey,
            });

        const transaction =
            await this.transactions.createTransaction(
                params.authority.publicKey,
                [instruction],
            );

        const signature =
            await sendAndConfirmTransaction(
                this.connection,
                transaction,
                [params.authority],
                {
                    commitment:
                        "confirmed",
                },
            );

        return {
            signature,
            reward,
            application:
                params.application,
            beneficiary:
                params.beneficiary,
            rewardId:
                params.rewardId,
        };
    }

    async configureApplicationConfig(
        params: ConfigureApplicationConfigParams,
    ): Promise<ConfigureApplicationConfigResult> {
        const [applicationConfig] =
            findApplicationConfigPda(
                this.programId,
                params.application,
            );

        const instruction =
            buildConfigureApplicationConfigInstruction({
                programId:
                    this.programId,
                application:
                    params.application,
                authority:
                    params.authority.publicKey,
                websiteUri:
                    params.websiteUri,
                logoUri:
                    params.logoUri,
                supportUri:
                    params.supportUri,
                description:
                    params.description,
                metadataUri:
                    params.metadataUri,
            });

        const transaction =
            await this.transactions.createTransaction(
                params.authority.publicKey,
                [instruction],
            );

        const signature =
            await sendAndConfirmTransaction(
                this.connection,
                transaction,
                [params.authority],
                {
                    commitment:
                        "confirmed",
                },
            );

        return {
            signature,
            application:
                params.application,
            applicationConfig,
            websiteUri:
                params.websiteUri,
            logoUri:
                params.logoUri,
            supportUri:
                params.supportUri,
            description:
                params.description,
            metadataUri:
                params.metadataUri,
        };
    }

    async updateApplicationConfig(
        params: UpdateApplicationConfigParams,
    ): Promise<UpdateApplicationConfigResult> {
        const [applicationConfig] =
            findApplicationConfigPda(
                this.programId,
                params.application,
            );

        const instruction =
            buildUpdateApplicationConfigInstruction({
                programId:
                    this.programId,
                application:
                    params.application,
                authority:
                    params.authority.publicKey,
                websiteUri:
                    params.websiteUri,
                logoUri:
                    params.logoUri,
                supportUri:
                    params.supportUri,
                description:
                    params.description,
                metadataUri:
                    params.metadataUri,
            });

        const transaction =
            await this.transactions.createTransaction(
                params.authority.publicKey,
                [instruction],
            );

        const signature =
            await sendAndConfirmTransaction(
                this.connection,
                transaction,
                [params.authority],
                {
                    commitment:
                        "confirmed",
                },
            );

        return {
            signature,
            application:
                params.application,
            applicationConfig,
            websiteUri:
                params.websiteUri,
            logoUri:
                params.logoUri,
            supportUri:
                params.supportUri,
            description:
                params.description,
            metadataUri:
                params.metadataUri,
        };
    }

    async registerMembership(
        params: RegisterMembershipParams,
    ): Promise<RegisterMembershipResult> {
        const [membership] =
            findMembershipPda(
                this.programId,
                params.application,
                params.member,
            );

        const instruction =
            buildRegisterMembershipInstruction({
                ...params,
                programId:
                    this.programId,
                membership,
                authority:
                    params.authority.publicKey,
            });

        const transaction =
            await this.transactions.createTransaction(
                params.authority.publicKey,
                [instruction],
            );

        const signature =
            await sendAndConfirmTransaction(
                this.connection,
                transaction,
                [params.authority],
                {
                    commitment:
                        "confirmed",
                },
            );

        return {
            signature,
            application:
                params.application,
            membership,
            member:
                params.member,
        };
    }

    async updateMembership(
        params: UpdateMembershipParams,
    ): Promise<UpdateMembershipResult> {
        const [membership] =
            findMembershipPda(
                this.programId,
                params.application,
                params.member,
            );

        const {
            member,
            authority,
            ...builderParams
        } = params;

        const instruction =
            buildUpdateMembershipInstruction({
                ...builderParams,
                programId:
                    this.programId,
                membership,
                authority:
                    authority.publicKey,
            });

        const transaction =
            await this.transactions.createTransaction(
                authority.publicKey,
                [instruction],
            );

        const signature =
            await sendAndConfirmTransaction(
                this.connection,
                transaction,
                [authority],
                {
                    commitment:
                        "confirmed",
                },
            );

        return {
            signature,
            application:
                params.application,
            membership,
            member,
        };
    }

    async renewMembership(
        params: RenewMembershipParams,
    ): Promise<RenewMembershipResult> {
        const [membership] =
            findMembershipPda(
                this.programId,
                params.application,
                params.member,
            );

        const {
            member,
            authority,
            ...builderParams
        } = params;

        const instruction =
            buildRenewMembershipInstruction({
                ...builderParams,
                programId:
                    this.programId,
                membership,
                authority:
                    authority.publicKey,
            });

        const transaction =
            await this.transactions.createTransaction(
                authority.publicKey,
                [instruction],
            );

        const signature =
            await sendAndConfirmTransaction(
                this.connection,
                transaction,
                [authority],
                {
                    commitment:
                        "confirmed",
                },
            );

        return {
            signature,
            application:
                params.application,
            membership,
            member,
        };
    }

    async verifyNftMembership(
        params: VerifyNftMembershipParams,
    ): Promise<VerifyNftMembershipResult> {
        const [membership] =
            findMembershipPda(
                this.programId,
                params.application,
                params.member.publicKey,
            );

        const {
            member,
            ...builderParams
        } = params;

        const instruction =
            buildVerifyNftMembershipInstruction({
                ...builderParams,
                programId:
                    this.programId,
                membership,
                member:
                    member.publicKey,
            });

        const transaction =
            await this.transactions.createTransaction(
                member.publicKey,
                [instruction],
            );

        const signature =
            await sendAndConfirmTransaction(
                this.connection,
                transaction,
                [member],
                {
                    commitment:
                        "confirmed",
                },
            );

        return {
            signature,
            application:
                params.application,
            membership,
            member:
                member.publicKey,
        };
    }

    async configureTokenGate(
        params: ConfigureTokenGateParams,
    ): Promise<ConfigureTokenGateResult> {
        const [tokenGate] =
            findTokenGatePda(
                this.programId,
                params.application,
                params.applicationAsset,
            );

        const {
            authority,
            ...builderParams
        } = params;

        const instruction =
            buildConfigureTokenGateInstruction({
                ...builderParams,
                programId:
                    this.programId,
                authority:
                    authority.publicKey,
            });

        const transaction =
            await this.transactions.createTransaction(
                authority.publicKey,
                [instruction],
            );

        const signature =
            await sendAndConfirmTransaction(
                this.connection,
                transaction,
                [authority],
                {
                    commitment:
                        "confirmed",
                },
            );

        return {
            signature,
            application:
                params.application,
            applicationAsset:
                params.applicationAsset,
            tokenGate,
        };
    }

    async verifyGateAccess(
        params: VerifyGateAccessParams,
    ): Promise<VerifyGateAccessResult> {
        const [tokenGate] =
            findTokenGatePda(
                this.programId,
                params.application,
                params.applicationAsset,
            );

        const {
            wallet,
            ...builderParams
        } = params;

        const instruction =
            buildVerifyGateAccessInstruction({
                ...builderParams,
                programId:
                    this.programId,
                wallet:
                    wallet.publicKey,
            });

        const transaction =
            await this.transactions.createTransaction(
                wallet.publicKey,
                [instruction],
            );

        const signature =
            await sendAndConfirmTransaction(
                this.connection,
                transaction,
                [wallet],
                {
                    commitment:
                        "confirmed",
                },
            );

        return {
            signature,
            application:
                params.application,
            applicationAsset:
                params.applicationAsset,
            tokenGate,
            wallet:
                wallet.publicKey,
        };
    }

    /**
     * Retrieves a confirmed transaction and decodes Babycowans events
     * from its Solana log messages in original emission order.
     *
     * A transaction that is not available at the requested commitment
     * produces an empty event list.
     */
    async decodeEvents(
        signature: string,
        options: DecodeEventLogsOptions = {},
    ): Promise<DecodedBabycowansEvent[]> {
        const transaction =
            await this.connection.getTransaction(
                signature,
                {
                    commitment: "confirmed",
                    maxSupportedTransactionVersion: 0,
                },
            );

        return decodeBabycowansEventLogs(
            transaction?.meta?.logMessages,
            {
                ...options,
                programId: this.programId,
            },
        );
    }

    private async fetchDecodedAccount<T>(
        address: PublicKey,
        decoder: (buffer: Buffer) => T,
    ): Promise<ReadAccount<T> | null> {
        const account =
            await this.accounts.fetch(address);

        if (account === null) {
            return null;
        }

        if (!account.owner.equals(this.programId)) {
            throw new Error(
                `Babycowans account owner mismatch: ${address.toBase58()}`,
            );
        }

        return {
            address,
            data:
                decoder(account.data),
        };
    }

    /**
     * Reads an Application using its canonical PDA inputs.
     */
    async getApplication(
        params: GetApplicationParams,
    ): Promise<ReadAccount<ApplicationAccount> | null> {
        const [address] =
            this.findApplication(
                params.authority,
                params.applicationId,
            );

        return this.fetchDecodedAccount(
            address,
            decodeApplicationAccount,
        );
    }

    /**
     * Reads a Membership using its canonical Application + member PDA.
     */
    async getMembership(
        params: GetMembershipParams,
    ): Promise<ReadAccount<MembershipAccount> | null> {
        const [address] =
            this.findMembership(
                params.application,
                params.member,
            );

        return this.fetchDecodedAccount(
            address,
            decodeMembershipAccount,
        );
    }

    /**
     * Reads a Reward using its canonical reward PDA inputs.
     */
    async getReward(
        params: GetRewardParams,
    ): Promise<ReadAccount<RewardAccount> | null> {
        const [address] =
            this.findReward(
                params.application,
                params.beneficiary,
                params.rewardId,
            );

        return this.fetchDecodedAccount(
            address,
            decodeRewardAccount,
        );
    }

    /**
     * Reads all AuditLog accounts for an Application.
     *
     * AuditLog.application begins at byte offset 44:
     * 8 discriminator + 2 version + 2 schema version + 32 authority.
     *
     * Results are returned oldest-first. Equal timestamps are ordered
     * by account address for deterministic behavior.
     */
    async getAuditHistory(
        params: GetAuditHistoryParams,
    ): Promise<ReadAccount<AuditLogAccount>[]> {
        const accounts =
            await this.connection.getProgramAccounts(
                this.programId,
                {
                    commitment: "confirmed",
                    filters: [
                        {
                            memcmp: {
                                offset: 44,
                                bytes:
                                    params.application.toBase58(),
                            },
                        },
                    ],
                },
            );

        const history:
            ReadAccount<AuditLogAccount>[] =
            [];

        for (const item of accounts) {
            if (
                !matchesAccountDiscriminator(
                    item.account.data,
                    "AuditLog",
                )
            ) {
                continue;
            }

            const data =
                decodeAuditLogAccount(
                    item.account.data,
                );

            if (
                !data.application.equals(
                    params.application,
                )
            ) {
                continue;
            }

            history.push({
                address:
                    item.pubkey,
                data,
            });
        }

        history.sort(
            (left, right) => {
                if (
                    left.data.createdAt <
                    right.data.createdAt
                ) {
                    return -1;
                }

                if (
                    left.data.createdAt >
                    right.data.createdAt
                ) {
                    return 1;
                }

                return left.address
                    .toBase58()
                    .localeCompare(
                        right.address.toBase58(),
                    );
            },
        );

        return history;
    }

    async accountExists(
        address: PublicKey,
    ): Promise<boolean> {
        return this.accounts.exists(address);
    }

    async buildTransaction(
        payer: PublicKey,
        instructions: TransactionInstruction[],
    ): Promise<Transaction> {
        return this.transactions.createTransaction(
            payer,
            instructions,
        );
    }

    async buildVersionedTransaction(
        payer: PublicKey,
        instructions: TransactionInstruction[],
    ): Promise<VersionedTransaction> {
        return this.transactions.createVersionedTransaction(
            payer,
            instructions,
        );
    }
}
